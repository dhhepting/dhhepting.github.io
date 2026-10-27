# frozen_string_literal: true

require_relative '../lib/change_log'

# Thin Jekyll wrapper around lib/change_log.rb (all logic lives there).
#
# Opt-in via _config.yml:
#
#   changes:
#     enabled: true                  # false or absent section = do nothing
#     repo_url: https://github.com/dhhepting/dhhepting.github.io
#     site_url: https://example.org  # optional; default is `url` + `baseurl`.
#                                    # Root of THIS host's site, baseurl included:
#                                    # feed readers need absolute URLs.
#     limit: 50                      # entries per feed
#     only: []                       # path prefixes to include; [] = everything
#     exclude: [_question_bank/]     # path prefixes never to publish
#     feeds:
#       - path: changes.xml
#         title: Site changes
#       - path: teaching/CS-315/202630/changes.xml   # example; adjust
#         title: CS-315 changes
#         only: [teaching/CS-315/202630/]
#
# Produces:
#   * one Atom feed per entry in `feeds` (one entry per commit, diff linked)
#   * site.data['changes']['pages'] : rows for the /changes/ page template
module Jekyll
  class ChangesGenerator < Generator
    safe true
    priority :low # run after the generators that add PageWithoutAFile pages

    def generate(site)
      cfg = site.config['changes']
      return if cfg.nil? || cfg['enabled'] == false

      repo_url = require_setting(cfg, 'repo_url')
      site_url = (cfg['site_url'] || default_site_url(site)).chomp('/')
      limit    = cfg.fetch('limit', 50)

      commits = ChangeLog.commits(repo: site.source,
                                  only: Array(cfg['only']),
                                  except: Array(cfg['exclude']))
      urls = source_urls(site)

      site.data['changes'] = {
        'pages' => ChangeLog.page_rows(ChangeLog.last_changes(commits), urls, repo_url)
      }

      absolute = urls.transform_values { |u| "#{site_url}#{u}" }
      Array(cfg['feeds'] || [{ 'path' => 'changes.xml', 'title' => 'Site changes' }]).each do |feed|
        add_feed(site, feed, commits, absolute, site_url, repo_url, limit)
      end
    rescue ChangeLog::Error => e
      raise Jekyll::Errors::FatalException, "changes: #{e.message}"
    end

    private

    def add_feed(site, feed, commits, absolute_urls, site_url, repo_url, limit)
      feed_path = feed.fetch('path')
      scoped = ChangeLog.select(commits, only: Array(feed['only']))
      xml = ChangeLog.atom(commits: scoped,
                           title: feed.fetch('title', 'Site changes'),
                           feed_url: "#{site_url}/#{feed_path}",
                           site_url: site_url,
                           repo_url: repo_url,
                           page_urls: absolute_urls,
                           limit: limit)

      dir = File.dirname(feed_path)
      page = PageWithoutAFile.new(site, site.source, dir == '.' ? '' : dir, File.basename(feed_path))
      page.content = xml
      page.data['layout'] = nil               # no layout around XML
      page.data['sitemap'] = false
      page.data['render_with_liquid'] = false # commit subjects may contain {{ or {%
      site.pages << page
    end

    # { source path (relative to site.source) => page url (no baseurl) } for
    # every HTML page and collection document.  Generated pages that have no
    # source file simply never appear in git's output and are dropped later.
    def source_urls(site)
      urls = {}
      site.pages.each { |p| urls[p.path] = p.url if p.output_ext == '.html' }
      site.collections.each_value do |collection|
        collection.docs.each { |d| urls[d.relative_path] = d.url if d.output_ext == '.html' }
      end
      urls
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