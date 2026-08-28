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

  # ===========================================================================
# ADD TO: lib/semester_validator.rb, inside `module SemesterData`
# (anywhere after `module_function`, alongside validate/derive!).
#
# Computes the SEMESTER-OWNED CALENDAR: the ordered list of class weeks, each
# with its Monday `weekof` and the no-class events that fall in it. This is a
# property of the term — identical for every offering in it — so it is derived
# once here and shared, rather than recomputed per course.
#
# The Monday anchor is IDENTICAL to _plugins/meeting_page_generator.rb
# (first_monday / week = ((d - fmon)/7)+1), so a meeting page's `week`/`week_of`
# and a semester `weeks[].weekof` can never disagree. Verified against
# CS-280/202610: all 26 TuTh meetings index to the matching weekof.
#
# No new authored field and no new validation: validate_no_class_days already
# rejects any no_class_day outside term_start..class_end, which is exactly the
# range these weeks span — so no event can be silently dropped.
# ===========================================================================

  # Monday of the week containing d.  (wday: Sun=0..Sat=6)
  # Same formula as meeting_page_generator's first_monday.
  def monday_of(d)
    d = coerce_to_date(d)
    d - ((d.wday + 6) % 7)
  end

  # Accept a native YAML Date (the normal case) or an ISO string, defensively.
  # If SemesterData already has a date coercer, delete this and use that one.
  def coerce_to_date(v)
    return v if v.is_a?(Date)
    Date.strptime(v.to_s.strip, '%Y-%m-%d')
  end

  # -> Array of { 'week' => Integer, 'weekof' => Date(Monday),
  #               'events' => [ { 'date' => Date, 'label' => String|nil }, ... ] }
  # spanning the week of term_start through the week of class_end (class weeks;
  # the exam period term_start..term_end is intentionally excluded).
  def weeks_for(entry)
    fmon = monday_of(entry['term_start'])
    last = monday_of(entry['class_end'])

    events_by_monday = Hash.new { |h, k| h[k] = [] }
    Array(entry['no_class_days']).each do |nc|
      d     = coerce_to_date(nc.is_a?(Hash) ? (nc['date'] || nc[:date]) : nc)
      label = nc.is_a?(Hash) ? (nc['label'] || nc[:label]) : nil
      events_by_monday[monday_of(d)] << { 'date' => d, 'label' => label }
    end

    weeks = []
    mon   = fmon
    n     = 0
    while mon <= last
      n += 1
      weeks << {
        'week'   => n,
        'weekof' => mon,
        'events' => events_by_monday[mon].sort_by { |e| e['date'] }
      }
      mon += 7
    end
    weeks
  end

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
      entry['weeks']         = weeks_for(entry)
      # ===========================================================================
# ADD TO: the same file, inside `def derive!(data)`, in the loop that already
# injects year/semester_name onto each entry. One line:
#
#     entry['weeks'] = weeks_for(entry)
#
# After this, every offering can read its term's calendar at
#   site.data.teaching.all.semesters | where:"semester", crs_sem | first | .weeks
# and step 3 (the semester-schedule overlay) layers meetings + topics onto it.
# ===========================================================================
 
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
    # lib/semester_validator.rb:179
    SemesterData.validate(data)  
  end
end