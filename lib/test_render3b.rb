require 'liquid'
tpl = Liquid::Template.parse(File.read('creole_preamble.liquid', encoding: 'UTF-8'))

gen2 = {
  'meeting'=>2,'date'=>'2026-09-09','weekday'=>'Wednesday',
  'theme'=>'Wiki, exams, more fundamentals','BOK'=>nil,
  'outline'=>[{'text'=>'fundamentals','url'=>nil},{'text'=>'wiki','url'=>nil},{'text'=>'exams','url'=>nil}],
  'for_next_meeting'=>nil,
  'prev_slug'=>'01_2026-09-04','next_slug'=>'03_2026-09-11','wiki_ed_group'=>'WG-A',
  'attendance_QR'=>'https://urcourses.uregina.ca/mod/attendance/password.php?session=274999&view=1',
  'calendar_day_url'=>'https://urcourses.uregina.ca/calendar/view.php?view=day&time=1757437200&course=27214',
  'calendar_upcoming_url'=>'https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=27214',
  'photos_wiki_page_name'=>'02_2026-09-09-photos','audio_wiki_page_name'=>'02_2026-09-09-audio-txt',
}
gen3 = {
  'meeting'=>3,'date'=>'2026-09-11','weekday'=>'Friday',
  'theme'=>'Graphics pipeline and rendering basics',
  'BOK'=>[{'ka'=>'GIT','ku_title'=>'Fundamentals',
           'topics_rows'=>[{'kind'=>'row','depth'=>0,'text'=>'uses'},{'kind'=>'row','depth'=>0,'text'=>'output'}],
           'outcomes_rows'=>[{'kind'=>'row','depth'=>0,'text'=>'describe the pipeline'}]}],
  'outline'=>[{'text'=>'Recap last meeting','url'=>nil},
              {'text'=>'Transformations','url'=>'https://learnopengl.com/Getting-started/Transformations'}],
  'for_next_meeting'=>[{'text'=>'Read WebGL Fundamentals — Matrices','url'=>'https://webglfundamentals.org/'}],
  'prev_slug'=>'02_2026-09-09','next_slug'=>'04_2026-09-16','wiki_ed_group'=>'A',
  'attendance_QR'=>'https://urcourses.uregina.ca/mod/attendance/password.php?session=275001&view=1',
  'calendar_day_url'=>'https://urcourses.uregina.ca/calendar/view.php?view=day&time=1&course=27214',
  'calendar_upcoming_url'=>'https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=27214',
  'photos_wiki_page_name'=>'03_2026-09-11-photos','audio_wiki_page_name'=>'03_2026-09-11-audio-txt',
}

puts "################ MEETING 2 (real: bare-string outline, no BOK, no for-next) ################"
puts tpl.render('page'=>{'course'=>'CS-315'}, 'gen'=>gen2)
puts "\n\n################ MEETING 3 (synthetic: BOK + URL outline item + for-next) ################"
puts tpl.render('page'=>{'course'=>'CS-315'}, 'gen'=>gen3)