# frozen_string_literal: true
#
# lib/meeting_page_fields.rb
#
# The single implementation of "what generated fields does a meeting
# page need", shared by:
#   - _plugins/meeting_pages_data_generator.rb (Jekyll::Generator, runs
#     automatically on every build — this is the "automagic in CI" path)
#   - lib/meeting_page_generator.rb (Rake-invoked, only for creating new
#     hand-authored .creole stubs — still needs these fields to fill in
#     the initial template)
#
# Factored out so both call sites compute fields identically instead of
# maintaining two implementations that could quietly drift apart.
#
# To add a new input beyond `theme`: read it in load_meeting_plan below
# (it already loads the WHOLE per-meeting hash from plan.yml, not just
# theme, so most new fields need no change here) and add it to the
# returned Hash in compute(). See BOK and photos for worked examples.

require 'date'
require 'csv'
require_relative 'tlo_resolver'

module MeetingPageFields
  module_function

  # meeting_plan is the per-meeting plan.yml row: {'meeting'=>N, 'theme'=>...,
  # 'BOK'=>[...], and whatever else you add to plan.yml's per-meeting hash}.
  # `standard` + `canonical_lookup` come from the caller so BOK resolves through
  # the shared TLOResolver (same engine as the offering section and MtgNN page).
  def compute(crs_id, crs_sem, offering, meetings, index, meeting_plan,
              standard = nil, canonical_lookup = nil, photos = [])
    mtg = meetings[index]
    date = parse_date(mtg['date'])
    has_photos = !(photos.nil? || photos.empty?)
    slug = meeting_slug(mtg)

    {
      'meeting' => mtg['meeting'],
      'date' => mtg['date'],
      'weekday' => date.strftime('%A'),
      'theme' => meeting_plan['theme'],
      'BOK' => resolve_bok(meeting_plan['BOK'], standard, canonical_lookup),
      'photos' => has_photos ? photos : nil,
      # Path only (no baseurl) — the layout applies `| relative_url` so
      # this resolves correctly regardless of which deploy target
      # (github vs uregina, different baseurl) is building.
      'photos_page_path' => has_photos ? "/meeting-pages/#{crs_id}/#{crs_sem}/#{slug}-photos/" : nil,
      # The Moodle-internal wiki page name (not a URL) — [[PageName]] links
      # to a page that doesn't exist yet in the same wiki render red in
      # Moodle/MediaWiki-style wikis automatically, and clicking one lets
      # you create it. Computed once here so the link text used every
      # meeting and the actual page name you eventually create in Moodle
      # can never drift apart.
      'photos_wiki_page_name' => "Mtg #{mtg['meeting']} Photos",
      'meeting_page_path' => "/meeting-pages/#{crs_id}/#{crs_sem}/#{slug}/",
      'prev_page' => index.positive? ? meetings[index - 1]['date'] : nil,
      'next_page' => index < meetings.size - 1 ? meetings[index + 1]['date'] : nil,
      'wiki_ed_group' => mtg['wiki_ed_group'],
      'wiki_ed_url' => mtg['wiki_ed_asgn'] && "https://urcourses.uregina.ca/mod/assign/view.php?id=#{mtg['wiki_ed_asgn']}",
      'attendance_url' => "https://urcourses.uregina.ca/mod/attendance/manage.php?id=#{offering['attendance_id']}&view=1",
      'calendar_day_url' => "https://urcourses.uregina.ca/calendar/view.php?view=day&time=#{regina_timestamp(date)}&course=#{offering['urc_course_id']}",
      'calendar_upcoming_url' => "https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=#{offering['urc_course_id']}",
      'groupblog_url' => offering['groupblog_id'] && "https://urcourses.uregina.ca/mod/oublog/view.php?id=#{offering['groupblog_id']}",
    }
  end

  def meeting_slug(mtg)
    format('%02d_%s', mtg['meeting'], mtg['date'])
  end

  # Loads the FULL per-meeting hash from plan.yml (not just theme), so
  # any new key you add there is already available to compute() above
  # without touching this loader again.
  def load_meeting_plan(plan_path)
    return {} unless File.exist?(plan_path)

    plan = YAML.load_file(plan_path) || {}
    (plan['meetings'] || []).each_with_object({}) { |m, h| h[m['meeting']] = m }
  end

  # Resolve a meeting's BOK list into render-ready units via the shared
  # TLOResolver — the SAME engine the offering section and the public MtgNN page
  # use, so meeting ⊆ offering ⊆ canonical holds and there is no second,
  # divergent resolution path. Returns nil when there's no BOK to show.
  #
  # `standard` scopes which curriculum to read; `canonical_lookup` is
  # ->(ka, ku){ canonical_ku_hash_or_nil }, supplied by the caller (it knows
  # whether to read site.data or disk).
  def resolve_bok(bok_list, standard, canonical_lookup)
    return nil if bok_list.nil? || bok_list.empty?
    return nil if canonical_lookup.nil?

    units = TLOResolver.resolve_meeting_bok(bok_list, &canonical_lookup)
    units.empty? ? nil : units
  end

  # The offering's TLO standard (e.g. "CS2023") from tlo.yml — scopes which
  # curriculum BOK resolves against. Returns nil if absent.
  def load_standard(tlo_path)
    return nil unless File.exist?(tlo_path)

    (YAML.load_file(tlo_path) || {})['standard']
  end

  # media.csv is written entirely by sharemedia.py (Dropbox share-link
  # generation) — never hand-edited, unlike plan.yml — so this belongs
  # fully on the generated side, same reasoning as meetings.yml. This
  # replaces the separate mediamtgs/*.txt generation step: instead of a
  # script producing a static Creole snippet you paste in once, photos
  # are computed live from media.csv every build, same as everything
  # else on the generated side.
  #
  # Pairs each base filename with its _tn thumbnail counterpart. Skips:
  #   - rows whose `meet` isn't one of this offering's real meeting
  #     numbers (media.csv's "428,428 Exam cover sheet.docx" row, for
  #     instance — not a meeting photo at all)
  #   - .HEIC entries (the real m22.txt only ever links the .jpg,
  #     never the HEIC original — HEIC doesn't render in browsers)
  #   - anything without a usable web image extension
  # A file with no matching thumbnail (or vice versa) is skipped
  # entirely rather than guessed at — every real example we've seen
  # comes in tn/full pairs.
  IMAGE_EXTS = %w[.jpg .jpeg .png .gif].freeze

  def load_media(media_csv_path, valid_meetings)
    return {} unless File.exist?(media_csv_path)

    by_meeting = Hash.new { |h, k| h[k] = [] }
    CSV.read(media_csv_path, headers: true).each do |row|
      # Explicit base 10 — Integer("08") auto-detects octal from the
      # leading zero and silently fails (8 isn't a valid octal digit),
      # which was dropping meetings 08 and 09's photos entirely.
      meeting = Integer(row['meet'], 10, exception: false)
      next unless meeting && valid_meetings.include?(meeting)
      next unless row['file'] && row['URL']

      by_meeting[meeting] << { 'file' => row['file'], 'url' => row['URL'] }
    end

    by_meeting.transform_values { |files| pair_media_files(files) }
  end

  def pair_media_files(files)
    groups = Hash.new { |h, k| h[k] = {} }

    files.each do |f|
      ext = File.extname(f['file'])
      next unless IMAGE_EXTS.include?(ext.downcase)

      base = File.basename(f['file'], ext)
      if base.end_with?('_tn')
        groups[base.sub(/_tn\z/, '')]['thumb_url'] = f['url']
      else
        groups[base]['full_url'] = f['url']
      end
    end

    # Natural sort: numeric labels ("1", "2", ... "10") sort as numbers,
    # non-numeric labels ("realfakemap") sort alphabetically after them.
    sorted_labels = groups.keys.sort_by { |l| l.match?(/\A\d+\z/) ? [0, l.to_i, ''] : [1, 0, l] }

    sorted_labels.filter_map do |label|
      g = groups[label]
      next nil unless g['full_url'] && g['thumb_url']

      { 'label' => label, 'thumb_url' => g['thumb_url'], 'full_url' => g['full_url'] }
    end
  end

  def parse_date(date_str)
    Date.strptime(date_str, '%a-%d-%b-%Y')
  end

  # Regina, Saskatchewan does not observe daylight saving time — fixed
  # -06:00 year-round. Date#to_time would pick up whatever timezone the
  # machine running this happens to be set to (a GitHub Actions runner,
  # your Mac, this sandbox — all different), silently producing wrong
  # calendar links depending on where it runs.
  def regina_timestamp(date)
    Time.new(date.year, date.month, date.day, 0, 0, 0, '-06:00').to_i
  end
end