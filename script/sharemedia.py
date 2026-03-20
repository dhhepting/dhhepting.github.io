#!/usr/bin/env python3

import sys, os, datetime, subprocess
import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError, AuthError

print(datetime.datetime.now())
print(datetime.datetime.now(),file=sys.stderr)
# arguments to this script:
# - the absolute path to the website's local root directory
# - the course/semester (in that form): i.e. CS-428+828/201830
# - the absolute path to the local Dropbox directory
if (len(sys.argv) != 3):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\"")
  sys.exit()

print("OFFERING: ", sys.argv[2])
# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
print("SITE DIR: ", sitedir)
if (not sitedir.endswith("/")):
  sitedir += "/"
#datadir = sitedir + "_data/teaching/media/"
datadir = sitedir + '_data/teaching/' + sys.argv[2] + '/'
print("DATA DIR: ", datadir)

# get the offering details: course/semester
offdir = (sys.argv[2]).split('/')
print('split:',offdir)
if (len(offdir) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\"")
  sys.exit()
off_crs = offdir[0]
off_sem = offdir[1]
off_id = off_crs + "-" + off_sem

# Get Dropbox OAuth2 access token from environment variable
# See <https://blogs.dropbox.com/developers/2014/05/generate-an-access-token [...]
# for how to generate one for an account.
#command = ['bash', '-c', 'source /Users/hepting/.bashrc && env | grep DB_ACCESS_TOKEN']
command = ['zsh', '-c', 'source /Users/hepting/.zshrc && env | grep DB_ACCESS_TOKEN']
proc = subprocess.Popen(command, stdout = subprocess.PIPE)
for line in proc.stdout:
  kvs = line.decode("utf-8").strip().split("=")
  os.environ[kvs[0]] = kvs[1]
TOKEN = os.environ['DB_ACCESS_TOKEN']
# Check that access token is valid
if (len(TOKEN) == 0):
  sys.exit("ERROR: Access token not found.")
else:
  # Create an instance of a Dropbox class, which can make requests to the API.
  dbx = dropbox.Dropbox(TOKEN)
  # Check that the access token is valid
  try:
    dbx.users_get_current_account()
  except AuthError as err:
    sys.exit("ERROR: Invalid access token; try re-generating an "
      "access token from the app console on the web.")

# Dropbox access token is valid at this point

# walk through that directory and get sharing link for each file
# replace dropbox.com with dropboxcontent in URL
dbmedia_dir = "/Users/hepting/Dropbox/teaching/" + "m-" + off_id + "/"
filedict = {}
# path to local media.csv in site data (normalize + in path)
dbmedia_csv = datadir.replace("+","_") + "media.csv"
# read existing media.csv (if present) to reuse known URLs
existing = {}
if os.path.exists(dbmedia_csv):
  try:
    with open(dbmedia_csv, 'r', encoding='utf-8') as mf:
      # skip header, parse lines: meet,file,URL
      first = True
      for line in mf:
        if first:
          first = False
          continue
        parts = line.rstrip('\n').split(',')
        if len(parts) >= 3:
          fname = parts[1]
          url = ','.join(parts[2:]).strip()
          if url:
            existing[fname] = url
  except Exception as e:
    print(f"Warning: failed to read existing media.csv: {e}")
for root, subdirs, files in os.walk(dbmedia_dir):
    print(dbmedia_dir)
    for filename in files:
        if (filename != ".DS_Store"):
            file_path = os.path.join(root, filename)
            db_path = os.path.join(dbmedia_dir, filename)
            dbp = db_path[len("Users/hepting/Dropbox/"):]
            try:
                print(dbp)
                # reuse existing URL if present
                if filename in existing and existing[filename]:
                    filedict[filename] = existing[filename]
                else:
                    share = dbx.sharing_create_shared_link(dbp)
                    shared_url = (share.url).replace('www.dropbox','dl.dropboxusercontent')
                    filedict[filename] = shared_url
                    # add to existing map so new entries are preserved
                    existing[filename] = shared_url
            except ApiError as err:
                print(err)


# write sharing link details to csv file in _data directory of site
with open(dbmedia_csv, "w", encoding='utf-8') as data_file:
  data_file.write("meet,file,URL\n")
  # Use the keys from the combined `existing`/filedict map so we include preserved URLs
  # Sort by filename (column 2) for predictable ordering
  for w in sorted(existing.keys()):
    try:
      meetstr = str(w).split(".")
      if " " in meetstr[0]:
        meetstr = meetstr[0].split(" ")
      if "-" in meetstr[0]:
        meetstr = meetstr[0].split("-")
      meetval = str(meetstr[0]).zfill(2)
    except Exception:
      meetval = "00"
    url = existing.get(w, '')
    data_str = f"{meetval},{w},{url}\n"
    print(data_str.strip())
    data_file.write(data_str)
