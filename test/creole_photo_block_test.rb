# frozen_string_literal: true

require 'minitest/autorun'
require 'creole_photo_block'

# ruby -Ilib -Itest test/creole_photo_block_test.rb
class CreolePhotoBlockTest < Minitest::Test
  PHOTOS = [
    { 'label' => '01-1',  'thumb_url' => 'https://x/t1.jpg',
      'full_url' => 'https://dl.dropboxusercontent.com/scl/fi/q5/01-1.jpeg?rlkey=z&raw=1' },
    { 'label' => '01-1a', 'thumb_url' => 'https://x/t2.jpg',
      'full_url' => 'https://dl.dropboxusercontent.com/scl/fi/z6/01-1a.jpg?rlkey=u&raw=1' }
  ].freeze

  def blocks
    CreolePhotoBlock.block(PHOTOS).chomp.split("\n\n")
  end

  def test_each_photo_is_an_image_line_followed_by_its_caption_line
    lines = blocks
    assert_equal 4, lines.size # image, caption, image, caption
    lines.each_slice(2).with_index do |(img, cap), i|
      assert_match(/\A\{\{#{Regexp.escape(PHOTOS[i]['full_url'])} \| .* \}\}\z/, img)
      assert_equal CreolePhotoBlock.caption_line, cap
    end
  end

  # Text after the pipe is only the image's hidden alt attribute in Creole,
  # so the visible caption must live OUTSIDE the {{ }} markup.
  def test_caption_is_outside_the_image_markup
    CreolePhotoBlock.block(PHOTOS).scan(/\{\{.*?\}\}/).each do |markup|
      refute_includes markup, 'Caption'
    end
  end

  def test_alt_text_is_descriptive_with_no_trailing_colon
    assert_includes CreolePhotoBlock.line(PHOTOS[0]), '| Mtg 01-1 photo }}'
    refute_match(/:\s*\}\}/, CreolePhotoBlock.line(PHOTOS[0]))
  end

  # tools that check the wiki for unwritten captions look for a leading TODO
  def test_placeholder_starts_with_todo
    assert CreolePhotoBlock::CAPTION_PLACEHOLDER.start_with?('TODO')
    assert_equal '**Caption:** //TODO: describe what is on the board//', CreolePhotoBlock.caption_line
  end

  def test_single_trailing_newline
    out = CreolePhotoBlock.block(PHOTOS)
    assert out.end_with?("\n")
    refute out.end_with?("\n\n")
  end

  def test_no_photos_raises
    assert_raises(ArgumentError) { CreolePhotoBlock.block([]) }
    assert_raises(ArgumentError) { CreolePhotoBlock.block(nil) }
  end
end