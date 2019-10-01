#!/usr/bin/env python
# for now, directory path must contain 'teach'
import sys, os, datetime

### expect that site.py is invoked from site root directory
### and that sitemap file will be named as sitemap.xml
### in the search directory

#
if (len(sys.argv) != 1):
    print sys.argv[0], "must be invoked site root directory with no arguments"
    sys.exit()

outfile = "sitemap.rss"
out_dir = "/Users/hepting/Sites/public_html/search"
out_dir = os.path.join(os.path.abspath(out_dir),"")

site_root_dir = "/Users/hepting/Sites/public_html/"
#site_root_dir = os.path.join(os.path.abspath(site_root_dir),"")

preweb = "http://www2.cs.uregina.ca/~hepting/"

filedict = {}
for root, subdirs, files in os.walk(site_root_dir):
        for filename in files:
		file_path = (os.path.join(root, filename))[len(site_root_dir):]
		if ('0_nonweb' not in file_path) and ('1_offweb' not in file_path): 
			# test filename for allowed extensions
			#and (not filename.startswith(".")):
			file_parts =  filename.split(".")
			if len(file_parts) == 2: #  and in the list of file exts
				dt = datetime.datetime.fromtimestamp(
			     	     os.path.getmtime(file_path))
				filedict[str(dt)] = file_path
# write out feed to the file rss in the directory 
with open(out_dir + outfile, 'w') as sitemap_file:
	sitemap_file.write('<?xml version="1.0" encoding="utf-8"?>\n')
	sitemap_file.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
	for k in sorted(filedict.keys(),reverse=True):
		try:
			update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S.%f")
		except ValueError:
			update = datetime.datetime.strptime(k,"%Y-%m-%d %H:%M:%S")
		sitemap_file.write('<url>\n')
		sitemap_file.write('\t<loc>'+preweb+filedict[k]+'</loc>\n')
		sitemap_file.write('\t<lastmod>'+str(update.date())+'</lastmod>\n')
		sitemap_file.write('</url>\n')
	sitemap_file.write('</urlset>\n')

