# frozen_string_literal: true

# _plugins/semester_generator.rb
#
# Thin Jekyll wrapper around the shared SemesterData logic in lib/. Runs at
# :high priority so year/semester_name are derived and the data is proven valid
# before any other generator or Liquid template reads it. A validation failure
# raises, aborting `jekyll build` and turning CI red.

require_relative "../lib/semester_validator"

module SemesterData
  class InvalidSemesterData < StandardError; end

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      data = site.data["semesters"]
      return if data.nil?

      errors = SemesterData.validate(data)
      unless errors.empty?
        report = (["semesters.yml failed validation (#{errors.length} issue(s)):"] +
                  errors.map { |e| "  \u2022 #{e}" }).join("\n")
        Jekyll.logger.error("Semesters:", report)
        raise InvalidSemesterData, report
      end

      SemesterData.derive!(data)
      Jekyll.logger.info("Semesters:", "validated and enriched #{data.length} semester(s)")
    end
  end
end