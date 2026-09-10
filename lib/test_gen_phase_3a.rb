require 'meeting_page_generator'

gen = MeetingPageGenerator.new(
  teaching_data_dir: 'tmp/_data/teaching',
  output_dir: 'tmp/_meeting_pages'
)
result = gen.generate_all

puts "=== generate_all result ==="
puts "written: #{result[:written].size}"
result[:written].each { |w| puts "  - #{w}" }
puts "errors:  #{result[:errors].size}"
result[:errors].each { |e| puts "  ! #{e}" }

puts "\n=== files on disk ==="
Dir.glob('tmp/_meeting_pages/**/*.creole').sort.each { |f| puts "  #{f}" }

puts "\n=== full content of mtg 8 page (front-matter only; slug zero-padded) ==="
puts File.read('tmp/_meeting_pages/CS-315/202630/08_2026-10-07.creole')

# Prove idempotency + full-overwrite: run again, confirm identical, no dup files
before = Dir.glob('tmp/_meeting_pages/**/*.creole').sort
c1 = File.read(before.first)
MeetingPageGenerator.new(teaching_data_dir: 'tmp/_data/teaching', output_dir: 'tmp/_meeting_pages').generate_all
after = Dir.glob('tmp/_meeting_pages/**/*.creole').sort
puts "=== idempotency: #{before == after ? 'same file set' : 'FILE SET CHANGED'}; first file #{c1 == File.read(after.first) ? 'byte-identical' : 'CHANGED'} on re-run ==="