import re
import sys
import os
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone
from pybtex.database import BibliographyData, Entry, parse_file
from slugify import slugify
import yaml

force = False
bib_data = parse_file('/Users/hepting/Sites/dhhepting.github.io/research/0_nonweb/main.bib')
# allow regeneration to be forced with "-f"
if len(sys.argv) == 2:
    if sys.argv[1] == "-f":
        force = True

bibtex_path = "/Users/hepting/Sites/dhhepting.github.io/_works/bibtex/"

#
# return field value string, if keystr is a key (otherwise exit)
#
def getValueStr(keystr):
    try:
        return entry.fields[keystr]
    except KeyError:
        print("Cannot proceed without a " + keystr + " (" + entry.key + ")")
        sys.exit()

def format_people(people,kind,mdf):
	if kind in people:
		ppl = people[kind]
		if kind == "author":
			mdf.write("authors:\n")
		elif kind == "editor":
			mdf.write("editors:\n")
		for pp in range(len(ppl)):
			# get first name(s) in unicode
			fnamestr = ""
			firstname = ppl[pp].rich_first_names
			for ff in range(len(firstname)):
				fnamestr += firstname[ff].render_as('text')
				fnamestr += " "
			# get middle name(s) in unicode
			mnamestr = ""
			middlename = ppl[pp].rich_middle_names
			for mm in range(len(middlename)):
				mnamestr += middlename[mm].render_as('text')
				mnamestr += " "
			# get pre-last name(s) in unicode
			plnamestr = ""
			prelastname = ppl[pp].rich_prelast_names
			for pl in range(len(prelastname)):
				plnamestr += prelastname[pl].render_as('text')
				plnamestr += " "
			# get last name(s) in unicode
			lnamestr = ""
			lastname = ppl[pp].rich_last_names
			for ll in range(len(lastname)):
				lnamestr += lastname[ll].render_as('text')
				#lnamestr += " "
			perstr = " - " + fnamestr + mnamestr + plnamestr + lnamestr
			mdf.write(perstr + "\n")

def format_article(entry,mdf):
    format_people(entry.persons,"author",mdf)
    venuestr = "venue: \"" + entry.fields['Journal'] + "\"\n"
    mdf.write(venuestr)
	### the following may be split out into its own function...
    try:
        kwstr = entry.fields['Keywords']
    except KeyError:
        kwstr = ""
    if (kwstr != ""):
        mdf.write("keywords:\n")
        keywords = kwstr.split(",")
        for kk in range(len(keywords)):
            kwordstr = " - " + "\"" + keywords[kk].strip() + "\""
            mdf.write(kwordstr + "\n")
    try:
        pgstr = entry.fields['Pages']
    except KeyError:
        pgstr = ""
    if (pgstr != ""):
        pagerange = pgstr.split("--")
        if len(pagerange) == 2:
            mdf.write("pagestart: " + pagerange[0] + "\n")
            mdf.write("pageend: " + pagerange[1] + "\n")
    try:
        doistr = entry.fields['Doi']
    except KeyError:
        doistr = ""
    if (doistr != ""):
        mdf.write("doi: " + doistr + "\n")
    try:
        modstr = entry.fields['Date-Modified']
        #entrytime = datetime.strptime(entrytimestr,"%Y-%m-%d %H:%M:%S %z")
    except KeyError:
        modstr = ""
    if (modstr != ""):
        mdf.write("datemod: " + modstr + "\n")

def format_inproceedings(entry,mdf):
    format_people(entry.persons,"author",mdf)
    venuestr = "venue: \"" + entry.fields['Booktitle'] + "\"\n"
    mdf.write(venuestr)
    #mdf.write("venue: "+re.sub(r'[^\w]',' ',entry.fields['Booktitle'])+"\n")
    format_people(entry.persons,"editor",mdf)

def format_conference(entry,mdf):
    format_people(entry.persons,"author",mdf)
    venuestr = "venue: \"" + entry.fields['Booktitle'] + "\"\n"
    mdf.write(venuestr)

