# frozen_string_literal: true

require 'minitest/autorun'
require 'cgi'
require 'creole_renderer'

# ruby -Ilib -Itest test/creole_renderer_test.rb
class CreoleRendererTest < Minitest::Test
  def r(src, **opts)
    CreoleRenderer.render(src, wrap: false, **opts)
  end

  # -- math protection (the point of the module) ---------------------

  MATRIX = '\( R = \begin{pmatrix} \cos\theta & -\sin\theta \cr \sin\theta & \cos\theta \end{pmatrix} \)'

  def test_math_survives_byte_for_byte_modulo_html_escaping
    html = r(MATRIX)
    assert_includes CGI.unescapeHTML(html), MATRIX
    assert_includes html, '&amp;' # & escaped for HTML, decoded again by the browser
  end

  def test_creole_markup_inside_math_is_not_interpreted
    html = r('\( a//b//c ** d ** e \)')
    refute_match(/<em>|<strong>/, html)
  end

  def test_bare_double_backslash_row_separator_inside_math_is_not_a_line_break
    html = r('\( \begin{pmatrix} a \\\\ b \end{pmatrix} \)')
    refute_includes html, '<br'
    assert_includes CGI.unescapeHTML(html), '\\\\'
  end

  def test_double_backslash_outside_math_is_a_line_break
    assert_includes r('one \\\\ two'), 'one <br /> two'
  end

  def test_display_math_forms_and_multiline_spans
    assert_includes CGI.unescapeHTML(r('\[ x^2 \]')), '\[ x^2 \]'
    assert_includes CGI.unescapeHTML(r('$$ x_1 | x_2 $$')), '$$ x_1 | x_2 $$'
    multi = "\\( a &\n b \\)"
    assert_includes CGI.unescapeHTML(r(multi)), multi
  end

  def test_pipe_in_math_inside_table_cell_does_not_split_cell
    html = r('|= det | \( |A| \) |')
    assert_equal 1, html.scan('<th>').size
    assert_equal 1, html.scan('<td>').size
  end

  def test_math_inside_link_label_and_bold
    html = r('[[https://example.org|see \( x \)]] and **\( y \)**')
    assert_includes html, '<a href="https://example.org">see \( x \)</a>'
    assert_includes html, '<strong>\( y \)</strong>'
  end

  def test_nowiki_shows_math_literally_and_is_not_a_math_span
    html = r("{{{\n\\( x \\\\ y \\)\n}}}")
    assert_includes html, '<pre>'
    assert_includes html, '\( x \\\\ y \)'
  end

  # -- converter subset ----------------------------------------------

  def test_headings_paragraphs_and_offset
    assert_equal "<h3>Rotation</h3>\n<p>text</p>", r("=== Rotation ===\n\ntext")
    assert_equal '<h4>T</h4>', r('=== T ===', heading_offset: 1)
    assert_equal '<h6>T</h6>', r('====== T ======', heading_offset: 3)
  end

  def test_bold_italic_and_urls_are_not_italicised
    html = r('**b** //i// see http://example.org/a//b.')
    assert_includes html, '<strong>b</strong>'
    assert_includes html, '<em>i</em>'
    assert_includes html, '<a href="http://example.org/a//b">http://example.org/a//b</a>.'
  end

  def test_nested_lists_and_type_change
    expected = '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>' \
               '<ol><li>d</li><li>e</li></ol>'
    assert_equal expected, r("* a\n** b\n* c\n# d\n# e")
  end

  def test_table_with_header_and_link_pipe
    html = r("|= A |= B |\n| [[https://x.org|x]] | 2 |")
    assert_includes html, '<th>A</th><th>B</th>'
    assert_includes html, '<td><a href="https://x.org">x</a></td><td>2</td>'
  end

  def test_rule_and_tilde_escape
    assert_equal '<hr />', r('----')
    assert_equal '<p>**not bold**</p>', r('~*~*not bold~*~*')
  end

  def test_html_in_source_is_escaped
    assert_equal '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', r('<script>alert(1)</script>')
  end

  def test_unsafe_scheme_raises
    assert_raises(ArgumentError) { r('[[javascript:alert(1)|x]]') }
    assert_raises(ArgumentError) { r('{{data:text/html;base64,AAAA|x}}') }
  end

  def test_wiki_link_hook
    assert_includes r('[[Week 3]]'), '<span class="wikilink">Week 3</span>'
    hook = ->(name) { name == 'Week 3' ? '/wiki/week-3' : nil }
    assert_includes r('[[Week 3]]', wiki_link: hook), '<a href="/wiki/week-3">Week 3</a>'
  end

  def test_wrap_and_empty
    assert_equal %(<div class="creole-block">\n<p>x</p>\n</div>), CreoleRenderer.render('x')
    assert_equal '', CreoleRenderer.render(nil)
    assert_equal '', CreoleRenderer.render("  \n")
  end

  def test_reserved_characters_raise
    assert_raises(ArgumentError) { r("bad \uE000 char") }
  end
end