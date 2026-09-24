# frozen_string_literal: true
#
# lib/creole_photo_block.rb
#
# Builds the block of Creole image links that goes at the top of a
# meeting's NN_YYYY-MM-DD-photos-text wiki page. The transcript text is
# pasted in by hand below it.
#
# Pure function, no I/O. Input is one meeting's photos exactly as
# MeetingPageFields.load_media returns them ({'label','thumb_url',
# 'full_url'}), so the raw=1 embeddable URL, the _tn pairing, the HEIC
# skip and the sort order all come from that single implementation —
# nothing about media.csv is re-derived here.

module CreolePhotoBlock
  module_function

  # One photo per paragraph, so Moodle stacks them vertically.
  def block(photos)
    raise ArgumentError, 'no photos for this meeting' if photos.nil? || photos.empty?

    photos.map { |p| line(p) }.join("\n\n") + "\n"
  end

  # {{https://…&raw=1 | Mtg 01-1: }}
  def line(photo)
    "{{#{photo.fetch('full_url')} | Mtg #{photo.fetch('label')}: }}"
  end
end