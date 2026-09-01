# _plugins/meeting_page_generator.rb
#
# Generates one rendered page per class meeting for every offering, at:
#   /teaching/<course>/<semester>/MtgNN/      (NN = zero-padded meeting number)
# Each page links out to its Moodle wiki page IF (and only if) a wikipage_id
# is authored for that meeting in plan.yml. Presence is derived from data:
# no wikipage_id -> no wiki link. Nothing dangling can ship.
#
# STABLE IDENTITY: the meeting NUMBER is the URL. The display NAME is the
# authored `theme` and may change freely without moving the page.
#
# TLO/BOK: if a meeting authors a `BOK:` block in plan.yml, it is resolved here
# (via the shared TLOResolver) into covered-only render rows and handed to the
# page as `bok`, so _layouts/meeting.html can show this meeting's slice of the
# Body of Knowledge. Resolution is the SAME engine the offering section uses.

require 'date'
require 'set'
require_relative '../lib/meeting_calendar'
require_relative '../lib/tlo_resolver'

module Teaching
  WIKI_BASE = 'https://urcourses.uregina.ca/mod/wiki/view.php?pageid='

  module_function

  SEM_KEYS = {
    start:    %w[term-start term_start start first-day],
    finish:   %w[class-end  class_end  end  last-day classes-end],
    no_class: %w[no-class-days no_class_days no-class holidays]
  }.freeze

  def dig_first(hash, keys)
    keys.each { |k| v = hash[k]; return v unless v.nil? }
    nil
  end

  MEETING_NUM_KEYS = %w[meeting number num n mtg].freeze

  def meeting_number(item)
    MEETING_NUM_KEYS.each { |k| v = item[k]; return v.to_i unless v.nil? }
    nil
  end

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

        # Canonical lookup for BOK resolution: the offering's standard scopes
        # which curriculum to read from the shared `all` namespace.
        std    = node.dig('tlo', 'standard')
        std_curr = std && site.data.dig('teaching', 'all', 'curricula', std)
        bok_lookup = ->(ka, ku) { std_curr && std_curr.dig(ka, ku) }

        dates.each_with_index do |d, i|
          n     = i + 1
          nn    = format('%02d', n)
          slug  = "#{MEETING_SLUG}#{nn}"
          week  = ((d - fmon).to_i / 7) + 1
          entry = authored[n]
          entry = {} unless entry.is_a?(Hash)
          wid   = entry['wikipage_id']
          theme = entry['theme'] || entry['topic']

          bok = nil
          if entry['BOK'] && !entry['BOK'].empty?
            if std_curr.nil?
              raise "meetings: #{course}/#{sem} Mtg #{nn} authors BOK but the " \
                    "offering has no tlo.yml `standard` / curricula to resolve against"
            end
            bok = TLOResolver.resolve_meeting_bok(entry['BOK'], &bok_lookup)
          end

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
            'topic'       => theme,
            'bok'         => bok,
            'wikipage_id' => wid,
            'wiki_url'    => (wid ? "#{Teaching::WIKI_BASE}#{wid}" : nil),
            'title'       => (theme || "Meeting #{nn} — #{d.strftime('%a %d %b %Y')}"))
        end
      end
    end
  end
end