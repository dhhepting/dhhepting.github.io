# frozen_string_literal: true

require 'minitest/autorun'
require 'fileutils'
require 'open3'
require 'rexml/document'
require 'tmpdir'
require 'yaml'
require 'change_log'
require_relative 'git_repo_helper'

# ---------------------------------------------------------------------------
# Path patterns (no git needed)
# ---------------------------------------------------------------------------
class PathMatchingTest < Minitest::Test
  def match?(path, *patterns)
    ChangeLog.matches_any?(path, patterns)
  end

  def test_directory_prefix_and_exact_file
    assert match?('_question_bank/q1.md', '_question_bank/')
    assert match?('_question_bank/a/b.md', '_question_bank')
    assert match?('index.md', 'index.md')
    refute match?('_question_bank_old/q1.md', '_question_bank/')
    refute match?('index.md.bak', 'index.md')
  end

  def test_glob_without_slash_matches_names_at_any_depth_including_dotfiles
    assert match?('a/b/.student.mjs.swp', '*.swp')
    assert match?('x.swp', '*.swp')
    refute match?('a/b/notes.md', '*.swp')
    assert match?('a/b/x.swo', '*.{swp,swo}')
  end

  def test_glob_with_slash_matches_path_or_any_parent_directory
    assert match?('teaching/CS-315/dist/app.js', 'teaching/*/dist/')
    assert match?('teaching/CS-315/dist', 'teaching/*/dist/')
    refute match?('teaching/CS-315/src/app.js', 'teaching/*/dist/')
    refute match?('teaching/a/b/dist/app.js', 'teaching/*/dist/') # * does not cross "/"
    assert match?('teaching/a/b/dist/app.js', 'teaching/**/dist/')
    assert match?('dist/app.js', '**/dist/')
  end
end

