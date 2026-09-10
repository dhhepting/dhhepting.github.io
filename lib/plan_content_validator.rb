# frozen_string_literal: true
#
# lib/plan_content_validator.rb
#
# Validates AND normalizes the "list of links" content fields authored on
# each plan.yml meeting block — currently `outline` (Outline for Today)
# and `for_next_meeting` (For Next Meeting). Same authored/derived seam as
# everything else: you hand-author terse YAML, this turns it into the
# render-ready shape the layout consumes, and it fails LOUD (with the
# course/semester/meeting/field/index and the offending value) on anything
# malformed rather than silently emitting a broken bullet into Moodle.
#
# Pure library (no Jekyll): testable offline with `ruby -Ilib`. Phase 2
# calls normalize_meeting from MeetingPageFields.compute so `gen.outline`
# and `gen.for_next_meeting` arrive pre-normalized; the layout then just
# formats.
#
# Each list item may be authored two ways, so your existing
# `outline: [fundamentals, wiki, exams]` keeps working unchanged:
#   - a bare String      -> { 'text' => <string>, 'url' => nil }   (* text)
#   - a { text, url } Hash -> { 'text' => ...,     'url' => ... }   (* [[url | text]])
# `url` is optional; `text` is required. Any other key on the hash, any
# non-String/Hash item, a non-list value, or blank text is an authoring
# error and raises. Absent or nil field = section omitted downstream
# (presence-driven rendering), so it is NOT an error.

module PlanContentValidator
  module_function

  LIST_FIELDS = %w[outline for_next_meeting].freeze
  ITEM_KEYS   = %w[text url].freeze

  # Returns { 'outline' => [...normalized...], 'for_next_meeting' => [...] }
  # containing only the fields actually present (and non-nil) on this meeting.
  def normalize_meeting(mtg, crs_id: nil, crs_sem: nil)
    LIST_FIELDS.each_with_object({}) do |field, out|
      next unless mtg.key?(field)
      raw = mtg[field]
      next if raw.nil? # authored empty -> treat as absent, not an error

      out[field] = normalize_list(raw, loc: location(crs_id, crs_sem, mtg, field))
    end
  end

  def normalize_list(raw, loc:)
    unless raw.is_a?(Array)
      raise "#{loc} must be a list, got #{raw.class} (#{raw.inspect})"
    end

    raw.each_with_index.map { |item, i| normalize_item(item, loc: "#{loc}[#{i}]") }
  end

  def normalize_item(item, loc:)
    case item
    when String then { 'text' => require_text(item, loc: loc), 'url' => nil }
    when Hash   then normalize_hash_item(item, loc: loc)
    else
      raise "#{loc} must be a String or a { text, url } Hash, got #{item.class} (#{item.inspect})"
    end
  end

  def normalize_hash_item(item, loc:)
    extra = item.keys - ITEM_KEYS
    unless extra.empty?
      raise "#{loc} has unknown key(s) #{extra.inspect} — only #{ITEM_KEYS.inspect} are allowed"
    end

    text = require_text(item['text'], loc: loc, what: "'text'")

    url = item['url']
    unless url.nil?
      raise "#{loc} 'url' must be a String, got #{url.class} (#{url.inspect})" unless url.is_a?(String)
      url = url.strip
      raise "#{loc} 'url' is present but empty — omit the key or give it a value" if url.empty?
    end

    { 'text' => text, 'url' => url }
  end

  def require_text(value, loc:, what: 'item')
    raise "#{loc} #{what} must be a String, got #{value.class} (#{value.inspect})" unless value.is_a?(String)

    stripped = value.strip
    raise "#{loc} #{what} is empty — remove it or give it text" if stripped.empty?

    stripped
  end

  def location(crs_id, crs_sem, mtg, field)
    who = [crs_id, crs_sem].compact.join('/')
    prefix = who.empty? ? '' : "plan.yml #{who} "
    "#{prefix}meeting #{mtg['meeting'].inspect} #{field}"
  end
end