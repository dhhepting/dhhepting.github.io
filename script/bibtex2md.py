import re
import sys
import os
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone
from pybtex.database import BibliographyData, Entry, parse_file

bib_data = parse_file('../research/dhhepting.bib')

bibtex_path = "../_works/bibtex/"

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
	mdf.write("venue: "+re.sub(r'[^\w]',' ',entry.fields['Journal'])+"\n")

def format_inproceedings(entry,mdf):
    format_people(entry.persons,"author",mdf)
    mdf.write("venue: "+re.sub(r'[^\w]',' ',entry.fields['Booktitle'])+"\n")
    format_people(entry.persons,"editor",mdf)

def format_incollection(entry,mdf):
    format_people(entry.persons,"author",mdf)
    format_people(entry.persons,"editor",mdf)

def format_techreport(entry,mdf):
    format_people(entry.persons,"author",mdf)
    mdf.write("venue: "+re.sub(r'[^\w]',' ',entry.fields['Institution'])+"\n")

def format_book(entry,mdf):
	format_people(entry.persons,"editor",mdf)
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
		mdf.write("\tTitle = \"" + ed["Title"]+"\"\n")
	ed.pop("Title", None)
	#
	# the URL: if there is a pdf for the entry,
	# create or replace Url indicated in bibtex file
	#
	newurlstr = "/assets/works/pdf/" + entry.key + ".pdf"
	newurlpath = Path(".." + newurlstr)
	if newurlpath.is_file():
		mdf.write("\tUrl = " + "\\\"{{\"" +  newurlstr + "\" | absolute_url }}\\\",\n")
	else:
		print("MISSING PDF: ", newurlstr)
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
for entry in bib_data.entries.values():
	# create a separate structure for each entry
    entry_data = BibliographyData()
    entry_data.entries[entry.key] = entry
    # get title of entry
    btitlestr = getValueStr("Title")
    #titlestr = re.sub(r'[^\w]', ' ', btitlestr)
    titlestr = re.sub(r':', ' ', btitlestr)
    titlestr = re.sub(r'/', '', titlestr)
    # get date-modified for bibtex entry if it exists, if it doesn't
    # exist, recreate the markdown file
    recreate = False
    try:
        entrytimestr = entry.fields['Date-Modified']
        entrytime = datetime.strptime(entrytimestr,"%Y-%m-%d %H:%M:%S %z")
    except KeyError:
        recreate = True
	#
	# make the filename for the markdown and test if it exists
	# (also check if the title has changed on the bibtex entry and remove
	# those old markdown files). If the file exists, check its modification
	# time against the bibtex entry's.
	#
    if (recreate == False):
        mdnamestr = entry.key + " " + titlestr + ".md"
        mdnamestr = re.sub(r"\s+", '-', mdnamestr)
        mdfilepath = Path(bibtex_path + mdnamestr)
        matches = [f for f in os.listdir(bibtex_path) if f.startswith(entry.key+"-")]
        for m in matches:
            if m != mdnamestr:
                try:
                    os.remove(bibtex_path + m)
                except OSError:
                    pass
        if mdfilepath.is_file():
            filetimestr = time.ctime(os.path.getmtime(mdfilepath))
            filetime = datetime.strptime(filetimestr,"%a %b %d %H:%M:%S %Y")
            localtz = timezone('America/Regina')
            filetime = localtz.localize(filetime)
            if (entrytime > filetime):
                recreate = True
        else:
            recreate = True
    #if recreate:
    if True:
        print ("(re)create: ", entry.key)
        with open(bibtex_path+mdnamestr,"w") as mdf:
            mdf.write("---\n")
            mdf.write("layout: bibtex-default\n")
            mdf.write("citekey: " + entry.key + "\n")
            yearstr = getValueStr("Year")
            pagestr = "title: " + titlestr + " (" + yearstr + ")\n"
            mdf.write(pagestr)
            breadstr = "breadcrumb: " + titlestr + " (" + yearstr + ")\n"
            mdf.write(breadstr)
            if 'W-Type' in entry.fields:
                typestr = entry.fields['W-Type']
                mdf.write("category: " + typestr + "\n")
            else:
                mdf.write("category: paper\n")
			#
			# projects
			#
            if 'W-Projects' in entry.fields:
                mdf.write("projects:\n")
                projectstr = entry.fields['W-Projects']
                projectarr = projectstr.split(",")
                for pp in range(len(projectarr)):
                    ppstr = " - " + projectarr[pp]
                    mdf.write(ppstr + "\n")
			#
			# Abstract
			#
            if 'Abstract' in entry.fields:
                abstractstr = entry.fields['Abstract']
                mdf.write("abstract: >-\n")
                mdf.write("  " + abstractstr + "\n")
			#
			# Type-specific
			#
            if entry.type == "article":
                format_article(entry,mdf)
            elif entry.type == "inproceedings":
                format_inproceedings(entry,mdf)
            elif entry.type == "incollection":
                format_incollection(entry,mdf)
            elif entry.type == "techreport":
                format_techreport(entry,mdf)
            elif entry.type == "book":
                format_book(entry,mdf)
            else:
                print("MISSING TYPE: ", entry.type)
			#
			# end front-matter
			#
            mdf.write("---\n")

			#
			# bibtex entry as "content"
			#
            output_bibtex_content(mdf)