# ---------------------------------------------------------------------------
# History parsing, filtering, last-modified map, Atom (basic behaviour)
#
#   1  2026-09-01 10:00 -06:00  add syllabus, question bank, index
#   2  2026-09-02 12:00 +00:00  rename syllabus -> outline        (= 06:00 Regina)
#   3  2026-09-03 08:00 -06:00  edit index  (subject full of XML/Liquid specials)
#   4  2026-09-04 09:00 -06:00  add tmp.md
#   5  2026-09-05 09:00 -06:00  delete tmp.md
#   6  2026-09-06 09:00 -06:00  touch question bank only
# ---------------------------------------------------------------------------
class ChangeLogTest < Minitest::Test
  include GitRepoHelper

  TRICKY = 'Edit {{ index }} <b> & more'

  def build_history
    commit('2026-09-01T10:00:00-06:00', 'add syllabus and index') do
      write('teaching/syllabus.md', "v1\n")
      write('_question_bank/q1.md', "q1\n")
      write('index.md', "home\n")
    end
    commit('2026-09-02T12:00:00+00:00', 'rename syllabus') do
      git(@repo, 'mv', 'teaching/syllabus.md', 'teaching/outline.md')
    end
    commit('2026-09-03T08:00:00-06:00', TRICKY) { write('index.md', "home v2\n") }
    commit('2026-09-04T09:00:00-06:00', 'add tmp') { write('tmp.md', "tmp\n") }
    commit('2026-09-05T09:00:00-06:00', 'remove tmp') { File.delete(File.join(@repo, 'tmp.md')) }
    commit('2026-09-06T09:00:00-06:00', 'touch question bank') { write('_question_bank/q1.md', "q1 v2\n") }
  end

  # --- shallow-clone check --------------------------------------------------

  def test_full_repository_is_not_shallow
    refute ChangeLog.shallow?(@repo)
    ChangeLog.assert_full_history!(@repo) # does not raise
  end

  def test_shallow_clone_is_rejected
    shallow = File.join(@dir, 'shallow')
    out, status = Open3.capture2e('git', 'clone', '-q', '--depth', '1', "file://#{@repo}", shallow)
    assert status.success?, out

    assert ChangeLog.shallow?(shallow)
    error = assert_raises(ChangeLog::ShallowRepositoryError) { ChangeLog.commits(repo: shallow) }
    assert_includes error.message, 'fetch-depth: 0'
  end

  def test_not_a_repository_raises
    plain = File.join(@dir, 'plain')
    FileUtils.mkdir_p(plain)
    assert_raises(ChangeLog::GitError) { ChangeLog.commits(repo: plain) }
  end

  # --- history --------------------------------------------------------------

  def test_commits_are_newest_first_in_regina_time
    commits = ChangeLog.commits(repo: @repo)
    assert_equal ['touch question bank', 'remove tmp', 'add tmp', TRICKY,
                  'rename syllabus', 'add syllabus and index'], commits.map(&:subject)
    assert(commits.all? { |c| c.time.utc_offset == -6 * 3600 })

    rename = commits.find { |c| c.subject == 'rename syllabus' }
    assert_equal '2026-09-02T06:00:00-06:00', rename.time.iso8601 # was 12:00 UTC
  end

  def test_rename_records_both_paths
    rename = ChangeLog.commits(repo: @repo).find { |c| c.subject == 'rename syllabus' }
    change = rename.files.fetch(0)
    assert_equal 'R', change.status
    assert_equal 'teaching/syllabus.md', change.old_path
    assert_equal 'teaching/outline.md', change.path
  end

  def test_except_drops_files_and_empty_commits
    commits = ChangeLog.commits(repo: @repo, except: ['_question_bank/'])
    refute_includes commits.map(&:subject), 'touch question bank'
    paths = commits.flat_map { |c| c.files.map(&:path) }
    assert(paths.none? { |p| p.start_with?('_question_bank') })
    assert_includes commits.map(&:subject), 'add syllabus and index' # kept, minus the q-bank file
  end

  def test_only_keeps_matching_prefix
    subjects = ChangeLog.commits(repo: @repo, only: ['teaching/']).map(&:subject)
    assert_equal ['rename syllabus', 'add syllabus and index'], subjects
  end

  def test_repo_below_the_root_reports_relative_paths
    commits = ChangeLog.commits(repo: File.join(@repo, 'teaching'))
    paths = commits.flat_map { |c| c.files.flat_map { |f| [f.path, f.old_path] } }.compact.uniq.sort
    assert_equal %w[outline.md syllabus.md], paths
  end

  # --- last-modified map ----------------------------------------------------

  def test_last_changes
    last = ChangeLog.last_changes(ChangeLog.commits(repo: @repo))
    assert_equal TRICKY, last.fetch('index.md').subject
    assert_equal 'rename syllabus', last.fetch('teaching/outline.md').subject
    assert_equal 'touch question bank', last.fetch('_question_bank/q1.md').subject
    refute last.key?('tmp.md'), 'deleted file must be absent'
    refute last.key?('teaching/syllabus.md'), 'old side of a rename must be absent'
  end

  def test_page_rows_are_newest_first_and_skip_unknown_pages
    last = ChangeLog.last_changes(ChangeLog.commits(repo: @repo, except: ['_question_bank/']))
    urls = { 'index.md' => '/', 'teaching/outline.md' => '/teaching/outline/', 'no-such.md' => '/x/' }
    rows = ChangeLog.page_rows(last, urls, REPO_URL)
    assert_equal %w[index.md teaching/outline.md], rows.map { |r| r['path'] }
    assert_equal '2026-09-03', rows.first['modified_date']
    assert_match %r{\Ahttps://github.com/example/site/commit/\h{40}\.diff\z}, rows.first['diff_url']
  end

  # --- Atom -----------------------------------------------------------------

  def feed(**opts)
    commits = ChangeLog.commits(repo: @repo, except: ['_question_bank/'])
    ChangeLog.atom(commits: commits, title: 'Site changes', feed_url: 'https://example.org/changes.xml',
                   site_url: 'https://example.org/', repo_url: REPO_URL,
                   page_urls: { 'index.md' => 'https://example.org/' }, **opts)
  end

  def test_atom_is_well_formed_and_escapes_commit_subjects
    doc = REXML::Document.new(feed) # raises on malformed XML
    entries = REXML::XPath.match(doc, '//entry')
    assert_equal 5, entries.size
    titles = entries.map { |e| REXML::XPath.first(e, 'title').text }
    assert_includes titles, TRICKY # specials survive the round trip
    assert_equal '2026-09-05T09:00:00-06:00', REXML::XPath.first(doc, '/feed/updated').text
  end

  def test_atom_links_diffs_and_pages
    xml = feed
    assert_match %r{https://github.com/example/site/commit/\h{40}\.diff}, xml
    assert_includes xml, '&lt;a href=&quot;https://example.org/&quot;&gt;index.md&lt;/a&gt;'
  end

  def test_atom_respects_limit
    assert_equal 2, REXML::XPath.match(REXML::Document.new(feed(limit: 2)), '//entry').size
  end

  def test_empty_atom_is_still_valid
    xml = ChangeLog.atom(commits: [], title: 't', feed_url: 'https://e/x.xml', site_url: 'https://e/', repo_url: REPO_URL)
    assert_equal 0, REXML::XPath.match(REXML::Document.new(xml), '//entry').size
  end
end

# ---------------------------------------------------------------------------
# Globs, ignore-revs, dependencies, titles, row cap, file cap
#
#   1  2026-08-01  bulk import     7 files: two offerings (index.md + notes.md /
#                                  plan.yml data), build/dist/app.js, a .swp file
#   2  2026-08-05  edit notes      CS-1 notes.md
#   3  2026-09-01  reformat everything   (IGNORED) touches CS-1 index+notes,
#                                  adds only-ignored.md, touches CS-2 plan.yml
#   4  2026-09-10  move notes      (IGNORED) renames notes.md -> docs/notes.md
#   5  2026-09-15  update plan     CS-1 plan.yml
#   6  2026-09-20  rebuild         build/dist/app.js and the .swp file
# ---------------------------------------------------------------------------
class ChangeLogFeaturesTest < Minitest::Test
  include GitRepoHelper

  CS1_INDEX = 'teaching/CS-1/T1/index.md'
  CS2_INDEX = 'teaching/CS-2/T2/index.md'
  DEPENDS = [{ 'page' => 'teaching/(?<course>[^/]+)/(?<term>[^/]+)/index\.md',
               'from' => ['_data/teaching/%{course}/%{term}/'] }].freeze

  def build_history
    commit('2026-08-01T10:00:00-06:00', 'bulk import') do
      write(CS1_INDEX, "cs1\n")
      write('teaching/CS-1/T1/notes.md', "notes\n")
      write('_data/teaching/CS-1/T1/plan.yml', "plan: 1\n")
      write(CS2_INDEX, "cs2\n")
      write('_data/teaching/CS-2/T2/plan.yml', "plan: 1\n")
      write('build/dist/app.js', "v1\n")
      write('teaching/.junk.swp', "x\n")
    end
    commit('2026-08-05T10:00:00-06:00', 'edit notes') { write('teaching/CS-1/T1/notes.md', "notes v2\n") }
    commit('2026-09-01T10:00:00-06:00', 'reformat everything') do
      write(CS1_INDEX, "cs1 \n")
      write('teaching/CS-1/T1/notes.md', "notes v2 \n")
      write('teaching/CS-1/T1/only-ignored.md', "x\n")
      write('_data/teaching/CS-2/T2/plan.yml', "plan: 1 \n")
    end
    commit('2026-09-10T10:00:00-06:00', 'move notes') do
      FileUtils.mkdir_p(File.join(@repo, 'teaching/CS-1/T1/docs'))
      git(@repo, 'mv', 'teaching/CS-1/T1/notes.md', 'teaching/CS-1/T1/docs/notes.md')
    end
    commit('2026-09-15T10:00:00-06:00', 'update plan') { write('_data/teaching/CS-1/T1/plan.yml', "plan: 2\n") }
    commit('2026-09-20T10:00:00-06:00', 'rebuild') do
      write('build/dist/app.js', "v2\n")
      write('teaching/.junk.swp', "y\n")
    end
    @ignored = [sha_of('reformat everything'), sha_of('move notes')]
  end

  def all_commits(**opts)
    ChangeLog.commits(repo: @repo, ignore_revs: @ignored, **opts)
  end

  # --- patterns in except / only -------------------------------------------

  def test_glob_and_directory_excludes
    commits = all_commits(except: ['*.swp', 'build/dist/'])
    paths = commits.flat_map { |c| c.files.map(&:path) }
    assert(paths.none? { |p| p.end_with?('.swp') || p.start_with?('build/') })
    refute_includes commits.map(&:subject), 'rebuild' # it only touched excluded files
  end

  def test_glob_with_wildcard_directory
    commits = all_commits(except: ['teaching/*/T2/', '_data/teaching/*/T2/'])
    paths = commits.flat_map { |c| c.files.map(&:path) }
    assert(paths.none? { |p| p.include?('/T2/') })
  end

  # --- ignore-revs ----------------------------------------------------------

  def test_ignored_commits_are_flagged_by_abbreviated_sha
    commits = ChangeLog.commits(repo: @repo, ignore_revs: [sha_of('move notes')[0, 8]])
    assert_equal ['move notes'], commits.select(&:ignored).map(&:subject)
  end

  def test_read_ignore_revs
    path = File.join(@dir, 'ignore')
    File.write(path, "# bulk commits\n\n#{@ignored[0]}  # reformat\nABCDEF1\n")
    assert_equal [@ignored[0], 'abcdef1'], ChangeLog.read_ignore_revs(path)
  end

  def test_read_ignore_revs_is_loud_about_problems
    assert_raises(ChangeLog::Error) { ChangeLog.read_ignore_revs(File.join(@dir, 'nope')) }
    path = File.join(@dir, 'bad')
    File.write(path, "not-a-sha\n")
    error = assert_raises(ChangeLog::Error) { ChangeLog.read_ignore_revs(path) }
    assert_includes error.message, ':1:'
  end

  def test_ignored_commits_do_not_set_page_dates
    last = ChangeLog.last_changes(all_commits)
    assert_equal 'bulk import', last.fetch(CS1_INDEX).subject # not "reformat everything"
    assert_equal 'edit notes', last.fetch('teaching/CS-1/T1/docs/notes.md').subject
  end

  def test_rename_in_an_ignored_commit_is_followed
    last = ChangeLog.last_changes(all_commits)
    refute last.key?('teaching/CS-1/T1/notes.md'), 'old name must be absent'
    assert last.key?('teaching/CS-1/T1/docs/notes.md')
  end

  def test_file_touched_only_by_ignored_commits_falls_back_to_them
    last = ChangeLog.last_changes(all_commits)
    assert_equal 'reformat everything', last.fetch('teaching/CS-1/T1/only-ignored.md').subject
  end

  def test_without_an_ignore_list_nothing_changes
    last = ChangeLog.last_changes(ChangeLog.commits(repo: @repo))
    assert_equal 'reformat everything', last.fetch(CS1_INDEX).subject
    assert_equal 'move notes', last.fetch('teaching/CS-1/T1/docs/notes.md').subject
  end

  def test_bulk_commits_finds_the_big_ones
    bulk = ChangeLog.bulk_commits(ChangeLog.commits(repo: @repo), 4)
    assert_equal ['reformat everything', 'bulk import'], bulk.map(&:subject)
  end

  # --- dependencies ---------------------------------------------------------

  def test_page_inherits_a_newer_dependency_change
    commits = all_commits
    last = ChangeLog.last_changes(commits)
    pages = [CS1_INDEX, CS2_INDEX]
    effective, via = ChangeLog.apply_dependencies(last, commits, ChangeLog.rules(DEPENDS), pages)

    assert_equal 'update plan', effective.fetch(CS1_INDEX).subject
    assert_equal '_data/teaching/CS-1/T1/plan.yml', via.fetch(CS1_INDEX)
  end

  def test_dependency_changed_only_by_an_ignored_commit_does_not_count
    commits = all_commits
    effective, via = ChangeLog.apply_dependencies(ChangeLog.last_changes(commits), commits,
                                                  ChangeLog.rules(DEPENDS), [CS2_INDEX])
    assert_equal 'bulk import', effective.fetch(CS2_INDEX).subject
    refute via.key?(CS2_INDEX)
  end

  def test_page_without_history_of_its_own_gets_a_date_from_dependencies
    commits = all_commits
    effective, via = ChangeLog.apply_dependencies({}, commits, ChangeLog.rules(DEPENDS), [CS1_INDEX])
    assert_equal 'update plan', effective.fetch(CS1_INDEX).subject
    assert via.key?(CS1_INDEX)
  end

  def test_no_rules_changes_nothing
    last = ChangeLog.last_changes(all_commits)
    effective, via = ChangeLog.apply_dependencies(last, all_commits, [], [CS1_INDEX])
    assert_equal last, effective
    assert_empty via
  end

  def test_rules_validate_their_configuration
    assert_raises(ChangeLog::Error) { ChangeLog.rules([{ 'page' => 'x' }]) }
    assert_raises(ChangeLog::Error) { ChangeLog.rules([{ 'page' => '(', 'from' => ['a/'] }]) }
    error = assert_raises(ChangeLog::Error) do
      ChangeLog.rules([{ 'page' => 'teaching/(?<course>[^/]+)/index\.md', 'from' => ['_data/%{term}/'] }])
    end
    assert_includes error.message, '%{term}'
  end

  def test_rules_load_from_yaml_text_as_jekyll_would_read_it
    config = YAML.safe_load(<<~YAML)
      depends:
        - page: 'teaching/(?<course>[^/]+)/(?<term>\\d{6})/index\\.md'
          from:
            - '_data/teaching/%{course}/%{term}/'
    YAML
    rule = ChangeLog.rules(config['depends']).first
    assert_equal ['_data/teaching/CS-428+828/202230/'], rule.expand('teaching/CS-428+828/202230/index.md')
    assert_nil rule.expand('teaching/CS-428+828/202230/01_meeting.md')
  end

  def test_the_yaml_boolean_trap_is_reported_helpfully
    config = YAML.safe_load("depends:\n  - page: 'a'\n    on:\n      - 'b/'\n")
    error = assert_raises(ChangeLog::Error) { ChangeLog.rules(config['depends']) }
    assert_includes error.message, '`from:`'
  end

  # --- table: titles, via note, row cap -------------------------------------

  def table(**opts)
    commits = all_commits
    effective, via = ChangeLog.apply_dependencies(ChangeLog.last_changes(commits), commits,
                                                  ChangeLog.rules(DEPENDS), [CS1_INDEX, CS2_INDEX])
    urls = { CS1_INDEX => '/teaching/CS-1/T1/', CS2_INDEX => '/teaching/CS-2/T2/' }
    ChangeLog.page_table(effective, urls, REPO_URL, titles: { CS1_INDEX => 'CS-1 (Term 1)' }, via: via, **opts)
  end

  def test_table_uses_titles_and_explains_dependency_dates
    rows = table['pages']
    cs1 = rows.find { |r| r['path'] == CS1_INDEX }
    cs2 = rows.find { |r| r['path'] == CS2_INDEX }
    assert_equal 'CS-1 (Term 1)', cs1['title']
    assert_equal 'update plan (via _data/teaching/CS-1/T1/plan.yml)', cs1['change']
    assert_equal CS2_INDEX, cs2['title'], 'path stands in when there is no title'
    assert_equal 'bulk import', cs2['change']
  end

  def test_table_row_cap_and_summary
    capped = table(limit: 1)
    assert_equal 1, capped['pages'].size
    assert_equal 2, capped['total']
    assert_equal 'Showing the 1 most recently changed of 2 pages.', capped['summary']
    assert_equal '2 pages.', table['summary']
  end

  # --- Atom: file cap -------------------------------------------------------

  def test_atom_caps_the_file_list_and_lists_pages_first
    commits = all_commits.reject(&:ignored)
    xml = ChangeLog.atom(commits: commits, title: 't', feed_url: 'https://e/x.xml', site_url: 'https://e/',
                         repo_url: REPO_URL, max_files: 3,
                         page_urls: { CS1_INDEX => 'https://e/cs1/', CS2_INDEX => 'https://e/cs2/' })
    doc = REXML::Document.new(xml)
    import = REXML::XPath.match(doc, '//entry').find { |e| REXML::XPath.first(e, 'title').text == 'bulk import' }
    html = REXML::XPath.first(import, 'content').text

    assert_includes html, '<a href="https://e/cs1/">'
    assert_includes html, '<a href="https://e/cs2/">'
    assert_equal 4, html.scan('<li>').size # 3 files + the "and N more" line
    assert_includes html, "\u2026and 4 more files"
  end

  def test_atom_feed_leaves_out_ignored_commits_when_given_only_real_ones
    commits = all_commits.reject(&:ignored)
    subjects = REXML::XPath.match(REXML::Document.new(
                                    ChangeLog.atom(commits: commits, title: 't', feed_url: 'https://e/x.xml',
                                                   site_url: 'https://e/', repo_url: REPO_URL)
                                  ), '//entry/title').map(&:text)
    refute_includes subjects, 'reformat everything'
    refute_includes subjects, 'move notes'
  end
end