# frozen_string_literal: true

require 'csv'
require 'time'

# Pure checker: which past meetings lack photos and/or a cleaned transcript?
# Offline-testable:  ruby -Ilib test/meeting_resources_checker_test.rb
class MeetingResourcesChecker
  REGINA_OFFSET = '-06:00' # fixed year-round, no DST

  Problem = Struct.new(:meeting, :kind, :message, keyword_init: true)

  # media.csv columns: meet,file,URL  ("meet" is a zero-padded STRING, e.g. "01")
  def self.photo_counts(media_csv_path)
    CSV.read(media_csv_path, headers: true, encoding: 'bom|utf-8')
       .group_by { |r| r['meet'].to_s.rjust(2, '0') }
       .transform_values(&:size)
  end

  # meetings: array of hashes with 'meeting' (Integer) and 'date' (ISO string)
  def initialize(meetings:, photo_counts:, transcript_dir:, now: Time.now, min_photos: 1)
    @meetings       = meetings
    @photo_counts   = photo_counts
    @transcript_dir = transcript_dir
    @now            = now
    @min_photos     = min_photos
  end

  def nn(meeting)   = format('%02d', Integer(meeting['meeting']))
  def stem(meeting) = "#{nn(meeting)}_#{meeting['date']}-audio"

  # Meetings marked wiki_ed_group: NA (no class / no wiki resources) are skipped.
  def skipped?(meeting)
    meeting['wiki_ed_group'].to_s.strip.upcase == 'NA'
  end

  # A meeting is "past" once its day has ended in Regina time.
  def past?(meeting)
    Time.parse("#{meeting['date']}T23:59:59#{REGINA_OFFSET}") < @now
  end

  # Extension-agnostic: any file whose name starts with the standard stem.
  def transcript_exists?(meeting)
    !Dir.glob(File.join(@transcript_dir, "#{stem(meeting)}*")).empty?
  end

  def problems
    @meetings.select { |m| past?(m) && !skipped?(m) }.flat_map do |m|
      found = []
      unless transcript_exists?(m)
        found << Problem.new(meeting: nn(m), kind: :transcript,
                             message: "#{stem(m)}: transcript not found in #{@transcript_dir}")
      end
      count = @photo_counts.fetch(nn(m), 0)
      if count < @min_photos
        found << Problem.new(meeting: nn(m), kind: :photos,
                             message: "#{nn(m)} (#{m['date']}): #{count} photo(s) in media.csv")
      end
      found
    end
  end
end