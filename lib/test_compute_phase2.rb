require 'yaml'
require 'meeting_page_fields'

plan = YAML.load_file('plan.yml')
plans = (plan['meetings'] || []).each_with_object({}) { |m, h| h[m['meeting']] = m }

# Minimal materialized meetings.yml-shaped rows (dates/carried fields).
meetings = [
  { 'meeting' => 1, 'date' => '2026-09-02', 'wiki_ed_group' => 'None' },
  { 'meeting' => 2, 'date' => '2026-09-09', 'wiki_ed_group' => 'WG-A', 'attendance_session' => 274999 },
  { 'meeting' => 3, 'date' => '2026-09-11', 'wiki_ed_group' => 'A', 'wiki_ed_asgn' => 3250295 },
]
offering = { 'urc_course_id' => 27214 }

def compute2(crs_id, crs_sem, offering, meetings, i, plan_row)
  MeetingPageFields.compute(crs_id, crs_sem, offering, meetings, i, plan_row || {})
end

puts "=== compute() gen for MEETING 2 (real plan.yml: outline of bare strings) ==="
gen = compute2('CS-315', '202630', offering, meetings, 1, plans[2])
%w[slug outline for_next_meeting photos_wiki_page_name audio_wiki_page_name].each do |k|
  puts "  #{k.ljust(22)} => #{gen[k].inspect}"
end
puts "  groupblog_url present? #{gen.key?('groupblog_url')}   (expect false — dropped)"

puts "\n=== compute() gen for a synthetic meeting: for_next_meeting with a {text,url} item ==="
synth = plans[2].merge(
  'for_next_meeting' => [
    'Skim the syllabus',
    { 'text' => 'Read WebGL Fundamentals — Matrices', 'url' => 'https://webglfundamentals.org/' },
  ]
)
gen2 = compute2('CS-315', '202630', offering, meetings, 1, synth)
puts "  outline          => #{gen2['outline'].inspect}"
puts "  for_next_meeting => #{gen2['for_next_meeting'].inspect}"

puts "\n=== fail-loud is now wired INTO the build path (malformed outline) ==="
bad = plans[2].merge('outline' => [{ 'text' => 'x', 'lnik' => 'typo-key' }])
begin
  compute2('CS-315', '202630', offering, meetings, 1, bad)
  puts "  [MISS] compute did NOT raise"
rescue RuntimeError => e
  puts "  [ok] compute raised: #{e.message}"
end