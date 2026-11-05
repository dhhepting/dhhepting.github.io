# frozen_string_literal: true
#
# lib/transcript_loader.rb
#
# Finds a meeting's cleaned transcript in the repo:
#
#   _data/teaching/<course>/<term>/audio-transcript/<slug>-audio.txt
#
# <slug> is MeetingPageFields.meeting_slug (NN_YYYY-MM-DD) — passed in, never
# re-derived here, so the transcript filename, the wiki page name and every
# [[link]] share one implementation. The path is built from the slug, never
# by globbing, so a misnamed file is reported missing instead of guessed at.
#
# Pure aside from the one File.read; returns nil when the meeting has no
# transcript (presence-driven — the caller decides whether that is a warning).

module TranscriptLoader
  module_function

  EXT = '.txt'

  def path(offering_dir, slug)
    File.join(offering_dir, 'audio-transcript', "#{slug}-audio#{EXT}")
  end

  def load(offering_dir, slug)
    p = path(offering_dir, slug)
    File.exist?(p) ? File.read(p, encoding: 'UTF-8') : nil
  end
end