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

  FileChange = Struct.new(:status, :path, :old_path, keyword_init: true)
  Commit     = Struct.new(:sha, :time, :subject, :files, keyword_init: true)

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

  # ------------------------------------------------------------ history ----

  # Newest-first list of Commit, restricted to the files that matter.
  #
  # repo   - directory inside the work tree; paths are reported relative to it
  #          (so it may be a Jekyll source directory below the repo root)
  # only   - path prefixes to keep (a directory or an exact file); [] = all
  # except - path prefixes to drop.  A rename counts as touching BOTH of its
  #          paths, so moving a file out of an excluded directory stays hidden.
  def self.commits(repo:, only: [], except: [])
    assert_full_history!(repo)
    raw = git(repo, 'log', '--no-color', '--relative', '-M', '--name-status',
              "--format=#{RECORD}%H#{FIELD}%cI#{FIELD}%s")
    select(parse(raw), only: only, except: except)
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
                 files: lines.reject(&:empty?).map { |l| parse_file_change(l) })
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
      files.empty? ? nil : Commit.new(sha: c.sha, time: c.time, subject: c.subject, files: files)
    end
    kept.each_with_index.sort_by { |c, i| [-c.time.to_i, i] }.map(&:first)
  end

  def self.wanted?(file, only, except)
    paths = [file.path, file.old_path].compact
    return false if paths.any? { |p| under?(p, except) }

    only.empty? || paths.any? { |p| under?(p, only) }
  end

  def self.under?(path, prefixes)
    prefixes.any? do |prefix|
      dir = prefix.chomp('/')
      path == dir || path.start_with?("#{dir}/")
    end
  end

  # { path => Commit } : newest commit touching each file that still exists.
  # `commits` must be newest-first.  Deleted files and the old side of a
  # rename are absent, and older history cannot resurrect them.
  def self.last_changes(commits)
    seen = {}
    result = {}
    commits.each do |commit|
      commit.files.each do |f|
        seen[f.old_path] = true if f.status == 'R'
        next if seen[f.path]

        seen[f.path] = true
        result[f.path] = commit unless f.status == 'D'
      end
    end
    result
  end

  # ------------------------------------------------------------ output -----

  def self.commit_url(repo_url, sha)
    "#{repo_url.chomp('/')}/commit/#{sha}"
  end

  def self.diff_url(repo_url, sha)
    "#{commit_url(repo_url, sha)}.diff"
  end

  # Rows for the human-readable page, newest first.  Plain string-keyed hashes
  # so the template only has to loop.  page_urls: { source path => page url }.
  def self.page_rows(last_changes, page_urls, repo_url)
    rows = page_urls.filter_map do |path, url|
      commit = last_changes[path] or next
      [commit.time, { 'path' => path, 'url' => url,
                      'modified' => commit.time.iso8601,
                      'modified_date' => commit.time.strftime('%Y-%m-%d'),
                      'subject' => commit.subject,
                      'commit_url' => commit_url(repo_url, commit.sha),
                      'diff_url' => diff_url(repo_url, commit.sha) }]
    end
    rows.sort_by { |time, row| [-time.to_i, row['path']] }.map(&:last)
  end

  # Atom feed, one entry per commit.  Diffs are linked, not inlined.
  # page_urls: { source path => absolute page url }; unmapped files are
  # listed as plain paths.
  def self.atom(commits:, title:, feed_url:, site_url:, repo_url:, page_urls: {}, limit: 50)
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
      *entries.map { |c| entry(c, repo_url, page_urls) },
      '</feed>',
      ''
    ].join("\n")
  end

  def self.entry(commit, repo_url, page_urls)
    url = commit_url(repo_url, commit.sha)
    <<~XML.gsub(/^(?=.)/, '  ').chomp
      <entry>
        <title>#{esc(commit.subject)}</title>
        <id>#{esc(url)}</id>
        <link rel="alternate" type="text/html" href="#{esc(url)}"/>
        <link rel="related" type="text/x-diff" href="#{esc(url)}.diff"/>
        <updated>#{commit.time.iso8601}</updated>
        <content type="html">#{esc(entry_html(commit, repo_url, page_urls))}</content>
      </entry>
    XML
  end

  def self.entry_html(commit, repo_url, page_urls)
    items = commit.files.map do |f|
      label = f.old_path ? "#{f.old_path} \u2192 #{f.path}" : f.path
      page = page_urls[f.path]
      name = page ? %(<a href="#{esc(page)}">#{esc(label)}</a>) : esc(label)
      "<li>#{STATUS_WORDS.fetch(f.status, f.status)} #{name}</li>"
    end
    %(<ul>#{items.join}</ul><p><a href="#{esc(diff_url(repo_url, commit.sha))}">View diff</a></p>)
  end

  def self.esc(text)
    CGI.escapeHTML(text.to_s)
  end

  private_class_method :entry, :entry_html, :esc, :parse_file_change, :wanted?, :under?
end