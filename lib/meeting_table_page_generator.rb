# frozen_string_literal: true
#
# lib/meeting_table_page_generator.rb
#
# Writes ONE index page per offering at
#   _meeting_pages/<crs_id>/<crs_sem>/table.creole
# whose layout (meeting_table_page.html) renders a Creole table of every
# meeting — meeting number, [[slug]] wiki link, weekday — for pasting into
# the wiki as a table of contents.
#
# Like the photos page (lib/meeting_photos_page_generator.rb) this file has
# NO hand-authored content — it's purely generated from meetings.yml — so
# it is always safe to overwrite in full, every run, with no drift check.
#
# Unlike the photos generator there is NO per-meeting `tracked?` guard:
# the table is offering-level and depends only on meetings.yml existing,
# not on any individual meeting stub having been committed.
#
# Runs as a Rake task (rake table:sync_all) and, like photos:sync_all,
# should be a prerequisite of :build so the file exists on disk before
# Jekyll scans the meeting_pages collection.

require 'yaml'
require 'fileutils'

class MeetingTablePageGenerator
  def initialize(teaching_data_dir: '_data/teaching', output_dir: '_meeting_pages')
    @teaching_data_dir = teaching_data_dir
    @output_dir = output_dir
  end

  # Scans every offering under teaching_data_dir, same as
  # MeetingPagesDataGenerator / MeetingPhotosPageGenerator.
  # Returns { written: [...], errors: [...], skipped: [...] }.
  def generate_all
    result = { written: [], errors: [], skipped: [] }

    Dir.glob(File.join(@teaching_data_dir, '*', '*', 'meetings.yml')).each do |meetings_path|
      offering_dir = File.dirname(meetings_path)
      crs_sem = File.basename(offering_dir)
      crs_id = File.basename(File.dirname(offering_dir))

      offering = load_yaml(File.join(offering_dir, 'offering.yml'))
      next if offering.nil?

      meetings = load_yaml(meetings_path)
      if meetings.nil? || meetings.empty?
        result[:skipped] << "#{crs_id}/#{crs_sem}/table (no meetings)"
        next
      end

      write_table_page(crs_id, crs_sem, result)
    end

    result
  end

  private

  def load_yaml(path)
    return nil unless File.exist?(path)

    YAML.load_file(path)
  end

  def write_table_page(crs_id, crs_sem, result)
    out_path = File.join(@output_dir, crs_id, crs_sem, 'table.creole')

    front_matter = {
      'layout' => 'meeting_table_page',
      'course' => crs_id,
      'semester' => crs_sem,
      'title' => "#{crs_id} #{crs_sem} Meeting Index",
    }

    FileUtils.mkdir_p(File.dirname(out_path))
    File.write(out_path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, '')}---\n")
    result[:written] << "#{crs_id}/#{crs_sem}/table"
  rescue StandardError => e
    result[:errors] << "#{crs_id}/#{crs_sem}/table: #{e.message}"
  end
end