# frozen_string_literal: true
#
# lib/photos_text_page.rb
#
# Composes the whole NN_YYYY-MM-DD-photos-text wiki page: photo block
# (CreolePhotoBlock) on top, cleaned transcript (CreoleEscape) below.
#
# Pure function, no I/O. Presence-driven: a section appears only if its input
# exists. Raises only if there is nothing at all to publish.

require_relative 'creole_photo_block'
require_relative 'creole_escape'

module PhotosTextPage
  module_function

  # A bold line, NOT a heading: students paste this page into the main meeting
  # page, where an added heading would shift Moodle's positional #toc-N anchors
  # (and they are told not to add headings).
  TRANSCRIPT_LABEL = '**Transcript**'
  SEPARATOR = "\n\n----\n\n"

  def compose(photos:, transcript:)
    sections = []
    sections << CreolePhotoBlock.block(photos).chomp unless photos.nil? || photos.empty?
    unless transcript.nil? || transcript.strip.empty?
      sections << "#{TRANSCRIPT_LABEL}\n\n#{CreoleEscape.paragraphs(transcript).chomp}"
    end
    raise ArgumentError, 'neither photos nor transcript for this meeting' if sections.empty?

    sections.join(SEPARATOR) + "\n"
  end
end