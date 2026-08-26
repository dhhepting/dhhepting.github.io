# frozen_string_literal: true

# _plugins/semester_generator.rb
#
# Purpose
# -------
# `_data/all/semesters.yml` is the single hand-authored source of semester-level
# detail. It deliberately does NOT store `year` or `semester_name`, because the
# `semester` term code already encodes both (YYYY + 10/20/30). This generator:
#
#   1. VALIDATES the file at build time. A bad edit raises and aborts
#      `jekyll build`, so `site-checks.yml` (CI) goes red instead of the site
#      quietly rendering wrong.
#   2. DERIVES `year` and `semester_name` and injects them into each in-memory
#      record, so templates can keep using {{ s.year }} / {{ s.semester_name }}.
#
# It runs at :high priority so the derived fields are present before any other
# generator (e.g. a calendar/offering generator) or Liquid template reads them.

require "date"

module SemesterData
  # Raised on invalid data. A raise inside a generator aborts the build.
  class InvalidSemesterData < StandardError; end

  TERM_NAMES    = { 10 => "Winter", 20 => "Spring/Summer", 30 => "Fall" }.freeze
  REQUIRED_KEYS = %w[semester term_start class_end term_end no_class_days classes_taught].freeze
  DATE_KEYS     = %w[term_start class_end term_end].freeze
  VALID_DAYS    = %w[Mon Tue Wed Thu Fri Sat Sun].freeze
  CODE_RE       = /\A\d{6}\z/.freeze
  TIME_RE       = /\A([01]\d|2[0-3]):[0-5]\d\z/.freeze # 24h HH:MM

  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      data = site.data["semesters"]
      return if data.nil? # file absent in this build; nothing to do

      errors = validate(data)
      unless errors.empty?
        report = (["semesters.yml failed validation (#{errors.length} issue(s)):"] +
                  errors.map { |e| "  \u2022 #{e}" }).join("\n")
        Jekyll.logger.error("Semesters:", report)
        raise InvalidSemesterData, report
      end

      derive!(data)
      Jekyll.logger.info("Semesters:", "validated and enriched #{data.length} semester(s)")
    end

    # --- validation ---------------------------------------------------------
    # Returns an array of human-readable error strings; empty means valid.
    # Never raises on bad input — it collects and reports, so one build shows
    # every problem at once.
    def validate(data)
      # If a stray second YAML document (a rogue `---`) sneaks back in, the
      # loader returns only the first document, which will not be our list.
      # Asserting "Array of Hashes" here is how we enforce the single-document,
      # well-formed shape from inside the build.
      unless data.is_a?(Array)
        return ["top level is #{data.class}, not a list \u2014 " \
                "did a stray '---' split the file into two documents?"]
      end
      return ["the semester list is empty"] if data.empty?

      errors = []
      data.each_with_index { |entry, i| errors.concat(validate_entry(entry, i)) }
      errors.concat(validate_order_and_uniqueness(data))
      errors
    end

    def validate_entry(entry, i)
      return ["entry ##{i} is #{entry.class}, not a mapping"] unless entry.is_a?(Hash)

      code  = entry["semester"]
      where = code.is_a?(Integer) ? "semester #{code}" : "entry ##{i}"
      errs  = []

      missing = REQUIRED_KEYS.reject { |k| entry.key?(k) }
      errs << "#{where}: missing key(s): #{missing.join(', ')}" unless missing.empty?

      if code.is_a?(Integer) && code.to_s.match?(CODE_RE)
        term = code % 100
        errs << "#{where}: unknown term suffix #{format('%02d', term)} (expected 10/20/30)" unless TERM_NAMES.key?(term)
      else
        errs << "#{where}: `semester` must be a 6-digit integer like 202610 (got #{code.inspect})"
      end

      dates = {}
      DATE_KEYS.each do |k|
        v = entry[k]
        if v.is_a?(Date)
          dates[k] = v
        elsif entry.key?(k)
          errs << "#{where}: `#{k}` is #{v.inspect}, not a date \u2014 use unquoted ISO YYYY-MM-DD"
        end
      end

      if dates.length == DATE_KEYS.length
        errs << "#{where}: term_start #{dates['term_start']} is after class_end #{dates['class_end']}" unless dates["term_start"] <= dates["class_end"]
        errs << "#{where}: class_end #{dates['class_end']} is after term_end #{dates['term_end']}"   unless dates["class_end"] <= dates["term_end"]
      end

      errs.concat(validate_no_class_days(entry["no_class_days"], where, dates))

      ct = entry["classes_taught"]
      if entry.key?("classes_taught") && (!ct.is_a?(Array) || ct.empty? || ct.any? { |c| !c.is_a?(String) })
        errs << "#{where}: `classes_taught` must be a non-empty list of course strings"
      end

      errs.concat(validate_office_hours(entry["office_hours"], where)) if entry.key?("office_hours")
      errs
    end

    def validate_no_class_days(list, where, dates)
      return ["#{where}: `no_class_days` must be a list"] unless list.is_a?(Array)

      lo = dates["term_start"]
      hi = dates["term_end"]
      seen = {}
      errs = []
      list.each_with_index do |d, j|
        unless d.is_a?(Hash)
          errs << "#{where}: no_class_days[#{j}] is #{d.class}, expected {date, label}"
          next
        end
        date  = d["date"]
        label = d["label"]
        errs << "#{where}: no_class_days[#{j}].date is #{date.inspect}, not a date" unless date.is_a?(Date)
        errs << "#{where}: no_class_days[#{j}].label is missing or blank" unless label.is_a?(String) && !label.strip.empty?
        next unless date.is_a?(Date)

        errs << "#{where}: duplicate no-class day #{date}" if seen[date]
        seen[date] = true
        if lo && hi && !date.between?(lo, hi)
          errs << "#{where}: no-class day #{date} (#{label}) is outside the term #{lo}..#{hi}"
        end
      end
      errs
    end

    def validate_office_hours(list, where)
      return ["#{where}: `office_hours` must be a list"] unless list.is_a?(Array)

      errs = []
      list.each_with_index do |h, j|
        unless h.is_a?(Hash)
          errs << "#{where}: office_hours[#{j}] is #{h.class}, expected {day, start, end}"
          next
        end
        errs << "#{where}: office_hours[#{j}].day #{h['day'].inspect} not one of #{VALID_DAYS.join('/')}" unless VALID_DAYS.include?(h["day"])
        s = h["start"]
        e = h["end"]
        good_s = s.is_a?(String) && TIME_RE.match?(s)
        good_e = e.is_a?(String) && TIME_RE.match?(e)
        errs << "#{where}: office_hours[#{j}].start #{s.inspect} must be quoted \"HH:MM\"" unless good_s
        errs << "#{where}: office_hours[#{j}].end #{e.inspect} must be quoted \"HH:MM\""   unless good_e
        errs << "#{where}: office_hours[#{j}] start #{s} is not before end #{e}" if good_s && good_e && s >= e
      end
      errs
    end

    def validate_order_and_uniqueness(data)
      codes = data.filter_map { |e| e["semester"] if e.is_a?(Hash) }
                  .select { |c| c.is_a?(Integer) }
      errs = []
      dups = codes.tally.select { |_, n| n > 1 }.keys
      errs << "duplicate semester code(s): #{dups.join(', ')}" unless dups.empty?
      errs << "semesters are not in ascending code order (expected #{codes.sort.join(', ')})" unless codes == codes.sort
      errs
    end

    # --- derivation ---------------------------------------------------------
    # Inject the two fields we deliberately do not store, so templates keep
    # working. Safe to call only after validation passes.
    def derive!(data)
      data.each do |entry|
        code = entry["semester"]
        entry["year"]          = code / 100
        entry["semester_name"] = TERM_NAMES.fetch(code % 100)
      end
    end
  end
end