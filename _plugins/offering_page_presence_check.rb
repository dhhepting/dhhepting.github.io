# frozen_string_literal: true
#
# _plugins/offering_page_presence_check.rb
#
# Fails the build if an indexed offering has no /teaching/<crs>/<sem>/ page.
# priority :lowest so every page-creating generator has already run.

class OfferingPagePresenceError < StandardError; end

class OfferingPagePresenceCheck < Jekyll::Generator
  priority :lowest

  def generate(site)
    offerings = Array(site.data.dig('teaching', 'offerings'))
    built = (site.pages + site.collections.values.flat_map(&:docs))
            .map { |p| p.url.to_s.chomp('/') + '/' }.to_set

    missing = offerings.filter_map do |o|
      url = "/teaching/#{o['id']}/#{o['semester']}/"
      "#{o['id']}/#{o['semester']} (expected #{url})" unless built.include?(url)
    end
    return if missing.empty?

    raise OfferingPagePresenceError,
          "offering data exists but no offering page was built for:\n  " \
          "#{missing.join("\n  ")}\n" \
          'Create teaching/<course>/<semester>/index.md, or remove the offering data.'
  end
end