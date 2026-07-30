# frozen_string_literal: true
#
# lib/meeting_photos_page_generator.rb
#
# Writes a SEPARATE .creole page per meeting-with-photos, so updating
# photos never touches the main meeting page once it's been pasted into
# Moodle and students have started editing it collaboratively.
#
# Unlike the main meeting page's hand-authored stub (created once, then
# never touched), this file has NO hand-authored content at all — it's
# purely generated from media.csv — so it's always safe to overwrite in
# full, every run, no drift-detection needed.
#
# Runs as a Rake prerequisite of :build (not a _plugins/ Jekyll::Generator)
# because the resulting file needs to exist on disk BEFORE Jekyll scans
# collections — a file written during a Generator's in-memory pass
# wouldn't be picked up as a page until the *next* build.
#
# Skips meetings with no photos yet — the page's mere existence signals
# "photos are available", rather than shipping a page with an empty gallery.

require 'yaml'
require 'fileutils'
require_relative 'meeting_page_fields'

class MeetingPhotosPageGenerator
  def initialize(teaching_data_dir: '_data/teaching', output_dir: '_meeting_pages')
    @teaching_data_dir = teaching_data_dir
    @output_dir = output_dir
  end

  # Scans every offering under teaching_data_dir, same as
  # MeetingPagesDataGenerator. Returns { written: [...], errors: [...] }
  def generate_all
    result = { written: [], errors: [] }

    Dir.glob(File.join(@teaching_data_dir, '*', '*', 'meetings.yml')).each do |meetings_path|
      offering_dir = File.dirname(meetings_path)
      crs_sem = File.basename(offering_dir)
      crs_id = File.basename(File.dirname(offering_dir))

      offering = load_yaml(File.join(offering_dir, 'offering.yml'))
      next if offering.nil?

      meetings = (load_yaml(meetings_path) || []).sort_by { |m| m['meeting'] }
      valid_meetings = meetings.map { |m| m['meeting'] }
      media = MeetingPageFields.load_media(File.join(offering_dir, 'media.csv'), valid_meetings)

      meetings.each do |mtg|
        photos = media[mtg['meeting']] || []
        next if photos.empty?

        write_photos_page(crs_id, crs_sem, mtg, photos, result)
      end
    end

    result
  end

  private

  def load_yaml(path)
    return nil unless File.exist?(path)

    YAML.load_file(path)
  end

  def write_photos_page(crs_id, crs_sem, mtg, photos, result)
    slug = MeetingPageFields.meeting_slug(mtg)
    out_path = File.join(@output_dir, crs_id, crs_sem, "#{slug}-photos.creole")

    front_matter = {
      'layout' => 'meeting_photos_page',
      'course' => crs_id,
      'semester' => crs_sem,
      'generated_from' => mtg['meeting'],
      'title' => "#{crs_id} Mtg #{mtg['meeting']} Photos",
    }

    FileUtils.mkdir_p(File.dirname(out_path))
    File.write(out_path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, '')}---\n")
    result[:written] << "#{crs_id}/#{crs_sem}/#{slug}-photos (#{photos.size} photo#{'s' if photos.size != 1})"
  rescue StandardError => e
    result[:errors] << "#{crs_id}/#{crs_sem}/mtg#{mtg['meeting']}: #{e.message}"
  end
end
