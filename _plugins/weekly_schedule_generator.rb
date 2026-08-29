# frozen_string_literal: true
#
# _plugins/weekly_schedule_generator.rb
#
# Builds the per-offering "Weekly Schedule (Tentative)" table by OVERLAYING an
# offering's meetings + authored topics onto the SEMESTER-OWNED week grid.
# Nothing here recomputes the calendar: the weeks come from the semester
# (SemesterData.derive! -> weeks[]), the meeting dates come from the shared
# lib/meeting_calendar.rb, and the text comes from plan.yml. The result is
# written to a DERIVED key (node['wklysched']) — never into the authored
# plan hash — so plan.yml stays sacred.
#
# Per week the row is:
#   Meetings      -> this offering's meetings that week (linked to their Mtg pages)
#   Topics        -> plan.weekly[week].heading if present, else the meetings' themes
#   Items of Note -> the semester's events for that week + plan.weekly[week].note
#
# reuse-with-optional-override: meeting `theme`s are reused by default; a
# plan.yml `weekly:` entry can override the heading and/or add a note per week.
#
# Runs :low so SemesterData::Generator (:high) has already injected weeks[].

require 'date'
require_relative '../lib/meeting_calendar'

class WeeklyScheduleGenerator < Jekyll::Generator
  safe true
  priority :low

  MEETING_SLUG = 'Mtg'

  def generate(site)
    teaching = site.data['teaching']
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
        next unless semrec
        weeks = Array(semrec['weeks'])
        next if weeks.empty? # semester not enriched (weeks[]) -> nothing to overlay

        term_start = semrec['term_start']
        class_end  = semrec['class_end']
        next if term_start.nil? || class_end.nil?

        # This offering's meetings, grouped by week number. Meeting numbering and
        # week numbers use the SAME MeetingCalendar the Mtg pages use, so the
        # links below hit real pages and the weeks align with the meeting pages.
        dates    = MeetingCalendar.meeting_dates(
                     term_start, class_end, offering['mdays'], semrec['no_class_days'])
        themes   = theme_by_meeting(node)          # meeting number -> theme text
        overrides = weekly_overrides(node)         # week number   -> { heading, note }

        mtgs_by_week = Hash.new { |h, k| h[k] = [] }
        dates.each_with_index do |d, i|
          n  = i + 1
          nn = format('%02d', n)
          wk = MeetingCalendar.week_number(d, term_start)
          mtgs_by_week[wk] << {
            'num'   => nn,
            'slug'  => "#{MEETING_SLUG}#{nn}",
            'url'   => "/teaching/#{course}/#{sem}/#{MEETING_SLUG}#{nn}/",
            'theme' => themes[n],
            'date'  => d.iso8601,
            'weekday' => d.strftime('%a')
          }
        end

        node['wklysched'] = weeks.map do |wk|
          n     = wk['week']
          mtgs  = mtgs_by_week[n]
          over  = overrides[n] || {}

          used_themes = mtgs.map { |m| m['theme'] }
                            .compact.map(&:to_s).reject(&:empty?).uniq
          topics = present(over['heading']) || used_themes.join('; ')

          notes = Array(wk['events']).map { |e| event_label(e) } + [over['note']]
          noteworth = notes.compact.map(&:to_s).reject { |s| s.strip.empty? }.uniq.join('; ')

          {
            'week'      => n,
            'weekof'    => wk['weekof'],
            'mtgs'      => mtgs,
            'topics'    => topics,
            'noteworth' => noteworth
          }
        end
      end
    end
  end

  private

  def present(v) = (v.nil? || v.to_s.strip.empty?) ? nil : v

  # plan.yml meetings is already validated by MeetingPageGenerator; here we only
  # read it, tolerantly, into number -> theme. (theme is the authored key;
  # accept legacy topic.)
  def theme_by_meeting(node)
    Array(node.dig('plan', 'meetings')).each_with_object({}) do |e, h|
      next unless e.is_a?(Hash)
      num = e['meeting'] || e['number'] || e['num'] || e['n'] || e['mtg']
      h[num.to_i] = (e['theme'] || e['topic']) if num
    end
  end

  # Optional plan.yml weekly: overrides, into week number -> { heading, note }.
  def weekly_overrides(node)
    Array(node.dig('plan', 'weekly')).each_with_object({}) do |e, h|
      next unless e.is_a?(Hash)
      wk = e['week'] || e['wk']
      h[wk.to_i] = e if wk
    end
  end

  # A semester event -> caption. Labelled (Fall Reading Week) or, for the older
  # unlabelled terms, "No class (Oct 8)".
  def event_label(e)
    return e.to_s unless e.is_a?(Hash)
    e['label'] || "No class (#{MeetingCalendar.coerce_date(e['date']).strftime('%b %-d')})"
  end
end