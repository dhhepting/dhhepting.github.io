# frozen_string_literal: true
#
# lib/teaching_data_validator.rb
#
# Validates _data/teaching/**/offering.yml directly with Ruby's YAML/CSV
# libraries — no Jekyll build required. Checks the same referential
# integrity the OfferingsIndexGenerator enforces at build time, but here
# it's a fast pre-build check with plain error messages, run via
# `rake data:validate`.

require 'yaml'
require 'csv'

class TeachingDataValidator
  REQUIRED_FIELDS = %w[mdays location times urc_course_id attendance_id].freeze

  def initialize(teaching_data_dir = '_data/teaching')
    @teaching_data_dir = teaching_data_dir
  end

  # Returns an Array of human-readable error strings. Empty array = pass.
  def run
    errors = []
    known_course_ids = load_csv_column(File.join(@teaching_data_dir, 'courses.csv'), 'id')
    known_semesters = load_csv_column(File.join(@teaching_data_dir, 'semesters.csv'), 'semester')

    offering_files.each do |path|
      errors.concat(validate_offering(path, known_course_ids, known_semesters))
    end

    errors
  end

  private

  def offering_files
    Dir.glob(File.join(@teaching_data_dir, '*', '*', 'offering.yml'))
  end

  def load_csv_column(path, column)
    return [] unless File.exist?(path) # caller flags this separately if missing entirely

    CSV.read(path, headers: true).map { |row| row[column] }.compact
  end

  def validate_offering(path, known_course_ids, known_semesters)
    errors = []
    crs_sem = File.basename(File.dirname(path))
    crs_id = File.basename(File.dirname(File.dirname(path)))
    label = "#{crs_id}/#{crs_sem}"

    unless known_course_ids.include?(crs_id)
      errors << "#{label}: course id not found in courses.csv"
    end
    unless known_semesters.include?(crs_sem)
      errors << "#{label}: semester not found in semesters.csv"
    end

    data = YAML.load_file(path) || {}
    REQUIRED_FIELDS.each do |field|
      errors << "#{label}: missing required field '#{field}'" unless data.key?(field) && !data[field].nil?
    end

    errors
  end
end
