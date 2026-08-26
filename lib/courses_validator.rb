# frozen_string_literal: true
#
# lib/courses_validator.rb
#
# Validates _data/teaching/all/courses.yml against course_groups.yml:
#   * courses is a list of maps, each with a non-empty string `id`
#   * ids are unique
#   * `groups`, when present, is a list of strings that are all known group ids
#     (keys of course_groups.yml) — this is the typo guard that stops `graphcis`
#     from silently creating a singleton group
# Returns [] on success, else an array of error strings. Same shape as the
# other validators, so it slots into structure:validate.

require 'yaml'
require 'date'

class CoursesValidator
  def initialize(dir = '_data/teaching/all')
    @courses_path = File.join(dir, 'courses.yml')
    @groups_path  = File.join(dir, 'course_groups.yml')
  end

  def run
    courses = load_yaml(@courses_path)
    groups  = load_yaml(@groups_path)
    errors  = []

    return ["#{@courses_path}: expected a list of courses, got #{courses.class}"] unless courses.is_a?(Array)
    unless groups.is_a?(Hash)
      errors << "#{@groups_path}: expected an id->label map, got #{groups.class}"
      groups = {}
    end
    known = groups.keys.map(&:to_s)

    seen = {}
    courses.each_with_index do |c, i|
      unless c.is_a?(Hash)
        errors << "courses[#{i}] is #{c.class}, expected a map"
        next
      end
      id = c['id']
      if !id.is_a?(String) || id.strip.empty?
        errors << "courses[#{i}]: `id` is missing or blank"
        next
      end
      errors << "duplicate course id: #{id}" if seen[id]
      seen[id] = true

      errors << "#{id}: `name` is present but not a string" if c.key?('name') && !c['name'].is_a?(String)

      next unless c.key?('groups')
      g = c['groups']
      unless g.is_a?(Array)
        errors << "#{id}: `groups` must be a list"
        next
      end
      g.each do |grp|
        errors << "#{id}: unknown group '#{grp}' (not in course_groups.yml: #{known.join(', ')})" unless known.include?(grp.to_s)
      end
    end
    errors
  end

  private

  def load_yaml(path)
    return nil unless File.exist?(path)
    YAML.safe_load_file(path, permitted_classes: [Date, Time])
  rescue Psych::Exception => e
    { '__error__' => "#{path}: #{e.message.lines.first&.strip}" }
  end
end