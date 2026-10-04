# frozen_string_literal: true

# lib/tlo_resolver.rb
# ---------------------------------------------------------------------------
# Pure resolution of a CS2023 Knowledge Unit against a selection.
#
# "Author the tree, compute the numbers." The canonical KU file stores no
# outline numbers; this module derives them from list position and nesting
# depth (arabic / lower-alpha / lower-roman) so ACM errata renumbering never
# touches the data. It also:
#   * asserts entries appear in curriculum-level order — core, then
#     knowledge-area, then non-core (fail-loud: a stray entry mid-list would
#     make the tier dividers misfire silently);
#   * marks each tier divider (`tier_break_before`);
#   * applies an `all | [ids]` selection as a `covered` flag per top-level
#     entry (display policy — grey vs omit — is the caller's choice, not ours).
#
# This module does NO file IO and knows nothing about Jekyll, so it is unit-
# testable against plain hashes and runnable offline (see test/tlo_resolver_test.rb).
#
# Public API:
#   TLOResolver.resolve(ku_data, topics: sel, learning_outcomes: sel) -> Hash
#     sel is the string "all" or an Array of top-level ids.
#   TLOResolver.topic_ids(ku_data)  / .outcome_ids(ku_data) -> [ids]  (helpers
#     the validator uses to check containment without duplicating traversal).
# ---------------------------------------------------------------------------

