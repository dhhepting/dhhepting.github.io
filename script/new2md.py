import re
import sys
import os
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone
from pybtex.database import BibliographyData, Entry, parse_file

bib_data = parse_file('../research/works/works.bib')

bibtex_path = "../_works/bibtex/"

def getValueStr(keystr):
	try:
		return entry.fields[keystr]
	except KeyError:
		print("Cannot proceed without a " + keystr + " (" + entry.key + ")")
		sys.exit()

def output_bibtex_content(mdf):
# output selected fields of BibTex entry
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
	# Author goes first
	if "Author" in ed:
		mdf.write("\tAuthor = " + ed["Author"] + "\n")
	ed.pop("Author", None)
	# Then Title
	if "Title" in ed:
		mdf.write("\tTitle = " + ed["Title"]+"\n")
	ed.pop("Title", None)
	# if there is a pdf for the entry, add Url
	# replace URL, if pdf file exists
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

for entry in bib_data.entries.values():
	# create a separate structure for each entry
	entry_data = BibliographyData()
	entry_data.entries[entry.key] = entry
	# get title of entry
	btitlestr = getValueStr("Title")
	titlestr = re.sub(r'[^\w]', ' ', btitlestr)
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
		print(matches)
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
	if recreate:
		print ("(re)create: ", entry.key)
		with open(bibtex_path+mdnamestr,"w") as mdf:
			mdf.write("---\n")
			yearstr = getValueStr("Year")
			pagestr = "title: " + titlestr + " (" + yearstr + ")\n"
			#breadstr = "breadcrumb: >-\n  " + titlestr + " (" + yearstr + ")\n"
			breadstr = "breadcrumb: " + titlestr + " (" + yearstr + ")\n"
			mdf.write("layout: bibtex-default\n")
			keystr = "citekey: " + entry.key + "\n"
			mdf.write(keystr)
			if 'Journal' in entry.fields:
				venuestr = "venue: " + re.sub(r'[^\w]', ' ', entry.fields['Journal'])
				mdf.write(venuestr + "\n")
			elif 'Booktitle' in entry.fields:
				venuestr = "venue: " + re.sub(r'[^\w]', ' ', entry.fields['Booktitle'])
				mdf.write(venuestr + "\n")
			mdf.write(pagestr)
			if 'Abstract' in entry.fields:
				abstractstr = entry.fields['Abstract']
				mdf.write("abstract: >-\n")
				mdf.write("  " + abstractstr + "\n")
			mdf.write(breadstr)
			mdf.write("projects:\n")
			if 'W-Projects' in entry.fields:
				projectstr = entry.fields['W-Projects']
				projectarr = projectstr.split(",")
				for pp in range(len(projectarr)):
					ppstr = " - " + projectarr[pp]
					mdf.write(ppstr + "\n")
			if 'W-Type' in entry.fields:
				typestr = entry.fields['W-Type']
				mdf.write("category: " + typestr + "\n")
			else:
				mdf.write("category: paper\n")
			if 'author' in entry.persons:
				auths = entry.persons['author']
				mdf.write("authors:\n")
				for aa in range(len(auths)):
					# get first name(s) in unicode
					firstnamestr = ""
					firstname = auths[aa].rich_first_names
					for ff in range(len(firstname)):
						firstnamestr += firstname[ff].render_as('text')
						firstnamestr += " "
					# get middle name(s) in unicode
					middlenamestr = ""
					middlename = auths[aa].rich_middle_names
					for mm in range(len(middlename)):
						middlenamestr += middlename[mm].render_as('text')
						middlenamestr += " "
					# get pre-last name(s) in unicode
					prelastnamestr = ""
					prelastname = auths[aa].rich_prelast_names
					for pl in range(len(prelastname)):
						prelastnamestr += prelastname[pl].render_as('text')
						prelastnamestr += " "
					# get last name(s) in unicode
					lastnamestr = ""
					lastname = auths[aa].rich_last_names
					for ll in range(len(lastname)):
						lastnamestr += lastname[ll].render_as('text')
						lastnamestr += " "
					authstr = " - " + firstnamestr + middlenamestr + prelastnamestr + lastnamestr
					mdf.write(authstr + "\n")
			mdf.write("---\n")

			output_bibtex_content(mdf)
