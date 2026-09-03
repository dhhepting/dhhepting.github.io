# frozen_string_literal: true
# Liquid filter: {{ some_id | data_key }} -> data-tree key form (+ -> _).
# Use ONLY to reach site.data; use the authored + id for URLs/display.
require_relative '../lib/course_id'
module CourseIdFilter
  def data_key(input) = CourseId.data_key(input)
end
Liquid::Template.register_filter(CourseIdFilter)