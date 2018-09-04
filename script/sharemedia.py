#!/usr/bin/env python3

import sys, os, datetime, subprocess
import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError, AuthError

# Get Dropbox OAuth2 access token from environment variable
# See <https://blogs.dropbox.com/developers/2014/05/generate-an-access-token [...]
# for how to generate one for an account.

command = ['bash', '-c', 'source /Users/hepting/.bashrc && env | grep DB_ACCESS_TOKEN']

proc = subprocess.Popen(command, stdout = subprocess.PIPE)

for line in proc.stdout:
  kvs = line.decode("utf-8").strip().split("=")
  os.environ[kvs[0]] = kvs[1]

TOKEN = os.environ['DB_ACCESS_TOKEN']

# Set root directory for media files to be shared

CRS_MEDIA_PATH = "/Users/hepting/Dropbox/teaching/"
DB_MEDIA_PATH = "/teaching/"
JEKYLL_DATA_DIR = "/Users/hepting/Sites/dhhepting.github.io/_data/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()

crs_dir = str(reldir[0]) + "-" + str(reldir[1])
crs_media_dir = os.path.join(os.path.abspath(CRS_MEDIA_PATH),crs_dir)

# Check for an access token
if (len(TOKEN) == 0):
	sys.exit("ERROR: Access token not found.")

# Create an instance of a Dropbox class, which can make requests to the API.
dbx = dropbox.Dropbox(TOKEN)

# Check that the access token is valid
try:
	dbx.users_get_current_account()
except AuthError as err:
        sys.exit("ERROR: Invalid access token; try re-generating an "
            "access token from the app console on the web.")

# walk through that directory and get sharing link for each file
#### replace dropbox.com with dropboxcontent in URL
#### write URL to file in _data directory of jekyll site

filedict = {}
db_media_dir = str(DB_MEDIA_PATH) + str(crs_dir)
for root, subdirs, files in os.walk(crs_media_dir):
	for filename in files:
		file_path = os.path.join(root, filename)
		db_path = os.path.join(db_media_dir, filename)
		try:
			share = dbx.sharing_create_shared_link(db_path)
			shared_url = (share.url).replace('www.dropbox','dl.dropboxusercontent')
			filedict[filename] = shared_url
		except ApiError as err:
			print(err)

# open crs_dir.yml in DATA_DIR and write out filedict to it
with open(str(JEKYLL_DATA_DIR)+crs_dir+".csv","w") as data_file:
	data_file.write("meet,file,URL\n")	
	for w in sorted(filedict, key=filedict.get, reverse=True):
		meetstr = str(w).split(".")
		if " " in meetstr[0]:
			meetstr = meetstr[0].split(" ")
		data_str = str(meetstr[0])+","+str(w) + "," + str(filedict[w]+"\n")	
		data_file.write(data_str)	
		print(data_str)
