require 'yaml'
require 'plan_content_validator'

def show(title); puts "\n=== #{title} ==="; end

# ---- 1. REAL plan.yml: every meeting normalizes without error ----
show 'REAL plan.yml (CS-315/202630) — normalized content fields per meeting'
plan = YAML.load_file('plan.yml')
plan['meetings'].each do |mtg|
  norm = PlanContentValidator.normalize_meeting(mtg, crs_id: plan['course'], crs_sem: plan['semester'])
  next if norm.empty?
  puts "meeting #{mtg['meeting']}:"
  norm.each do |field, items|
    puts "  #{field}:"
    items.each { |it| puts "    - text=#{it['text'].inspect} url=#{it['url'].inspect}" }
  end
end
puts "(meetings with no outline/for_next_meeting are correctly omitted)"

# ---- 2. Bare-string + {text,url} mix normalizes as designed ----
show 'MIXED shapes (bare string + {text,url}) — backward compatible'
mixed = { 'meeting' => 99,
          'outline' => ['recap',
                        { 'text' => 'Transformations', 'url' => 'https://learnopengl.com/Getting-started/Transformations' }] }
p PlanContentValidator.normalize_meeting(mixed, crs_id: 'CS-315', crs_sem: '202630')

# ---- 3. Fail-loud: each malformed input raises with a precise message ----
show 'FAIL-LOUD cases (each should raise)'
bad = {
  'outline not a list'          => "meeting: 5\noutline: just a string\n",
  'unknown key on hash item'    => "meeting: 5\noutline:\n  - text: x\n    link: https://y\n",
  'non-string / non-hash item'  => "meeting: 5\noutline: [42]\n",
  'hash item missing text'      => "meeting: 5\nfor_next_meeting:\n  - url: https://y\n",
  'url wrong type'              => "meeting: 5\noutline:\n  - text: x\n    url: 5\n",
  'empty string item'           => "meeting: 5\noutline: ['']\n",
}
bad.each do |label, yaml|
  mtg = YAML.load(yaml)
  begin
    PlanContentValidator.normalize_meeting(mtg, crs_id: 'CS-315', crs_sem: '202630')
    puts "  [MISS] #{label}: did NOT raise"
  rescue RuntimeError => e
    puts "  [ok]   #{label}"
    puts "         -> #{e.message}"
  end
end