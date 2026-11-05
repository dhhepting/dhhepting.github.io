# frozen_string_literal: true
#
# lib/creole_escape.rb
#
# Makes spoken text safe to paste into a Moodle (Creole) wiki page.
# Creole's escape character is "~": it makes the next character literal.
#
# Pure functions, no I/O. Two jobs:
#   * inline: neutralise two-character markup that can occur inside speech
#     ("//" in URLs and "and//or", "**", "[[", "{{", "\\" forced line break, ...)
#   * paragraphs: turn a blank-line-separated transcript into Creole
#     paragraphs, escaping anything that would be read as block markup when it
#     starts a paragraph (=, *, #, |, ----).
#
# NOTE: confirm on UR Courses that "~" escaping is honoured by Moodle's
# Creole parser (see test/creole_escape_test.rb for the probe string).

module CreoleEscape
  module_function

  INLINE_MARKUP = %r{//|\*\*|\[\[|\]\]|\{\{|\}\}|\\\\}
  BLOCK_START   = /\A\s*(?:=|\*|#|\||-{4})/

  def inline(str)
    str.gsub('~', '~~')
       .gsub(INLINE_MARKUP) { |m| m.chars.map { |c| "~#{c}" }.join }
  end

  # One paragraph: internal newlines collapse to spaces, so only the start of
  # the paragraph can look like block markup.
  def paragraph(str)
    text = inline(str.gsub(/\s*\n\s*/, ' ').strip)
    text.match?(BLOCK_START) ? "~#{text.lstrip}" : text
  end

  # Blank-line-separated text -> Creole paragraphs, blank-line separated,
  # one trailing newline. Raises on empty input (caller decides what absent
  # means; see PhotosTextPage).
  def paragraphs(text)
    paras = text.gsub("\r\n", "\n").split(/\n[ \t]*\n+/).map(&:strip).reject(&:empty?)
    raise ArgumentError, 'empty transcript' if paras.empty?

    paras.map { |p| paragraph(p) }.join("\n\n") + "\n"
  end
end