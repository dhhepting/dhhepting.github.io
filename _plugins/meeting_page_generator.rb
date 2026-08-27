# _plugins/meeting_page_generator.rb
#
# Generates one rendered page per class meeting for every offering, at:
#   /teaching/<course>/<semester>/MtgNN/      (NN = zero-padded meeting number)
# Each page links out to its Moodle wiki page IF (and only if) a wikipage_id
# is authored for that meeting in plan.yml. Presence is derived from data:
# no wikipage_id -> no wiki link. Nothing dangling can ship.
#
# STABLE IDENTITY: the meeting NUMBER is the URL. The display NAME is the
# authored `topic` and may change freely without moving the page. An explicit
# permalink is set so the URL never drifts with global permalink config.
#
# Meeting DATES are a pure function of the semester calendar + the offering's
# meeting days. They are computed here at build time and never persisted, so
# there is no derived file anyone can be tempted to hand-edit.
#
# ---------------------------------------------------------------------------
# DATA CONTRACT (confirm these paths/keys match your upgrade-2026 layout)
#
#   site.data['teaching']['all']['semesters']  -> list of records, each:
#       semester:      "202630"
#       term-start:    2026-09-01        # native YAML date preferred; the
#       class-end:     2026-11-28        # dd-Mon-yy string form still parses
#       no-class-days: [2026-10-12, ...] # list (or omit / [] if none)
#
#   site.data['teaching'][<course>][<semester>]['offering']  ->
#       mdays: [Tue, Thu]                # list, or "Tue,Thu" string
#       expected_meetings: 26            # OPTIONAL: build-time sanity check
#
#   site.data['teaching'][<course>][<semester>]['plan']  ->  (hand-authored)
#       meetings:
#         1: { topic: "Introduction",  wikipage_id: 12345 }
#         2: { topic: "...",           wikipage_id: 12346 }
#         # `topic` is the display name and may change freely; the URL (NN)
#         # does not. Any meeting may be absent -> page still built, no link.
# ---------------------------------------------------------------------------

require 'date'
require 'set'

module Teaching
  WDAY = { 'Sun' => 0, 'Mon' => 1, 'Tue' => 2, 'Wed' => 3,
           'Thu' => 4, 'Fri' => 5, 'Sat' => 6 }.freeze

  WIKI_BASE = 'https://urcourses.uregina.ca/mod/wiki/view.php?pageid='

  module_function

  def coerce_date(v)
    return v if v.is_a?(Date)
    s = v.to_s.strip
    [->(x) { Date.strptime(x, '%Y-%m-%d') },
     ->(x) { Date.strptime(x, '%d-%b-%y') }].each do |p|
      begin; return p.call(s); rescue ArgumentError; end
    end
    raise "meeting_page_generator: unparseable date #{v.inspect}"
  end

  # Candidate key spellings for each semester field. Your migrated
  # semesters.yml may use any of these; the first present (non-nil) wins.
  # Once you settle on one spelling, you can trim these to the single key.
  SEM_KEYS = {
    start:    %w[term-start term_start start first-day],
    finish:   %w[class-end  class_end  end  last-day classes-end],
    no_class: %w[no-class-days no_class_days no-class holidays]
  }.freeze

  # First non-nil value among the given keys.
  def dig_first(hash, keys)
    keys.each { |k| v = hash[k]; return v unless v.nil? }
    nil
  end

  def to_days(mdays)
    list = mdays.is_a?(Array) ? mdays : mdays.to_s.split(',')
    list.map { |d| WDAY.fetch(d.to_s.strip) }.to_set
  end

  # A no-class-day may be authored as a bare date/string OR as a hash
  # like { "date" => <Date>, "label" => "Reading Week" }. Normalize to a Date.
  def nc_date(entry)
    entry = (entry['date'] || entry[:date]) if entry.is_a?(Hash)
    coerce_date(entry)
  end

  # Field names to look for as a meeting\'s explicit number in plan.yml.
  # Trim to your single real key once confirmed.
  MEETING_NUM_KEYS = %w[meeting number num n mtg].freeze

  def meeting_number(item)
    MEETING_NUM_KEYS.each { |k| v = item[k]; return v.to_i unless v.nil? }
    nil
  end

  # plan.yml authors `meetings:` as a sequence of explicitly-numbered
  # mappings (also accepts a number-keyed mapping). Normalize to a Hash
  # keyed by Integer meeting number. Meetings are keyed by their authored
  # number, never by position, so order and gaps in the list don\'t matter.
  # An entry with no recognizable number is a build error, not a guess.
  def index_meetings(raw)
    case raw
    when Hash
      raw.each_with_object({}) { |(k, v), h| h[k.to_i] = v }
    when Array
      raw.each_with_object({}) do |e, h|
        unless e.is_a?(Hash)
          raise "meetings: plan.yml meeting entry is not a mapping: #{e.inspect}"
        end
        num = meeting_number(e)
        if num.nil?
          raise "meetings: plan.yml meeting entry has no number " \
                "(looked for #{MEETING_NUM_KEYS.inspect}); " \
                "keys present: #{e.keys.inspect}; entry: #{e.inspect}"
        end
        h[num] = e
      end
    else
      {}
    end
  end

  # Monday of term_start's week (weeks start Monday).
  def first_monday(term_start)
    ts = coerce_date(term_start)
    ts - ((ts.wday + 6) % 7)
  end

  # The pure function. Returns an ordered Array<Date>.
  def meeting_dates(term_start, class_end, mdays, no_class)
    wanted = to_days(mdays)
    skip   = Array(no_class).map { |e| nc_date(e) }.to_set
    (coerce_date(term_start)..coerce_date(class_end)).select do |d|
      wanted.include?(d.wday) && !skip.include?(d)
    end
  end
