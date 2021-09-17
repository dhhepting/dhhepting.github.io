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
if (len(sys.argv) != 2):
    print (sys.argv[0],"must be invoked with \"<path-to-site-directory>\"")
    sys.exit()

# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
if (not sitedir.endswith("/")):
    sitedir += "/"


# setup offering information for later use

# time information
local_tz = timezone('America/Regina')
tfmt = "%Y-%m-%d %H:%M:%S"

# set earliest and latest dates for the offering

# setup RSS details
st = "  " # indentation in rss file (soft tab or space tab?)
rss_fname = "site.rss"
rss_dir = os.path.join(os.path.abspath(sitedir + "rss"),"")

# setup paths to directories to be checked for updates
site_dir = os.path.join(os.path.abspath(sitedir),"")

# don't create updates past the latest date for the offering
local_now = local_tz.localize(datetime.datetime.now())
# variables for RSS channel-level tags
fc_title = "RSS Feed for " + '{{ site_url }}/{{base_url}}'
fc_link = '{{ "/" | absolute_url }}'
fc_desc = "Updates to " +  '{{ site_url }}/{{base_url}}' + " as of " + local_now.strftime("%A, %d %B %Y %H:%M %Z")
fc_lang = "en-CA"
fc_wm = "hepting@cs.uregina.ca (Daryl Hepting)"
fc_lb = '{{ site.time | date: "%a, %d %b %Y %H:%M:%S %Z" }}'
fc_atom = '{{ "/rss/' + rss_fname + '" | absolute_url | replace: "~", "%7E" | replace: "+", "%2B"}}'

filedict = {}
# get updated markdown (to become html) files within course directory
for root, subdirs, files in os.walk(site_dir):
    for filename in files:
        file_path = os.path.join(root, filename)
        file_parts = filename.split(".")
        path_parts = file_path.split("/")
        # test if the path is meant to be included
        path_in_rss = False
        if ("0_nonweb" not in file_path) and ("1_offweb" not in file_path) and "/_" not in file_path:
            path_in_rss = True
        # include only markdown files under the html_dir
        if (path_in_rss and len(file_parts) == 2 and file_parts[1] == "md"):
            mts = os.path.getmtime(file_path)
            dt = local_tz.localize(datetime.datetime.fromtimestamp(mts)).strftime(tfmt)
            file_path = file_path[len(sitedir)-1:]
            filedict[str(dt)] = file_path.replace(".md", ".html")

# updated files now in filedict, ready for output
rssfilepath = rss_dir + rss_fname
print(rss_dir)
print(rss_fname)
print(rssfilepath)
with open(rssfilepath, 'w') as rss_file:
    # front matter
    rss_file.write("---\n")
    rss_file.write("title: " + "Site" + "\n")
    rss_file.write("layout: rss\n")
    rss_file.write("---\n")
    # header for feed
    rss_file.write("<?xml version=\"1.0\" encoding=\"utf-8\"?>")
    rss_file.write("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n")
    rss_file.write(st+"<channel>\n")
    rss_file.write(st+st+"<title>" + "Site" + "</title>\n")
    rss_file.write(st+st+"<link>" + fc_link + "</link>\n")
    rss_file.write(st+st+"<description>" + fc_desc + "</description>\n")
    rss_file.write(st+st+"<language>" + fc_lang + "</language>\n")
    rss_file.write(st+st+"<webMaster>" + fc_wm + "</webMaster>\n")
    rss_file.write(st+st+"<lastBuildDate>" + fc_lb + "</lastBuildDate>\n")
    rss_file.write(st+st+"<atom:link href=\"" + fc_atom + "\" rel=\"self\" type=\"application/rss+xml\"/>\n")
    # loop over updated files to create feed items
    count = 0
    for k in sorted(filedict.keys(), reverse=True):
        # key is update time as string, convert that back into datetime
        try:
            update = local_tz.localize(datetime.datetime.strptime(k,tfmt))
        except ValueError:
            update = local_tz.localize(datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S.%f"))
        # collect and format feed item (fi_...) information
        #fi_pubdate = update.strftime("%Y-%m-%d %H:%M %z")
        fi_pubdate = update.strftime("%a, %d %b %Y %H:%M:%S %Z")
        fi_link = '{{ "' + filedict[k] + '" | absolute_url }}'
        fi_desc = 'Updated: ' + update.strftime("%A, %d %B %Y %H:%M %Z")
        rss_file.write(st+st+"<item>\n")
        rss_file.write(st+st+st+"<title>" + fi_link + "</title>\n")
        rss_file.write(st+st+st+"<link>" + fi_link + "</link>\n")
        rss_file.write(st+st+st+"<guid>" + fi_link + "</guid>\n")
        rss_file.write(st+st+st+"<description>" + fi_desc + "</description>\n")
        rss_file.write(st+st+st+"<pubDate>" + fi_pubdate + "</pubDate>\n")
        rss_file.write(st+st+"</item>\n")
        count += 1
        if (count > 20):
            break
    # closing tags for feed
    rss_file.write(st+"</channel>\n")
    rss_file.write("</rss>\n")
# end of file-writing loop
