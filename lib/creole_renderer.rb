# frozen_string_literal: true

require 'cgi'

# lib/creole_renderer.rb
#
# Renders a Creole block (the urcourses wiki markup kept verbatim in plan.yml
# `creole:` items) to HTML for the Jekyll site. Pure function: no Jekyll, no
# I/O, testable offline:
#
#   ruby -Ilib -Itest test/creole_renderer_test.rb
#
# Pipeline (the point of this module is steps 1-2 and 4):
#   1. stash {{{nowiki}}} spans         -> shown literally, never parsed
#   2. stash LaTeX math spans           -> Creole never sees them, so //, **,
#                                          \\ and | inside math are untouched
#   3. convert the remaining Creole     -> HTML
#   4. restore math as HTML-escaped text inside the output; MathJax in the
#      browser then typesets \( \), \[ \] and $$ $$ in .creole-block.
#
# The converter is a deliberate SUBSET of Creole 1.0 (what the wiki blocks
# use): headings, paragraphs, **bold**, //italic//, \\ line break, * and #
# lists (nested), tables, ---- rules, [[links]], {{images}}, bare URLs, ~escape,
# and {{{nowiki}}} (inline and block). It is not Moodle's parser; anything it
# does not understand is passed through as paragraph text.
module CreoleRenderer
  OPEN  = "\uE000"
  CLOSE = "\uE001"
  TOKEN = /#{OPEN}(\d+)#{CLOSE}/

  MATH          = /\\\[.*?\\\]|\\\(.*?\\\)|\$\$.*?\$\$/m
  NOWIKI_BLOCK  = /^\{\{\{[ \t]*\n(.*?)\n\}\}\}[ \t]*$/m
  NOWIKI_INLINE = /\{\{\{(.*?)\}\}\}/
  HEADING       = /\A\s*(={1,6})(?!=)\s*(.+?)\s*=*\s*\z/
  RULE          = /\A\s*-{4,}\s*\z/
  LIST_ITEM     = /\A\s*([*#]+)[ \t]+(.*)\z/
  TABLE_ROW     = /\A\s*\|/
  URL_LIKE      = %r{\A(?:[a-z][a-z0-9+.\-]*:|/|#|\./|\.\./)}i
  BARE_URL      = %r{https?://[^\s<>\uE000\uE001]*[^\s<>.,;:!?)\]\uE000\uE001]}

  # heading_offset: shift Creole heading levels (e.g. 1 makes === an <h4>).
  # wiki_link:      optional ->(page_name) { url_or_nil } for [[Page]] links;
  #                 without it (or on nil) they render as <span class="wikilink">.
  # wrap:           wrap output in <div class="creole-block"> (the hook the
  #                 MathJax include typesets).
  def self.render(src, heading_offset: 0, wiki_link: nil, wrap: true)
    return '' if src.nil? || src.strip.empty?

    html = Renderer.new(heading_offset, wiki_link).render(src)
    wrap ? %(<div class="creole-block">\n#{html}\n</div>) : html
  end

  class Renderer
    def initialize(heading_offset, wiki_link)
      @offset = heading_offset
      @wiki_link = wiki_link
      @store = []
    end

    def render(src)
      if src.match?(/[#{OPEN}#{CLOSE}]/)
        raise ArgumentError, 'Creole source contains reserved private-use characters'
      end

      text = src.gsub("\r\n", "\n")
      text = text.gsub(NOWIKI_BLOCK) { stash("<pre>#{esc(Regexp.last_match(1))}</pre>", block: true) }
      text = text.gsub(NOWIKI_INLINE) { stash("<code>#{esc(Regexp.last_match(1))}</code>") }
      text = text.gsub(MATH) { |m| stash(esc(m)) }
      restore(blocks(text))
    end

    private

    def esc(str) = CGI.escapeHTML(str)

    def stash(html, block: false)
      @store << [html, block]
      "#{OPEN}#{@store.size - 1}#{CLOSE}"
    end

    # Stashed entries may contain earlier tokens (e.g. math inside a link
    # label), so resolve until none remain. Tokens only point backwards, so
    # this terminates.
    def restore(html)
      html = html.gsub(TOKEN) { @store[Regexp.last_match(1).to_i][0] } while html.match?(TOKEN)
      html
    end

    # -- block level ------------------------------------------------------

    def block_start?(line)
      line.match?(HEADING) || line.match?(RULE) || line.match?(LIST_ITEM) || line.match?(TABLE_ROW)
    end

    def blocks(text)
      lines = text.split("\n")
      out = []
      i = 0
      while i < lines.size
        line = lines[i]
        if line.strip.empty?
          i += 1
        elsif (m = line.match(HEADING))
          level = [[m[1].size + @offset, 1].max, 6].min
          out << "<h#{level}>#{inline(m[2])}</h#{level}>"
          i += 1
        elsif line.match?(RULE)
          out << '<hr />'
          i += 1
        elsif line.match?(LIST_ITEM)
          items = []
          while i < lines.size && (m = lines[i].match(LIST_ITEM))
            items << [m[1], m[2]]
            i += 1
          end
          out << render_list(items)
        elsif line.match?(TABLE_ROW)
          rows = []
          while i < lines.size && lines[i].match?(TABLE_ROW)
            rows << lines[i]
            i += 1
          end
          out << render_table(rows)
        else
          para = []
          while i < lines.size && !lines[i].strip.empty? && !block_start?(lines[i])
            para << lines[i]
            i += 1
          end
          out << paragraph(para.join("\n").strip)
        end
      end
      out.join("\n")
    end

    def paragraph(text)
      if (m = text.match(/\A#{OPEN}(\d+)#{CLOSE}\z/)) && @store[m[1].to_i][1]
        text # a block-level nowiki <pre>: do not wrap in <p>
      else
        "<p>#{inline(text)}</p>"
      end
    end

    def render_list(items)
      html = +''
      stack = []
      items.each do |prefix, text|
        depth = prefix.size
        tags = prefix.chars.map { |c| c == '*' ? 'ul' : 'ol' }
        html << "</li></#{stack.pop}>" while stack.size > depth
        html << "</li></#{stack.pop}>" if stack.size == depth && stack.last != tags.last
        html << '</li>' if stack.size == depth
        while stack.size < depth
          tag = tags[stack.size]
          html << "<#{tag}>"
          stack << tag
          html << '<li>' if stack.size < depth # intermediate level hosts the nested list
        end
        html << "<li>#{inline(text)}"
      end
      stack.reverse_each { |t| html << "</li></#{t}>" }
      html
    end

    def render_table(rows)
      body = rows.map do |row|
        r = row.strip.sub(/\A\|/, '').sub(/\|\z/, '')
        cells = split_cells(r).map do |c|
          c = c.strip
          if c.start_with?('=')
            "<th>#{inline(c.sub(/\A=\s*/, ''))}</th>"
          else
            "<td>#{inline(c)}</td>"
          end
        end
        "<tr>#{cells.join}</tr>"
      end
      "<table>\n#{body.join("\n")}\n</table>"
    end

    # Split on | but not inside [[links]] or {{images}}.
    def split_cells(str)
      cells = []
      cur = +''
      depth = 0
      i = 0
      while i < str.size
        two = str[i, 2]
        if two == '[[' || two == '{{'
          depth += 1
          cur << two
          i += 2
        elsif (two == ']]' || two == '}}') && depth.positive?
          depth -= 1
          cur << two
          i += 2
        elsif str[i] == '|' && depth.zero?
          cells << cur
          cur = +''
          i += 1
        else
          cur << str[i]
          i += 1
        end
      end
      cells << cur
    end

    # -- inline -----------------------------------------------------------

    def inline(raw)
      s = raw.gsub(/~([^\s#{OPEN}#{CLOSE}])/) { stash(esc(Regexp.last_match(1))) }
      s = s.gsub(/\{\{(.+?)(?:\|(.*?))?\}\}/) { stash(image_html(Regexp.last_match(1), Regexp.last_match(2))) }
      s = s.gsub(/\[\[(.+?)(?:\|(.*?))?\]\]/m) { stash(link_html(Regexp.last_match(1), Regexp.last_match(2))) }
      s = s.gsub(BARE_URL) { |u| stash(%(<a href="#{esc(u)}">#{esc(u)}</a>)) }
      s = emphasis(esc(s))
      s.gsub('\\\\', '<br />')
    end

    def emphasis(escaped)
      escaped.gsub(/\*\*(.+?)\*\*/m, '<strong>\1</strong>').gsub(%r{//(.+?)//}m, '<em>\1</em>')
    end

    def check_url!(url)
      scheme = url[/\A\s*([a-z][a-z0-9+.\-]*):/i, 1]
      return if scheme.nil? || %w[http https mailto].include?(scheme.downcase)

      raise ArgumentError, "unsafe URL scheme in Creole: #{url}"
    end

    def image_html(src, alt)
      src = src.strip
      check_url!(src)
      %(<img src="#{esc(src)}" alt="#{esc((alt || '').strip)}" />)
    end

    def link_html(target, label)
      target = target.strip
      text = label.nil? ? nil : emphasis(esc(label.strip))
      if target.match?(URL_LIKE)
        check_url!(target)
        %(<a href="#{esc(target)}">#{text || esc(target)}</a>)
      elsif (url = @wiki_link&.call(target))
        check_url!(url)
        %(<a href="#{esc(url)}">#{text || esc(target)}</a>)
      else
        %(<span class="wikilink">#{text || esc(target)}</span>)
      end
    end
  end
end