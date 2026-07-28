# frozen_string_literal: true
#
# _plugins/offerings_index_generator.rb
#
# Replaces the hand-maintained _data/teaching/offerings.csv with a
# generated index, built by scanning every
# _data/teaching/<crs_id>/<crs_sem>/offering.yml file — one small,
# self-contained, complete file per offering, instead of one row in an
# ever-widening spreadsheet.
#
# This is the direct fix for the bug that started this whole thread:
# offerings.csv's header had grown columns over the years (jid was added
# around 2022) while older rows kept their original, shorter shape —
# so a header-mapped CSV reader silently misaligned every field on
# those older rows. A single offering.yml can't have that problem: it's
# never a row relative to an evolving header, just a complete document.
#
# priority :highest — this MUST run before MeetingGridGenerator, which
# reads site.data.teaching.offerings and needs it already populated.

require 'csv'

class OfferingsIndexError < StandardError; end

class OfferingsIndexGenerator < Jekyll::Generator
  priority :highest

  def generate(site)
    courses_dir = site.config.dig('teaching_data', 'courses_csv') || '_data/teaching/courses.csv'
    semesters_dir = site.config.dig('teaching_data', 'semesters_csv') || '_data/teaching/semesters.csv'

    known_course_ids = load_csv_ids(File.join(site.source, courses_dir), 'id')
    known_semesters = load_csv_ids(File.join(site.source, semesters_dir), 'semester')

    offerings = []

    Dir.glob(File.join(site.source, '_data/teaching/*/*/offering.yml')).each do |path|
      # Path shape: .../_data/teaching/<crs_id>/<crs_sem>/offering.yml
      crs_sem = File.basename(File.dirname(path))
      crs_id = File.basename(File.dirname(File.dirname(path)))
      label = "#{crs_id}/#{crs_sem}"

      unless known_course_ids.include?(crs_id)
        raise OfferingsIndexError, "#{label}: course id #{crs_id.inspect} not found in #{courses_dir}"
      end
      unless known_semesters.include?(crs_sem)
        raise OfferingsIndexError, "#{label}: semester #{crs_sem.inspect} not found in #{semesters_dir}"
      end

      data = YAML.load_file(path) || {}
      offerings << data.merge('id' => crs_id, 'semester' => crs_sem)
    end

    site.data['teaching'] ||= {}
    site.data['teaching']['offerings'] = offerings
  end

  private

  def load_csv_ids(path, column)
    raise OfferingsIndexError, "reference file not found: #{path}" unless File.exist?(path)

    CSV.read(path, headers: true).map { |row| row[column] }.compact
  end
end
