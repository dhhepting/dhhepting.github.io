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
#     page_limit: 100                # rows in each changes table
#     page_layout: default           # layout for generated pages (default: your
#                                    # front-matter defaults for pages apply)
#     ignore_revs: .changes-ignore-revs   # bulk commits (see `rake changes:bulk`)
#     only: []                       # patterns to include; [] = everything
#     exclude:                       # patterns never to publish: prefixes or globs
#       - _question_bank/
#       - '*.swp'
#     depends:                       # pages are built from these files
#       - page: 'teaching/(?<course>[^/]+)/(?<term>\d{6})/index\.md'
#         from: ['_data/teaching/%{course}/%{term}/']
#     feeds:
#       - path: changes.xml
#         title: Site changes
#       - path: teaching/CS-315/202630/changes.xml
#         title: CS-315 changes
#         only: [teaching/CS-315/202630/, _meeting_pages/CS-315/202630/]
#         page: true               # also write /teaching/CS-315/202630/changes/
#         # page: some/other/dir/  # ...or put the page elsewhere
#         # layout: wide           # ...optionally with its own layout
#         # page_limit: 50
#
# Produces:
#   * one Atom feed per entry in `feeds` (one entry per commit, diff linked)
#   * for feeds with `page:`, an HTML page showing the same scope as a table
#     (it needs _includes/changes-table.html)
#   * site.data['changes'] = { 'pages', 'total', 'summary' } for changes.md
module Jekyll
  class ChangesGenerator < Generator
    safe true
    priority :low # run after the generators that add PageWithoutAFile pages

    # What every generated page contains; the table markup lives in the include.
    PAGE_CONTENT = <<~HTML
      <p>Subscribe: <a href="{{ page.changes.feed | relative_url }}">Atom feed</a></p>
      {% include changes-table.html data=page.changes %}
    HTML

    Build = Struct.new(:cfg, :repo_url, :site_url, :urls, :existing_urls, :titles, :changes, :via,
                       :commits, keyword_init: true)

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

      all_urls, titles = source_info(site)
      urls = all_urls.select { |path, _| only.empty? || ChangeLog.matches_any?(path, only) }
      changes, via = ChangeLog.apply_dependencies(ChangeLog.last_changes(history), history, rules, urls.keys)
      site.data['changes'] = ChangeLog.page_table(changes, urls, repo_url, titles: titles, via: via,
                                                                          limit: cfg.fetch('page_limit', 100))

      build = Build.new(cfg: cfg, repo_url: repo_url, site_url: site_url, urls: urls,
                        existing_urls: all_urls.values, titles: titles, changes: changes, via: via,
                        commits: ChangeLog.select(history.reject(&:ignored), only: only))
      Array(cfg['feeds'] || [{ 'path' => 'changes.xml', 'title' => 'Site changes' }]).each do |feed|
        add_feed(site, feed, build)
      end
    rescue ChangeLog::Error => e
      raise Jekyll::Errors::FatalException, "changes: #{e.message}"
    end

    private

    def add_feed(site, feed, build)
      feed_path = feed.fetch('path')
      page_dir = page_dir_for(feed, feed_path)
      title = feed.fetch('title', 'Site changes')
      feed_only = Array(feed['only'])

      xml = ChangeLog.atom(commits: ChangeLog.select(build.commits, only: feed_only),
                           title: title,
                           feed_url: "#{build.site_url}/#{feed_path}",
                           site_url: page_dir ? "#{build.site_url}/#{page_dir}/" : build.site_url,
                           repo_url: build.repo_url,
                           page_urls: build.urls.transform_values { |u| "#{build.site_url}#{u}" },
                           limit: build.cfg.fetch('limit', 50),
                           max_files: build.cfg.fetch('max_files', 15))

      dir = File.dirname(feed_path)
      page = PageWithoutAFile.new(site, site.source, dir == '.' ? '' : dir, File.basename(feed_path))
      page.content = xml
      page.data['layout'] = nil               # no layout around XML
      page.data['sitemap'] = false
      page.data['render_with_liquid'] = false # commit subjects may contain {{ or {%
      site.pages << page

      add_html_page(site, feed, page_dir, feed_path, title, build) if page_dir
    end

    # The same table as /changes/, limited to this feed's scope.
    def add_html_page(site, feed, dir, feed_path, title, build)
      url = "/#{dir}/"
      if build.existing_urls.include?(url)
        raise Jekyll::Errors::InvalidConfigurationError,
              "changes: #{url} is already a page; choose another `page:` for the #{feed_path} feed"
      end

      feed_only = Array(feed['only'])
      scoped = build.urls.select { |path, _| feed_only.empty? || ChangeLog.matches_any?(path, feed_only) }
      table = ChangeLog.page_table(build.changes, scoped, build.repo_url, titles: build.titles, via: build.via,
                                                                          limit: feed.fetch('page_limit', build.cfg.fetch('page_limit', 100)))
      table['feed'] = "/#{feed_path}"

      page = PageWithoutAFile.new(site, site.source, dir, 'index.html')
      page.content = PAGE_CONTENT.dup
      page.data['title'] = title
      layout = feed['layout'] || build.cfg['page_layout']
      page.data['layout'] = layout if layout
      page.data['changes'] = table
      site.pages << page
    end

    # nil (no page), or the page's directory without slashes at either end.
    def page_dir_for(feed, feed_path)
      setting = feed['page']
      return nil if setting.nil? || setting == false

      if setting == true
        unless feed_path.end_with?('.xml')
          raise Jekyll::Errors::InvalidConfigurationError,
                "changes: `page: true` needs a feed path ending in .xml (got #{feed_path}); give `page:` a directory instead"
        end

        return feed_path.delete_suffix('.xml')
      end

      dir = setting.to_s.gsub(%r{\A/+|/+\z}, '')
      if dir.empty?
        raise Jekyll::Errors::InvalidConfigurationError, "changes: `page:` for #{feed_path} must not be empty"
      end

      dir
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