# frozen_string_literal: true
#
# lib/wiki_start_generator.rb
#
# Generates _wiki_starts/<crs_id>/<crs_sem>/<id>.creole files from that
# offering's plan.yml `wiki_starts:` section, resolving each entry's date
# against the offering's existing meetings.yml (same data source
# MeetingGridGenerator already uses) and composing a Moodle wiki link
# from a bare activity id.
#
# Safe to re-run: if a previously-generated file has been hand-edited
# since generation (checksum mismatch), it's skipped with a warning
# rather than overwritten — pass force: true to regenerate anyway.

require 'yaml'
require 'erb'
require 'digest'
require 'fileutils'

class WikiStartGenerator
  # GUESS — confirm this against a real Moodle wiki activity URL before
  # relying on it. Adjust the course id (?id=NNN) portion if your Moodle
  # instance uses a different course-vs-activity id scheme.
  MOODLE_WIKI_URL_PATTERN = 'https://urcourses.uregina.ca/mod/wiki/view.php?id=%<id>s'

  def initialize(teaching_data_dir: '_data/teaching',
                 templates_dir: '_wiki_start_templates',
                 output_dir: '_wiki_starts')
    @teaching_data_dir = teaching_data_dir
    @templates_dir = templates_dir
    @output_dir = output_dir
  end

  # Returns a summary Hash: { written: [...], skipped: [...], errors: [...] }
  def generate_for(crs_id, crs_sem, force: false)
    plan = load_plan(crs_id, crs_sem)
    meetings = load_meetings(crs_id, crs_sem)

    result = { written: [], skipped: [], errors: [] }

    (plan['wiki_starts'] || []).each do |entry|
      generate_one(crs_id, crs_sem, entry, meetings, force: force, result: result)
    end

    result
  end

  private

  def load_plan(crs_id, crs_sem)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'plan.yml')
    raise "No plan.yml found at #{path}" unless File.exist?(path)

    YAML.load_file(path) || {}
  end

  def load_meetings(crs_id, crs_sem)
    path = File.join(@teaching_data_dir, crs_id, crs_sem, 'meetings.yml')
    raise "No meetings.yml found at #{path}" unless File.exist?(path)

    (YAML.load_file(path) || []).each_with_object({}) do |mtg, h|
      h[mtg['meeting']] = mtg['date']
    end
  end

  def generate_one(crs_id, crs_sem, entry, meetings, force:, result:)
    label = "#{crs_id}/#{crs_sem}/#{entry['id']}"

    date = meetings[entry['meeting']]
    unless date
      result[:errors] << "#{label}: no meeting ##{entry['meeting'].inspect} in meetings.yml"
      return
    end

    template_path = File.join(@templates_dir, "#{entry['template']}.creole.erb")
    unless File.exist?(template_path)
      result[:errors] << "#{label}: template not found at #{template_path}"
      return
    end

    moodle_url = format(MOODLE_WIKI_URL_PATTERN, id: entry['moodle_wiki_id'])
    body = render_template(template_path, title: entry['title'], date: date,
                                           moodle_url: moodle_url, course: crs_id, semester: crs_sem)
    checksum = Digest::SHA256.hexdigest(body)

    out_path = File.join(@output_dir, crs_id, crs_sem, "#{entry['id']}.creole")

    if File.exist?(out_path) && !force
      existing_checksum = existing_generated_checksum(out_path)
      current_body_checksum = Digest::SHA256.hexdigest(strip_front_matter(File.read(out_path, encoding: 'UTF-8')))
      if existing_checksum && existing_checksum != current_body_checksum
        result[:skipped] << "#{label}: hand-edited since last generation — not overwriting " \
                             "(pass force: true to regenerate anyway)"
        return
      end
    end

    write_file(out_path, entry, body, checksum, crs_id, crs_sem)
    result[:written] << label
  end

  def render_template(path, locals)
    erb = ERB.new(File.read(path, encoding: 'UTF-8'), trim_mode: '-')
    erb.result(binding_with_locals(locals))
  end

  # Gives the ERB template access to `title`, `date`, `moodle_url`, etc.
  # as plain local variables, e.g. `<%= title %>`.
  def binding_with_locals(locals)
    b = binding
    locals.each { |k, v| b.local_variable_set(k, v) }
    b
  end

  def existing_generated_checksum(path)
    match = File.read(path, encoding: 'UTF-8').match(/\A---\s*\n(.*?)\n---\s*\n/m)
    return nil unless match

    front_matter = YAML.safe_load(match[1]) || {}
    front_matter['generated_checksum']
  end

  def strip_front_matter(raw)
    raw.sub(/\A---\s*\n.*?\n---\s*\n/m, '')
  end

  def write_file(path, entry, body, checksum, crs_id, crs_sem)
    FileUtils.mkdir_p(File.dirname(path))
    front_matter = {
      'title' => entry['title'],
      'course' => crs_id,
      'semester' => crs_sem,
      'layout' => 'wiki_start',
      'generated' => true,
      'generated_from' => entry['id'],
      'generated_checksum' => checksum,
    }
    File.write(path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, '')}---\n#{body}")
  end
end
