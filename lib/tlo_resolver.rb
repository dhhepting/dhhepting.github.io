# frozen_string_literal: true

# lib/tlo_resolver.rb
# ---------------------------------------------------------------------------
# Pure resolution of a CS2023 Knowledge Unit against a selection.
#
# "Author the tree, compute the numbers." The canonical KU file stores no
# outline numbers; this module derives them from list position and nesting
# depth (arabic / lower-alpha / lower-roman) so ACM errata renumbering never
# touches the data. It also:
#   * asserts CS-core entries precede KA-core entries (fail-loud: a stray
#     KA entry mid-list would make the tier divider misfire silently);
#   * marks the single CS->KA divider (`tier_break_before`);
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

    seen_ka = false
    entries.each_with_index.map do |e, i|
      core = e["core"]
      unless %w[CS KA].include?(core)
        raise ArgumentError, "#{ku_name}/#{kind}/#{e['id']}: core must be CS or KA, got #{core.inspect}"
      end
      # Ordering invariant: once KA seen, no CS may follow.
      if core == "CS" && seen_ka
        raise ArgumentError,
              "#{ku_name}/#{kind}: CS-core entry #{e['id'].inspect} appears after a KA-core entry; " \
              "list order drives numbering and the tier divider, so CS must precede KA"
      end
      tier_break = (core == "KA" && !seen_ka)
      seen_ka ||= (core == "KA")

      covered = selection == :all || selection.include?(e["id"])
      {
        "number"            => number_for(0, i + 1), # continuous across tiers
        "id"                => e["id"],
        "core"              => core,
        "text"              => e["text"],
        "covered"           => covered,
        "tier_break_before" => tier_break,
        "items"             => number_items(e["items"], 1)
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