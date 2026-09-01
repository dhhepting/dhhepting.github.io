# frozen_string_literal: true
require "yaml"
require_relative "../lib/tlo_resolver"

# Canonical lookup off disk (simulates System B; System A uses site.data).
CUR = "_data/teaching/all/curricula/CS2023"
lookup = ->(ka, ku) do
  p = File.join(CUR, ka, "#{ku}.yml")
  File.exist?(p) ? YAML.load_file(p) : nil
end

plan = YAML.load_file("_data/teaching/CS-315/202630/plan.yml")
bok  = plan["meetings"].first["BOK"]
units = TLOResolver.resolve_meeting_bok(bok, &lookup)

ok = true
def check(d); r = yield; puts "  #{r ? 'PASS':'FAIL'}  #{d}"; r; end

u = units.first
ok &= check("one unit, kaku=GIT/Fundamentals, ku_title resolved") do
  units.size == 1 && u["kaku"] == "GIT/Fundamentals" && u["ku_title"] == "Fundamental Concepts"
end
ok &= check("topics shown = only covered top-level [uses, output, vision] (+their items), nothing greyed") do
  tops = u["topics_rows"].select { |r| r["kind"]=="row" && r["depth"]==0 }.map { |r| r["id"] }
  greyed = u["topics_rows"].any? { |r| r["kind"]=="row" && r["covered"]==false }
  tops == %w[uses output vision] && !greyed
end
ok &= check("outcomes shown = only [o01, o02, o03]") do
  os = u["outcomes_rows"].select { |r| r["kind"]=="row" && r["depth"]==0 }.map { |r| r["number"] }
  os == %w[1 2 3]
end
ok &= check("no CS/KA divider (meeting covers no KA-core entry)") do
  u["topics_rows"].none? { |r| r["kind"]=="tier_break" } &&
    u["outcomes_rows"].none? { |r| r["kind"]=="tier_break" }
end
ok &= check("nested items still present & numbered under covered 'output' (a,b,c,d / i,ii,iii)") do
  d1 = u["topics_rows"].select { |r| r["kind"]=="row" && r["depth"]==1 }.map{|r| r["number"]}
  d2 = u["topics_rows"].select { |r| r["kind"]=="row" && r["depth"]==2 }.map{|r| r["number"]}
  (%w[a b c d] - d1).empty? && (%w[i ii iii] - d2).empty?
end

# fail-loud: a BOK entry naming an unknown KU
ok &= (begin
  TLOResolver.resolve_meeting_bok([{"kaku"=>"GIT/DoesNotExist"}], &lookup)
  puts "  FAIL  unknown KU should raise"; false
rescue ArgumentError => e
  puts "  PASS  unknown KU raises -> #{e.message[0,40]}"; true
end)

puts "\n#{ok ? 'ALL MEETING-BOK CHECKS PASSED' : 'MEETING-BOK CHECKS FAILED'}"
exit(ok ? 0 : 1)