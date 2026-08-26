# frozen_string_literal: true
#
# _plugins/see_also_generator.rb
#
# Derives each course's See-also list from shared navigational groups, the same
# way semester_generator derives year/semester_name — computation in Ruby, not
# Liquid. Injects `course['see_also']`: a sorted list of {id, name, url} for
# sibling courses that share a group, so a template renders it directly.
#
# Two rules keep it clean:
#   * ATOMIC only — ids containing '+' are co-listings, never See-also targets.
#   * PRESENCE-GUARDED — a sibling appears only if its committed landing page
#     (teaching/<id>/index.md or index.html) exists in the build, so a group may
#     list a course you have not stood up yet without emitting a red link.

module SeeAlso
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      courses = site.data.dig('teaching', 'all', 'courses')
      return unless courses.is_a?(Array)

      atomic = courses.reject { |c| c['id'].to_s.include?('+') }
      name_of = atomic.to_h { |c| [c['id'].to_s, c['name']] }

      # group id -> [course ids], atomic only
      members = Hash.new { |h, k| h[k] = [] }
      atomic.each do |c|
        Array(c['groups']).each { |g| members[g.to_s] << c['id'].to_s }
      end

      atomic.each do |c|
        id = c['id'].to_s
        siblings = Array(c['groups']).flat_map { |g| members[g.to_s] }.uniq
        siblings = siblings.reject { |sid| sid == id || !landing_exists?(site, sid) }.sort
        c['see_also'] = siblings.map { |sid| { 'id' => sid, 'name' => name_of[sid], 'url' => "/teaching/#{sid}/" } }
      end
    end

    private

    def landing_exists?(site, id)
      %w[index.md index.html].any? do |name|
        File.exist?(File.join(site.source, 'teaching', id, name))
      end
    end
  end
end