# frozen_string_literal: true
#
# lib/meeting_calendar.rb
#
# The single home for meeting-date math: given a term's dates and an offering's
# meeting days, produce the ordered class-meeting dates and their week numbers.
# Extracted from the Teaching module in _plugins/meeting_page_generator.rb so
# that generator AND the semester-schedule overlay share ONE computation rather
# than each walking the calendar independently.
#
# Pure functions on primitives (dates + a day list). No Jekyll, no site.data —
# so it is usable offline (Rake, specs) exactly like SemesterData.
#
# The Monday anchor (first_monday) and week formula are identical to what the
# generator emitted before, and to SemesterData.weeks_for, so a meeting's
# `week` and a semester `weeks[].weekof` always agree.

require 'date'
require 'set'

module MeetingCalendar
  WDAY = { 'Sun' => 0, 'Mon' => 1, 'Tue' => 2, 'Wed' => 3,
           'Thu' => 4, 'Fri' => 5, 'Sat' => 6 }.freeze

  module_function

  def coerce_date(v)
    return v if v.is_a?(Date)
    s = v.to_s.strip
    [->(x) { Date.strptime(x, '%Y-%m-%d') },
     ->(x) { Date.strptime(x, '%d-%b-%y') }].each do |p|
      begin; return p.call(s); rescue ArgumentError; end
    end
    raise "MeetingCalendar: unparseable date #{v.inspect}"
  end

  # Monday of term_start's week (weeks start Monday). wday: Sun=0..Sat=6.
  def first_monday(term_start)
    ts = coerce_date(term_start)
    ts - ((ts.wday + 6) % 7)
  end

  # mdays as [Tue, Thu] or "Tue,Thu" -> Set of wday integers.
  def to_days(mdays)
    list = mdays.is_a?(Array) ? mdays : mdays.to_s.split(',')
    list.map { |d| WDAY.fetch(d.to_s.strip) }.to_set
  end

  # no_class_days as [{date:,label:}] or [Date] or ["2026-..."] -> Set of Dates.
  def no_class_dates(no_class_days)
    Array(no_class_days).map { |e|
      e = (e['date'] || e[:date]) if e.is_a?(Hash)
      coerce_date(e)
    }.to_set
  end

  # The pure function. Ordered Array<Date> of actual class meetings.
  def meeting_dates(term_start, class_end, mdays, no_class_days)
    wanted = to_days(mdays)
    skip   = no_class_dates(no_class_days)
    (coerce_date(term_start)..coerce_date(class_end)).select do |d|
      wanted.include?(d.wday) && !skip.include?(d)
    end
  end

  # 1-based week number of a date within the term (Monday-anchored).
  def week_number(date, term_start)
    ((coerce_date(date) - first_monday(term_start)).to_i / 7) + 1
  end
end