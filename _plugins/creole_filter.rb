# frozen_string_literal: true

require_relative '../lib/creole_renderer'

# _plugins/creole_filter.rb
#
# Jekyll-coupled glue only; all logic lives in lib/creole_renderer.rb.
#
#   {{ item.creole | creole_html }}
#   {{ item.creole | creole_html: 1 }}   # shift heading levels down by 1
module Jekyll
  module CreoleFilter
    def creole_html(input, heading_offset = 0)
      CreoleRenderer.render(input.to_s, heading_offset: heading_offset.to_i)
    end
  end
end

Liquid::Template.register_filter(Jekyll::CreoleFilter)