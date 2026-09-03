# frozen_string_literal: true
require 'set'
require_relative 'course_id'

# lib/offering_source_audit.rb
# Pure comparison of the three offering sources, so the audit logic is testable
# offline. Given the CSV rows, the derived-index rows, and the list of
# (course,sem) pairs that have an offering.yml, it returns a printable matrix
# and, crucially, an inference of what the derived INDEX is sourced from.
module OfferingSourceAudit
  module_function

  def key_of(row)
    # Normalize the course id so the readable + form and the data _ form of the
    # same cross-listed course compare equal (CS-428+828 == CS-428_828).
    [CourseId.data_key(row['id']), row['semester'].to_s]
  end

  def audit(csv_rows, index_rows, yml_pairs)
    csv   = Array(csv_rows).map  { |r| key_of(r) }.to_set
    index = Array(index_rows).map { |r| key_of(r) }.to_set
    yml   = Array(yml_pairs).map  { |c, s| [c.to_s, s.to_s] }.to_set
    all   = (csv | index | yml).to_a.sort

    lines = []
    lines << format('%-16s %-8s  %-5s %-5s %-5s  %s', 'COURSE', 'SEM', 'CSV', 'INDEX', 'YML', 'note')
    lines << ('-' * 60)
    all.each do |c, s|
      inc = ->(set) { set.include?([c, s]) ? 'yes' : '—' }
      present = []
      present << 'CSV'   if csv.include?([c, s])
      present << 'INDEX' if index.include?([c, s])
      present << 'YML'   if yml.include?([c, s])
      note = (present.size == 3) ? '' : "only #{present.join('+')}"
      lines << format('%-16s %-8s  %-5s %-5s %-5s  %s', c, s, inc.call(csv), inc.call(index), inc.call(yml), note)
    end

    lines << ('-' * 60)
    lines << "INDEX tracks: #{infer_index_source(csv, index, yml)}"
    lines.join("\n")
  end

  # The migration question, answered empirically: is the derived INDEX set equal
  # to the CSV set, the YML set, both (identical during overlap), or neither?
  def infer_index_source(csv, index, yml)
    matches_csv = (index == csv)
    matches_yml = (index == yml)
    return 'CSV and YML are identical right now — inconclusive (make them differ to tell)' if matches_csv && matches_yml
    return 'the CSV (site.data.teaching.all.offerings) — legacy source' if matches_csv
    return 'the offering.yml files (per-offering nodes) — new source' if matches_yml
    'NEITHER exactly — index diverges from both; inspect OfferingsIndexGenerator'
  end
end