# frozen_string_literal: true

# _plugins/semester_generator.rb
#
# Thin Jekyll wrapper around the shared SemesterData logic in lib/. Runs at
# :high priority so year/semester_name/weeks are derived and the data is proven
# valid before any other generator or Liquid template reads it. A validation
# failure raises, aborting `jekyll build` and turning CI red.

require_relative "../lib/semester_validator"

module SemesterData
  class InvalidSemesterData < StandardError; end

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      # semesters.yml lives at _data/teaching/all/semesters.yml, which Jekyll
      # loads to site.data['teaching']['all']['semesters'] — NOT
      # site.data['semesters']. Every other consumer (meeting_page_generator,
      # offerings_index_generator, lib validator) uses this nested path.
      data = site.data.dig("teaching", "all", "semesters")

      # Warn loudly rather than return silently: a nil here means the path is
      # wrong or the file didn't load, and a silent no-op would leave every
      # downstream reader without year/semester_name/weeks.
      if data.nil?
        Jekyll.logger.warn("Semesters:",
          "no data at site.data.teaching.all.semesters — skipping validation/enrichment")
        return
      end

      errors = SemesterData.validate(data)
      unless errors.empty?
        report = (["semesters.yml failed validation (#{errors.length} issue(s)):"] +
                  errors.map { |e| "  \u2022 #{e}" }).join("\n")
        Jekyll.logger.error("Semesters:", report)
        raise InvalidSemesterData, report
      end

      SemesterData.derive!(data) # injects year, semester_name, and weeks
      Jekyll.logger.info("Semesters:", "validated and enriched #{data.length} semester(s)")
    end
  end
end