module TLOResolver
  module_function

  # ---- selection sentinel -------------------------------------------------

  ALL = "all"

  # Curriculum tiers, in the order they must appear within a KU's lists.
  CURRICULUM_LEVELS = %w[core knowledge-area non-core].freeze

  # Read and validate an entry's `curriculum_level`. Gives a pointed message
  # for the retired `core: CS | KA` key so a half-migrated file is obvious.
  def curriculum_level_of(entry, where)
    level = entry["curriculum_level"]
    return level if CURRICULUM_LEVELS.include?(level)

    if level.nil? && entry.key?("core")
      raise ArgumentError,
            "#{where}: retired `core:` key (#{entry['core'].inspect}); rename to " \
            "`curriculum_level:` (CS -> core, KA -> knowledge-area)"
    end
    raise ArgumentError,
          "#{where}: curriculum_level must be one of " \
          "#{CURRICULUM_LEVELS.join(', ')}, got #{level.inspect}"
  end

  # Normalise a selector value to either :all or an Array of ids.
  # Raises on anything else so a typo'd selector fails loud, not silent.
  def normalize_selection(sel, where)
    return :all if sel.nil?               # bare KU / missing key => whole set
    return :all if sel == ALL
    return sel  if sel.is_a?(Array)
    raise ArgumentError,
          "#{where}: selector must be \"all\" or a list of ids, got #{sel.inspect}"
  end

  # ---- id helpers (used by the validator) --------------------------------

  def topic_ids(ku_data)
    Array(ku_data["topics"]).map { |t| t["id"] }
  end

  def outcome_ids(ku_data)
    Array(ku_data["learning_outcomes"]).map { |o| o["id"] }
  end

  # ---- numbering ----------------------------------------------------------

  # depth 0 -> arabic, 1 -> lower-alpha, 2 -> lower-roman, then cycle.
  def number_for(depth, index) # index is 1-based
    case depth % 3
    when 0 then index.to_s
    when 1 then to_alpha(index)
    else        to_roman(index)
    end
  end

  def to_alpha(n) # 1 -> "a", 26 -> "z", 27 -> "aa"
    s = +""
    while n > 0
      n -= 1
      s.prepend((97 + (n % 26)).chr)
      n /= 26
    end
    s
  end

  ROMAN = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"],
           [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"],
           [5, "v"], [4, "iv"], [1, "i"]].freeze

  def to_roman(n)
    out = +""
    ROMAN.each do |val, sym|
      while n >= val
        out << sym
        n -= val
      end
    end
    out
  end

  # ---- nested sub-topic numbering ----------------------------------------

  def number_items(items, depth)
    Array(items).each_with_index.map do |it, i|
      {
        "number"   => number_for(depth, i + 1),
        "text"     => it["text"],
        "see_also" => it["see_also"],
        "items"    => number_items(it["items"], depth + 1)
      }
    end
  end

  # ---- top-level list resolution -----------------------------------------

  # entries: canonical list (topics or learning_outcomes)
  # selection: :all or [ids]
  # kind: "topics" | "learning_outcomes" (for error messages)
  def resolve_list(entries, selection, kind, ku_name)
    entries = Array(entries)

    # Fail loud if any selected id is not a real top-level id.
    if selection.is_a?(Array)
      known = entries.map { |e| e["id"] }
      unknown = selection - known
      unless unknown.empty?
        raise ArgumentError,
              "#{ku_name}/#{kind}: selected ids not in this KU: #{unknown.inspect} " \
              "(known: #{known.inspect})"
      end
    end

    prev_rank  = -1
    prev_level = nil
    entries.each_with_index.map do |e, i|
      level = curriculum_level_of(e, "#{ku_name}/#{kind}/#{e['id']}")
      rank  = CURRICULUM_LEVELS.index(level)
      # Ordering invariant: levels may only stay the same or step forward.
      if rank < prev_rank
        raise ArgumentError,
              "#{ku_name}/#{kind}: #{level} entry #{e['id'].inspect} appears after a " \
              "#{prev_level} entry; list order drives numbering and the tier dividers, " \
              "so entries must run #{CURRICULUM_LEVELS.join(' -> ')}"
      end
      tier_break = !prev_level.nil? && level != prev_level
      prev_rank  = rank
      prev_level = level

      covered = selection == :all || selection.include?(e["id"])
      {
        "number"            => number_for(0, i + 1), # continuous across tiers
        "id"                => e["id"],
        "curriculum_level"  => level,
        "text"              => e["text"],
        "covered"           => covered,
        "tier_break_before" => tier_break,
        "items"             => number_items(e["items"], 1)
      }
    end
  end

  # ---- flatten for rendering ---------------------------------------------

  # Pre-order flatten of a resolved list (topics or learning_outcomes) into a
  # flat array of rows the Liquid renderer walks with a single loop — no
  # recursion, no depth cap. Row kinds:
  #   { "kind" => "tier_break", "tier" => <new level> }   <- tier divider
  #   { "number","text","depth","covered","see_also",... } <- content row
  # depth 0 = top-level, 1 = items, 2 = items-of-items, ...
  # Nested items inherit their top-level entry's `covered` (grey the block).
  #
  # covered_only:
  #   false (offering view) — show the whole KU; non-covered entries are greyed.
  #   true  (meeting view)  — show only covered entries; nothing greyed.
  # Dividers are recomputed over the rows actually shown: one is emitted
  # wherever the curriculum level changes between consecutive shown entries
  # (core -> knowledge-area, knowledge-area -> non-core, ...), and carries the
  # level it introduces in "tier" so the template can label it.
  def flatten_for_render(entries, covered_only: false)
    shown = Array(entries)
    shown = shown.select { |e| e["covered"] } if covered_only

    rows = []
    prev_level = nil
    shown.each do |e|
      level = e["curriculum_level"]
      rows << { "kind" => "tier_break", "tier" => level } if prev_level && level != prev_level
      prev_level = level
      rows << {
        "kind"             => "row",
        "number"           => e["number"],
        "text"             => e["text"],
        "depth"            => 0,
        "covered"          => e["covered"],
        "curriculum_level" => level,
        "id"               => e["id"],
        "see_also"         => nil
      }
      flatten_items(e["items"], 1, e["covered"], rows)
    end
    rows
  end

  def flatten_items(items, depth, covered, rows)
    Array(items).each do |it|
      rows << {
        "kind"     => "row",
        "number"   => it["number"],
        "text"     => it["text"],
        "depth"    => depth,
        "covered"  => covered,
        "see_also" => it["see_also"]
      }
      flatten_items(it["items"], depth + 1, covered, rows)
    end
  end

  # ---- meeting BOK resolution (shared by both meeting systems) ------------

  # Resolve a meeting's `BOK:` list against the canonical curriculum. Callers
  # differ only in HOW they find a KU (System A reads site.data; System B reads
  # disk), so they pass a lookup proc  ->(ka, ku) { canonical_ku_hash_or_nil }.
  # Returns one render-ready unit per BOK entry, with covered-only rows (a
  # meeting shows what it covers, not the whole KU greyed).
  #
  #   bok_list: [ { "kaku"=>"GIT/Fundamentals",
  #                 "topics"=>[...]|"all", "learning_outcomes"=>[...]|"all" }, ... ]
  def resolve_meeting_bok(bok_list, &canonical_lookup)
    Array(bok_list).map do |entry|
      kaku = entry["kaku"]
      ka, ku = kaku.to_s.split("/", 2)
      if ka.nil? || ku.nil? || ku.empty?
        raise ArgumentError, "meeting BOK: kaku #{kaku.inspect} is not \"KA/KU\""
      end
      canon = canonical_lookup.call(ka, ku)
      raise ArgumentError, "meeting BOK: no canonical data for #{kaku}" if canon.nil?

      t_sel = entry.key?("topics") ? entry["topics"] : "all"
      l_sel = entry.key?("learning_outcomes") ? entry["learning_outcomes"] : "all"
      res = resolve(canon, topics: t_sel, learning_outcomes: l_sel)

      {
        "kaku"          => kaku,
        "ka"            => ka,
        "ku"            => ku,
        "ku_title"      => res["title"] || ku,
        "topics_rows"   => flatten_for_render(res["topics"], covered_only: true),
        "outcomes_rows" => flatten_for_render(res["learning_outcomes"], covered_only: true)
      }
    end
  end

  # ---- public entry point -------------------------------------------------

  def resolve(ku_data, topics: :all, learning_outcomes: :all)
    ku_name = ku_data["ku"] || ku_data["title"] || "<unknown KU>"
    t_sel = normalize_selection(topics == :all ? ALL : topics, "#{ku_name}/topics")
    l_sel = normalize_selection(learning_outcomes == :all ? ALL : learning_outcomes,
                                "#{ku_name}/learning_outcomes")
    {
      "ku"                => ku_data["ku"],
      "title"             => ku_data["title"],
      "description"       => ku_data["description"],
      "topics"            => resolve_list(ku_data["topics"], t_sel, "topics", ku_name),
      "learning_outcomes" => resolve_list(ku_data["learning_outcomes"], l_sel,
                                          "learning_outcomes", ku_name)
    }
  end
end