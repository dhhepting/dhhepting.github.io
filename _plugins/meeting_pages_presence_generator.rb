# frozen_string_literal: true
require 'set'

# Stamps meeting_pages_generated[n]['meeting_page_exists'] (Boolean): true iff
# a page with that URL is in the built site. priority :lowest so it runs after
# every generator that adds pages; it mutates the hashes MeetingPagesDataGenerator
# (:high) already put in site.data.
class MeetingPagePresenceGenerator < Jekyll::Generator
  priority :lowest

  def generate(site)
    built = (site.pages + site.collections.values.flat_map(&:docs))
            .map { |p| slashed(p.url) }.to_set

    (site.data['teaching'] || {}).each_value do |by_sem|
      next unless by_sem.is_a?(Hash)

      by_sem.each_value do |sem_data|
        next unless sem_data.is_a?(Hash)

        (sem_data['meeting_pages_generated'] || {}).each_value do |g|
          g['meeting_page_exists'] = built.include?(slashed(g['meeting_page_path']))
        end
      end
    end
  end

  private

  def slashed(url) = url.to_s.end_with?('/') ? url.to_s : "#{url}/"
end