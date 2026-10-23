# frozen_string_literal: true
#
# lib/creole_photo_block.rb
#
# Builds the block of Creole photo entries that goes at the top of a
# meeting's NN_YYYY-MM-DD-photos-text wiki page. The transcript text is
# pasted in by hand below it.
#
# Each entry is the image plus a visible "Caption <label>:" line for students to
# fill in. The caption must be separate visible text: in Creole's
# {{url | text}} the text after the pipe becomes the image's alt attribute,
# which Moodle does not display. The alt text here is only a stable,
# descriptive default ("Mtg 01-1 photo"); students never need to edit it.
# The TODO placeholder is easy to spot and is what the wiki-page checker
# (toc_links.py) looks for to flag captions nobody wrote.
#
# Pure function, no I/O. Input is one meeting's photos exactly as
# MeetingPageFields.load_media returns them ({'label','thumb_url',
# 'full_url'}), so the raw=1 embeddable URL, the _tn pairing, the HEIC
# skip and the sort order all come from that single implementation —
# nothing about media.csv is re-derived here.

module CreolePhotoBlock
  module_function

  CAPTION_PLACEHOLDER = 'TODO: describe what is depicted'

  # One entry per photo (image line, then its caption line directly below),
  # entries separated by blank lines so Moodle stacks them vertically.
  def block(photos)
    raise ArgumentError, 'no photos for this meeting' if photos.nil? || photos.empty?

    photos.map { |p| entry(p) }.join("\n\n") + "\n"
  end

  # {{https://…&raw=1 | Mtg 01-1 photo }}
  # **Caption 01-1:** //TODO: describe what is depicted//
  def entry(photo)
    "#{line(photo)}\n#{caption_line(photo)}"
  end

  # {{https://…&raw=1 | Mtg 01-1 photo }}
  def line(photo)
    "{{#{photo.fetch('full_url')} | Mtg #{photo.fetch('label')} photo }}"
  end

  # **Caption 01-1:** //TODO: describe what is depicted//
  def caption_line(photo)
    "**Caption #{photo.fetch('label')}:** //#{CAPTION_PLACEHOLDER}//"
  end
end