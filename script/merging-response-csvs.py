#!/usr/bin/env python3
import sys, os, csv, re
import glob

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
DL_DIR = '/Users/hepting/Downloads/'

# Make sure that script is executed properly: i.e. CS-428+828/201830 3
if (len(sys.argv) != 3):
	print(sys.argv[0], 'must be invoked with <course>/<semester> <mtg-nbr>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester> as 2nd argument')
	sys.exit()

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace('+','_')
crs_id_str = reldir[0].replace('-',' ')
# create Jekyll-friendly version of offering ID
joff_id = jcrs_id + '-' + reldir[1]
# open the response csv file
RESP_SRC = DL_DIR + joff_id + '/' + sys.argv[2].zfill(2) + '.csv'
resps_to_grade = {}
with open(RESP_SRC, newline='') as respcsv:
    responses = csv.DictReader(respcsv)
    for row in responses:
          resps_to_grade[row["ID number"]] = row["(response) What is your response to today's meeting?"]    

# open the grading worksheet
grading_worksheet = DL_DIR + 'Grades-' + crs_id_str + ' (Hepting-' + reldir[1] + ')' + '*Meeting ' + sys.argv[2] + '*.csv'
# print('Searching for grading worksheet:',grading_worksheet)
# clean this up a bit
matchedfiles = glob.glob(grading_worksheet)
if len(matchedfiles) == 1:
    filename = matchedfiles[0]
    print('Reading from:', filename)
    marksfile = DL_DIR + jcrs_id + '-MR-' + sys.argv[2].zfill(2) + '.csv'
    with open(filename, encoding='utf-8-sig', newline='') as gradecsv, open(marksfile, 'w', newline='') as markscsv:
        grades = csv.DictReader(gradecsv)
        fieldnames = ['Identifier','Full name','ID number','Email address','Status','Grade','Maximum Grade','Grade can be changed','Last modified (grade)']
        markswriter = csv.DictWriter(markscsv, fieldnames=fieldnames)
        markswriter.writeheader()
        for row in grades:
            if row["ID number"] in resps_to_grade:
                if row['Grade']:
                    print('Warning: non-zero grades are contained in this worksheet')
                print(resps_to_grade[row["ID number"]])
                ip = input("Assign 2?: ")
                while ip != 'y' and ip != 'n':
                    ip = input("Assign 2?: ")
                row["Grade"] = 2 if ip == 'y' else 1
            else:
                row["Grade"] = 0
            markswriter.writerow(row)  