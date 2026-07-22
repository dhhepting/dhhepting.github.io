#!/usr/bin/env python3
"""Create Creole wiki files for each meeting in an offering.

Usage: 2_offering_plan-data-creole-create.py <course>/<semester>

Reads _data/teaching/offerings.csv to find the offering and its
`urc` and `attendance` IDs, then reads the offering's
`meetings.csv` and emits one Creole wiki file per meeting in
`_data/teaching/<jcrs_id>/<semester>/wiki/` ready to paste into Moodle.
"""
import sys, os, csv
from datetime import datetime

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
DATA_ROOT = SITE_DIR + '_data/teaching/'

if (len(sys.argv) != 2):
    print(sys.argv[0], 'must be invoked with <course>/<semester>')
    sys.exit(1)

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
    print(sys.argv[0], 'must be invoked with <course>/<semester>')
    sys.exit(1)

# find offering indicated by arguments and load meeting ids
with open(DATA_ROOT + 'all/offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    off_found = False
    urcid = 0
    attendid = 0
    for row in offreader:
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = True
            if row.get('urc'):
                urcid = row['urc']
            if row.get('attendance'):
                attendid = row['attendance']
            if row.get('groupblog'):
                groupblogid = row['groupblog']


if not off_found:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
    sys.exit(1)

# create Jekyll-friendly version of course ID (replace + with _)
crs_id = reldir[0]
jcrs_id = reldir[0].replace('+','_')

offdatadir = os.path.abspath(DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
if not os.path.isdir(offdatadir):
    print('meetings data dir not found:', offdatadir)
    sys.exit(1)

mtgsfile = os.path.join(offdatadir, 'meetings.csv')
if not os.path.isfile(mtgsfile):
    print('meetings.csv not found for offering:', mtgsfile)
    sys.exit(1)

wiki_dir = os.path.join(offdatadir, 'wiki')
os.makedirs(wiki_dir, exist_ok=True)

template = '''
= {course} Mtg {mtgnbr}: {date_str} =
== Navigation ==
[[{prev_link} | Previous]] <-- [[Home]] --> [[{next_link} | Next]]
== Today's Theme ==

== Administration ==
* Today's Wiki Editors: [[https://urcourses.uregina.ca/mod/assign/view.php?id={wiki_ed_asgn} | ClassWork Group {wiki_ed_group}]]
* Happy {weekday}
* ACTION: [[https://urcourses.uregina.ca/mod/attendance/manage.php?id={attendid}&view=1 | Click here to record your own attendance]]
* [[https://urcourses.uregina.ca/calendar/view.php?view=day&time={ts}&course={urcid} | Class calendar for today]]
* [[https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course={urcid} | Upcoming events ]]
* Any questions from last day?
* Any examples found since last meeting?
* [[https://urcourses.uregina.ca/mod/oublog/view.php?id={groupblogid} | Discussions on group blog]]

== Outline for Today ==

== For Next Meeting ==

----
----

== Raw Transcript ==

== Photos ==

== Commentary ==

== Fair Exam Questions (with Answers) About Today's Meeting ==
'''

created = []
with open(mtgsfile, newline='') as mtgscsv:
    mtgsreader = csv.DictReader(mtgscsv)
    rows = list(mtgsreader)

    def make_name(r):
        basefile = r.get('file','').strip()
        if basefile:
            return os.path.splitext(basefile)[0] + '.txt'
        try:
            mtgnbr = int(r.get('meeting','0'))
        except Exception:
            mtgnbr = 0
        return f'mtg{mtgnbr:02d}.txt'

    def parse_date_label(date_str):
        if not date_str:
            return ''
        # Preserve hyphens from the original date field (e.g. Tue-06-Jan-2026)
        return date_str.strip()

    for i, row in enumerate(rows):
        try:
            mtgnbr = int(row.get('meeting', '0'))
        except ValueError:
            mtgnbr = 0
        date_str = row.get('date','')
        try:
            date_object = datetime.strptime(date_str, '%a-%d-%b-%Y')
            ts = int(date_object.timestamp())
            weekday = datetime.strftime(date_object, '%A-%d-%b-%Y').split('-')[0]
            year = date_object.year
        except Exception:
            ts = ''
            weekday = ''
            year = ''

        # compute today's output filename
        name = make_name(row)

        # previous/next links: use the date field as link target/label
        if i > 0:
            prev_row = rows[i-1]
            prev_label = parse_date_label(prev_row.get('date','')) or f'Mtg {prev_row.get("meeting","")}'
            prev_link = f'{prev_label}'
        else:
            prev_link = 'Previous'

        if i < len(rows)-1:
            next_row = rows[i+1]
            next_label = parse_date_label(next_row.get('date','')) or f'Mtg {next_row.get("meeting","")}'
            next_link = f'{next_label}'
        else:
            next_link = 'Next'

        outpath = os.path.join(wiki_dir, name)
        wiki_ed_group = row.get('wiki_ed_group','').strip()
        wiki_ed_asgn = row.get('wiki_ed_asgn','').strip()
        contents = template.format(course=crs_id, mtgnbr=f'{mtgnbr:02d}', year=year, weekday=weekday, date_str=date_str,wiki_ed_group=wiki_ed_group,wiki_ed_asgn=wiki_ed_asgn,attendid=attendid,groupblogid=groupblogid, ts=ts, urcid=urcid, prev_link=prev_link, next_link=next_link)

        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(contents)
        created.append(outpath)

print('Created', len(created), 'wiki files in', wiki_dir)
for p in created:
    print(' -', p)
