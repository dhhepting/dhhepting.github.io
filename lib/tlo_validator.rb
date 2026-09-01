# frozen_string_literal: true

require "yaml"
require_relative "tlo_resolver"

# lib/tlo_validator.rb
# ---------------------------------------------------------------------------
# Build-time containment check for the TLO layers:
#
#     meeting selection  ⊆  offering coverage  ⊆  canonical KU
#
# Usable offline via Rake and at build time in a generator, matching the
# project's validator convention:  TLOValidator.new(dir).run -> [errors]
# (empty array == valid). It never raises for *data* problems — it collects
# them — so one run reports every mistake, not just the first.
#
# Layout it expects under `dir` (default "_data/teaching"):
#   curricula/<STD>/<KA>/<KU>.yml         canonical (authoritative full sets)
#   <COURSE>/<SEM>/tlo.yml                offering: { standard, kaku: {..} }
#   <COURSE>/<SEM>/plan.yml               meetings[].tlo[] selections
#
# Rules enforced:
#   * offering `standard` present; each "KA/KU" resolves to a canonical file
#   * every selector value is the literal "all" or a YAML list (nothing else)
#   * every selector KEY is exactly `topics` or `learning_outcomes`
#     (a stray `topic`/`outcome`/`spectop` is an ERROR, not a silent skip)
#   * every selected id exists in the canonical KU
#   * every meeting `kaku` is declared by the offering
#   * every meeting-selected id is within the offering's coverage for that KU
# ---------------------------------------------------------------------------

