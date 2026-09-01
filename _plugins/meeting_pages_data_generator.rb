# frozen_string_literal: true
#
# _plugins/meeting_pages_data_generator.rb
#
# Computes site.data.teaching[crs_id][crs_sem].meeting_pages_generated
# automatically on every `jekyll build`/`jekyll serve` — no Rake step,
# no file written to disk, always current with plan.yml/meetings.yml.
# This is what makes CI "automagic": you never need to remember to run
# a generation command before a build for these fields to be fresh.
#
# NOTE: this replaces the disk-file version. If your repo still has
# _data/teaching/<id>/<sem>/meeting_pages_generated.yml checked in from
# before, delete it — this generator sets the same site.data key, so a
# stale on-disk copy is now dead weight, not a second source of truth
# (Jekyll loads _data/ before running generators, and this generator
# unconditionally overwrites the key, so a stale file wouldn't cause
# wrong output — but it's confusing residue worth removing).
#
# priority :high — same tier as MeetingGridGenerator, after
# OfferingsIndexGenerator's :highest (this doesn't depend on the
# offerings index — it reads each offering's offering.yml directly off
# disk — so exact ordering relative to MeetingGridGenerator doesn't
# matter, only that both run after :highest).

require 'yaml'
require_relative '../lib/meeting_page_fields'

class MeetingPagesDataGenerator < Jekyll::Generator
  priority :high

  def generate(site)
    Dir.glob(File.join(site.source, '_data/teaching/*/*/meetings.yml')).each do |meetings_path|
      crs_sem = File.basename(File.dirname(meetings_path))
      crs_id = File.basename(File.dirname(File.dirname(meetings_path)))
      offering_dir = File.dirname(meetings_path)

      offering = load_yaml(File.join(offering_dir, 'offering.yml'))
      next if offering.nil? # no offering.yml yet — nothing to compute against

      meetings = (load_yaml(meetings_path) || []).sort_by { |m| m['meeting'] }
      meeting_plans = MeetingPageFields.load_meeting_plan(File.join(offering_dir, 'plan.yml'))
      standard = MeetingPageFields.load_standard(File.join(offering_dir, 'tlo.yml'))
      # Canonical KU lookup from the shared `all` namespace already loaded into
      # site.data — same source the offering section and MtgNN page resolve from.
      std_curr = standard && site.data.dig('teaching', 'all', 'curricula', standard)
      canonical_lookup = ->(ka, ku) { std_curr && std_curr.dig(ka, ku) }
      valid_meetings = meetings.map { |m| m['meeting'] }
      media = MeetingPageFields.load_media(File.join(offering_dir, 'media.csv'), valid_meetings)

      generated = {}
      meetings.each_with_index do |mtg, i|
        generated[mtg['meeting']] = MeetingPageFields.compute(
          crs_id, crs_sem, offering, meetings, i, meeting_plans[mtg['meeting']] || {},
          standard, canonical_lookup, media[mtg['meeting']] || []
        )
      end

      site.data['teaching'] ||= {}
      site.data['teaching'][crs_id] ||= {}
      site.data['teaching'][crs_id][crs_sem] ||= {}
      site.data['teaching'][crs_id][crs_sem]['meeting_pages_generated'] = generated
    end
  end

  private

  def load_yaml(path)
    return nil unless File.exist?(path)

    YAML.load_file(path)
  end
end