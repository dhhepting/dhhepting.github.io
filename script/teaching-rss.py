#!/usr/bin/env python3

import sys, os, datetime, re
import pytz
from pytz import timezone

# the 'teaching' website subdirectory will have subdirectories
# for courses and those course subdirectories will have
# subdirectories for semesters.

# the rss feed for a course includes the course directory
# level, non-semester subdirectories, and the current semester
# subdirectory

# arguments to this script:
# - the absolute path to the website's root directory
# - the offering's course/semester (in that form): i.e. CS-428+828/201830
if (len(sys.argv) != 3):
    print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\"")
    sys.exit()

# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
if (not sitedir.endswith("/")):
    sitedir += "/"

# determine the index (depth) of the semester subdirectory
semdiridx = len(sitedir.split("/")) + 1

# get the offering details: course/semester
offdir = (sys.argv[2]).split('/')
if (len(offdir) != 2):
    print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\"")
    sys.exit()

# setup offering information for later use
off_crs = offdir[0]
off_sem = offdir[1]
off_yr = int((offdir[1])[:4])
off_ss = int((offdir[1])[4:])
off_id = off_crs + "-" + off_sem
doff_id = off_id.replace("+","_")
off_gc = off_crs + "_"
off_rel_path = off_crs + "/" + off_sem

# time information
local_tz = timezone('America/Regina')
tfmt = "%Y-%m-%d %H:%M:%S"

# set earliest and latest dates for the offering
if (off_ss == 10): # WINTER
    earliest = local_tz.localize(datetime.datetime(year=off_yr, month=1, day=1))
    latest = local_tz.localize(datetime.datetime(year=off_yr, month=4, day=30))
elif (off_ss == 20): # SPRING/SUMMER
    earliest = local_tz.localize(datetime.datetime(year=off_yr, month=5, day=1))
    latest = local_tz.localize(datetime.datetime(year=off_yr, month=8, day=31))
elif (off_ss == 30): # FALL
    earliest = local_tz.localize(datetime.datetime(year=off_yr, month=9, day=1))
    latest = local_tz.localize(datetime.datetime(year=off_yr, month=12, day=31))

# setup RSS details
st = "  " # indentation in rss file (soft tab or space tab?)
rss_fname = off_id + ".rss"
rss_dir = os.path.join(os.path.abspath(sitedir + "rss"),"")

# setup paths to directories to be checked for updates
html_dir = os.path.join(os.path.abspath(sitedir + "teaching"),off_crs)
assets_dir = os.path.join(os.path.abspath(sitedir + "assets/teaching"),"")
data_dir = os.path.join(os.path.abspath(sitedir + "_data/teaching"),"")