class TLOValidator
  SELECTOR_KEYS = %w[topics learning_outcomes].freeze

  def initialize(dir = "_data/teaching")
    @dir = dir
    @errors = []
    @canon = {} # "STD/KA/KU" => parsed hash (memoised)
  end

  def run
    @errors = []
    offering_files.each { |f| validate_offering(f) }
    @errors
  end

  private

  def add(msg)
    @errors << msg
  end

  def offering_files
    Dir.glob(File.join(@dir, "*", "*", "tlo.yml")).sort
  end

  def load_yaml(path)
    YAML.load_file(path)
  rescue => e
    add("#{path}: unreadable YAML (#{e.class}: #{e.message})")
    nil
  end

  # Return parsed canonical KU hash, or nil (recording an error) if missing.
  def canonical(std, ka, ku, context)
    key = "#{std}/#{ka}/#{ku}"
    return @canon[key] if @canon.key?(key)

    path = File.join(@dir, "curricula", std, ka, "#{ku}.yml")
    unless File.exist?(path)
      add("#{context}: no canonical file for #{ka}/#{ku} under #{std} (expected #{path})")
      return @canon[key] = nil
    end
    data = load_yaml(path)
    # tolerate a not-yet-renamed canonical file, but prefer learning_outcomes
    data["learning_outcomes"] ||= data.delete("outcomes") if data.is_a?(Hash)
    @canon[key] = data
  end

  # Validate one selection block ({topics:, learning_outcomes:}) against a set
  # of allowed ids per kind. `allowed` is { "topics" => [...], "learning_outcomes" => [...] }.
  # Returns the *resolved coverage* { "topics" => [ids], "learning_outcomes" => [ids] }
  # (what this selection actually covers), for downstream ⊆ checks.
  def validate_selection(sel, allowed, context)
    coverage = {}
    return coverage unless sel.is_a?(Hash)

    # Unknown selector keys are errors (kills the topic vs topics typo class).
    (sel.keys - SELECTOR_KEYS).each do |bad|
      add("#{context}: unknown selector key #{bad.inspect} " \
          "(only #{SELECTOR_KEYS.join(', ')} allowed)")
    end

    SELECTOR_KEYS.each do |kind|
      next unless sel.key?(kind)
      value = sel[kind]
      allow = allowed[kind] || []
      if value == "all"
        coverage[kind] = allow.dup
      elsif value.is_a?(Array)
        unknown = value - allow
        unless unknown.empty?
          add("#{context}/#{kind}: ids not allowed here: #{unknown.inspect} " \
              "(allowed: #{allow.inspect})")
        end
        coverage[kind] = value & allow
      else
        add("#{context}/#{kind}: value must be \"all\" or a list, got #{value.inspect}")
        coverage[kind] = []
      end
    end
    # A kaku with no selector keys means whole KU.
    if (sel.keys & SELECTOR_KEYS).empty? && (sel.keys - ["all"]).empty?
      SELECTOR_KEYS.each { |k| coverage[k] = (allowed[k] || []).dup }
    end
    coverage
  end

  def validate_offering(tlo_path)
    off_dir = File.dirname(tlo_path)
    label = off_dir.sub(@dir + File::SEPARATOR, "")
    data = load_yaml(tlo_path) or return

    std = data["standard"]
    add("#{label}/tlo.yml: missing `standard`") if std.nil? || std.to_s.empty?
    kaku_map = data["kaku"]
    unless kaku_map.is_a?(Hash)
      add("#{label}/tlo.yml: missing or malformed `kaku:` map")
      return
    end

    # coverage[kaku_key] = { "topics"=>[ids], "learning_outcomes"=>[ids] }
    offering_coverage = {}

    kaku_map.each do |kaku_key, sel|
      ka, ku = kaku_key.to_s.split("/", 2)
      if ka.nil? || ku.nil? || ku.empty?
        add("#{label}/tlo.yml: kaku key #{kaku_key.inspect} is not \"KA/KU\"")
        next
      end
      canon = canonical(std, ka, ku, "#{label}/tlo.yml[#{kaku_key}]") or next
      allowed = {
        "topics"            => TLOResolver.topic_ids(canon),
        "learning_outcomes" => TLOResolver.outcome_ids(canon)
      }
      offering_coverage[kaku_key] =
        validate_selection(sel, allowed, "#{label}/tlo.yml[#{kaku_key}]")
    end

    validate_plan(off_dir, label, offering_coverage)
  end

  def validate_plan(off_dir, label, offering_coverage)
    plan_path = File.join(off_dir, "plan.yml")
    return unless File.exist?(plan_path) # plan is optional
    plan = load_yaml(plan_path) or return

    meetings = extract_meetings(plan)
    return if meetings.nil?

    meetings.each do |mtg|
      mnum = mtg["meeting"] || mtg["mtg"] || "?"
      Array(mtg["tlo"]).each do |entry|
        unless entry.is_a?(Hash) && entry["kaku"]
          add("#{label}/plan.yml meeting #{mnum}: tlo entry missing `kaku`")
          next
        end
        kaku_key = entry["kaku"]
        cov = offering_coverage[kaku_key]
        if cov.nil?
          add("#{label}/plan.yml meeting #{mnum}: kaku #{kaku_key.inspect} " \
              "is not declared in this offering's tlo.yml")
          next
        end
        # Meeting selection must be ⊆ what the offering covers for this KU.
        allowed = {
          "topics"            => cov["topics"] || [],
          "learning_outcomes" => cov["learning_outcomes"] || []
        }
        sel = entry.reject { |k, _| k == "kaku" }
        validate_selection(sel, allowed,
                           "#{label}/plan.yml meeting #{mnum} [#{kaku_key}]")
      end
    end
  end

  # plan.yml top-level shape isn't locked yet; accept either a top-level
  # `meetings:` list or a single-key wrapper whose value carries `meetings:`.
  def extract_meetings(plan)
    return plan["meetings"] if plan.is_a?(Hash) && plan["meetings"].is_a?(Array)
    if plan.is_a?(Hash)
      inner = plan.values.find { |v| v.is_a?(Hash) && v["meetings"].is_a?(Array) }
      return inner["meetings"] if inner
    end
    add("plan.yml: could not locate a `meetings:` list (shape not recognised)")
    nil
  end
end