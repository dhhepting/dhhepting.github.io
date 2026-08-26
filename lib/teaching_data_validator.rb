# frozen_string_literal: true
#
# lib/teaching_data_validator.rb
#
# Validates _data/teaching/**/offering.yml directly with Ruby's YAML/CSV
# libraries — no Jekyll build required. Checks the same referential integrity
# the OfferingsIndexGenerator enforces at build time, but here it's a fast
# pre-build check with plain error messages, run via `rake structure:validate`.
#
# Course/semester reference lists are read from YAML if present, else the
# legacy CSV (strict precedence: a .yml source wins entirely, the .csv is only
# consulted when the .yml is absent — so the CSV can be deleted the moment the
# YAML exists, with no drift window). Codes are coerced to strings so integer
# YAML semester codes (202610) match the string directory names ("202610").

require 'yaml'
require 'csv'

class TeachingDataValidator
  REQUIRED_FIELDS = %w[mdays location times urc_course_id attendance_id].freeze

  # Resolution order for each reference list, first existing wins:
  #   explicit kwarg  ->  _config.yml teaching_data.<courses|semesters>
  #   ->  _data/teaching/all/<name>.yml  (new home)
  #   ->  _config.yml teaching_data.<...>_csv  (legacy key)
  #   ->  _data/teaching/<name>.csv     (legacy default)
  def initialize(teaching_data_dir = '_data/teaching',
                 config_path: '_config.yml',
                 courses_path: nil,
                 semesters_path: nil)
    @teaching_data_dir = teaching_data_dir
    cfg = File.exist?(config_path) ? (YAML.load_file(config_path) || {}) : {}
    td  = cfg['teaching_data'] || {}

    @courses_path = resolve(courses_path, td['courses'],
                            File.join(teaching_data_dir, 'all', 'courses.yml'),
                            td['courses_csv'],
                            File.join(teaching_data_dir, 'courses.csv'))
    @semesters_path = resolve(semesters_path, td['semesters'],
                              File.join(teaching_data_dir, 'all', 'semesters.yml'),
                              td['semesters_csv'],
                              File.join(teaching_data_dir, 'semesters.csv'))
  end

  # Returns an Array of human-readable error strings. Empty array = pass.
  def run
    errors = []
    known_course_ids = load_ids(@courses_path, 'id')
    known_semesters  = load_ids(@semesters_path, 'semester')

    offering_files.each do |path|
      errors.concat(validate_offering(path, known_course_ids, known_semesters))
    end
    errors
  end

  private

  # First candidate that exists on disk; falls back to the first non-nil so
  # error messages still name a path when nothing is found.
  def resolve(*candidates)
    candidates = candidates.compact
    candidates.find { |p| File.exist?(p) } || candidates.first
  end

  def offering_files
    Dir.glob(File.join(@teaching_data_dir, '*', '*', 'offering.yml'))
  end

  # Load the id/semester column from either a YAML list-of-maps or a CSV,
  # chosen by extension, coerced to non-empty strings.
  def load_ids(path, field)
    return [] unless path && File.exist?(path)

    rows = if path.match?(/\.ya?ml\z/)
             YAML.safe_load_file(path, permitted_classes: [Date, Time]) || []
           else
             CSV.read(path, headers: true)
           end
    rows.map { |r| r[field] }.compact.map(&:to_s).reject(&:empty?)
  end

  def validate_offering(path, known_course_ids, known_semesters)
    errors = []
    crs_sem = File.basename(File.dirname(path))
    crs_id  = File.basename(File.dirname(File.dirname(path)))
    label   = "#{crs_id}/#{crs_sem}"

    errors << "#{label}: course id '#{crs_id}' not found in #{@courses_path}"   unless known_course_ids.include?(crs_id)
    errors << "#{label}: semester '#{crs_sem}' not found in #{@semesters_path}" unless known_semesters.include?(crs_sem)

    data = YAML.load_file(path) || {}
    REQUIRED_FIELDS.each do |field|
      errors << "#{label}: missing required field '#{field}'" unless data.key?(field) && !data[field].nil?
    end
    errors
  end
end