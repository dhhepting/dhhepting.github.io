# frozen_string_literal: true
#
# _plugins/zz_offering_source_audit.rb  (READ-ONLY diagnostic; delete after migration)
#
# Runs :lowest so every generator has populated site.data. Prints a presence
# matrix for every (course, semester) offering across the three sources, and
# infers what the derived INDEX is built from — answering "which offerings path
# is canonical" from real build data instead of reasoning. Named zz_ so it loads
# last. Writes nothing; only logs.
require_relative '../lib/offering_source_audit'

module Teaching
  class OfferingSourceAuditGenerator < Jekyll::Generator
    safe true
    priority :lowest

    def generate(site)
      t = site.data['teaching'] || {}
      csv   = Array(t.dig('all', 'offerings'))   # the CSV
      index = Array(t['offerings'])              # the derived index

      yml = []
      t.each do |course, sems|
        next if course == 'all'
        next unless sems.is_a?(Hash)
        sems.each do |sem, node|
          yml << [course.to_s, sem.to_s] if node.is_a?(Hash) && node['offering']
        end
      end

      report = OfferingSourceAudit.audit(csv, index, yml)
      Jekyll.logger.info 'offering-audit:', "\n#{report}\n"
    end
  end
end