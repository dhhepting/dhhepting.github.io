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
bib_data = parse_file('/Users/hepting/Sites/dhhepting.github.io/research/dhhepting.bib')
# allow regeneration to be forced with "-f"
if len(sys.argv) == 2:
    if sys.argv[1] == "-f":
        force = True

bibtex_path = "/Users/hepting/Sites/dhhepting.github.io/_works/bibtex/"
yaml_path = "/Users/hepting/Sites/dhhepting.github.io/_data/research/works/"

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
for entry in bib_data.entries.values():
	# create a separate structure for each entry
    entry_data = BibliographyData()
    entry_data.entries[entry.key] = entry
    # get title of entry
    if entry.type == "inbook":
        btitlestr = getValueStr("Chapter")
    else:
        btitlestr = getValueStr("Title")
    titlestr = slugify(btitlestr, lowercase=False)

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
        htmlnamestr = mdnamestr.replace('.md', '.html')
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
        # check if there are any redirects to be added to markdown file
        yamlnamestr = entry.key + ".yml"
        yamlfilepath = Path(yaml_path + yamlnamestr)
        if yamlfilepath.is_file():
            #print(yamlfilepath)
            yamltimestr = time.ctime(os.path.getmtime(yamlfilepath))
            yamltime = datetime.strptime(yamltimestr,"%a %b %d %H:%M:%S %Y")
            localtz = timezone('America/Regina')
            yamltime = localtz.localize(yamltime)
            #print(yamltime)
            if (filetime < yamltime):
                recreate = True

    # above is decision about whether to recreate file
    if force or recreate:
    #if True:
        print ("(re)create: ", entry.key)
        with open(bibtex_path+mdnamestr,"w") as mdf:
            mdf.write("---\n")
            if yamlfilepath.is_file():
                with open(yamlfilepath, 'r') as yamf:
                    try:
                        yamldict = yaml.safe_load(yamf)
                        if 'redirects' in yamldict and yamldict['redirects']:
                            mdf.write("redirect_from:\n")
                            for yr in yamldict['redirects']:
                                mdf.write("  - " + yr + "\n")
                    except yaml.YAMLError as exc:
                        print(exc)
            else:
                with open(yamlfilepath, 'w') as yamf:
                    try:
                        yamf.write("redirects:\n")
                        yamf.write("links:\n")
                    except yaml.YAMLError as exc:
                        print(exc)

            yearstr = getValueStr("Year")
            if (yearstr != "2011"):
                mdf.write("main_entity: ScholarlyArticle\n")
            mdf.write("layout: bibtex-default\n")
            mdf.write("citekey: " + entry.key + "\n")
            yearstr = getValueStr("Year")
            btitlestr = btitlestr.replace('``', '&ldquo;')
            btitlestr = btitlestr.replace('\'\'', '&rdquo;')
            pagestr = "title: \"" + btitlestr + " (" + yearstr + ")\"\n"
            mdf.write(pagestr)
            breadstr = "breadcrumb: \"" + btitlestr + " (" + yearstr + ")\"\n"
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
            elif entry.type == "conference":
                format_conference(entry,mdf)
            elif entry.type == "incollection":
                format_incollection(entry,mdf)
            elif entry.type == "techreport":
                format_techreport(entry,mdf)
            elif entry.type == "book":
                format_book(entry,mdf)
            elif entry.type == "inbook":
                format_inbook(entry,mdf)
            elif entry.type == "mastersthesis" or entry.type == "phdthesis":
                format_mscphd(entry,mdf)
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
