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
	entry_data = BibliographyData()
	titlestr = entry.fields['Title']
	titlestr = re.sub(r'[^\w]', ' ', titlestr)
	#urlstr = entry.fields['Url']
	#print (urlstr)
	entrytimestr = entry.fields['Date-Modified']
	entrytime = datetime.strptime(entrytimestr,"%Y-%m-%d %H:%M:%S %z")
	mdnamestr = entry.key + " " + titlestr + ".md"
	mdnamestr = re.sub(r"\s+", '-', mdnamestr)
	#mdnamestr = re.sub(r"[^\w]", '', mdnamestr)
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
	if recreate:
		print ("(re)create: ", entry.key)
	# get mod time of the md file (if it exists) and test if its entrytime is
        # BEFORE the bibtex entry's entrytime.  If so, proceed to write a new version.
	if (recreate):
		with open(bibtex_path+mdnamestr,"w") as mdf:
			yearstr = entry.fields['Year']
			#projectstr = entry.fields['W-Projects']
			projectstr = "test"	
			pagestr = "title: " + titlestr + " (" + yearstr + ")\n"
			breadstr = "breadcrumb: " + titlestr + " (" + yearstr + ")\n"
			mdf.write("---\n")
			mdf.write("layout: works-default\n")
			keystr = "citekey: " + entry.key + "\n"
			mdf.write(keystr)
			mdf.write(pagestr)
			mdf.write(breadstr)
			mdf.write("projects: " + projectstr + "\n")
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
				# get last name(s) in unicode
				lastnamestr = ""
				lastname = auths[aa].rich_last_names
				for ll in range(len(lastname)):
					lastnamestr += lastname[ll].render_as('text')
					lastnamestr += " "
				authstr = " - " + firstnamestr + middlenamestr + lastnamestr
				mdf.write(authstr + "\n")
			mdf.write("---\n")
			entry_data.entries[entry.key] = entry
			mdf.write("{% capture bibtexdat %}\n")
			mdf.write("````\n")
			mdf.write(entry_data.to_string('bibtex') + "\n")
			mdf.write("````\n")
			mdf.write("{% endcapture %}\n")
			mdf.write("{{ bibtexdat }}\n")
