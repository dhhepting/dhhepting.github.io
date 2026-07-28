# frozen_string_literal: true
#
# _plugins/creole_source_tag.rb
#
# Provides {% creole_source %} for use inside a generated page's layout.
# Composes the FULL text meant for pasting into Moodle:
#   1. Whatever literal-Creole preamble text the calling layout already
#      built (via {% capture creole_preamble %}...{% endcapture %}) from
#      that page's generated data — kept generic here so this same tag
#      works for wiki-start pages, meeting pages, or any future
#      generated-page type, each with their own preamble shape.
#   2. The hand-authored .creole file's raw body, read straight off
#      disk (bypassing Jekyll's Liquid/Converter pipeline entirely, so
#      what's shown is guaranteed to be the literal text you wrote —
#      never HTML, never Liquid-processed).
# Both parts are HTML-escaped together before being embedded in a
# <textarea>, so nothing in either part gets misread as markup by the
# browser.
#
# Usage in a layout:
#   {%- capture creole_preamble -%}
#   ...literal Creole text built from this page's generated fields...
#   {%- endcapture -%}
#   <textarea readonly>{% creole_source %}</textarea>

require 'cgi'

class CreoleSourceTag < Liquid::Tag
  def render(context)
    site = context.registers[:site]
    page = context['page']

    raise 'creole_source: no page.path in context — use this tag inside a page/collection layout' unless page && page['path']

    preamble = context['creole_preamble'] || ''
    hand_body = read_hand_authored_body(site, page)

    CGI.escapeHTML("#{preamble}#{hand_body}")
  end

  private

  def read_hand_authored_body(site, page)
    source_path = File.join(site.source, page['path'])
    raise "creole_source: file not found at #{source_path}" unless File.exist?(source_path)

    raw = File.read(source_path, encoding: 'UTF-8')
    raw.sub(/\A---\s*\n.*?\n---\s*\n/m, '')
  end
end

Liquid::Template.register_tag('creole_source', CreoleSourceTag)
