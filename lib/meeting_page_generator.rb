# frozen_string_literal: true
#
# lib/meeting_page_generator.rb
#
# Same two-file pattern as WikiStartGenerator, applied to regular class
# meeting pages instead of special wiki-start pages:
#   1. Generated fields (weekday, prev/next links, wiki-editor link,
#      attendance/calendar/groupblog links) -> a data file, fully
#      overwritten every run.
#   2. The hand-authored body (Outline for Today, For Next Meeting,
#      Resources, Raw Transcript, Photos, Commentary, Fair Exam
#      Questions) -> created once per meeting, then left alone.
#
# Built from real CS-280/202610 files (meetings.csv, tstplan.yml,
# blankmtg.txt, 22_Thu-26-Mar-2026.txt, linked-meetings): the
# Administration block's attendance/calendar/wiki-editor/group-blog
# lines have zero meeting-specific content beyond the date and are
# always mechanically derivable — so they belong on the generated side,
# not duplicated by hand into every single meeting file the way
# tstplan.yml currently does it.
#
# NOTE on `theme`: in the one real plan.yml-shaped file we've seen
# (tstplan.yml), `theme` was blank for every meeting except one that had
# already happened — suggesting it may genuinely not be known until
# close to the meeting, rather than always available in advance. This
# generator treats a missing theme as blank (matching blankmtg.txt),
# not as an error.

require 'yaml'
require 'erb'
require 'fileutils'
require 'date'

class MeetingPageGenerator
  def initialize(teaching_data_dir: '_data/teaching',
                 templates_dir: '_meeting_page_templates',
                 output_dir: '_meeting_pages')
    @teaching_data_dir = teaching_data_dir
    @templates_dir = templates_dir
    @output_dir = output_dir
  end

  # Returns { created: [...], updated_data: bool, skipped: [...], errors: [...] }
  def generate_for(crs_id, crs_sem, template: 'default', force: false)
    offering = load_offering(crs_id, crs_sem)
    meetings = load_meetings(crs_id, crs_sem)
    themes = load_themes(crs_id, crs_sem)

    result = { created: [], skipped: [], errors: [] }
    generated_data = {}

    meetings.each_with_index do |mtg, i|
      label = "#{crs_id}/#{crs_sem}/mtg#{mtg['meeting']}"
      begin
        fields = build_generated_fields(offering, meetings, i, themes)
      rescue StandardError => e
        result[:errors] << "#{label}: #{e.message}"
        next
      end

      generated_data[mtg['meeting']] = fields
      create_hand_authored_file(crs_id, crs_sem, mtg, template: template, force: force, label: label, result: result)
    end

    write_generated_data(crs_id, crs_sem, generated_data)
    result[:updated_data] = true
    result
  end

  private

  def load_offering(crs_id, crs_sem)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'offering.yml')
    raise "No offering.yml found at #{path}" unless File.exist?(path)

    YAML.load_file(path) || {}
  end

  def load_meetings(crs_id, crs_sem)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'meetings.yml')
    raise "No meetings.yml found at #{path}" unless File.exist?(path)

    (YAML.load_file(path) || []).sort_by { |m| m['meeting'] }
  end

  def load_themes(crs_id, crs_sem)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'plan.yml')
    return {} unless File.exist?(path)

    plan = YAML.load_file(path) || {}
    (plan['meetings'] || []).each_with_object({}) { |m, h| h[m['meeting']] = m['theme'] }
  end

  def parse_date(date_str)
    Date.strptime(date_str, '%a-%d-%b-%Y')
  end

  # Regina, Saskatchewan does not observe daylight saving time — it's a
  # fixed -06:00 offset year-round. Using Date#to_time here would pick up
  # whatever timezone the machine running this happens to be set to
  # (this sandbox, your Mac, a GitHub Actions runner — all different),
  # silently producing wrong calendar links depending on where it runs.
  def regina_timestamp(date)
    Time.new(date.year, date.month, date.day, 0, 0, 0, '-06:00').to_i
  end

  def build_generated_fields(offering, meetings, index, themes)
    mtg = meetings[index]
    date = parse_date(mtg['date'])

    {
      'meeting' => mtg['meeting'],
      'date' => mtg['date'],
      'weekday' => date.strftime('%A'),
      'theme' => themes[mtg['meeting']],
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

  def write_generated_data(crs_id, crs_sem, generated_data)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'meeting_pages_generated.yml')
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, generated_data.to_yaml)
  end

  def create_hand_authored_file(crs_id, crs_sem, mtg, template:, force:, label:, result:)
    slug = MeetingPageFields.meeting_slug(mtg)
    out_path = File.join(@output_dir, crs_id, crs_sem, "#{slug}.creole")

    if File.exist?(out_path) && !force
      result[:skipped] << "#{label}: already exists — hand-authored content left untouched"
      return
    end

    template_path = File.join(@templates_dir, "#{template}.creole.erb")
    unless File.exist?(template_path)
      result[:errors] << "#{label}: template not found at #{template_path}"
      return
    end

    body = ERB.new(File.read(template_path, encoding: 'UTF-8'), trim_mode: '-').result(binding)
    front_matter = {
      'layout' => 'meeting_page',
      'course' => crs_id,
      'semester' => crs_sem,
      'generated_from' => mtg['meeting'],
    }

    FileUtils.mkdir_p(File.dirname(out_path))
    File.write(out_path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, '')}---\n#{body}")
    result[:created] << label
  end
end