def format_incollection(entry,mdf):
    format_people(entry.persons,"author",mdf)
    format_people(entry.persons,"editor",mdf)

def format_techreport(entry,mdf):
    format_people(entry.persons,"author",mdf)
    #mdf.write("venue: "+re.sub(r'[^\w]',' ',entry.fields['Institution'])+"\n")
    venuestr = "venue: \"" + entry.fields['Institution'] + "\"\n"
    mdf.write(venuestr)
    #mdf.write("venue: "+re.sub(r':',' ',entry.fields['Institution'])+"\n")

def format_book(entry,mdf):
	format_people(entry.persons,"author",mdf)
	format_people(entry.persons,"editor",mdf)

def format_inbook(entry,mdf):
    format_people(entry.persons,"author",mdf)
    #mdf.write("venue: " + re.sub(r'[^\w]',' ',entry.fields['Title'])+"\n")
    venuestr = "venue: \"" + entry.fields['Title'] + "\"\n"
    mdf.write(venuestr)
    format_people(entry.persons,"editor",mdf)

def format_mscphd(entry,mdf):
    format_people(entry.persons,"author",mdf)
    venuestr = "venue: \"" + entry.fields['School'] + "\"\n"
    mdf.write(venuestr)

#
# output selected fields of BibTex entry
#
def output_bibtex_content(mdf):
	ed = {}
	edstr = entry_data.to_string('bibtex')
	lines = edstr.split("\n")
	lc = 0
	for l in lines:
		fields = l.split("=")
		if len(fields) == 1:
			if fields[0] != "":
				ed[lc] = fields[0]
				lc += 1
			else:
				pass
		else:
			ed[fields[0].strip()] = fields[1]
	# now to format them properly
	mdf.write(ed[0] + "\n")
	ed.pop(0, None)
	#
	# Author goes first
	#
	if "Author" in ed:
		mdf.write("\tAuthor = " + ed["Author"] + "\n")
	ed.pop("Author", None)
	#
	# then Title
	#
	if "Title" in ed:
		mdf.write("\tTitle = " + ed["Title"] + "\n")
	ed.pop("Title", None)
	# OLD --
	# the URL: if there is a pdf for the entry,
	# create or replace Url indicated in bibtex file
	#
	#newurlstr = "/assets/works/pdf/" + entry.key + ".pdf"

	#
	# the URL: set it to the canonical webpage for this item
	# create or replace Url indicated in bibtex file
	#
	newurlstr = "/research/works/" + htmlnamestr
	# print(newurlstr)
	newurlpath = Path(".." + newurlstr)
	#teststr = "\\\"{{site.canonical}} +  newurlstr + "\\\"",\n")
	teststr = "\\\"{{site.canonical}}" +  newurlstr + "\\\",\n"
	# print(teststr)
	mdf.write("\tUrl = " + teststr)
	#if newurlpath.is_file():
	#	mdf.write("\tUrl = " + "\\\"{{ {{site.canonical}}\"" +  newurlstr + "\" | absolute_url }}\\\",\n")
	#else:
	#	print("MISSING PDF: ", newurlstr)
	ed.pop("Url", None)
	# don't output the following fields:
	ed.pop("Abstract", None)
	ed.pop("Date-Added",None)
	ed.pop("Date-Modified",None)
	ed.pop("W-Type",None)
	ed.pop("W-Projects",None)
	ed.pop("Bdsk-Url-1",None)
	ed.pop("Bdsk-Url-2",None)
	# output remaining fields as they occur
	# and end with closing brace (ed[1])
	for k in ed:
		if k != 1:
			mdf.write("\t"+k+" = "+ed[k]+"\n")
	mdf.write(ed[1]+"\n")

#
# Main loop
#
entry_data = BibliographyData()
for entry in bib_data.entries.values():
    entry_data.entries[entry.key] = entry
    #print(entry.key)
#for d in range(len(entry_data)):
#    print (d,entry_data[d])
for key in sorted(bib_data.entries,reverse=True):
    print (key)