# don't create updates past the latest date for the offering
local_now = local_tz.localize(datetime.datetime.now())
if (local_now <= latest):
    # variables for RSS channel-level tags
    fc_title = "RSS 2.0 Feed for " + '{{ page.title }}'
    fc_link = '{{ "/teaching/' + off_rel_path + '" | absolute_url }}'
    fc_desc = "Updates to " + off_rel_path + " as of " + local_now.strftime("%A, %d %B %Y %H:%M %Z")
    fc_lang = "en-CA"
    fc_wm = "hepting@cs.uregina.ca (Daryl Hepting)"
    fc_lb = '{{ site.time | date: "%a, %d %b %Y %H:%M:%S %Z" }}'
    fc_atom = '{{ "/rss/' + rss_fname + '" | absolute_url | replace: "~", "%7E" | replace: "+", "%2B"}}'

    filedict = {}
    # get updated markdown (to become html) files within course directory
    for root, subdirs, files in os.walk(html_dir):
        for filename in files:
            file_path = os.path.join(root, filename)
            file_parts = filename.split(".")
            path_parts = file_path.split("/")
            # test if the path is meant to be included
            path_in_rss = False
            if ("0_nonweb" not in file_path) and ("1_offweb" not in file_path):
                # test that previous offerings (semesters) are not included in updates
                if (len(path_parts) > semdiridx):
                    if (path_parts[semdiridx] >= off_sem):
                        path_in_rss = True
                    else:
                        pass
                else:
                    path_in_rss = True
            # include only markdown files under the html_dir
            if (path_in_rss and len(file_parts) == 2 and file_parts[1] == "md"):
                mts = os.path.getmtime(file_path)
                dt = local_tz.localize(datetime.datetime.fromtimestamp(mts)).strftime(tfmt)
                file_path = file_path[len(sitedir)-1:]
                filedict[str(dt)] = file_path.replace(".md", ".html")

    # get any asset files within /assets/teaching that match offering
    # e.g. name includes either CS-428+828-201830_ or CS-428+828_
    for root, subdirs, files in os.walk(assets_dir):
        for filename in files:
            file_path = os.path.join(root, filename)
            if (off_id in file_path or off_gc in file_path):
                mts = os.path.getmtime(file_path)
                dt = local_tz.localize(datetime.datetime.fromtimestamp(mts)).strftime(tfmt)
                file_path = file_path[len(sitedir)-1:]
                filedict[str(dt)] = file_path

    # get any data files within /assets/teaching that match offering
    # e.g. name includes either CS-428_828-201830
    for root, subdirs, files in os.walk(data_dir):
        for filename in files:
            file_path = os.path.join(root, filename)
            if (doff_id in file_path):
                mts = os.path.getmtime(file_path)
                dt = local_tz.localize(datetime.datetime.fromtimestamp(mts)).strftime(tfmt)
                file_path = file_path[len(sitedir)-1:]
                filedict[str(dt)] = file_path
    # updated files now in filedict, ready for output
    rssfilepath = rss_dir + rss_fname
    with open(rssfilepath, 'w') as rss_file:
        # front matter
        rss_file.write("---\n")
        rss_file.write("title: " + off_rel_path + "\n")
        rss_file.write("layout: rss\n")
        rss_file.write("---\n")
        # header for feed
        rss_file.write("<?xml version=\"1.0\" encoding=\"utf-8\"?>")
        rss_file.write("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n")
        rss_file.write(st+"<channel>\n")
        rss_file.write(st+st+"<title>" + fc_title + "</title>\n")
        rss_file.write(st+st+"<link>" + fc_link + "</link>\n")
        rss_file.write(st+st+"<description>" + fc_desc + "</description>\n")
        rss_file.write(st+st+"<language>" + fc_lang + "</language>\n")
        rss_file.write(st+st+"<webMaster>" + fc_wm + "</webMaster>\n")
        rss_file.write(st+st+"<lastBuildDate>" + fc_lb + "</lastBuildDate>\n")
        rss_file.write(st+st+"<atom:link href=\"" + fc_atom + "\" rel=\"self\" type=\"application/rss+xml\"/>\n")
        # loop over updated files to create feed items
        for k in sorted(filedict.keys(), reverse=True):
            # key is update time as string, convert that back into datetime
            try:
                update = local_tz.localize(datetime.datetime.strptime(k,tfmt))
            except ValueError:
                update = local_tz.localize(datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S.%f"))
            # collect and format feed item (fi_...) information
            #fi_pubdate = update.strftime("%Y-%m-%d %H:%M %z")
            fi_pubdate = update.strftime("%a, %d %b %Y %H:%M:%S %Z")
            if (filedict[k].startswith("/_data/teaching")):
                # set feed item title for asset
                fi_title = (filedict[k])[len("/_data/teaching/"):]
            elif (filedict[k].startswith("/assets/teaching")):
                # set feed item title for asset
                fi_title = (filedict[k])[len("/assets/teaching/"):]
            else:
                # set feed item title for html
                fi_title = (filedict[k])[len("/teaching/"):]
            fi_link = '{{ "' + filedict[k] + '" | absolute_url }}'
            fi_desc = 'Updated: ' + update.strftime("%A, %d %B %Y %H:%M %Z")
            # print(fi_title)
            # print(st,fi_pubdate)
            # print(st,fi_desc)
            # print(st,fi_link)
            rss_file.write(st+st+"<item>\n")
            rss_file.write(st+st+st+"<title>" + fi_title + "</title>\n")
            if ("_data" not in fi_link):
                rss_file.write(st+st+st+"<link>" + fi_link + "</link>\n")
                rss_file.write(st+st+st+"<guid>" + fi_link + "</guid>\n")
            rss_file.write(st+st+st+"<description>" + fi_desc + "</description>\n")
            rss_file.write(st+st+st+"<pubDate>" + fi_pubdate + "</pubDate>\n")
            rss_file.write(st+st+"</item>\n")
        # closing tags for feed
        rss_file.write(st+"</channel>\n")
        rss_file.write("</rss>\n")
    # end of file-writing loop
# end of conditional (now < latest)
"""
    # define desired edits
    rep = {"&quot;": "\"", "em><it": "em>\n<it"}
    rep = dict((re.escape(k), v) for k, v in rep.iteritems())
    pattern = re.compile("|".join(rep.keys()))
    # apply edits
    for line in xml_file:
      line = pattern.sub(lambda m: rep[re.escape(m.group(0))], line)
      rss_file.write(line)
  # clean up temporary file
  try:
    os.remove(tmpfilepath)
  except OSError:
    pass

feed = RSS2Feed(
  title="D. H. Hepting: " + off_rel_path,
  link= '{{ "/teaching/' + off_rel_path + '" | absolute_url }}',
  description="Updates to " + off_rel_path +
    #" as of " + datetime.datetime.utcnow().strftime("%A, %d %B %Y %H:%M %z")
    " as of " + lt.strftime("%A, %d %B %Y %H:%M %z")
    #pub_date=lt
)
"""
