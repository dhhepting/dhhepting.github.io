# frozen_string_literal: true

require 'set'

# OfferingIndexValidator
#
# Fails the build if any *served, navigable* course- or offering-level
# directory under teaching/ lacks an index page. This is the guardrail that
# stops the "linked directory with no index.html" html-proofer error from ever
# recurring — it catches the problem in under a second, before any Jekyll
# build, with a clear message, instead of as a buried broken-link error later.
#
# Two deliberate scoping choices keep it precise (no false positives on the
# ~200 asset / node_modules / off-web directories the raw audit turned up):
#
#   1. Only two directory LEVELS are treated as landing pages and checked:
#        - course-level:   teaching/<COURSE>/
#        - offering-level: teaching/<COURSE>/<SEMESTER>/   (SEMESTER = 6 digits)
#      Subdirectories like code/, Common/, or modules/ are never landing pages,
#      so they're ignored. Asset folders aren't under teaching/ at all.
#
#   2. Source of truth is `git ls-files`, NOT the filesystem. So this validates
#      what CI will actually build. Content that exists on your laptop but was
#      never committed is treated as absent — which is exactly how the CI runner
#      will see it. This is the same "does it actually reach the repo?" check
#      that's bitten this project before, enforced automatically.
#
# A directory is only required to have an index if it has *served* content —
# i.e. at least one committed file none of whose path segments start with "_"
# or "." (Jekyll excludes those). A course or offering that contains only
# _offweb/ or _nonweb/ produces no _site directory and needs no index, so it is
# correctly left alone.
#
# Usage (returns [] on success, or an array of human-readable error strings):
#   OfferingIndexValidator.new('teaching').run
class OfferingIndexValidator
  SEMESTER    = /\A\d{6}\z/                 # e.g. 202610
  INDEX_NAMES = %w[index.html index.md].freeze
  GIT_ERROR   = 'could not read git-tracked files under teaching/ ' \
                '(is this being run inside the git repo?)'

  def initialize(root = 'teaching')
    @root = root
  end

  def run
    files = tracked_files
    return [GIT_ERROR] if files.nil?

    # Keep only files Jekyll will actually build: drop anything with a
    # "_"- or "."-prefixed segment anywhere in its path (e.g. _offweb/, .git/).
    served     = files.reject { |path| excluded?(path) }
    served_set = served.to_set

    # From the served files, collect the set of landing directories that need
    # an index. A course/offering dir qualifies only if served content exists
    # *below* it.
    landing_dirs = Set.new
    served.each do |path|
      parts = path.split('/')
      next unless parts[0] == @root

      # course-level: served file lives somewhere under teaching/<COURSE>/
      landing_dirs << parts[0, 2].join('/') if parts.size >= 3

      # offering-level: served file lives under teaching/<COURSE>/<SEMESTER>/
      landing_dirs << parts[0, 3].join('/') if parts.size >= 4 && parts[2].match?(SEMESTER)
    end

    landing_dirs.sort.filter_map do |dir|
      next if INDEX_NAMES.any? { |name| served_set.include?("#{dir}/#{name}") }

      level = dir.split('/').size == 2 ? 'course' : 'offering'
      "#{level} landing directory has no index page: #{dir}/  (add #{dir}/index.md)"
    end
  end

  private

  # True if any path segment is Jekyll-excluded (leading "_" or ".").
  def excluded?(path)
    path.split('/').any? { |segment| segment.start_with?('_', '.') }
  end

  # Committed files under @root, or nil if git can't be read.
  def tracked_files
    out = `git ls-files #{@root} 2>/dev/null`
    return nil unless $?.success?

    out.split("\n").reject(&:empty?)
  end
end
