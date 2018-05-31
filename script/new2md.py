import re
import os
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone

from pybtex.database import BibliographyData, Entry
from pybtex.database import parse_file

bib_data = parse_file('../research/works/works.bib')

bibtex_path = "../_works/bibtex/"

for entry in bib_data.entries.values():
	ed = {}
	entry_data = BibliographyData()
	entry_data.entries[entry.key] = entry
	otitlestr = entry.fields['Title']
	titlestr = re.sub(r'[^\w]', ' ', otitlestr)
	entrytimestr = entry.fields['Date-Modified']
	entrytime = datetime.strptime(entrytimestr,"%Y-%m-%d %H:%M:%S %z")
	mdnamestr = entry.key + " " + titlestr + ".md"
	mdnamestr = re.sub(r"\s+", '-', mdnamestr)
	mdfilepath = Path(bibtex_path + mdnamestr)
	recreate = False
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
			yearstr = entry.fields['Year']
			pagestr = "title: " + titlestr + " (" + yearstr + ")\n"
			breadstr = "breadcrumb: " + titlestr + " (" + yearstr + ")\n"
			mdf.write("---\n")
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
			mdf.write("authors:\n")
			auths = entry.persons['author']
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

			edstr = entry_data.to_string('bibtex')
			# output selected fields of BibTex entry
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
			mdf.write("\tAuthor = " + ed["Author"] + "\n")
			ed.pop("Author", None)
			mdf.write("\tTitle = " + ed["Title"]+"\n")
			ed.pop("Title", None)
			#if 'Url' in entry.fields:
			#mdf.write("\tUrl = " + "\\\"{{" + (ed["Url"])[:-1] + "| absolute_url }}\\\",")
			# replace URL
			newurlstr = "/assets/works/pdf/" + entry.key + ".pdf"
			#print (newurlstr)
			#mdf.write("\tUrl = " + "\\\"{{" + (ed["Url"])[:-1] + "| absolute_url }}\\\",")
			mdf.write("\tUrl = " + "\\\"{{\"" +  newurlstr + "\" | absolute_url }}\\\",\n")
			ed.pop("Url", None)
			ed.pop("Abstract", None)
			ed.pop("Date-Added",None)
			ed.pop("Date-Modified",None)
			ed.pop("W-Type",None)
			ed.pop("W-Projects",None)
			ed.pop("Bdsk-Url-1",None) 
			ed.pop("Bdsk-Url-2",None) 
			# output remaining fields
			for k in ed:
				if k != 1:
					mdf.write("\t"+k+" = "+ed[k]+"\n")
				else:
					mdf.write(ed[1]+"\n")
