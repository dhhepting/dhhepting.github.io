#!/usr/bin/env python3

import sys, os, datetime, subprocess, re
import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError, AuthError

print(datetime.datetime.now())
print(datetime.datetime.now(),file=sys.stderr)
# arguments to this script:
# - the absolute path to the website's local root directory
# - the course/semester (in that form): i.e. CS-428+828/201830
# - the absolute path to the local Dropbox directory
if (len(sys.argv) not in (3,4)):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester> [meet_to_check]\"")
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
                    # try simple normalization fallbacks: underscore <-> hyphen
                    alt = None
                    if "_" in filename:
                      alt = filename.replace("_","-")
                    elif "-" in filename:
                      alt = filename.replace("-","_")
                    if alt and alt in existing and existing[alt]:
                      # reuse the existing URL for the alternate name
                      filedict[filename] = existing[alt]
                      existing[filename] = existing[alt]
                      continue
                    # try removing spaces or replacing spaces with hyphen
                    if " " in filename:
                      alt2 = filename.replace(" ", "-")
                      if alt2 in existing and existing[alt2]:
                        filedict[filename] = existing[alt2]
                        existing[filename] = existing[alt2]
                        continue
                    # fall through to create a new shared link
                    
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
      # Normalize filename start: treat underscores and spaces like hyphens
      base = str(w).split(".")[0]
      base = base.replace("_","-")
      base = base.replace(" ", "-")
      if "-" in base:
        parts = base.split("-")
        meet_candidate = parts[0]
      else:
        meet_candidate = base
      try:
        meetval = str(int(meet_candidate)).zfill(2)
      except Exception:
        meetval = "00"
    except Exception:
      meetval = "00"
    url = existing.get(w, '')
    data_str = f"{meetval},{w},{url}\n"
    print(data_str.strip())
    data_file.write(data_str)


def _collect_dropbox_files_for_meet(meet, db_dir):
  """Return set of filenames in db_dir that look like they belong to meet.
  We match filenames starting with either zero-padded meet (e.g. '02-') or
  the integer meet without padding (e.g. '2-'), to be robust."""
  # Build a regex that matches filenames that start with the meet number
  # allowing zero-padding and separators like '-' or '_', e.g. '20-5.jpg'
  try:
    meet_int = int(meet)
  except Exception:
    meet_int = None
  if meet_int is None:
    meet_str = str(meet)
  else:
    meet_str = str(meet_int)
  # Match start of filename, optional zero padding, then separator '-' or '_'
  pattern = re.compile(rf'^0*{re.escape(meet_str)}(?:[-_]).*', re.IGNORECASE)
  found = set()
  for root, subdirs, files in os.walk(db_dir):
    for fn in files:
      if fn == ".DS_Store":
        continue
      if pattern.match(fn):
        found.add(fn)
  return found


def _collect_media_csv_for_meet(meet, csvpath):
  """Return set of filenames listed in media.csv for the given meet (numeric or padded)."""
  want = set()
  if not os.path.exists(csvpath):
    return want
  try:
    with open(csvpath, 'r', encoding='utf-8') as mf:
      first = True
      for line in mf:
        if first:
          first = False
          continue
        parts = line.rstrip('\n').split(',')
        if len(parts) >= 2:
          meetcol = parts[0].strip()
          fname = parts[1].strip()
          if not meetcol:
            continue
          try:
            if int(meetcol) == int(meet):
              want.add(fname)
          except Exception:
            # fallback to string compare (allow padded vs non-padded)
            if meetcol == str(meet) or meetcol == str(meet).zfill(2):
              want.add(fname)
  except Exception as e:
    print(f"Warning: failed to read media.csv for meet check: {e}")
  return want


def _filter_filenames_for_meet_from_names(meet, names):
  """Filter an iterable of filenames, returning those that belong to meet.
  This uses the same regex logic as the os.walk-based collector but works
  from an explicit list of filenames (e.g., keys from `existing` or
  `filedict`)."""
  import re
  try:
    meet_int = int(meet)
  except Exception:
    meet_int = None
  meet_str = str(meet_int) if meet_int is not None else str(meet)
  pattern = re.compile(rf'^0*{re.escape(meet_str)}(?:[-_]).*', re.IGNORECASE)
  found = set()
  for fn in names:
    if fn == ".DS_Store":
      continue
    if pattern.match(fn):
      found.add(fn)
  return found


# Optional: check that media.csv entries for a given meet match files in Dropbox
if len(sys.argv) == 4:
  meet_to_check = sys.argv[3]
  print(f"Checking meet files for meet: {meet_to_check}")
  # Prefer using the filenames we discovered via Dropbox API (existing/filedict)
  names_source = set(existing.keys()) | set(filedict.keys())
  print(f"[debug] names_source count={len(names_source)}; sample=\n{', '.join(list(sorted(names_source))[:20])}")
  dropbox_files = _filter_filenames_for_meet_from_names(meet_to_check, names_source)
  print(f"[debug] matched dropbox_files count={len(dropbox_files)}; matches=\n{', '.join(sorted(dropbox_files))}")
  csv_files = _collect_media_csv_for_meet(meet_to_check, dbmedia_csv)
  print(f"[debug] media.csv entries for meet {meet_to_check}: count={len(csv_files)}; sample=\n{', '.join(sorted(list(csv_files))[:20])}")
  only_in_dropbox = sorted(list(dropbox_files - csv_files))
  only_in_csv = sorted(list(csv_files - dropbox_files))
  print(f"Files in Dropbox matching meet {meet_to_check}: {len(dropbox_files)}")
  print(f"Files in media.csv for meet {meet_to_check}: {len(csv_files)}")
  if only_in_dropbox:
    print("Files present in Dropbox but missing from media.csv:")
    for f in only_in_dropbox:
      print("  ", f)
  else:
    print("No files missing from media.csv (Dropbox -> media.csv)")
  if only_in_csv:
    print("Files listed in media.csv but not found in Dropbox:")
    for f in only_in_csv:
      print("  ", f)
  else:
    print("No extra files in media.csv (media.csv -> Dropbox)")
