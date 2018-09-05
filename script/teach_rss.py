#!/usr/bin/env python

import sys, os, datetime, re
from rss2producer import RSS2Feed

# the 'teaching' website directory will have subdirectories
# for courses and those course subdirectories will have 
# subdirectories for semesters.

# the rss feed for a course includes the course directory
# level, non-semester subdirectories, and the current semester
# subdirectory

# arguments to this script:
# - the absolute path to the website's root directory
# - the course/semester (in that form): i.e. CS-428+828/201830
if (len(sys.argv) != 3):
  print sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\""
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
  print sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\""
  sys.exit()
off_crs = offdir[0]
off_sem = offdir[1]
off_id = off_crs + "-" + off_sem
off_gc = off_crs + "_"

# file extensions to record
#extensions = [ 'md', 'html', 'svg', 'cpp', 'py' ]

rss_fname = off_id + ".rss"
rss_dir = os.path.join(os.path.abspath(sitedir + "rss"),"")

html_dir = os.path.join(os.path.abspath(sitedir + "teaching"),off_crs)
assets_dir = os.path.join(os.path.abspath(sitedir + "assets/teaching"),"")

web_prefix = "/teaching/"
off_rel_path = off_crs + "/" + off_sem

# test if an update should be done based on semester
sem_year = int((offdir[1])[:4])
sem_sel =  int((offdir[1])[4:])
if (sem_sel == 10):
  earliest = datetime.datetime(year=sem_year, month=1, day=1)
  latest = datetime.datetime(year=sem_year, month=4, day=30)
elif (sem_sel == 20):
  earliest = datetime.datetime(year=sem_year, month=5, day=1)
  latest = datetime.datetime(year=sem_year, month=8, day=31)
elif (sem_sel == 30):
  earliest = datetime.datetime(year=sem_year, month=9, day=1)
  latest = datetime.datetime(year=sem_year, month=12, day=31)

#if (datetime.datetime.now() >= earliest and datetime.datetime.now() <= latest):
if (datetime.datetime.now() <= latest):
  # configure header for feed
  feed = RSS2Feed(
    title="D. H. Hepting: Updates to " + off_rel_path,
    link= '{{ "' + web_prefix + off_rel_path + '" | absolute_url }}',
    description="Updates to " + off_rel_path + 
      " as of " + datetime.datetime.now().strftime("%A, %d %B %Y %H:%M")
  )
  filedict = {}
  # first get markdown (html) files within course directory
  for root, subdirs, files in os.walk(html_dir):
    for filename in files:
      file_path = os.path.join(root, filename)
      # test if the file and path is meant to be included
      file_parts = filename.split(".")
      if ("0_nonweb" not in file_path) and (
        "1_offweb" not in file_path) and (
        len(file_parts) == 2): 
        # test if file should be included
        if (file_parts[1] == "md"):
          dt = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
          path_parts = file_path.split("/")
          path_len = len(path_parts)
	  if (path_len > semdiridx):
            if (path_parts[semdiridx] >= off_sem):
              #file_path = file_path[len(html_dir):]  
              file_path = file_path[len(sitedir)-1:]  
              filedict[str(dt)] = file_path.replace(".md", ".html")
  # then get any asset files within /assets/teaching that match course+semester
  for root, subdirs, files in os.walk(assets_dir):
    for filename in files:
      file_path = os.path.join(root, filename)
      # test if the file and path is meant to be included
      file_parts = filename.split(".")
      if ("0_nonweb" not in file_path) and (
        "1_offweb" not in file_path) and (
        len(file_parts) == 2): 
        # test if file should be included
        # (leave out test for extensions for now)
        if (file_parts[1]):
          if (off_id in file_path or off_gc in file_path):
            dt = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
            #file_path = file_path[len(sitedir):]  
            file_path = file_path[len(sitedir)-1:]  
            filedict[str(dt)] = file_path
  # format information for feed 
  for k in sorted(filedict.keys(), reverse=True):
    try:
      update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
      update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S")
    #if update > earliest and update < latest:
    #if update < latest:
    # (don't need to repeat this test, above, for date)
    # format item for asset
    print filedict[k]
    if (filedict[k].startswith("/assets/teaching")):
      feed.append_item(title=(filedict[k])[len("/assets/teaching/"):],
        link='{{ "' + filedict[k] + '" | absolute_url }}',
        description="Updated: " + update.strftime("%A, %d %B %Y %H:%M"), pub_date=update)
    # format item for html
    else:
      feed.append_item(title=(filedict[k])[len("/teaching/"):],
        link='{{ "' + filedict[k] + '" | absolute_url }}',
        description="Updated: " + update.strftime("%A, %d %B %Y %H:%M"), pub_date=update)
  # make a temporary file 
  tmpfilepath = rss_dir + "tmp-" + rss_fname
  rssfilepath = rss_dir + rss_fname
  with open(tmpfilepath, 'w') as tmp_file:
    tmp_file.write(feed.get_xml())
  # write out final version with YAML frontmatter and appropriate edits
  with open(tmpfilepath, 'r') as xml_file, open(rssfilepath, 'w') as rss_file:
    # front matter
    rss_file.write("---\n")
    rss_file.write("layout: rss\n")
    rss_file.write("---\n")
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
