# frozen_string_literal: true
#
# _plugins/offering_ics_generator.rb
#
# Publishes one iCalendar file per offering at
#   /teaching/<course>/<semester>/meetings.ics
# with a VEVENT for each class meeting AND the final exam. Replaces the hand-run
# 5_generate-ics.py: meeting dates come from the shared lib/meeting_calendar.rb
# (single source), times/exam from offering.yml, written at build time so it
# always ships in sync.
#
# Times are emitted in UTC (…Z). Regina is UTC-6 year-round (no DST), so the
# conversion is a fixed +6h and needs no VTIMEZONE. The file is written with
# File.binwrite in a :post_write hook so RFC 5545 CRLF/folding survive exactly.
#
# FINAL EXAM (offering.yml). Two accepted forms:
#   final_exam:                         # structured (precise) — preferred
#     date:  2026-04-16
#     start: "14:00"
#     end:   "17:00"
#     location: ED-106                  # optional; defaults to offering location
#   final_exam: "Thu, Apr 16, 2026 @ 14:00"   # legacy display string — start is
#                                             # parsed; end defaults to +3h and is
#                                             # logged. Add `end` for exactness.

require 'date'
require 'time'
require 'fileutils'
require_relative '../lib/meeting_calendar'

module OfferingIcs
  PRODID   = '-//D. H. Hepting//teaching//EN'
  TIMES_RE = /\A\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*\z/
  DEFAULT_EXAM_HOURS = 3 # U of R standard; used only when no end is authored

  module_function

  def esc(t)
    t.to_s.gsub(/([\\,;])/) { "\\#{Regexp.last_match(1)}" }.gsub("\n", '\\n')
  end

  def fold(line)
    return line if line.bytesize <= 75
    first, rest = take_bytes(line, 75)
    out = +first
    until rest.empty?
      chunk, rest = take_bytes(rest, 74)
      out << "\r\n " << chunk
    end
    out
  end

  def take_bytes(str, n)
    taken = +''
    str.each_char do |ch|
      break if taken.bytesize + ch.bytesize > n
      taken << ch
    end
    [taken, str[taken.length..] || '']
  end

  # A wall-clock time on <date> in Regina (-06:00).
  def regina_time(date, hhmm)
    h, m = hhmm.to_s.split(':').map(&:to_i)
    Time.new(date.year, date.month, date.day, h, m, 0, '-06:00')
  end

  def zstamp(time)      = time.getutc.strftime('%Y%m%dT%H%M%SZ')
  def utc_stamp(d, hhmm) = zstamp(regina_time(d, hhmm))
  def date_stamp(date)  = date.strftime('%Y%m%d')

  def vevent(uid:, dtstamp:, dtstart:, dtend:, summary:, location:, all_day:)
    lines = ['BEGIN:VEVENT', "UID:#{uid}", "DTSTAMP:#{dtstamp}"]
    if all_day
      lines << "DTSTART;VALUE=DATE:#{dtstart}" << "DTEND;VALUE=DATE:#{dtend}"
    else
      lines << "DTSTART:#{dtstart}" << "DTEND:#{dtend}"
    end
    lines << "SUMMARY:#{esc(summary)}"
    lines << "LOCATION:#{esc(location)}" unless location.to_s.strip.empty?
    lines << 'END:VEVENT'
    lines
  end

  def calendar(event_groups)
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:#{PRODID}",
             'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
    event_groups.each { |ev| lines.concat(ev) }
    lines << 'END:VCALENDAR'
    lines.map { |l| fold(l) }.join("\r\n") + "\r\n"
  end

  def theme_by_meeting(node)
    Array(node.dig('plan', 'meetings')).each_with_object({}) do |e, h|
      next unless e.is_a?(Hash)
      num = e['meeting'] || e['number'] || e['num'] || e['n'] || e['mtg']
      h[num.to_i] = (e['theme'] || e['topic']) if num
    end
  end

  # Resolve final_exam (structured hash or legacy string) to
  # [date, start_hhmm, end_hhmm_or_nil, location_or_nil], or nil if unusable.
  def exam_fields(final_exam)
    case final_exam
    when Hash
      return nil unless final_exam['date'] && final_exam['start']
      [MeetingCalendar.coerce_date(final_exam['date']),
       final_exam['start'].to_s, (final_exam['end'] && final_exam['end'].to_s),
       (final_exam['location'].to_s.strip.empty? ? nil : final_exam['location'].to_s)]
    when String
      s = final_exam.gsub('@', ' ')
      dt = begin DateTime.parse(s) rescue nil end
      return nil unless dt
      [Date.new(dt.year, dt.month, dt.day), format('%02d:%02d', dt.hour, dt.min), nil, nil]
    end
  end

  # -> [vevent_lines, assumed_default_end?] or nil
  def exam_event(course, off_id, offering)
    fields = exam_fields(offering['final_exam'])
    return nil unless fields
    date, st, et, exam_loc = fields
    start_t   = regina_time(date, st)
    assumed   = et.nil?
    end_t     = assumed ? start_t + DEFAULT_EXAM_HOURS * 3600 : regina_time(date, et)
    location  = exam_loc || offering['location'].to_s
    ev = vevent(uid: "#{off_id}-final@www2.cs.uregina.ca",
                dtstamp: zstamp(start_t), dtstart: zstamp(start_t), dtend: zstamp(end_t),
                summary: "#{course} \u2014 Final Exam", location: location, all_day: false)
    [ev, assumed]
  end

  # Build the whole .ics for one offering. Returns [ics_string, notes].
  def ics_for(course, sem, semrec, offering, node)
    dates = MeetingCalendar.meeting_dates(
      semrec['term_start'], semrec['class_end'], offering['mdays'], semrec['no_class_days'])

    notes  = []
    themes = theme_by_meeting(node)
    off_id = "#{course}-#{sem}"
    location = offering['location'].to_s
    location = offering['zoom_url'].to_s if location.casecmp('remote').zero? && offering['zoom_url']
    m      = TIMES_RE.match(offering['times'].to_s)
    st, et = m ? [m[1], m[2]] : [nil, nil]

    groups = dates.each_with_index.map do |d, i|
      n  = i + 1
      nn = format('%02d', n)
      uid = "#{off_id}-#{nn}@www2.cs.uregina.ca"
      theme = themes[n].to_s.strip
      summary = theme.empty? ? "#{course} \u2014 Meeting #{nn}" : "#{course} #{nn}: #{theme}"
      if st
        vevent(uid: uid, dtstamp: utc_stamp(d, st), dtstart: utc_stamp(d, st),
               dtend: utc_stamp(d, et), summary: summary, location: location, all_day: false)
      else
        vevent(uid: uid, dtstamp: "#{date_stamp(d)}T000000Z", dtstart: date_stamp(d),
               dtend: date_stamp(d + 1), summary: summary, location: location, all_day: true)
      end
    end

    if (exam = exam_event(course, off_id, offering))
      ev, assumed = exam
      groups << ev
      notes << "#{course}/#{sem}: final-exam end defaulted to +#{DEFAULT_EXAM_HOURS}h " \
               "(add final_exam.end for the exact time)" if assumed
    end

    return nil if groups.empty?
    [calendar(groups), notes]
  end
end

Jekyll::Hooks.register(:site, :post_write) do |site|
  teaching = site.data['teaching']
  next unless teaching.is_a?(Hash)
  semesters = Array(teaching.dig('all', 'semesters'))

  teaching.each do |course, sems|
    next if course == 'all'
    next unless sems.is_a?(Hash)
    sems.each do |sem, node|
      next unless node.is_a?(Hash)
      offering = node['offering']
      next unless offering.is_a?(Hash) && offering['mdays']
      semrec = semesters.find { |r| r['semester'].to_s == sem.to_s }
      next unless semrec && semrec['term_start'] && semrec['class_end']

      result = OfferingIcs.ics_for(course.to_s, sem.to_s, semrec, offering, node)
      next unless result
      ics, notes = result

      path = File.join(site.dest, 'teaching', course.to_s, sem.to_s, 'meetings.ics')
      FileUtils.mkdir_p(File.dirname(path))
      File.binwrite(path, ics)
      notes.each { |n| Jekyll.logger.info 'ics:', n }
      Jekyll.logger.info 'ics:', "wrote teaching/#{course}/#{sem}/meetings.ics"
    end
  end
end