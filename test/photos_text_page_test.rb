# frozen_string_literal: true
require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require_relative '../lib/creole_escape'
require_relative '../lib/transcript_loader'
require_relative '../lib/photos_text_page'

class CreoleEscapeTest < Minitest::Test
  def test_inline_markup_is_escaped
    assert_equal 'see http:~/~/x.org and~/~/or ~*~*not bold~*~*',
                 CreoleEscape.inline('see http://x.org and//or **not bold**')
    assert_equal '~[~[a~]~] ~{~{b~}~}', CreoleEscape.inline('[[a]] {{b}}')
  end

  def test_tilde_escaped_first_so_escapes_are_not_doubled
    assert_equal '~~~/~/', CreoleEscape.inline('~//')
  end

  def test_single_markup_chars_and_speaker_labels_untouched
    s = 'DH: a * b # c = d [student]: ok'
    assert_equal s, CreoleEscape.inline(s)
  end

  def test_block_markup_at_paragraph_start_escaped
    %w[= * # | ----].each do |lead|
      assert_equal "~#{lead} x", CreoleEscape.paragraph("#{lead} x"), lead
    end
    assert_equal 'a = b', CreoleEscape.paragraph('a = b')
  end

  def test_paragraphs_split_collapse_and_end_with_newline
    out = CreoleEscape.paragraphs("DH: one\ntwo\r\n\r\n\n[student]: three\n")
    assert_equal "DH: one two\n\n[student]: three\n", out
  end

  def test_empty_transcript_raises
    assert_raises(ArgumentError) { CreoleEscape.paragraphs("  \n\n ") }
  end
end

class TranscriptLoaderTest < Minitest::Test
  def test_path_is_built_from_slug
    assert_equal '_data/teaching/CS-315/202630/audio-transcript/01_2026-09-02-audio.txt',
                 TranscriptLoader.path('_data/teaching/CS-315/202630', '01_2026-09-02')
  end

  def test_load_present_and_absent
    Dir.mktmpdir do |dir|
      assert_nil TranscriptLoader.load(dir, '01_2026-09-02')
      p = TranscriptLoader.path(dir, '01_2026-09-02')
      FileUtils.mkdir_p(File.dirname(p))
      File.write(p, "DH: héllo\n")
      assert_equal "DH: héllo\n", TranscriptLoader.load(dir, '01_2026-09-02')
    end
  end
end

class PhotosTextPageTest < Minitest::Test
  PHOTOS = [{ 'label' => '01-1', 'thumb_url' => 't', 'full_url' => 'https://x/a.jpg?raw=1' }].freeze

  def test_photos_then_transcript
    out = PhotosTextPage.compose(photos: PHOTOS, transcript: "DH: hi // there\n")
    assert_operator out.index('{{https'), :<, out.index('**Transcript**')
    assert_includes out, "\n\n----\n\n**Transcript**\n\nDH: hi ~/~/ there\n"
    assert out.end_with?("\n") && !out.end_with?("\n\n")
  end

  def test_each_section_optional_but_not_both_absent
    assert_includes PhotosTextPage.compose(photos: PHOTOS, transcript: nil), '{{https'
    refute_includes PhotosTextPage.compose(photos: PHOTOS, transcript: nil), 'Transcript'
    assert_equal "**Transcript**\n\nDH: a\n", PhotosTextPage.compose(photos: nil, transcript: 'DH: a')
    assert_raises(ArgumentError) { PhotosTextPage.compose(photos: [], transcript: nil) }
  end
end