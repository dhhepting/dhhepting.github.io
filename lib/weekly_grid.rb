# frozen_string_literal: true
#
# lib/weekly_grid.rb
#
# Pure computation for the personal weekly grid (calendar step 5, phase 2): the
# "typical week" day x time model. Given the four kinds of block for a semester —
# class blocks (joined from offerings), office hours, research, reserved — it
# paints a Mon–Fri x 30-minute grid (08:30–17:30) and returns a render-ready data
# structure. No Jekyll here: the plugin resolves the offering join and hands the
# blocks in, so this logic is testable offline and can't drift from the build.
#
# Two invariants, both fail-loud (raise, per the site's build-time discipline):
#   * every block must fall inside the grid window and be well-formed;
#   * no cell may be claimed by two different blocks — an office hour laid over a
#     class, two classes at once, etc. all raise with the day, slot, and both
#     blocks named, instead of one silently winning (which the old Python did).
#
# The model carries only real, authored/derived information. Unclaimed cells stay
# nil — whether nil renders as "free" or as a default "busy" wash is a Phase 3
# presentation choice, deliberately NOT baked in here.
#
# Privacy: class and office blocks carry detail (course/location); research and
# reserved carry category only. This module never invents a label for them.

module WeeklyGrid
  module_function

  DAYS       = %w[Mon Tue Wed Thu Fri].freeze
  WINDOW_MIN = "08:30"
  WINDOW_MAX = "17:30" # exclusive upper bound for slot STARTS -> last slot 17:00–17:30
  STEP       = 30      # minutes

  # ---- time helpers (HH:MM zero-padded, so string compare == chronological) ----
  def to_min(hhmm)
    h, m = hhmm.split(":").map(&:to_i)
    (h * 60) + m
  end

  def from_min(mins)
    format("%02d:%02d", mins / 60, mins % 60)
  end

  # The fixed slot ruler: [{ "key","start","end","label" }, ...]
  def slots
    out = []
    t = to_min(WINDOW_MIN)
    stop = to_min(WINDOW_MAX)
    while t < stop
      s = from_min(t)
      e = from_min(t + STEP)
      out << { "key" => s, "start" => s, "end" => e, "label" => "#{s}–#{e}" }
      t += STEP
    end
    out
  end

  # blocks: array of { "category","day","start","end", "meta"=>{...} }
  #   category ∈ class|office|research|reserved
  # Returns { "days","slots","rows" }; rows = [{ "label","cells"=>{day=>block|nil} }].
  # Raises on any out-of-window/malformed block or any two-block cell collision.
  def build(blocks)
    ruler = slots
    keys  = ruler.map { |s| s["key"] }
    win_lo = WINDOW_MIN
    win_hi = from_min(to_min(WINDOW_MAX)) # 17:30, the end of the last slot

    # cells[day][slot_key] = the block occupying it (object identity tracks source)
    cells = DAYS.each_with_object({}) { |d, h| h[d] = {} }
    collisions = []

    Array(blocks).each do |b|
      day = b["day"]
      st  = b["start"]
      en  = b["end"]
      raise "weekly_grid: block on unknown day #{day.inspect}: #{describe(b)}" unless DAYS.include?(day)
      if st < win_lo || en > win_hi
        raise "weekly_grid: #{describe(b)} falls outside the grid window " \
              "#{win_lo}–#{win_hi}"
      end

      keys.each do |k|
        next unless k >= st && k < en # slot start inside [block.start, block.end)
        if (prev = cells[day][k]) && !prev.equal?(b)
          collisions << "#{day} #{k}: #{describe(prev)} vs #{describe(b)}"
        else
          cells[day][k] = b
        end
      end
    end

    unless collisions.empty?
      raise "weekly_grid: overlapping blocks (author the times so they don't " \
            "collide):\n  - " + collisions.join("\n  - ")
    end

    rows = ruler.map do |s|
      { "label" => s["label"],
        "start" => s["start"],
        "end"   => s["end"],
        "cells" => DAYS.each_with_object({}) { |d, h| h[d] = cells[d][s["key"]] } }
    end
    { "days" => DAYS, "slots" => ruler, "rows" => rows }
  end

  def describe(b)
    base = "#{b['category']} #{b['day']} #{b['start']}–#{b['end']}"
    course = b.dig("meta", "course")
    course ? "#{base} (#{course})" : base
  end
end