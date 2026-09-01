# frozen_string_literal: true

require "yaml"
require_relative "../lib/tlo_resolver"

# Load the REAL curriculum file the professor authored.
raw = YAML.load_file(ENV["KU_FILE"] || "/mnt/user-data/uploads/Fundamentals.yml")
# Vocabulary rename we agreed: outcomes -> learning_outcomes.
raw["learning_outcomes"] ||= raw.delete("outcomes")

def render(node, indent = 0)
  pad = "  " * indent
  lines = []
  Array(node["topics"] || node).each { |t| }
  lines
end

def print_list(list, kind)
  puts "  #{kind}:"
  list.each do |e|
    puts "  ----- CS · KA divider -----" if e["tier_break_before"]
    flag = e["covered"] ? " " : " (greyed)"
    puts "    #{e['number']}. [#{e['core']}] #{e['id']}#{flag}  #{truncate(e['text'])}"
    print_items(e["items"], 3)
  end
end

def print_items(items, indent)
  Array(items).each do |it|
    pad = "  " * indent
    sa = it["see_also"] ? "  see_also=#{it['see_also'].inspect}" : ""
    puts "#{pad}#{it['number']}) #{truncate(it['text'], 70)}#{sa}"
    print_items(it["items"], indent + 1)
  end
end

def truncate(s, n = 90)
  s = s.to_s.gsub(/\s+/, " ").strip
  s.length > n ? "#{s[0, n - 1]}…" : s
end

puts "=" * 78
puts "OFFERING VIEW  (tlo.yml: GIT/Fundamentals -> topics: all, learning_outcomes: all)"
puts "=" * 78
off = TLOResolver.resolve(raw, topics: :all, learning_outcomes: :all)
puts "KU: #{off['ku']} — #{off['title']}"
print_list(off["topics"], "topics")
print_list(off["learning_outcomes"], "learning_outcomes")

puts
puts "=" * 78
puts "MEETING 1 VIEW  (plan.yml: topics: [uses,output,vision]  learning_outcomes: [o01,o02,o03])"
puts "=" * 78
mtg = TLOResolver.resolve(raw,
                          topics: %w[uses output vision],
                          learning_outcomes: %w[o01 o02 o03])
covered_t = mtg["topics"].select { |e| e["covered"] }.map { |e| e["id"] }
covered_o = mtg["learning_outcomes"].select { |e| e["covered"] }.map { |e| e["id"] }
puts "covered topics:   #{covered_t.inspect}"
puts "covered outcomes: #{covered_o.inspect}"
print_list(mtg["topics"], "topics (subset shown covered, rest greyed)")

puts
puts "=" * 78
puts "INVARIANT CHECKS"
puts "=" * 78
def check(desc)
  ok = yield
  puts "  #{ok ? 'PASS' : 'FAIL'}  #{desc}"
  ok
end

all_ok = true
all_ok &= check("11 topics numbered 1..11 continuously") do
  off["topics"].map { |e| e["number"] } == (1..11).map(&:to_s)
end
all_ok &= check("14 outcomes numbered 1..14 continuously") do
  off["learning_outcomes"].map { |e| e["number"] } == (1..14).map(&:to_s)
end
all_ok &= check("exactly one CS->KA tier break in topics, before applied-interactive") do
  brks = off["topics"].select { |e| e["tier_break_before"] }
  brks.size == 1 && brks.first["id"] == "applied-interactive"
end
all_ok &= check("exactly one CS->KA tier break in outcomes, before o13") do
  brks = off["learning_outcomes"].select { |e| e["tier_break_before"] }
  brks.size == 1 && brks.first["id"] == "o13"
end
all_ok &= check("nested numbering: output -> a,b,c,d ; output.Concepts -> i,ii,iii") do
  out = off["topics"].find { |e| e["id"] == "output" }
  top = out["items"].map { |x| x["number"] } == %w[a b c d]
  concepts = out["items"].find { |x| x["text"].start_with?("Concepts") }
  nested = concepts["items"].map { |x| x["number"] } == %w[i ii iii]
  top && nested
end
all_ok &= check("selection marks only [uses,output,vision] covered in meeting view") do
  covered_t == %w[uses output vision]
end

# Fail-loud checks
def raises?(desc)
  yield
  puts "  FAIL  #{desc} (expected an error, got none)"
  false
rescue => e
  puts "  PASS  #{desc} -> #{e.class}: #{truncate(e.message, 60)}"
  true
end

all_ok &= raises?("unknown selected id raises") do
  TLOResolver.resolve(raw, topics: %w[uses bogus_id])
end

# CS-after-KA ordering violation
bad = Marshal.load(Marshal.dump(raw))
bad["topics"] = [bad["topics"][9]] + bad["topics"][0, 2]  # KA entry first, then CS
all_ok &= raises?("CS-core after KA-core raises (ordering invariant)") do
  TLOResolver.resolve(bad)
end

puts
puts all_ok ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"
exit(all_ok ? 0 : 1)