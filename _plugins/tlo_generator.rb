# frozen_string_literal: true

require_relative "../lib/tlo_resolver"
require_relative "../lib/tlo_validator"

# _plugins/tlo_generator.rb
# ---------------------------------------------------------------------------
# Derives, for every offering that has an authored `tlo`, a render-ready
# `tlo_resolved` node — mirroring weekly_schedule_generator.rb's shape (compute
# in Ruby, render dumb in Liquid). The offering include walks tlo_resolved and
# emits markup; it performs no lookup, filtering, numbering, or greying.
#
# It also runs TLOValidator once at build time and RAISES on any containment
# violation, so a bad selection fails the build instead of shipping silently.
#
# Reads canonical data from the shared `all` namespace:
#   site.data.teaching.all.curricula[STD][KA][KU]      (KU: topics/learning_outcomes)
#   site.data.teaching.all.curricula[STD][KA]._ka      (KA meta: name/preamble)
#
# Writes onto each offering node (site.data.teaching[COURSE][SEM]):
#   node["tlo_resolved"] = {
#     "standard" => "CS2023",
#     "units"    => [ { "ka","ku","ka_name","ka_preamble",
#                       "ku_title","ku_description",
#                       "topics_rows"=>[...], "outcomes_rows"=>[...] }, ... ]
#   }
# ---------------------------------------------------------------------------

module Jekyll
  class TLOGenerator < Generator
    safe true
    priority :normal

    def generate(site)
      teaching = site.data["teaching"]
      return unless teaching.is_a?(Hash)

      curricula = teaching.dig("all", "curricula")

      teaching.each do |course, sems|
        next if course == "all"
        next unless sems.is_a?(Hash)
        sems.each do |sem, node|
          next unless node.is_a?(Hash) && node["tlo"]
          label = "#{course}/#{sem}"
          if curricula.nil?
            raise "TLOGenerator: #{label} has a tlo but no curricula at " \
                  "site.data.teaching.all.curricula — check the all/ namespace"
          end
          node["tlo_resolved"] = resolve_offering(node["tlo"], curricula, label)
        end
      end

      # One build-time containment check across every offering (reuses the
      # same validator the Rake tier runs). Fail loud.
      errors = TLOValidator.new(File.join(site.source, "_data", "teaching")).run
      unless errors.empty?
        raise "TLOValidator found #{errors.size} problem(s):\n  - #{errors.join("\n  - ")}"
      end
    end

    private

    def resolve_offering(tlo, curricula, label)
      std = tlo["standard"]
      #raise "TLOGenerator: #{label}/tlo.yml missing `standard`" if std.nil?
      std_data = curricula[std]
      #raise "TLOGenerator: #{label} references unknown standard #{std.inspect}" if std_data.nil?

      kaku_map = tlo["kaku"]
      if kaku_map.is_a?(Hash)
      #raise "TLOGenerator: #{label}/tlo.yml missing `kaku:` map" unless kaku_map.is_a?(Hash)

    #   if kaku_map.nil? || !kaku_map.is_a?(Hash)
    #     Jekyll.logger.warn "TLOGenerator:", "#{label} has no valid `kaku` map"
    #     return { "standard" => std, "units" => [] }
    #   end

      units = kaku_map.map do |kaku_key, sel|
        ka, ku = kaku_key.to_s.split("/", 2)
        ka_node = std_data[ka]
        #raise "TLOGenerator: #{label} unknown KA #{ka.inspect} in #{std}" if ka_node.nil?
        ku_node = ka_node[ku]
        #raise "TLOGenerator: #{label} unknown KU #{ka}/#{ku} in #{std}" if ku_node.nil?
      end
        # KA meta lives in _ka.yml -> key "_ka". If it didn't load (some Jekyll
        # setups skip underscore-prefixed data files), warn loudly rather than
        # silently dropping the KA preamble.
        ka_meta = ka_node["_ka"]
        if ka_meta.nil?
          Jekyll.logger.warn "TLOGenerator:",
                             "#{label} #{ka}: no _ka meta loaded (KA preamble/name will be blank) " \
                             "— confirm Jekyll loads underscore-prefixed data files"
          ka_meta = {}
        end

        sel = {} unless sel.is_a?(Hash)
        t_sel = sel.key?("topics") ? sel["topics"] : "all"
        l_sel = sel.key?("learning_outcomes") ? sel["learning_outcomes"] : "all"

        resolved = TLOResolver.resolve(ku_node, topics: t_sel, learning_outcomes: l_sel)

        {
          "ka"             => ka,
          "ku"             => ku,
          "ka_name"        => ka_meta["name"],
          "ka_preamble"    => ka_meta["preamble"],
          "ku_title"       => resolved["title"] || ku,
          "ku_description" => resolved["description"],
          "topics_rows"    => TLOResolver.flatten_for_render(resolved["topics"]),
          "outcomes_rows"  => TLOResolver.flatten_for_render(resolved["learning_outcomes"])
        }
      end

      { "standard" => std, "units" => units }
    end
  end
end