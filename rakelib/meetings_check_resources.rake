# frozen_string_literal: true

require 'yaml'
require File.expand_path('lib/meeting_resources_checker') # rake runs from the Rakefile's directory

namespace :meetings do
  desc 'Warn about past meetings lacking photos or a cleaned transcript ' \
       '(STRICT=1 to fail). Usage: rake meetings:check_resources[CS-315,202630]'
  task :check_resources, [:course, :semester] do |_, args|
    course   = args[:course]   || 'CS-315'
    semester = (args[:semester] || '202630').to_s # coerce: YAML loads codes as Integer
    base     = File.join('_data', 'teaching', course, semester)

    # meetings.yml: top-level array of hashes with 'meeting' (Integer) and 'date' (ISO string)
    meetings = YAML.safe_load_file(File.join(base, 'meetings.yml'))

    checker = MeetingResourcesChecker.new(
      meetings: meetings,
      photo_counts: MeetingResourcesChecker.photo_counts(File.join(base, 'media.csv')),
      transcript_dir: File.join(base, 'audio-transcript')
    )

    problems = checker.problems
    problems.each { |p| warn "WARNING [#{p.kind}] #{p.message}" }
    puts 'All past meetings have photos and transcripts.' if problems.empty?
    abort "#{problems.size} resource problem(s)" if ENV['STRICT'] == '1' && problems.any?
  end
end
