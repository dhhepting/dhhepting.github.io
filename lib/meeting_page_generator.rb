# frozen_string_literal: true
#
# lib/meeting_page_generator.rb
#
# Writes one front-matter-only .creole page per meeting for ONE offering,
# fully generated from meetings.yml — NO hand-authored body, ever. A
# meeting page's whole Moodle-paste text is composed at render time by the
# meeting_page layout's `creole_preamble` capture and emitted via
# {% creole_source %}, so there is nothing to author in this file and it
# is ALWAYS safe to overwrite in full — no drift-detection, no FORCE flag.
#
# This REPLACES the former stub-creator of the same name (a CS-280-era
# leftover that seeded a HAND-AUTHORED body once, then left it alone via
# drift-detection). Now that Outline / For Next Meeting live in plan.yml
# and WikiGroup Contributions ships as generated seed text, no part of a
# meeting page is hand-authored on the Jekyll side — the same fully-
# generated model the photos page already uses.
#
# PER-OFFERING ON PURPOSE. There is deliberately no generate_all: writing
# front-matter-only pages DESTROYS any offering still using hand-authored
# bodies, so migration to this model is opt-in one offering at a time by
# running `rake meetings:pages[<crs>,<sem>]` for it. As a safety net,
# generate_for reports every page whose existing non-empty body it
# stripped, so a migration can be audited (migrate that content into
# plan.yml BEFORE running this).
#
# The .creole files stay COMMITTED (not build artifacts): front-matter
# only, they change solely when meetings are added/removed, and
# {% creole_source %} reads each file's (now empty) body straight off
# disk at render time, so the file must exist before Jekyll builds.

require 'yaml'
require 'fileutils'
require_relative 'meeting_page_fields'

class MeetingPageGenerator
  def initialize(teaching_data_dir: '_data/teaching', output_dir: '_meeting_pages')
    @teaching_data_dir = teaching_data_dir
    @output_dir = output_dir
  end

  # Regenerate every meeting .creole page for a single offering.
  # Returns { written: [...], stripped_body: [...], errors: [...] }.
  def generate_for(crs_id, crs_sem)
    result = { written: [], stripped_body: [], errors: [] }

    if to_s_blank?(crs_id) || to_s_blank?(crs_sem)
      result[:errors] << 'usage: generate_for(crs_id, crs_sem) — both required'
      return result
    end

    offering_dir = File.join(@teaching_data_dir, crs_id, crs_sem)
    meetings_path = File.join(offering_dir, 'meetings.yml')
    unless File.exist?(meetings_path)
      result[:errors] << "#{crs_id}/#{crs_sem}: no meetings.yml at #{meetings_path}"
      return result
    end

    offering = load_yaml(File.join(offering_dir, 'offering.yml'))
    if offering.nil?
      result[:errors] << "#{crs_id}/#{crs_sem}: no offering.yml (refusing to write pages for an offering that doesn't exist)"
      return result
    end

    meetings = (load_yaml(meetings_path) || []).sort_by { |m| m['meeting'] }
    meetings.each { |mtg| write_meeting_page(crs_id, crs_sem, mtg, result) }
    result
  end

  private

  def to_s_blank?(v) = v.nil? || v.to_s.strip.empty?

  def load_yaml(path)
    return nil unless File.exist?(path)

    YAML.load_file(path)
  end

  def write_meeting_page(crs_id, crs_sem, mtg, result)
    slug = MeetingPageFields.meeting_slug(mtg)
    out_path = File.join(@output_dir, crs_id, crs_sem, "#{slug}.creole")

    stripped = existing_body_present?(out_path)

    front_matter = {
      'layout' => 'meeting_page',
      'course' => crs_id,
      'semester' => crs_sem,
      'generated_from' => mtg['meeting'],
      'title' => "#{crs_id} Mtg #{mtg['meeting']}",
    }

    FileUtils.mkdir_p(File.dirname(out_path))
    File.write(out_path, "---\n#{front_matter.to_yaml.sub(/\A---\n/, '')}---\n")

    result[:written] << "#{crs_id}/#{crs_sem}/#{slug} (mtg #{mtg['meeting']})"
    result[:stripped_body] << "#{crs_id}/#{crs_sem}/#{slug}" if stripped
  rescue StandardError => e
    result[:errors] << "#{crs_id}/#{crs_sem}/mtg#{mtg['meeting']}: #{e.message}"
  end

  # True if the file exists and has non-whitespace content after its
  # front matter — i.e. a hand-authored body that this run will discard.
  def existing_body_present?(path)
    return false unless File.exist?(path)

    body = File.read(path, encoding: 'UTF-8').sub(/\A---\s*\n.*?\n---\s*\n/m, '')
    !body.strip.empty?
  end
end