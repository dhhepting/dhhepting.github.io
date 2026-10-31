# frozen_string_literal: true

# Exercises _plugins/changes_generator.rb against STUB Jekyll classes and a
# real throwaway git repository.  It checks our wiring (config handling, which
# pages and titles are collected, feeds written, errors raised).  It does NOT
# prove how real Jekyll treats the pages we add; only a real `jekyll build`
# does that.  Skipped when real Jekyll is loaded.

require 'minitest/autorun'
require 'rexml/document'
require 'change_log'
require_relative 'git_repo_helper'

REAL_JEKYLL = defined?(::Jekyll::Generator) ? true : false

unless REAL_JEKYLL
  module Jekyll
    class Generator
      def self.safe(*); end

      def self.priority(*); end
    end

    class PageWithoutAFile
      attr_reader :site, :base, :dir, :name
      attr_accessor :content, :data

      def initialize(site, base, dir, name)
        @site = site
        @base = base
        @dir = dir
        @name = name
        @data = {}
      end

      def relative_path
        File.join(*[dir, name].reject(&:empty?))
      end
    end

    module Errors
      class FatalException < RuntimeError; end
      class InvalidConfigurationError < FatalException; end
    end
  end

  require_relative '../_plugins/changes_generator'
end

FakePage = Struct.new(:path, :url, :output_ext, :data)
FakeDoc = Struct.new(:relative_path, :url, :output_ext, :data)
FakeCollection = Struct.new(:docs)
FakeSite = Struct.new(:source, :config, :pages, :collections, :data)

