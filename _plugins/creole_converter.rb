# frozen_string_literal: true
#
# _plugins/creole_converter.rb
#
# Registers .creole as a file type Jekyll knows how to render, the same
# way it already knows how to render .md via Kramdown. This gives you an
# on-site HTML preview of a wiki-seed page — useful for sanity-checking
# formatting before you paste the raw source into Moodle.
#
# IMPORTANT: this converter produces the *preview only*. It does not
# affect what you copy-paste — that comes from the raw source tag in
# creole_source_tag.rb, which reads the original .creole text straight
# off disk, untouched by this converter. Keeping these separate means a
# bug in the preview renderer can never corrupt the text you actually
# paste into a wiki page.
#
# Requires: gem 'creole' in your Gemfile (`bundle add creole`).
#
# --- How Jekyll::Converter works (quick primer) ---
# Any class in _plugins/ that inherits from Jekyll::Converter and defines
# `matches?(ext)` and `convert(content)` gets automatically used by Jekyll
# for any file whose extension matches. `content` is the raw file body
# (front matter already stripped); you return the HTML to use as the
# page's `content` in layouts.

require 'creole'

class CreoleConverter < Jekyll::Converter
  safe true
  priority :low

  def matches(ext)
    ext.casecmp('.creole').zero?
  end

  def output_ext(_ext)
    '.html'
  end

  def convert(content)
    Creole.creolize(content)
  rescue StandardError => e
    # Fail the build with a clear message naming the problem, rather than
    # emitting broken/partial HTML silently. Malformed Creole here means
    # the raw source tag output would also be suspect, so better to catch
    # it now than notice after pasting into a student wiki page.
    raise "CreoleConverter: failed to render Creole content — #{e.message}"
  end
end
