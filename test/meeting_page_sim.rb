# frozen_string_literal: true
require "yaml"
require_relative "../lib/meeting_page_fields"

CUR = "_data/teaching/all/curricula/CS2023"
lookup = ->(ka, ku) { p = File.join(CUR, ka, "#{ku}.yml"); File.exist?(p) ? YAML.load_file(p) : nil }

plan = MeetingPageFields.load_meeting_plan("_data/teaching/CS-315/202630/plan.yml")
standard = MeetingPageFields.load_standard("_data/teaching/CS-315/202630/tlo.yml")
offering = { "attendance_id"=>1, "urc_course_id"=>2 }
meetings = [{ "meeting"=>1, "date"=>"Tue-01-Sep-2026" }]

fields = MeetingPageFields.compute("CS-315","202630",offering,meetings,0,
                                   plan[1] || {}, standard, lookup, [])
bok = fields["BOK"]
puts "standard=#{standard.inspect}  theme=#{fields['theme'].inspect}  weekday=#{fields['weekday']}"
puts "BOK units=#{bok.size}; unit0 kaku=#{bok[0]['kaku']} title=#{bok[0]['ku_title'].inspect}"
puts "unit0 topic rows=#{bok[0]['topics_rows'].size}, outcome rows=#{bok[0]['outcomes_rows'].size}"

# Render the covered-only Learning Outcomes column exactly as tlo-column.html will.
def render(rows)
  rows.map { |r|
    if r["kind"]=="tier_break" then "  --- KA Core ---"
    else "  #{'  '*r['depth']}#{r['number']}. #{r['covered'] ? '' : '[grey] '}#{r['text'][0,60]}" end
  }.join("\n")
end
puts "\n-- meeting BOK: Learning Outcomes (covered-only) --"
puts render(bok[0]["outcomes_rows"])
puts "\n-- meeting BOK: Topics (covered-only, note nested items retained) --"
puts render(bok[0]["topics_rows"])