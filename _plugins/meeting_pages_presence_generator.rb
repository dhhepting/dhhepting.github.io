# frozen_string_literal: true
#
# _plugins/meeting_page_presence_generator.rb
#
# Stamps each entry of meeting_pages_generated with `meeting_page_exists`
# (Boolean): true iff a page with that URL is in the built site (collection
# doc or generated Page). Lets layouts link only to pages that exist, so
# html-proofer never sees a link to a not-yet-written meeting page.
#
# priority :lowest — must run after every generator that adds pages
# (PageWithoutAFile builders), and after MeetingPagesDataGenerator (:high),
# whose hashes it mutates in place.

class MeetingPagePresenceGenerator < Jekyll::Generator
  priority :lowest

  def generate(site)
    built = built_urls(site)

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

  def built_urls(site)
    docs  = site.collections.values.flat_map(&:docs)
    pages = site.pages
    (docs + pages).map { |p| slashed(p.url) }.to_set
  end

  def slashed(url) = url.to_s.end_with?('/') ? url.to_s : "#{url}/"
end