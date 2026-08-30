# frozen_string_literal: true
#
# _plugins/offerings_index_generator.rb
#
# Builds site.data.teaching.offerings by scanning every
# _data/teaching/<crs_id>/<crs_sem>/ offering directory. Discovery now
# enumerates the offering DIRECTORIES (course / 6-digit-semester) rather than
# globbing offering.yml directly, so a directory that is missing its
# offering.yml is reported instead of silently vanishing from the index.
#
# Referential integrity (course id + semester known) is checked against the
# course/semester lists in site.data.teaching.all, so this reads site.data
# directly and needs no file path or _config.yml key.
#
# priority :highest — must run before generators that read
# site.data.teaching.offerings.

require 'yaml'
require 'date'

class OfferingsIndexError < StandardError; end

class OfferingsIndexGenerator < Jekyll::Generator
  priority :highest

  # A directory is an offering iff its own name is a 6-digit semester code.
  # This is what distinguishes CS-280/202610 from the all/ and curricula/
  # trees (whose second level is never a 6-digit code).
  SEMESTER_RE = /\A\d{6}\z/

  def generate(site)
    all = site.data.dig('teaching', 'all') || {}
    known_course_ids = ref_ids(all['courses'],   'id',       'courses.yml')
    known_semesters  = ref_ids(all['semesters'], 'semester', 'semesters.yml')

    offerings = []
    missing   = 0

    Dir.glob(File.join(site.source, '_data/teaching/*/*')).sort.each do |dir|
      next unless File.directory?(dir)

      crs_sem = File.basename(dir)
      crs_id  = File.basename(File.dirname(dir))
      next unless crs_sem.match?(SEMESTER_RE) # only <course>/<NNNNNN>/ dirs

      label = "#{crs_id}/#{crs_sem}"
      path  = File.join(dir, 'offering.yml')

      unless File.file?(path)
        missing += 1
        Jekyll.logger.warn 'offerings:',
          "no offering.yml found for #{label} — directory skipped (not indexed)"
        next
      end

      unless known_course_ids.include?(crs_id)
        raise OfferingsIndexError,
          "#{label}: course id #{crs_id.inspect} not found in _data/teaching/all/courses.yml"
      end
      unless known_semesters.include?(crs_sem)
        raise OfferingsIndexError,
          "#{label}: semester #{crs_sem.inspect} not found in _data/teaching/all/semesters.yml"
      end

      data = YAML.safe_load_file(path, permitted_classes: [Date, Time]) || {}
      offerings << data.merge('id' => crs_id, 'semester' => crs_sem)
    end

    site.data['teaching'] ||= {}
    site.data['teaching']['offerings'] = offerings

    summary = "indexed #{offerings.size} offering(s)"
    summary += "; #{missing} directory(ies) missing offering.yml" if missing.positive?
    Jekyll.logger.info 'offerings:', summary
  end

  private

  # Reference ids from a site.data YAML list, coerced to non-empty strings so
  # integer semester codes (202610) match the string directory names ("202610").
  # Raises loudly if the reference list did not load at all.
  def ref_ids(list, field, filename)
    raise OfferingsIndexError, "reference data missing: _data/teaching/all/#{filename} did not load" if list.nil?
    raise OfferingsIndexError, "reference data _data/teaching/all/#{filename} should be a list, got #{list.class}" unless list.is_a?(Array)

    list.map { |row| row[field] }.compact.map(&:to_s).reject(&:empty?)
  end
end