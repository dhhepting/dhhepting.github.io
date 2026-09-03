# frozen_string_literal: true
#
# _plugins/weekly_grid_generator.rb   (calendar step 5, phase 2)
#
# Builds the personal weekly grid ("typical week") for every semester Daryl
# actually teaches — i.e. every entry with a non-empty `classes_taught`. Class
# blocks are JOINED from each offering (single source: a room/time change stays a
# one-file edit in offering.yml); office hours / research / reserved are overlaid
# from the semester entry. The computation and the fail-loud collision guard live
# in lib/weekly_grid.rb; this plugin only gathers data and attaches the result as
# `entry['weekly_grid']`, the way semester_generator attaches `weeks`.
#
# Runs :low so it sits after semester normalization. It reads only authored
# fields, so it doesn't depend on derive! output — but :low keeps it beside the
# other schedule generator and clear of any code coercion.
#
# Fail-loud, with context:
#   * a course in classes_taught with no offering.yml raises (this is the
#     "CS-315 not found" class of bug — surfaced, not silently skipped);
#   * research/reserved blocks are validated (the phase-1 leak-guard);
#   * overlapping blocks raise from lib/weekly_grid.rb.
# An offering that exists but has no mdays/times (e.g. a reading course) is a
# legitimate shape: it contributes no class block and is logged, not fatal.

require_relative "../lib/busy_block_validator"
require_relative "../lib/weekly_grid"

module Teaching
  class WeeklyGridGenerator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      semesters = site.data.dig("teaching", "all", "semesters")
      return if semesters.nil?

      # Phase-1 gate: no name/reason ever reaches a public build.
      BusyBlockValidator.validate!(semesters)

      semesters.each do |entry|
        taught = Array(entry["classes_taught"])
        next if taught.empty? # historical terms carry no grid

        sem_code = entry["semester"].to_s # codes load as Integer; dir keys are strings
        blocks = []

        taught.each do |course|
          off = offering_for(site, course, sem_code)
          if off.nil?
            raise "weekly_grid: #{sem_code} classes_taught lists #{course.inspect} " \
                  "but no offering was found at data key " \
                  "teaching.#{CourseId.data_key(course)}.#{sem_code}.offering " \
                  "(check the directory name and that offering.yml exists)"
          end
          blocks.concat(class_blocks(course, off, sem_code, site))
        end

        blocks.concat(hour_blocks(entry["office_hours"], "office"))
        blocks.concat(hour_blocks(entry["research"], "research"))
        blocks.concat(hour_blocks(entry["reserved"], "reserved"))

        entry["weekly_grid"] = WeeklyGrid.build(blocks)
      end
    end

    private

    # Mirrors Jekyll's data loading: _data/teaching/<jcrs_id>/<sem>/offering.yml
    # -> site.data["teaching"][jcrs_id][sem]["offering"].
    def offering_for(site, course, sem_code)
      site.data.dig("teaching", CourseId.data_key(course), sem_code, "offering")
    end

    def class_blocks(course, off, sem_code, site)
      mdays = Array(off["mdays"])
      times = off["times"].to_s
      if mdays.empty? || !times.include?("-")
        site.logger.info "weekly_grid:", "#{sem_code} #{course} has no mdays/times " \
                         "(reading course?) — no class block on the grid"
        return []
      end
      st, en = times.split("-", 2)
      mdays.map do |day|
        { "category" => "class", "day" => day, "start" => st.strip, "end" => en.strip,
          "meta" => { "course" => course, "location" => off["location"] } }
      end
    end

    def hour_blocks(list, category)
      Array(list).map do |o|
        { "category" => category, "day" => o["day"], "start" => o["start"],
          "end" => o["end"], "meta" => {} }
      end
    end
  end
end