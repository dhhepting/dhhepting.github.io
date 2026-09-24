# frozen_string_literal: true
#
# lib/creole_photo_block.rb
#
# Builds the block of Creole image links that goes at the top of a
# meeting's NN_YYYY-MM-DD-photos-text wiki page. The transcript text is
# pasted in by hand below it.
#
# Pure functions, no I/O: input is the photo rows for one meeting (as
# loaded from media.csv), output is a string ready to paste into Moodle.
#
# media.csv keeps Dropbox share links as sharemedia.py produced them
# (…&dl=0). Those render as a Dropbox preview page, not an image, so the
# embed URL is derived here (…&raw=1) rather than editing media.csv.

module CreolePhotoBlock
  module_function

  # One photo per paragraph, so Moodle stacks them vertically.
  def block(photos)
    raise ArgumentError, 'no photos for this meeting' if photos.empty?

    photos.map { |p| line(p.fetch('file'), p.fetch('URL')) }.join("\n\n") + "\n"
  end

  # {{https://…&raw=1 | Mtg 01-1: }}
  def line(file, url)
    label = "Mtg #{File.basename(file, File.extname(file))}:"
    "{{#{embed_url(url)} | #{label} }}"
  end

  # Fail loud on anything that isn't a recognisable Dropbox share link,
  # rather than emitting a link that silently shows a preview page.
  def embed_url(url)
    return url if url.match?(/[?&]raw=1(&|\z)/)

    unless url.match?(/[?&]dl=[01](&|\z)/)
      raise ArgumentError, "not a Dropbox share link (no dl= or raw= param): #{url}"
    end

    url.sub(/([?&])dl=[01](?=&|\z)/, '\1raw=1')
  end
end