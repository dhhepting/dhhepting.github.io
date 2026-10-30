# frozen_string_literal: true

# Git-derived change history for the site: which source files changed, when,
# and in which commit.  Pure functions, no Jekyll dependency, so it can be
# tested offline:
#
#   ruby -Ilib -Itest test/change_log_test.rb
#
# Times come from git, never from file mtimes (a CI checkout stamps every
# file with the checkout time).  That is only meaningful with full history, so
# every entry point refuses to run on a shallow clone.

require 'cgi'
require 'open3'
require 'time'

module ChangeLog
  class Error < StandardError; end
  class GitError < Error; end
  class ShallowRepositoryError < Error; end

  # Regina does not observe DST, so a fixed offset is correct year-round.
  REGINA_OFFSET = '-06:00'

  RECORD = "\x1e" # starts each commit in the git log output
  FIELD  = "\x1f" # separates the fields of the header line

  STATUS_WORDS = {
    'A' => 'added', 'M' => 'modified', 'D' => 'deleted',
    'R' => 'renamed', 'C' => 'copied', 'T' => 'type changed'
  }.freeze

  GLOB_CHARS = /[*?\[{]/.freeze
  GLOB_FLAGS = File::FNM_PATHNAME | File::FNM_EXTGLOB | File::FNM_DOTMATCH

  FileChange = Struct.new(:status, :path, :old_path, keyword_init: true)

  # ignored: true for commits listed in the ignore-revs file (bulk reformats,
  # mass renames...).  They never move a page's date unless nothing else has
  # ever touched the page, and they are left out of the feeds.
  Commit = Struct.new(:sha, :time, :subject, :files, :ignored, keyword_init: true)

  # "A page matching <regex> is built from the files matching <from>, so it
  # also changes whenever they do."  `regex` must match the whole page path; its
  # named groups can be used in the `from` patterns as %{name}.
  #
  # (Not called `on`: YAML reads an unquoted `on:` key as the boolean true.)
  Rule = Struct.new(:regex, :from, keyword_init: true) do
    def expand(page_path)
      match = regex.match(page_path) or return nil
      captures = match.named_captures.transform_keys(&:to_sym)
      from.map { |pattern| format(pattern, **captures) }
    end
  end

  # ---------------------------------------------------------------- git ----

  def self.git(repo, *args)
    out, err, status = Open3.capture3('git', '-C', repo.to_s, '-c', 'core.quotepath=false', *args)
    raise GitError, "git #{args.first} failed in #{repo}: #{err.strip}" unless status.success?

    out.force_encoding(Encoding::UTF_8)
  rescue Errno::ENOENT
    raise GitError, 'git executable not found'
  end

  def self.shallow?(repo)
    answer = git(repo, 'rev-parse', '--is-shallow-repository').strip
    case answer
    when 'true'  then true
    when 'false' then false
    else
      raise GitError, "cannot tell whether #{repo} is shallow (git printed #{answer.inspect}); git >= 2.15 is required"
    end
  end

  def self.assert_full_history!(repo)
    return unless shallow?(repo)

    raise ShallowRepositoryError,
          "#{repo} is a shallow clone, so history (and every page's last-modified time) is incomplete. " \
          'In GitHub Actions use actions/checkout with `fetch-depth: 0`.'
  end

  # ------------------------------------------------------ path matching ----

  # A pattern is either a path prefix (a directory or an exact file) or, if it
  # contains * ? [ or {, a glob.  Like .gitignore, a glob matches a path when it
  # matches the path itself or any parent directory, and a glob without a "/"
  # is compared with the name only:
  #
  #   _question_bank/            everything under that directory
  #   *.swp                      swap files anywhere
  #   teaching/*/dist/           a dist directory one level below teaching/
  #   **/public/                 any public directory
  def self.matches_any?(path, patterns)
    patterns.any? { |pattern| matches?(path, pattern) }
  end

  def self.matches?(path, pattern)
    if pattern.match?(GLOB_CHARS)
      glob = pattern.chomp('/')
      ancestors(path).any? do |candidate|
        File.fnmatch(glob, glob.include?('/') ? candidate : File.basename(candidate), GLOB_FLAGS)
      end
    else
      dir = pattern.chomp('/')
      path == dir || path.start_with?("#{dir}/")
    end
  end

  def self.ancestors(path)
    parts = path.split('/')
    (1..parts.size).map { |n| parts.first(n).join('/') }
  end

  # ------------------------------------------------------------ history ----

  # Newest-first list of Commit, restricted to the files that matter.
  #
  # repo        - directory inside the work tree; paths are reported relative
  #               to it (so it may be a Jekyll source directory below the root)
  # only        - patterns to keep; [] = all
  # except      - patterns to drop.  A rename counts as touching BOTH of its
  #               paths, so moving a file out of an excluded directory stays
  #               hidden.
  # ignore_revs - commit ids (full or abbreviated) to flag as ignored
  def self.commits(repo:, only: [], except: [], ignore_revs: [])
    assert_full_history!(repo)
    raw = git(repo, 'log', '--no-color', '--relative', '-M', '--name-status',
              "--format=#{RECORD}%H#{FIELD}%cI#{FIELD}%s")
    commits = select(parse(raw), only: only, except: except)
    commits.each { |c| c.ignored = ignore_revs.any? { |rev| c.sha.start_with?(rev) } }
    commits
  end

  # Committer date, not author date: author dates survive rebases and
  # cherry-picks, so they can predate the moment the change reached the site.
  def self.parse(raw)
    raw.split(RECORD).reject { |r| r.strip.empty? }.map do |record|
      header, *lines = record.lines.map(&:chomp)
      sha, iso, subject = header.split(FIELD, 3)
      raise Error, "unparseable git log header: #{header.inspect}" if sha.nil? || iso.nil? || subject.nil?

      Commit.new(sha: sha,
                 time: Time.iso8601(iso).getlocal(REGINA_OFFSET),
                 subject: subject,
                 files: lines.reject(&:empty?).map { |l| parse_file_change(l) },
                 ignored: false)
    end
  end

  def self.parse_file_change(line)
    status, *paths = line.split("\t")
    kind = status.to_s[0]
    two_paths = %w[R C].include?(kind)
    if kind.nil? || paths.empty? || (two_paths && paths.size != 2)
      raise Error, "unparseable name-status line: #{line.inspect}"
    end

    two_paths ? FileChange.new(status: kind, path: paths[1], old_path: paths[0])
              : FileChange.new(status: kind, path: paths[0])
  end

  # Drops unwanted files, then commits left with none; keeps newest-first
  # order, breaking same-second ties in git's own order.
  def self.select(commits, only: [], except: [])
    kept = commits.filter_map do |c|
      files = c.files.select { |f| wanted?(f, only, except) }
      files.empty? ? nil : Commit.new(**c.to_h, files: files)
    end
    kept.each_with_index.sort_by { |c, i| [-c.time.to_i, i] }.map(&:first)
  end

  def self.wanted?(file, only, except)
    paths = [file.path, file.old_path].compact
    return false if paths.any? { |p| matches_any?(p, except) }

    only.empty? || paths.any? { |p| matches_any?(p, only) }
  end

  # Commits touching at least `min` files: the usual suspects for the
  # ignore-revs file.
  def self.bulk_commits(commits, min)
    commits.select { |c| c.files.size >= min }
  end

  # One commit id per line, `#` starts a comment (the format of git's own
  # .git-blame-ignore-revs).  A configured file that is missing or malformed is
  # an error rather than silently ignored.
  def self.read_ignore_revs(path)
    raise Error, "ignore_revs file not found: #{path}" unless File.file?(path)

    File.readlines(path, chomp: true).each_with_index.filter_map do |line, index|
      entry = line.sub(/#.*/, '').strip.downcase
      next if entry.empty?
      raise Error, "#{path}:#{index + 1}: not a commit id: #{entry.inspect}" unless entry.match?(/\A\h{7,40}\z/)

      entry
    end
  end

  # { path => Commit }: the commit that last changed each file that still
  # exists.  `commits` must be newest-first.
  #
  # * Deleted files, and the old name of a renamed file, are absent.
  # * Ignored commits are skipped.  Renames are followed through them (a bulk
  #   move does not hide the real history), and a file touched ONLY by
  #   ignored commits falls back to the newest of them rather than vanishing.
  def self.last_changes(commits)
    final_of = {} # a name from older history => the name the file has today
    state = {}    # today's name => :gone or { any:, real: }
    commits.each do |commit|
      commit.files.each do |f|
        today = final_of.fetch(f.path, f.path)
        entry = state[today]
        if entry.nil?
          if f.status == 'D'
            state[today] = :gone
            next
          end
          entry = state[today] = { any: commit, real: nil }
        end
        next if entry == :gone

        entry[:real] ||= commit unless commit.ignored
        final_of[f.old_path] = today if f.status == 'R'
      end
    end
    state.each_with_object({}) { |(path, e), map| map[path] = e[:real] || e[:any] unless e == :gone }
  end

  # ------------------------------------------------------- dependencies ----

  # entries: [{ 'page' => regex, 'from' => [patterns] }] straight from config.
  def self.rules(entries)
    Array(entries).each_with_index.map do |entry, index|
      label = "changes.depends[#{index}]"
      if entry.key?(true) && !entry.key?('from')
        raise Error, "#{label}: YAML read `on:` as the boolean true; the key is called `from:`"
      end

      page = entry['page'].to_s
      from = Array(entry['from'])
      raise Error, "#{label} needs both `page` and `from`" if page.empty? || from.empty?

      regex = Regexp.new("\\A(?:#{page})\\z")
      used = from.flat_map { |pattern| pattern.scan(/%\{(\w+)\}/).flatten }.uniq
      missing = used - regex.names
      unless missing.empty?
        raise Error, "#{label}: `from` uses %{#{missing.first}} but `page` has no (?<#{missing.first}>...) group"
      end

      Rule.new(regex: regex, from: from)
    rescue RegexpError => e
      raise Error, "#{label}.page is not a valid regexp: #{e.message}"
    end
  end

  # Lets a page inherit the date of the files it is built from.
  # Returns [effective, via]: effective is last_changes with any page moved
  # forward to a newer dependency change, via maps those pages to the file that
  # caused it.  Ignored commits never count.  `pages` are source paths, so a
  # page with no history of its own can still pick up a date.
  def self.apply_dependencies(last_changes, commits, rules, pages)
    effective = last_changes.dup
    via = {}
    cache = {}
    pages.each do |page|
      rules.each do |rule|
        patterns = rule.expand(page) or next
        cache[patterns] = newest_touching(commits, patterns) unless cache.key?(patterns)
        hit = cache[patterns] or next
        commit, path = hit
        current = effective[page]
        next if current && commit.time <= current.time

        effective[page] = commit
        via[page] = path
      end
    end
    [effective, via]
  end

  def self.newest_touching(commits, patterns)
    commits.each do |commit|
      next if commit.ignored

      file = commit.files.find { |f| [f.path, f.old_path].compact.any? { |p| matches_any?(p, patterns) } }
      return [commit, file.path] if file
    end
    nil
  end

  # ------------------------------------------------------------ output -----

  def self.commit_url(repo_url, sha)
    "#{repo_url.chomp('/')}/commit/#{sha}"
  end

  def self.diff_url(repo_url, sha)
    "#{commit_url(repo_url, sha)}.diff"
  end

  # Rows for the human-readable page, newest first, as plain string-keyed
  # hashes so the template only has to loop.
  #   page_urls - { source path => page url }
  #   titles    - { source path => page title }; the path stands in when absent
  #   via       - { source path => file that moved the page's date }
  def self.page_rows(last_changes, page_urls, repo_url, titles: {}, via: {})
    rows = page_urls.filter_map do |path, url|
      commit = last_changes[path] or next
      title = titles[path].to_s.strip
      [commit.time, { 'path' => path,
                      'title' => title.empty? ? path : title,
                      'url' => url,
                      'modified' => commit.time.iso8601,
                      'modified_date' => commit.time.strftime('%Y-%m-%d'),
                      'change' => via[path] ? "#{commit.subject} (via #{via[path]})" : commit.subject,
                      'commit_url' => commit_url(repo_url, commit.sha),
                      'diff_url' => diff_url(repo_url, commit.sha) }]
    end
    rows.sort_by { |time, row| [-time.to_i, row['path']] }.map(&:last)
  end

  # What the /changes/ template consumes: the newest `limit` rows plus a
  # ready-made summary line.
  def self.page_table(last_changes, page_urls, repo_url, titles: {}, via: {}, limit: nil)
    rows = page_rows(last_changes, page_urls, repo_url, titles: titles, via: via)
    shown = limit ? rows.first(limit) : rows
    summary = if shown.size < rows.size
                "Showing the #{shown.size} most recently changed of #{rows.size} pages."
              else
                "#{rows.size} #{rows.size == 1 ? 'page' : 'pages'}."
              end
    { 'pages' => shown, 'total' => rows.size, 'summary' => summary }
  end

  # Atom feed, one entry per commit.  Diffs are linked, not inlined.
  #   page_urls - { source path => absolute page url }
  #   max_files - files listed per entry before "...and N more" (nil = all)
  def self.atom(commits:, title:, feed_url:, site_url:, repo_url:, page_urls: {}, limit: 50, max_files: 15)
    entries = commits.first(limit)
    updated = entries.first ? entries.first.time : Time.at(0).utc
    [
      %(<?xml version="1.0" encoding="utf-8"?>),
      %(<feed xmlns="http://www.w3.org/2005/Atom">),
      "  <title>#{esc(title)}</title>",
      %(  <link rel="self" type="application/atom+xml" href="#{esc(feed_url)}"/>),
      %(  <link rel="alternate" type="text/html" href="#{esc(site_url)}"/>),
      "  <id>#{esc(feed_url)}</id>",
      "  <updated>#{updated.iso8601}</updated>",
      *entries.map { |c| entry(c, repo_url, page_urls, max_files) },
      '</feed>',
      ''
    ].join("\n")
  end

  def self.entry(commit, repo_url, page_urls, max_files)
    url = commit_url(repo_url, commit.sha)
    <<~XML.gsub(/^(?=.)/, '  ').chomp
      <entry>
        <title>#{esc(commit.subject)}</title>
        <id>#{esc(url)}</id>
        <link rel="alternate" type="text/html" href="#{esc(url)}"/>
        <link rel="related" type="text/x-diff" href="#{esc(url)}.diff"/>
        <updated>#{commit.time.iso8601}</updated>
        <content type="html">#{esc(entry_html(commit, repo_url, page_urls, max_files))}</content>
      </entry>
    XML
  end

  # Files that are pages come first, so a 300-file commit still leads with
  # the pages it changed.
  def self.entry_html(commit, repo_url, page_urls, max_files)
    pages, others = commit.files.partition { |f| page_urls.key?(f.path) }
    ordered = pages + others
    shown = max_files ? ordered.first(max_files) : ordered
    items = shown.map do |f|
      label = f.old_path ? "#{f.old_path} \u2192 #{f.path}" : f.path
      page = page_urls[f.path]
      name = page ? %(<a href="#{esc(page)}">#{esc(label)}</a>) : esc(label)
      "<li>#{STATUS_WORDS.fetch(f.status, f.status)} #{name}</li>"
    end
    hidden = ordered.size - shown.size
    items << "<li>\u2026and #{hidden} more file#{'s' unless hidden == 1}</li>" if hidden.positive?
    %(<ul>#{items.join}</ul><p><a href="#{esc(diff_url(repo_url, commit.sha))}">View diff</a></p>)
  end

  def self.esc(text)
    CGI.escapeHTML(text.to_s)
  end

  private_class_method :entry, :entry_html, :esc, :parse_file_change, :wanted?, :matches?,
                       :ancestors, :newest_touching
end