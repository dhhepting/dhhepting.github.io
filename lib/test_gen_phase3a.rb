require 'meeting_page_generator'
r = MeetingPageGenerator.new(teaching_data_dir: 'tmp/_data/teaching', output_dir: 'tmp/_meeting_pages').generate_for('CS-315', '202630')
puts "written:       #{r[:written].inspect}"
puts "stripped_body: #{r[:stripped_body].inspect}   <-- migration audit: mtg 2 had a body"
puts "errors:        #{r[:errors].inspect}"
puts "\n--- mtg 2 file AFTER (body gone, front-matter only) ---"
puts File.read('tmp/_meeting_pages/CS-315/202630/02_2026-09-09.creole')
puts "--- guard: bad args ---"
p MeetingPageGenerator.new(teaching_data_dir: 'tmp/_data/teaching').generate_for(nil, '202630')[:errors]
p MeetingPageGenerator.new(teaching_data_dir: 'tmp/_data/teaching').generate_for('CS-999', '202630')[:errors]