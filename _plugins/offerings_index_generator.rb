# frozen_string_literal: true
#
# _plugins/offerings_index_generator.rb
#
# Builds site.data.teaching.offerings by scanning every
# _data/teaching/<crs_id>/<crs_sem>/offering.yml — one small, complete file per
# offering, instead of a row in an ever-widening spreadsheet (the misaligned
# offerings.csv header that started this whole thread).
#
# Referential integrity (course id + semester known) is checked here against
# the course/semester lists, which now live in YAML and are auto-loaded by
# Jekyll into site.data.teaching.all — so this reads site.data directly and
# needs no file path or _config.yml key. The offline lib/teaching_data_validator
# reads the same _data/teaching/all/*.yml files directly for the pre-build check;
# one source, two access mechanisms, no CSV.
#
# priority :highest — must run before MeetingGridGenerator, which reads
# site.data.teaching.offerings and needs it already populated.

require 'yaml'
require 'date'

class OfferingsIndexError < StandardError; end

class OfferingsIndexGenerator < Jekyll::Generator
  priority :highest

  def generate(site)
    all = site.data.dig('teaching', 'all') || {}
    known_course_ids = ref_ids(all['courses'],   'id',       'courses.yml')
    known_semesters  = ref_ids(all['semesters'], 'semester', 'semesters.yml')

    offerings = []
    Dir.glob(File.join(site.source, '_data/teaching/*/*/offering.yml')).sort.each do |path|
      # Path shape: .../_data/teaching/<crs_id>/<crs_sem>/offering.yml
      crs_sem = File.basename(File.dirname(path))
      crs_id  = File.basename(File.dirname(File.dirname(path)))
      label   = "#{crs_id}/#{crs_sem}"

      unless known_course_ids.include?(crs_id)
        raise OfferingsIndexError, "#{label}: course id #{crs_id.inspect} not found in _data/teaching/all/courses.yml"
      end
      unless known_semesters.include?(crs_sem)
        raise OfferingsIndexError, "#{label}: semester #{crs_sem.inspect} not found in _data/teaching/all/semesters.yml"
      end

      data = YAML.safe_load_file(path, permitted_classes: [Date, Time]) || {}
      offerings << data.merge('id' => crs_id, 'semester' => crs_sem)
    end

    site.data['teaching'] ||= {}
    site.data['teaching']['offerings'] = offerings
  end

  private

  # Reference ids from a site.data YAML list, coerced to non-empty strings so
  # integer semester codes (202610) match the string directory names ("202610").
  # Raises loudly if the reference list did not load at all.
  def ref_ids(list, field, filename)
    raise OfferingsIndexError, "reference data missing: _data/teaching/all/#{filename} did not load" if list.nil?
    raise OfferingsIndexError, "reference data _data/teaching/all/#{filename} should be a list, got #{list.class}" unless list.is_a?(Array)

    list.map { |row| row[field] }.compact.map(&:to_s).reject(&:empty?)
  end
end