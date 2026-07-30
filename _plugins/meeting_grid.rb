# frozen_string_literal: true
#
# _plugins/meeting_grid.rb
#
# Pre-computes "meetings per week" (mpw) grid-layout data for every course
# offering, once, at build time — before any page is rendered.
#
# This replaces the ~35-line block of nested {% for %}/{% modulo %} Liquid
# in _includes/offering/mtgs-all.html that crashed with a ZeroDivisionError
# when an offering's `mdays` field was missing. Doing this in Ruby instead
# of Liquid gets us three things Liquid can't give us:
#   1. Real error handling — `raise` with a message naming the offering,
#      instead of a silent bad value (like mpw == 0) surviving all the way
#      to a filter call deep inside a template.
#   2. A single implementation instead of three near-duplicates
#      (mtgs-all.html, old-mtgs-all.html, media-grid.html all reimplement
#      this "N items per row" logic separately today).
#   3. Something a Rakefile / test suite can call directly (see
#      lib/teaching_data_validator.rb and the Rakefile), without needing
#      to spin up a full Jekyll build to exercise the logic.
#
# --- How Jekyll::Generator works (quick primer, since Ruby is new to you) ---
# Any class in _plugins/ that inherits from Jekyll::Generator and defines
# a `generate(site)` method gets that method called automatically by
# Jekyll during the build, before pages are rendered. `site` gives you
# access to `site.data` (everything under _data/) and lets you write to it.
# `priority :high` just means "run this before lower-priority plugins" —
# useful because other plugins/templates depend on the data we're adding.

class MeetingGridError < StandardError; end

class MeetingGridGenerator < Jekyll::Generator
  priority :high

  def generate(site)
    offerings = site.data.dig('teaching', 'offerings') || []

    if offerings.empty?
      Jekyll.logger.warn "MeetingGrid:", "site.data.teaching.offerings is empty — nothing to compute"
      return
    end

    offerings.each do |offering|
      crs_id  = offering['id']
      crs_sem = offering['semester']
      label   = "#{crs_id}/#{crs_sem}"

      begin
        grid = compute_meeting_grid(site, crs_id, crs_sem, offering)
      rescue MeetingGridError => e
        # Fail the build loudly, with the offering identified, instead of
        # letting a bad value (e.g. mpw == 0) travel silently into Liquid.
        Jekyll.logger.error "MeetingGrid:", "#{label}: #{e.message}"
        raise
      end

      # Stash the result where Liquid can read it as plain data:
      #   site.data.teaching[crs_id][crs_sem].meeting_grid.mpw
      #   site.data.teaching[crs_id][crs_sem].meeting_grid.mpwidx
      #   site.data.teaching[crs_id][crs_sem].meeting_grid.mtgdays
      site.data['teaching'][crs_id] ||= {}
      site.data['teaching'][crs_id][crs_sem] ||= {}
      site.data['teaching'][crs_id][crs_sem]['meeting_grid'] = grid
    end
  end

  # Pulled out as a plain method (not tied to `self`/generate) so it can be
  # called directly from a test file without needing a real Jekyll::Site.
  # Takes `site_data` (a plain Hash, e.g. site.data or a fixture Hash in
  # tests) rather than the whole `site` object, for the same reason.
  def self.compute_meeting_grid(site_data, crs_id, crs_sem, offering)
    # mdays comes as a real YAML list from offering.yml (mdays: [Tue, Thu])
    # now that offerings are generated from per-offering files instead of
    # the old offerings.csv, which packed this as a comma-separated string
    # ("Mon,Wed,Fri") in a single cell. Handling both keeps this working
    # for any offering not yet migrated off the old CSV shape.
    mdays_raw = offering['mdays'] || []
    mtgdays = if mdays_raw.is_a?(Array)
                mdays_raw.map(&:to_s).map(&:strip).reject(&:empty?)
              else
                mdays_raw.to_s.split(',').map(&:strip).reject(&:empty?)
              end

    if mtgdays.empty?
      raise MeetingGridError,
        "no usable 'mdays' (got #{offering['mdays'].inspect}) — every offering needs a " \
        "comma-separated list of meeting weekdays"
    end

    meetings = site_data.dig('teaching', crs_id, crs_sem, 'meetings') || []
    if meetings.empty?
      raise MeetingGridError,
        "no meetings found at teaching.#{crs_id}.#{crs_sem}.meetings"
    end

    # How many of the offering's declared weekday tokens actually show up
    # among the real meeting dates.
    matched_days = meetings.filter_map do |mtg|
      date = mtg['date']
      raise MeetingGridError, "a meeting entry is missing 'date'" unless date
      day_token = date.split('-').first
      day_token if mtgdays.include?(day_token)
    end.uniq

    # NOTE: this preserves the original file's formula
    #   mpw = (# of meetings whose day matched) + (# of distinct mdays)
    # verbatim, to avoid silently changing visible layout behavior in this
    # first pass. Flagging it because it reads oddly for something named
    # "meetings per week" — worth confirming with yourself whether the
    # intended formula is really just `mtgdays.size` (the count of distinct
    # meeting weekdays), which is what "per week" usually implies. Once
    # you're sure, simplify this and delete the old dead code paths in
    # mtgs-all.html / old-mtgs-all.html.
    mpw = matched_days.size + mtgdays.size

    if mpw <= 0
      raise MeetingGridError,
        "computed mpw <= 0 (mdays=#{mtgdays.inspect}, #meetings=#{meetings.size}) — " \
        "this is the exact condition that crashed the CS-428+828/202130 build"
    end

    {
      'mpw'     => mpw,
      'mpwidx'  => mpw - 1,
      'mtgdays' => mtgdays,
    }
  end

  private

  def compute_meeting_grid(site, crs_id, crs_sem, offering)
    self.class.compute_meeting_grid(site.data, crs_id, crs_sem, offering)
  end
end
