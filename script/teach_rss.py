#!/usr/bin/env python

# for now, directory path must contain 'teach'
import sys, os, datetime
from rss2producer import RSS2Feed
from bs4 import BeautifulSoup

### expect that teach_rss.py is invoked from teach directory
### and that rss file will be named as course-semester.xml
### in the rss directory, at the same level as teach

# specify the root from which the rss file is to be created, 
# convert to absolute path
if (len(sys.argv) != 2):
  print sys.argv[0],"must be invoked with \"<course>/<semester>\""
  sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
  print sys.argv[0],"must be invoked with <course>/<semester>" 
  sys.exit()

# file extensions to record
extensions = [ 'html', 'svg', 'cpp', 'py' ]

outfile = reldir[0] + "-" + reldir[1] + ".rss"
out_dir = "/Users/hepting/Sites/dhhepting.github.io/rss"
out_dir = os.path.join(os.path.abspath(out_dir),"")

rss_root_dir = "/Users/hepting/Sites/dhhepting.github.io/teaching/"
rss_root_dir = os.path.join(os.path.abspath(rss_root_dir),sys.argv[1])

preweb = "http://www2.cs.uregina.ca/~hepting/teaching"
from_teach = rss_root_dir[rss_root_dir.rfind('teaching')+len('teaching'):]

# test if an update should be done based on semester
sem_year = int((reldir[1])[:4])
sem_sel =  int((reldir[1])[4:])
if (sem_sel == 10):
  earliest = datetime.datetime(year=sem_year, month=1, day=1)
  latest = datetime.datetime(year=sem_year, month=4, day=30)
elif (sem_sel == 20):
  earliest = datetime.datetime(year=sem_year, month=5, day=1)
  latest = datetime.datetime(year=sem_year, month=8, day=31)
elif (sem_sel == 30):
  earliest = datetime.datetime(year=sem_year, month=9, day=1)
  latest = datetime.datetime(year=sem_year, month=12, day=31)

if (datetime.datetime.now() >= earliest and datetime.datetime.now() <= latest):
  # configure header for feed
  feed = RSS2Feed(
    title="D. H. Hepting: Updates to " + from_teach[1:],
    link= preweb + from_teach,
    description="Updates to " + from_teach[1:] 
      + " as of " + datetime.datetime.now().strftime("%A, %d %B %Y %H:%M")
  )
  filedict = {}
  for root, subdirs, files in os.walk(rss_root_dir):
    for filename in files:
      file_path = os.path.join(root, filename)
      # test if the file and path is meant to be included
      file_parts = filename.split(".")
      if ("0_nonweb" not in file_path) and (
        "1_offweb" not in file_path) and (
        len(file_parts) == 2): 
        # test if file should be included
        if (file_parts[1] in extensions):
          dt = datetime.datetime.fromtimestamp( os.path.getmtime(file_path))
          if file_path.startswith(rss_root_dir):
            file_path = file_path[len(rss_root_dir):]  
            filedict[str(dt)] = file_path
  # write out feed to the file rss in the directory 
  for k in sorted(filedict.keys(), reverse=True):
    try:
      update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
      update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S")
    if update > earliest and update < latest:
      feed.append_item(title=filedict[k],
        link=preweb+from_teach+filedict[k], description="Updated: " + update.strftime("%A, %d %B %Y %H:%M"), pub_date=update)
  with open(out_dir + outfile, 'w') as rss_file:
    rss_file.write(feed.get_xml())
