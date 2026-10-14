require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'meeting_resources_checker'

class MeetingResourcesCheckerTest < Minitest::Test
  MEETINGS = [
    { 'meeting' => 1, 'date' => '2026-09-02' },
    { 'meeting' => 5, 'date' => '2026-09-30' },
    { 'meeting' => 9, 'date' => '2026-10-14' }, # "today": still in progress until 23:59 Regina
    { 'meeting' => 10, 'date' => '2026-10-21' }
  ].freeze

  def setup
    @dir = Dir.mktmpdir
    FileUtils.touch(File.join(@dir, '01_2026-09-02-audio.md'))
  end

  def teardown = FileUtils.remove_entry(@dir)

  def checker(now:)
    MeetingResourcesChecker.new(
      meetings: MEETINGS,
      photo_counts: MeetingResourcesChecker.photo_counts('/mnt/user-data/uploads/media.csv'),
      transcript_dir: @dir, now: now
    )
  end

  def test_reports_missing_for_past_only
    now = Time.parse('2026-10-14T10:00:00-06:00')
    probs = checker(now: now).problems
    assert_equal [%w[05 photos], %w[05 transcript]],
                 probs.map { |p| [p.meeting, p.kind.to_s] }.sort
    # 01 complete; 09 is today (not yet past); 10 is future
  end

  def test_na_meetings_are_skipped
    meetings = [{ 'meeting' => 12, 'date' => '2026-10-21', 'wiki_ed_group' => 'NA' },
                { 'meeting' => 11, 'date' => '2026-10-19', 'wiki_ed_group' => 'WG-J' }]
    c = MeetingResourcesChecker.new(
      meetings: meetings, photo_counts: {}, transcript_dir: @dir,
      now: Time.parse('2026-10-25T10:00:00-06:00')
    )
    assert_equal ['11'], c.problems.map(&:meeting).uniq
  end

  def test_day_after_counts_as_past
    now = Time.parse('2026-10-15T00:30:00-06:00')
    assert(checker(now: now).problems.any? { |p| p.meeting == '09' && p.kind == :transcript })
  end

  def test_zero_padded_keys
    assert_equal 5, MeetingResourcesChecker.photo_counts('/mnt/user-data/uploads/media.csv')['01']
  end
end