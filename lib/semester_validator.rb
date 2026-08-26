# frozen_string_literal: true

# lib/semester_validator.rb
#
# Pure validation + derivation logic for the semesters data file, with NO
# Jekyll dependency, so it can be required from two places:
#   * _plugins/semester_generator.rb — runs it during `jekyll build`
#   * Rakefile (structure:validate)  — runs it without a full build
#
# Schema: the REQUIRED core of a semester is its `semester` code plus the three
# term dates. `classes_taught`, `no_class_days`, and per-day `label` are
# OPTIONAL enrichment — present for current terms, absent for migrated history
# — and are validated only when present.
#
# `validate(data)` returns an array of error strings (empty == valid) and never
# raises on bad input. `derive!(data)` injects the fields the YAML does not
# store (`year`, `semester_name`).

require "date"

module SemesterData
  TERM_NAMES    = { 10 => "Winter", 20 => "Spring/Summer", 30 => "Fall" }.freeze
  REQUIRED_KEYS = %w[semester term_start class_end term_end].freeze
  DATE_KEYS     = %w[term_start class_end term_end].freeze
  VALID_DAYS    = %w[Mon Tue Wed Thu Fri Sat Sun].freeze
  CODE_RE       = /\A\d{6}\z/.freeze
  TIME_RE       = /\A([01]\d|2[0-3]):[0-5]\d\z/.freeze # 24h HH:MM

  module_function

  def validate(data)
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

  def derive!(data)
    data.each do |entry|
      code = entry["semester"]
      entry["year"]          = code / 100
      entry["semester_name"] = TERM_NAMES.fetch(code % 100)
    end
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
      # term_start of a semester must fall in the year its code encodes; this is
      # what caught the corrupt 202310/202320 rows (2022 dates on 2023 codes).
      if code.is_a?(Integer) && code.to_s.match?(CODE_RE) && dates["term_start"].year != code / 100
        errs << "#{where}: term_start #{dates['term_start']} is not in the term's year (#{code / 100})"
      end
      errs << "#{where}: term_start #{dates['term_start']} is after class_end #{dates['class_end']}" unless dates["term_start"] <= dates["class_end"]
      errs << "#{where}: class_end #{dates['class_end']} is after term_end #{dates['term_end']}"   unless dates["class_end"] <= dates["term_end"]
    end

    errs.concat(validate_no_class_days(entry["no_class_days"], where, dates)) if entry.key?("no_class_days")

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
        errs << "#{where}: no_class_days[#{j}] is #{d.class}, expected {date[, label]}"
        next
      end
      date = d["date"]
      errs << "#{where}: no_class_days[#{j}].date is #{date.inspect}, not a date" unless date.is_a?(Date)
      if d.key?("label") && !(d["label"].is_a?(String) && !d["label"].strip.empty?)
        errs << "#{where}: no_class_days[#{j}].label is present but blank"
      end
      next unless date.is_a?(Date)

      errs << "#{where}: duplicate no-class day #{date}" if seen[date]
      seen[date] = true
      if lo && hi && !date.between?(lo, hi)
        errs << "#{where}: no-class day #{date} is outside the term #{lo}..#{hi}"
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
end

# --- Rake-friendly wrapper -------------------------------------------------
# Same shape as TeachingDataValidator / OfferingIndexValidator:
#   SemesterDataValidator.new(path).run  -> [] on success, else [errors]
require "yaml"

class SemesterDataValidator
  def initialize(path = "_data/teaching/all/semesters.yml")
    @path = path
  end

  def run
    data =
      begin
        YAML.safe_load_file(@path, permitted_classes: [Date, Time])
      rescue Errno::ENOENT
        return ["#{@path}: file not found"]
      rescue Psych::Exception => e
        return ["#{@path}: not valid YAML \u2014 #{e.message.lines.first&.strip}"]
      end
    SemesterData.validate(data)
  end
end