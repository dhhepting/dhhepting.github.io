# frozen_string_literal: true

require_relative '../lib/change_log'

# Thin Jekyll wrapper around lib/change_log.rb (all logic lives there).
#
# Opt-in via _config.yml.  Only repo_url is required:
#
#   changes:
#     enabled: true                  # false or absent section = do nothing
#     repo_url: https://github.com/dhhepting/dhhepting.github.io
#     site_url: https://example.org  # default: `url` + `baseurl`.  Root of THIS
#                                    # host's site; feed readers need absolute URLs.
#     limit: 50                      # entries per feed
#     max_files: 15                  # files listed per feed entry, then "...and N more"
#     page_limit: 100                # rows in the /changes/ table
#     ignore_revs: .changes-ignore-revs   # bulk commits (see `rake changes:bulk`)
#     only: []                       # patterns to include; [] = everything
#     exclude:                       # patterns never to publish: prefixes or globs
#       - _question_bank/
#       - '*.swp'
#     depends:                       # a page also changes when these files do
#       - page: 'teaching/(?<course>[^/]+)/(?<term>\d{6})/index\.md'
#         from: ['_data/teaching/%{course}/%{term}/']
#     feeds:
#       - path: changes.xml
#         title: Site changes
#       - path: teaching/CS-315/202630/changes.xml
#         title: CS-315 changes
#         only: [teaching/CS-315/202630/, _meeting_pages/CS-315/202630/]
#
# Produces:
#   * one Atom feed per entry in `feeds` (one entry per commit, diff linked)
#   * site.data['changes'] = { 'pages', 'total', 'summary' } for changes.md
module Jekyll
  class ChangesGenerator < Generator
    safe true
    priority :low # run after the generators that add PageWithoutAFile pages

    def generate(site)
      cfg = site.config['changes']
      return if cfg.nil? || cfg['enabled'] == false

      repo_url = require_setting(cfg, 'repo_url')
      site_url = (cfg['site_url'] || default_site_url(site)).chomp('/')
      only     = Array(cfg['only'])
      ignore   = read_ignore_revs(site, cfg)
      rules    = ChangeLog.rules(cfg['depends'])

      # `only` narrows what is published, never what pages can depend on, so
      # history is read without it; `exclude` applies everywhere.
      history = ChangeLog.commits(repo: site.source, except: Array(cfg['exclude']), ignore_revs: ignore)

      urls, titles = source_info(site)
      urls = urls.select { |path, _| only.empty? || ChangeLog.matches_any?(path, only) }
      changes, via = ChangeLog.apply_dependencies(ChangeLog.last_changes(history), history, rules, urls.keys)
      site.data['changes'] = ChangeLog.page_table(changes, urls, repo_url, titles: titles, via: via,
                                                                          limit: cfg.fetch('page_limit', 100))

      published = ChangeLog.select(history.reject(&:ignored), only: only)
      absolute = urls.transform_values { |u| "#{site_url}#{u}" }
      Array(cfg['feeds'] || [{ 'path' => 'changes.xml', 'title' => 'Site changes' }]).each do |feed|
        add_feed(site, feed, published, absolute, site_url, repo_url, cfg)
      end
    rescue ChangeLog::Error => e
      raise Jekyll::Errors::FatalException, "changes: #{e.message}"
    end

    private

    def add_feed(site, feed, commits, absolute_urls, site_url, repo_url, cfg)
      feed_path = feed.fetch('path')
      scoped = ChangeLog.select(commits, only: Array(feed['only']))
      xml = ChangeLog.atom(commits: scoped,
                           title: feed.fetch('title', 'Site changes'),
                           feed_url: "#{site_url}/#{feed_path}",
                           site_url: site_url,
                           repo_url: repo_url,
                           page_urls: absolute_urls,
                           limit: cfg.fetch('limit', 50),
                           max_files: cfg.fetch('max_files', 15))

      dir = File.dirname(feed_path)
      page = PageWithoutAFile.new(site, site.source, dir == '.' ? '' : dir, File.basename(feed_path))
      page.content = xml
      page.data['layout'] = nil               # no layout around XML
      page.data['sitemap'] = false
      page.data['render_with_liquid'] = false # commit subjects may contain {{ or {%
      site.pages << page
    end

    # [{ source path => page url }, { source path => title }] for every HTML
    # page and collection document.  Generated pages that have no source file
    # simply never appear in git's output and are dropped later.
    def source_info(site)
      urls = {}
      titles = {}
      site.pages.each do |page|
        next unless page.output_ext == '.html'

        urls[page.path] = page.url
        titles[page.path] = page.data['title']
      end
      site.collections.each_value do |collection|
        collection.docs.each do |doc|
          next unless doc.output_ext == '.html'

          urls[doc.relative_path] = doc.url
          titles[doc.relative_path] = doc.data['title']
        end
      end
      [urls, titles]
    end

    def read_ignore_revs(site, cfg)
      return [] unless cfg['ignore_revs']

      ChangeLog.read_ignore_revs(File.join(site.source, cfg['ignore_revs']))
    end

    def default_site_url(site)
      url = site.config['url'].to_s
      raise Jekyll::Errors::InvalidConfigurationError, 'changes: set `changes.site_url` or the top-level `url`' if url.empty?

      "#{url}#{site.config['baseurl']}"
    end

    def require_setting(cfg, key)
      cfg[key] || raise(Jekyll::Errors::InvalidConfigurationError, "changes: `changes.#{key}` is required")
    end
  end
end