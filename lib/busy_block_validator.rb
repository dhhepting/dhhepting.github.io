# frozen_string_literal: true
#
# lib/busy_block_validator.rb
#
# Validates the optional `research:` and `reserved:` lists in each semester entry
# of _data/teaching/all/semesters.yml. These two lists are the ONLY new authored
# data for the personal weekly grid (calendar step 5): class blocks are joined
# from each offering.yml, and office hours already live in `office_hours:`.
#
# research/reserved are the PRIVATE categories. Publicly they render as an
# unlabelled "Unavailable" cell, told apart only by colour, so the committed YAML
# must never carry a name, a reason, or any other detail. This validator's core
# job is that leak-guard: an entry may hold EXACTLY day/start/end and nothing
# else. A stray `who:`/`note:`/`label:` fails the build loudly, before it can
# reach a public commit. Well-formedness (weekday, HH:MM times, start < end) is
# checked alongside.
#
# NOT checked here: overlap with class blocks — that needs the offering join and
# belongs to the grid generator (step 5, phase 2). office_hours is intentionally
# left alone: it is public, detailed data and is allowed to carry labels.
#
# Interface follows the lib/ convention — plain Ruby, usable both offline (Rake)
# and at build time (a generator that raises):
#   BusyBlockValidator.errors(semesters)     -> ["202630 research[0]: ...", ...]
#   BusyBlockValidator.validate!(semesters)  -> true, or raises with all messages
# where `semesters` is the array from site.data.dig("teaching", "all", "semesters").

module BusyBlockValidator
  module_function

  WEEKDAYS = %w[Mon Tue Wed Thu Fri].freeze
  KEYS     = %w[day start end].freeze
  BLOCKS   = %w[research reserved].freeze
  TIME_RE  = /\A([01]\d|2[0-3]):[0-5]\d\z/

  def errors(semesters)
    errs = []
    Array(semesters).each do |sem|
      code = sem["semester"].to_s # codes load as Integer; stringify for messages
      BLOCKS.each do |block|
        next unless sem.key?(block)
        list = sem[block]
        next if list.nil? # an empty/omitted key means "no blocks", not an error
        unless list.is_a?(Array)
          errs << "#{code} #{block}: expected a list, got #{list.class}"
          next
        end
        list.each_with_index { |entry, i| errs.concat(entry_errors(code, block, i, entry)) }
      end
    end
    errs
  end

  def validate!(semesters)
    e = errors(semesters)
    return true if e.empty?
    raise "semesters.yml research/reserved blocks invalid:\n  - " + e.join("\n  - ")
  end

  def entry_errors(code, block, idx, entry)
    loc = "#{code} #{block}[#{idx}]"
    return ["#{loc}: expected a mapping with day/start/end, got #{entry.class}"] unless entry.is_a?(Hash)

    out  = []
    keys = entry.keys.map(&:to_s)

    extra = keys - KEYS
    unless extra.empty?
      out << "#{loc}: unexpected key(s) #{extra.sort.inspect} — research/reserved " \
             "entries may hold ONLY #{KEYS.inspect}; no names or reasons in a public file"
    end
    missing = KEYS - keys
    out << "#{loc}: missing key(s) #{missing.inspect}" unless missing.empty?

    day = entry["day"]
    out << "#{loc}: day #{day.inspect} not one of #{WEEKDAYS.inspect}" unless day.nil? || WEEKDAYS.include?(day)

    st = entry["start"]
    en = entry["end"]
    st_ok = st.is_a?(String) && st.match?(TIME_RE)
    en_ok = en.is_a?(String) && en.match?(TIME_RE)
    out << "#{loc}: start #{st.inspect} not \"HH:MM\"" unless st_ok
    out << "#{loc}: end #{en.inspect} not \"HH:MM\"" unless en_ok
    out << "#{loc}: start #{st} is not before end #{en}" if st_ok && en_ok && st >= en

    out
  end
end