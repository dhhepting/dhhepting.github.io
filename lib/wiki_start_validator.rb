# frozen_string_literal: true
#
# lib/wiki_start_validator.rb
#
# Attempts to parse every .creole file with the same `creole` gem the
# site's preview converter uses. This is the fast, no-Jekyll-build tier
# of test (same idea as TeachingDataValidator) — it catches malformed
# Creole syntax in seconds, before you ever open a page to copy from it.
#
# It intentionally does NOT check content against the live Moodle wiki
# page — that comparison isn't meaningful, since the wiki page is
# expected to diverge from this seed file the moment students start
# editing it. This only validates that the seed file itself is
# well-formed Creole.

require 'creole'

class WikiStartValidator
  def initialize(wiki_starts_dir = '_wiki_starts')
    @dir = wiki_starts_dir
  end

  # Returns an Array of human-readable error strings. Empty array = pass.
  def run
    errors = []
    creole_files.each do |path|
      body = strip_front_matter(File.read(path, encoding: 'UTF-8'))
      begin
        Creole.creolize(body)
      rescue StandardError => e
        errors << "#{path}: failed to parse as Creole — #{e.message}"
      end

      errors.concat(check_required_front_matter(path))
    end
    errors
  end

  private

  def creole_files
    Dir.glob(File.join(@dir, '**', '*.creole'))
  end

  def strip_front_matter(raw)
    raw.sub(/\A---\s*\n.*?\n---\s*\n/m, '')
  end

  def check_required_front_matter(path)
    errors = []
    raw = File.read(path, encoding: 'UTF-8')
    match = raw.match(/\A---\s*\n(.*?)\n---\s*\n/m)

    if match.nil?
      errors << "#{path}: missing YAML front matter (needs at least `title:`)"
      return errors
    end

    front_matter = YAML.safe_load(match[1]) || {}
    errors << "#{path}: front matter missing 'title'" unless front_matter['title']

    errors
  end
end
