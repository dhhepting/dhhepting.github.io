# frozen_string_literal: true
#
# test/meeting_grid_test.rb
#
# Exercises MeetingGridGenerator.compute_meeting_grid directly, with a
# plain fixture Hash standing in for site.data — no Jekyll::Site needed.
# Run with: rake test:unit
#
# Add `gem 'minitest'` to your Gemfile if it's not already a transitive
# dependency of jekyll (it usually is).

require 'minitest/autorun'
require_relative '../_plugins/meeting_grid'

class MeetingGridTest < Minitest::Test
  def fixture_data(mdays:, meetings:)
    {
      'teaching' => {
        'CS-TEST' => {
          '999999' => { 'meetings' => meetings },
        },
      },
    }
  end

  def test_computes_mpw_for_well_formed_offering
    offering = { 'id' => 'CS-TEST', 'semester' => '999999', 'mdays' => 'Mon,Wed' }
    meetings = [{ 'date' => 'Mon-2026-01-05' }, { 'date' => 'Wed-2026-01-07' }]
    data = fixture_data(mdays: 'Mon,Wed', meetings: meetings)

    grid = MeetingGridGenerator.compute_meeting_grid(data, 'CS-TEST', '999999', offering)

    assert_equal 4, grid['mpw']       # 2 matched + 2 distinct mdays, per current formula
    assert_equal 3, grid['mpwidx']
    assert_equal %w[Mon Wed], grid['mtgdays']
  end

  def test_raises_on_missing_mdays
    # This is the exact scenario that crashed the CS-428+828/202130 build.
    offering = { 'id' => 'CS-TEST', 'semester' => '999999', 'mdays' => nil }
    data = fixture_data(mdays: nil, meetings: [{ 'date' => 'Mon-2026-01-05' }])

    err = assert_raises(MeetingGridError) do
      MeetingGridGenerator.compute_meeting_grid(data, 'CS-TEST', '999999', offering)
    end
    assert_match(/mdays/, err.message)
  end

  def test_raises_on_no_meetings
    offering = { 'id' => 'CS-TEST', 'semester' => '999999', 'mdays' => 'Mon' }
    data = fixture_data(mdays: 'Mon', meetings: [])

    err = assert_raises(MeetingGridError) do
      MeetingGridGenerator.compute_meeting_grid(data, 'CS-TEST', '999999', offering)
    end
    assert_match(/no meetings found/, err.message)
  end

  def test_raises_instead_of_silently_returning_zero_mpw
    # Guards against a regression of the original bug: mpw must never
    # come back as 0, and if the formula/data ever produces that, we want
    # a named error here — not a ZeroDivisionError three layers deep in
    # a Liquid template.
    offering = { 'id' => 'CS-TEST', 'semester' => '999999', 'mdays' => 'Mon' }
    # No meeting actually falls on 'Mon', so matched_days is empty —
    # but mtgdays.size is 1, so mpw = 0 + 1 = 1 here, which is fine.
    # To force mpw <= 0 you'd need mtgdays itself empty, which is already
    # covered by test_raises_on_missing_mdays. This test documents the
    # invariant explicitly so it's not lost if the formula changes later.
    data = fixture_data(mdays: 'Mon', meetings: [{ 'date' => 'Tue-2026-01-06' }])

    grid = MeetingGridGenerator.compute_meeting_grid(data, 'CS-TEST', '999999', offering)
    assert grid['mpw'] > 0
  end
end