class ChangesGeneratorTest < Minitest::Test
  include GitRepoHelper

  def build_history
    commit('2026-08-01T10:00:00-06:00', 'bulk import') do
      write('index.md', "home\n")
      write('teaching/CS-1/T1/index.md', "cs1\n")
      write('_data/teaching/CS-1/T1/plan.yml', "plan: 1\n")
      write('_meeting_pages/CS-1/T1/01.creole', "m1\n")
      write('_question_bank/q1.md', "secret\n")
      write('dist/app.js', "v1\n")
    end
    commit('2026-09-01T10:00:00-06:00', 'reformat everything') { write('index.md', "home \n") }
    commit('2026-09-15T10:00:00-06:00', 'update plan {{ x }}') { write('_data/teaching/CS-1/T1/plan.yml', "plan: 2\n") }
    commit('2026-09-16T10:00:00-06:00', 'meeting 1') { write('_meeting_pages/CS-1/T1/01.creole', "m1 v2\n") }
    commit('2026-09-17T10:00:00-06:00', 'touch secret') { write('_question_bank/q1.md', "secret 2\n") }
    File.write(File.join(@repo, '.changes-ignore-revs'), "#{sha_of('reformat everything')}  # bulk\n")
  end

  def config(**overrides)
    { 'url' => 'https://example.org', 'baseurl' => '',
      'changes' => { 'repo_url' => REPO_URL, 'exclude' => ['_question_bank/', 'dist/'],
                     'ignore_revs' => '.changes-ignore-revs',
                     'depends' => [{ 'page' => 'teaching/(?<course>[^/]+)/(?<term>[^/]+)/index\.md',
                                     'from' => ['_data/teaching/%{course}/%{term}/'] }],
                     'feeds' => [{ 'path' => 'changes.xml', 'title' => 'All' },
                                 { 'path' => 'teaching/CS-1/T1/changes.xml', 'title' => 'CS-1',
                                   'only' => ['teaching/CS-1/T1/', '_meeting_pages/CS-1/T1/'] }] }
                     .merge(overrides) }
  end

  def site(cfg = config, extra_pages: [])
    pages = [FakePage.new('index.md', '/', '.html', { 'title' => 'Home' }),
             FakePage.new('teaching/CS-1/T1/index.md', '/teaching/CS-1/T1/', '.html', { 'title' => 'CS-1 Term 1' }),
             FakePage.new('style.css', '/style.css', '.css', {}),
             FakePage.new('generated/no-source.html', '/generated/', '.html', {})]
    docs = FakeCollection.new([FakeDoc.new('_meeting_pages/CS-1/T1/01.creole', '/meetings/1/', '.html',
                                           { 'title' => 'Meeting 1' })])
    FakeSite.new(@repo, cfg, pages + extra_pages, { 'meeting_pages' => docs }, {})
  end

  def generate(site)
    Jekyll::ChangesGenerator.new.generate(site)
    site
  end

  def feed_page(site, path)
    site.pages.find { |p| p.is_a?(Jekyll::PageWithoutAFile) && p.relative_path == path }
  end

  def titles(page)
    REXML::XPath.match(REXML::Document.new(page.content), '//entry/title').map(&:text)
  end

  def setup
    super
    skip 'real Jekyll is loaded; this test uses stubs' if REAL_JEKYLL
  end

  # --- feeds ----------------------------------------------------------------

  def test_writes_each_configured_feed_as_a_non_liquid_page_without_layout
    site = generate(site())
    all = feed_page(site, 'changes.xml')
    scoped = feed_page(site, 'teaching/CS-1/T1/changes.xml')

    refute_nil all
    refute_nil scoped
    assert_equal 'teaching/CS-1/T1', scoped.dir
    assert_equal '', all.dir
    [all, scoped].each do |page|
      assert_equal false, page.data['render_with_liquid']
      assert page.data.key?('layout') && page.data['layout'].nil?
      assert_equal false, page.data['sitemap']
    end
  end

  def test_feed_content_respects_excludes_ignore_list_and_per_feed_only
    site = generate(site())
    assert_equal ['meeting 1', 'update plan {{ x }}', 'bulk import'], titles(feed_page(site, 'changes.xml'))
    # the plan.yml change lives under _data/, outside this feed's `only` patterns
    assert_equal ['meeting 1', 'bulk import'], titles(feed_page(site, 'teaching/CS-1/T1/changes.xml'))

    only_cs1 = config
    only_cs1['changes']['only'] = ['index.md']
    scoped = generate(site(only_cs1))
    assert_equal ['bulk import'], titles(feed_page(scoped, 'changes.xml')) # reformat is ignored
  end

  def test_feed_urls_are_absolute_and_use_url_plus_baseurl
    cfg = config
    cfg['baseurl'] = '/~me'
    page = feed_page(generate(site(cfg)), 'changes.xml')
    assert_includes page.content, '<id>https://example.org/~me/changes.xml</id>'
    assert_includes page.content, 'rel="alternate" type="text/html" href="https://example.org/~me"'
  end

  def test_site_url_setting_overrides_url_and_baseurl
    cfg = config
    cfg['changes']['site_url'] = 'https://elsewhere.example/site/'
    page = feed_page(generate(site(cfg)), 'changes.xml')
    assert_includes page.content, '<id>https://elsewhere.example/site/changes.xml</id>'
  end

  # --- table data -----------------------------------------------------------

  def test_table_rows_use_titles_dependencies_and_ignore_list
    rows = generate(site).data['changes']['pages']
    by_path = rows.to_h { |r| [r['path'], r] }

    assert_equal 'Home', by_path['index.md']['title']
    assert_equal 'bulk import', by_path['index.md']['change'], 'ignored reformat must not set the date'
    assert_equal 'CS-1 Term 1', by_path['teaching/CS-1/T1/index.md']['title']
    assert_equal 'update plan {{ x }} (via _data/teaching/CS-1/T1/plan.yml)',
                 by_path['teaching/CS-1/T1/index.md']['change']
    assert_equal 'Meeting 1', by_path['_meeting_pages/CS-1/T1/01.creole']['title']
    refute by_path.key?('style.css'), 'only HTML pages are listed'
    refute by_path.key?('generated/no-source.html'), 'pages without a source file are dropped'
  end

  def test_page_limit_is_applied
    data = generate(site(config('page_limit' => 1))).data['changes']
    assert_equal 1, data['pages'].size
    assert_equal 3, data['total']
    assert_equal 'Showing the 1 most recently changed of 3 pages.', data['summary']
  end

  def test_global_only_narrows_the_table_but_not_dependencies
    data = generate(site(config('only' => ['teaching/']))).data['changes']
    assert_equal ['teaching/CS-1/T1/index.md'], data['pages'].map { |r| r['path'] }
    assert_includes data['pages'].first['change'], '_data/teaching/CS-1/T1/plan.yml' # outside `only`, still counted
  end

  # --- per-feed HTML pages ----------------------------------------------------

  def config_with_page(**feed_overrides)
    cfg = config
    cfg['changes']['feeds'][1].merge!('page' => true, **feed_overrides)
    cfg
  end

  def test_feed_with_page_true_also_writes_an_html_page_next_to_it
    site = generate(site(config_with_page))
    page = feed_page(site, 'teaching/CS-1/T1/changes/index.html')

    refute_nil page
    assert_equal 'teaching/CS-1/T1/changes', page.dir
    assert_equal 'index.html', page.name
    assert_equal 'CS-1', page.data['title']
    assert_includes page.content, '{% include changes-table.html data=page.changes %}'
    assert_includes page.content, '{{ page.changes.feed | relative_url }}'
    refute page.data.key?('layout'), 'left to the site front-matter defaults'
    assert_nil feed_page(site, 'changes/index.html'), 'a feed without `page:` gets none'
  end

  def test_page_table_is_scoped_to_the_feed
    site = generate(site(config_with_page))
    table = feed_page(site, 'teaching/CS-1/T1/changes/index.html').data['changes']

    assert_equal '/teaching/CS-1/T1/changes.xml', table['feed']
    assert_equal ['_meeting_pages/CS-1/T1/01.creole', 'teaching/CS-1/T1/index.md'], table['pages'].map { |r| r['path'] }
    assert_equal 2, table['total']
    assert_equal 3, site.data['changes']['total'], 'the site-wide table is unaffected'
  end

  def test_scoped_rows_keep_dependency_dates
    table = feed_page(generate(site(config_with_page)), 'teaching/CS-1/T1/changes/index.html').data['changes']
    index = table['pages'].find { |r| r['path'] == 'teaching/CS-1/T1/index.md' }
    assert_includes index['change'], '(via _data/teaching/CS-1/T1/plan.yml)'
  end

  def test_page_limit_and_layout_can_be_set_per_feed
    page = feed_page(generate(site(config_with_page('page_limit' => 1, 'layout' => 'wide'))),
                     'teaching/CS-1/T1/changes/index.html')
    assert_equal 1, page.data['changes']['pages'].size
    assert_equal 2, page.data['changes']['total']
    assert_equal 'wide', page.data['layout']
  end

  def test_site_wide_page_layout_is_the_fallback
    cfg = config_with_page
    cfg['changes']['page_layout'] = 'default'
    page = feed_page(generate(site(cfg)), 'teaching/CS-1/T1/changes/index.html')
    assert_equal 'default', page.data['layout']
  end

  def test_page_can_be_put_in_any_directory
    page = feed_page(generate(site(config_with_page('page' => '/where/else/'))), 'where/else/index.html')
    refute_nil page
    assert_equal 'where/else', page.dir
  end

  def test_feed_points_at_its_page_as_the_human_readable_alternate
    site = generate(site(config_with_page))
    scoped = feed_page(site, 'teaching/CS-1/T1/changes.xml').content
    all = feed_page(site, 'changes.xml').content
    assert_includes scoped, 'rel="alternate" type="text/html" href="https://example.org/teaching/CS-1/T1/changes/"'
    assert_includes all, 'rel="alternate" type="text/html" href="https://example.org"'
  end

  def test_a_generated_page_may_not_overwrite_an_existing_page
    existing = FakePage.new('changes.md', '/changes/', '.html', {})
    cfg = config
    cfg['changes']['feeds'][0]['page'] = true # changes.xml -> /changes/
    error = assert_raises(Jekyll::Errors::InvalidConfigurationError) { generate(site(cfg, extra_pages: [existing])) }
    assert_includes error.message, '/changes/'
  end

  def test_page_true_needs_an_xml_feed_path_and_a_page_directory_must_not_be_empty
    cfg = config
    cfg['changes']['feeds'][0] = { 'path' => 'feed.atom', 'page' => true }
    assert_raises(Jekyll::Errors::InvalidConfigurationError) { generate(site(cfg)) }

    cfg['changes']['feeds'][0] = { 'path' => 'changes.xml', 'page' => '/' }
    assert_raises(Jekyll::Errors::InvalidConfigurationError) { generate(site(cfg)) }
  end

  # --- on/off and errors ------------------------------------------------------

  def test_does_nothing_without_a_changes_section_or_when_disabled
    bare = site(config)
    bare.config.delete('changes')
    generate(bare)
    assert_equal 4, bare.pages.size
    assert_empty bare.data

    off = generate(site(config('enabled' => false)))
    assert_equal 4, off.pages.size
  end

  def test_missing_repo_url_is_a_configuration_error
    cfg = config
    cfg['changes'].delete('repo_url')
    error = assert_raises(Jekyll::Errors::InvalidConfigurationError) { generate(site(cfg)) }
    assert_includes error.message, 'repo_url'
  end

  def test_missing_url_is_a_configuration_error
    cfg = config
    cfg['url'] = ''
    assert_raises(Jekyll::Errors::InvalidConfigurationError) { generate(site(cfg)) }
  end

  def test_bad_ignore_file_fails_the_build
    cfg = config('ignore_revs' => 'does-not-exist')
    error = assert_raises(Jekyll::Errors::FatalException) { generate(site(cfg)) }
    assert_includes error.message, 'ignore_revs file not found'
  end

  def test_shallow_clone_fails_the_build_with_the_fix_in_the_message
    shallow = File.join(@dir, 'shallow')
    out, status = Open3.capture2e('git', 'clone', '-q', '--depth', '1', "file://#{@repo}", shallow)
    assert status.success?, out
    s = site
    s.source = shallow
    s.config['changes'].delete('ignore_revs') # the ignore file is untracked, so absent from the clone

    error = assert_raises(Jekyll::Errors::FatalException) { generate(s) }
    assert_includes error.message, 'fetch-depth: 0'
  end

  def test_bad_dependency_rule_fails_the_build
    cfg = config('depends' => [{ 'page' => 'x', 'from' => ['%{nope}'] }])
    assert_raises(Jekyll::Errors::FatalException) { generate(site(cfg)) }
  end
end