end

class MeetingPage < Jekyll::PageWithoutAFile
  def initialize(site, base, dir, fields)
    super(site, base, dir, "#{fields['slug'] || fields['meeting']}.html")
    self.content = ''
    data.merge!(fields)
    data['layout'] ||= 'meeting'
  end
end

class MeetingPageGenerator < Jekyll::Generator
  safe true
  priority :normal

  # Slug prefix for generated meeting pages. Change here to change the
  # convention everywhere at once (URL becomes /.../<PREFIX>NN/).
  MEETING_SLUG = 'Mtg'

  def generate(site)
    teaching = site.data.dig('teaching')
    return unless teaching.is_a?(Hash)

    semesters = Array(teaching.dig('all', 'semesters'))

    teaching.each do |course, sems|
      next if course == 'all'
      next unless sems.is_a?(Hash)

      sems.each do |sem, node|
        next unless node.is_a?(Hash)
        offering = node['offering']
        next unless offering.is_a?(Hash) && offering['mdays']

        semrec = semesters.find { |r| r['semester'].to_s == sem.to_s }
        unless semrec
          Jekyll.logger.warn 'meetings:',
            "no semester record for #{course}/#{sem}; skipping"
          next
        end

        term_start = Teaching.dig_first(semrec, Teaching::SEM_KEYS[:start])
        class_end  = Teaching.dig_first(semrec, Teaching::SEM_KEYS[:finish])
        no_class   = Teaching.dig_first(semrec, Teaching::SEM_KEYS[:no_class])

        if term_start.nil? || class_end.nil?
          raise "meetings: #{course}/#{sem}: could not resolve " \
                "term-start/class-end. Record keys present: " \
                "#{semrec.keys.inspect}; record: #{semrec.inspect}"
        end

        dates = Teaching.meeting_dates(
          term_start, class_end, offering['mdays'], no_class)

        total   = dates.size
        fmon    = Teaching.first_monday(term_start)
        totwks  = dates.empty? ? 0 : (((dates.last - fmon).to_i / 7) + 1)

        expected = offering['expected_meetings']
        if expected && expected.to_i != total
          Jekyll.logger.warn 'meetings:',
            "#{course}/#{sem}: expected #{expected} meetings, computed #{total}"
        else
          Jekyll.logger.info 'meetings:', "#{course}/#{sem}: #{total} meetings"
        end

        authored = Teaching.index_meetings(node.dig('plan', 'meetings'))
        dir      = File.join('teaching', course.to_s, sem.to_s)

        dates.each_with_index do |d, i|
          n     = i + 1
          nn    = format('%02d', n)
          slug  = "#{MEETING_SLUG}#{nn}"
          week  = ((d - fmon).to_i / 7) + 1
          entry = authored[n]
          entry = {} unless entry.is_a?(Hash)
          wid   = entry['wikipage_id']
          topic = entry['topic']

          site.pages << MeetingPage.new(site, site.source, dir,
            'meeting'     => nn,
            'slug'        => slug,
            'permalink'   => "/teaching/#{course}/#{sem}/#{slug}/",
            'course'      => course.to_s,
            'semester'    => sem.to_s,
            'date'        => d.iso8601,
            'weekday'     => d.strftime('%a'),
            'week'        => week,
            'week_of'     => (fmon + (week - 1) * 7).iso8601,
            'total_mtgs'  => total,
            'total_wks'   => totwks,
            'topic'       => topic,
            'wikipage_id' => wid,
            'wiki_url'    => (wid ? "#{Teaching::WIKI_BASE}#{wid}" : nil),
            # display name: authored topic if present, else the date.
            'title'       => (topic || "Meeting #{nn} — #{d.strftime('%a %d %b %Y')}"))
        end
      end
    end
  end
end