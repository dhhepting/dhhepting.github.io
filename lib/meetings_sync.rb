# frozen_string_literal: true
#
# lib/meetings_sync.rb
#
# Derives _data/teaching/<crs>/<sem>/meetings.yml — the MATERIALIZED JOIN of:
#   * class-meeting dates       — computed from the term calendar (MeetingCalendar)
#   * per-meeting Moodle fields — CARRIED FORWARD from plan.yml, keyed by number
#
# This is what finally makes meetings.yml honestly "safe to regenerate
# wholesale": every field it holds has a real source elsewhere (the calendar,
# or plan.yml), so rewriting the file loses nothing. Deleting meetings.yml
# becomes a `rake meetings:sync` away from restored, instead of a build-ender.
#
# It reads YAML off disk (that's the task's whole point) but does NO Jekyll and
# NO network, so it is testable offline against a fixture teaching dir. All date
# MATH is delegated to MeetingCalendar, so there is exactly ONE calendar path,
# shared with _plugins/meeting_page_generator.rb.

require 'date'
require 'yaml'
require_relative 'meeting_calendar'

module MeetingsSync
  module_function

  # Fields authored in plan.yml that MUST survive a wholesale regenerate of
  # meetings.yml. Grow this list as the Moodle-sync surface grows.
  CARRY = %w[wikipage_id wiki_ed_group wiki_ed_asgn].freeze

  # plan.yml meeting-number keys — the SAME contract as
  # _plugins/meeting_page_generator.rb's Teaching.index_meetings. (See the note
  # at the bottom: the clean end-state lifts that into one shared helper so this
  # list can't drift from the plugin's.)
  NUM_KEYS = %w[meeting number num n mtg].freeze

  Result = Struct.new(:rows, :warnings)

  # teaching_dir e.g. '_data/teaching'; crs_id 'CS-315'; crs_sem '202630'.
  def derive(teaching_dir, crs_id, crs_sem)
    dir      = File.join(teaching_dir, crs_id.to_s, crs_sem.to_s)
    offering = load_yaml!(File.join(dir, 'offering.yml'))
    semrec   = semester_record!(teaching_dir, crs_sem)
    authored = index_by_number(load_optional_plan(dir))

    mdays = offering['mdays']
    raise "meetings_sync: #{crs_id}/#{crs_sem}: offering.yml has no `mdays`" if mdays.nil?

    dates = MeetingCalendar.meeting_dates(
      semrec.fetch('term_start'),
      semrec.fetch('class_end'),
      mdays,
      semrec['no_class_days']
    )

    warnings = orphan_warnings(authored, dates.size, crs_id, crs_sem)

    rows = dates.each_with_index.map do |d, i|
      n   = i + 1
      src = authored[n] || {}
      row = { 'meeting' => n, 'date' => format_date(d) }
      CARRY.each { |k| row[k] = src[k] if src.key?(k) }
      row
    end

    Result.new(rows, warnings)
  end

  # --- date representation: the ONE place the on-disk format is decided --------
  # Native Date -> YAML emits `2026-09-08` (ISO), which reloads as a real Date
  # (so Liquid can format it with `| date: "%a %d %b %Y"`) and round-trips
  # through MeetingCalendar.coerce_date AND SemesterData.coerce_to_date.
  #
  # If any current consumer DISPLAYS the raw string, or strptimes the old CS-280
  # `%a-%d-%b-%Y` format, change the body to: d.strftime('%a-%d-%b-%Y')
  def format_date(d)
    d.strftime('%Y-%m-%d')   # ISO STRING, not a Date: loads through every bare
                           # safe_load in the project without permitted_classes,
                           # and still round-trips via MeetingCalendar.coerce_date.
end

  # --- inputs ------------------------------------------------------------------

  def semester_record!(teaching_dir, crs_sem)
    path = File.join(teaching_dir, 'all', 'semesters.yml')
    data = load_yaml!(path)
    rec  = Array(data).find { |r| r.is_a?(Hash) && r['semester'].to_s == crs_sem.to_s }
    unless rec
      have = Array(data).filter_map { |r| r['semester'] if r.is_a?(Hash) }
      raise "meetings_sync: no semester #{crs_sem} in #{path}; present: #{have.inspect}"
    end
    %w[term_start class_end].each do |k|
      raise "meetings_sync: semester #{crs_sem} `#{k}` is #{rec[k].inspect}, not a Date" \
        unless rec[k].is_a?(Date)
    end
    rec
  end

  # plan.yml is optional: a term with no authored meetings still gets a file
  # of bare calendar rows (which is exactly the migrate-from-scratch case).
  def load_optional_plan(dir)
    path = File.join(dir, 'plan.yml')
    return nil unless File.exist?(path)

    plan = load_yaml!(path)
    plan.is_a?(Hash) ? plan['meetings'] : nil
  end

  def index_by_number(raw)
    case raw
    when Hash
      raw.each_with_object({}) { |(k, v), h| h[k.to_i] = v }
    when Array
      raw.each_with_object({}) do |e, h|
        next unless e.is_a?(Hash)

        n = NUM_KEYS.filter_map { |k| e[k] }.first
        h[n.to_i] = e unless n.nil?
      end
    else
      {}
    end
  end

  # Moodle IDs authored for a meeting number the calendar does NOT produce would
  # be silently dropped on write — the precise data loss this task exists to
  # prevent. Surface them loudly rather than eat them.
  def orphan_warnings(authored, total, crs_id, crs_sem)
    authored.filter_map do |n, e|
      next if n <= total || !e.is_a?(Hash)

      carried = CARRY.select { |k| e.key?(k) }
      next if carried.empty?

      "#{crs_id}/#{crs_sem}: plan.yml meeting ##{n} carries #{carried.inspect} " \
        "but only #{total} meeting(s) computed — those fields will NOT be written"
    end
  end

  def load_yaml!(path)
    raise "meetings_sync: file not found: #{path}" unless File.exist?(path)

    YAML.safe_load_file(path, permitted_classes: [Date, Time])
  end
end