# _plugins/meeting_page_generator.rb
#
# Generates one rendered page per class meeting for every offering, at:
#   /teaching/<course>/<semester>/MtgNN/      (NN = zero-padded meeting number)
# Each page links out to its Moodle wiki page IF (and only if) a wikipage_id
# is authored for that meeting in plan.yml. Presence is derived from data:
# no wikipage_id -> no wiki link. Nothing dangling can ship.
#
# STABLE IDENTITY: the meeting NUMBER is the URL. The display NAME is the
# authored `theme` and may change freely without moving the page. An explicit
# permalink is set so the URL never drifts with global permalink config.
#
# Meeting DATES are a pure function of the semester calendar + the offering's
# meeting days, now owned by lib/meeting_calendar.rb and SHARED with the
# semester-schedule overlay so the two never recompute the calendar differently.

require 'date'
require 'set'
require_relative '../lib/meeting_calendar'

module Teaching
  WIKI_BASE = 'https://urcourses.uregina.ca/mod/wiki/view.php?pageid='

  module_function

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

  # Field names to look for as a meeting's explicit number in plan.yml.
  # Trim to your single real key once confirmed.
  MEETING_NUM_KEYS = %w[meeting number num n mtg].freeze

  def meeting_number(item)
    MEETING_NUM_KEYS.each { |k| v = item[k]; return v.to_i unless v.nil? }
    nil
  end

  # plan.yml authors `meetings:` as a sequence of explicitly-numbered
  # mappings (also accepts a number-keyed mapping). Normalize to a Hash
  # keyed by Integer meeting number. Meetings are keyed by their authored
  # number, never by position, so order and gaps in the list don't matter.
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

        dates = MeetingCalendar.meeting_dates(
          term_start, class_end, offering['mdays'], no_class)

        total   = dates.size
        fmon    = MeetingCalendar.first_monday(term_start)
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
          # authored display name: plan.yml uses `theme` (accept legacy `topic`).
          theme = entry['theme'] || entry['topic']

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
            'theme'       => theme,
            'topic'       => theme,   # keep `topic` populated for any template still reading it
            'wikipage_id' => wid,
            'wiki_url'    => (wid ? "#{Teaching::WIKI_BASE}#{wid}" : nil),
            # display name: authored theme if present, else the date.
            'title'       => (theme || "Meeting #{nn} — #{d.strftime('%a %d %b %Y')}"))
        end
      end
    end
  end
end