#!/usr/bin/env python3

import sys, os, csv, datetime, re, stat
import dropbox
from dropbox.exceptions import ApiError, AuthError

print(datetime.datetime.now())
print(datetime.datetime.now(),file=sys.stderr)
# arguments to this script:
# - the absolute path to the website's local root directory
# - the course/semester (in that form): i.e. CS-428+828/201830
# - (optional) a meet number whose media.csv entries are cross-checked
#   against the files found in Dropbox
#
# Credentials (environment variables, or ~/.secrets with chmod 600):
# - DB_APP_KEY and DB_REFRESH_TOKEN   (preferred; access tokens are refreshed
#   automatically -- see the setup note at the end of this file)
# - DB_ACCESS_TOKEN                   (fallback; expires after ~4 hours)
# Optional:
# - DROPBOX_LOCAL_DIR                 (local Dropbox folder; default ~/Dropbox)
if (len(sys.argv) not in (3,4)):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester> [meet_to_check]\"")
  sys.exit(1)

print("OFFERING: ", sys.argv[2])
# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
print("SITE DIR: ", sitedir)
if (not sitedir.endswith("/")):
  sitedir += "/"
datadir = sitedir + '_data/teaching/' + sys.argv[2] + '/'
print("DATA DIR: ", datadir)

# get the offering details: course/semester
offdir = (sys.argv[2]).split('/')
print('split:',offdir)
if (len(offdir) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory> <course>/<semester>\"")
  sys.exit(1)
off_crs = offdir[0]
off_sem = offdir[1]
off_id = off_crs + "-" + off_sem


# ---------------------------------------------------------------------------
# Dropbox credentials
# ---------------------------------------------------------------------------

SECRET_NAMES = ("DB_APP_KEY", "DB_REFRESH_TOKEN", "DB_ACCESS_TOKEN")

def load_secrets(names=SECRET_NAMES):
    """Return {name: value} for the credentials found in ~/.secrets and/or
    the environment. The environment wins, but a warning is printed when it
    silently disagrees with the file (a stale exported variable is a classic
    way to keep using an old token). Values are never printed."""
    from_file = {}
    path = os.path.expanduser("~/.secrets")
    try:
        if os.stat(path).st_mode & (stat.S_IRWXG | stat.S_IRWXO):
            sys.exit(f"ERROR: {path} is accessible by others; run: chmod 600 {path}")
        with open(path, encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                # NAME=value, also tolerating spaces around "=", an "export "
                # prefix, optional quotes and a trailing "# comment"
                m = re.match(
                    r'\s*(?:export\s+)?(\w+)\s*=\s*(["\']?)([^"\'\s#]+)\2\s*(?:#.*)?$', line)
                if m and m.group(1) in names:
                    from_file[m.group(1)] = m.group(3)
                elif not m and any(n in line for n in names):
                    print(f"WARNING: {path} line {lineno} mentions a credential "
                          "name but is not in NAME=value form; ignored.",
                          file=sys.stderr)
    except FileNotFoundError:
        pass
    vals = dict(from_file)
    for n in names:
        v = os.environ.get(n, "").strip()
        if v:
            if n in from_file and from_file[n] != v:
                print(f"WARNING: {n} in the environment differs from {path}; "
                      "using the environment value.", file=sys.stderr)
            vals[n] = v
    return vals


def connect_to_dropbox():
    """Return an authenticated dropbox.Dropbox client, or exit with a message
    that says what is actually wrong."""
    secrets = load_secrets()
    app_key = secrets.get("DB_APP_KEY")
    refresh = secrets.get("DB_REFRESH_TOKEN")
    bare = secrets.get("DB_ACCESS_TOKEN")

    if app_key and refresh:
        # Short-lived access tokens are obtained and renewed by the SDK.
        client = dropbox.Dropbox(oauth2_refresh_token=refresh, app_key=app_key)
        refreshing = True
    elif bare:
        print("WARNING: using a bare DB_ACCESS_TOKEN. Dropbox access tokens "
              "expire after about 4 hours; set DB_APP_KEY and DB_REFRESH_TOKEN "
              "instead.", file=sys.stderr)
        client = dropbox.Dropbox(bare)
        refreshing = False
    else:
        found = [n for n in SECRET_NAMES if n in secrets]
        sys.exit("ERROR: no usable Dropbox credentials. Found: "
                 + (", ".join(found) or "none")
                 + ". Need DB_APP_KEY and DB_REFRESH_TOKEN (preferred) or "
                 "DB_ACCESS_TOKEN, in the environment or in ~/.secrets.")

    try:
        if refreshing:
            client.check_and_refresh_access_token()
        client.users_get_current_account()
    except AuthError as err:
        e = err.error
        if e.is_expired_access_token():
            if refreshing:
                sys.exit("ERROR: access token expired and could not be refreshed; "
                         "check DB_APP_KEY / DB_REFRESH_TOKEN.")
            sys.exit("ERROR: the access token has expired. Use DB_APP_KEY and "
                     "DB_REFRESH_TOKEN so it refreshes itself (see setup note at "
                     "the end of this script), or generate a new token in the "
                     "app console as a stopgap.")
        if e.is_invalid_access_token():
            sys.exit("ERROR: Dropbox rejected the credentials as invalid "
                     "(revoked or mistyped); re-authorize the app.")
        if e.is_missing_scope():
            sys.exit(f"ERROR: the app is missing a required permission: {e}")
        sys.exit(f"ERROR: Dropbox authentication failed: {e}")
    except Exception as err:
        sys.exit(f"ERROR: could not authenticate with Dropbox "
                 f"({type(err).__name__}: {err})")
    return client


dbx = connect_to_dropbox()

# Dropbox credentials are valid at this point


# ---------------------------------------------------------------------------
# Shared links
# ---------------------------------------------------------------------------

def get_shared_url(client, dropbox_path):
    """Return a sharing URL for dropbox_path (relative to the Dropbox root,
    with a leading "/"), creating the link if it does not yet exist.
    Needs the sharing.write permission."""
    try:
        url = client.sharing_create_shared_link_with_settings(dropbox_path).url
    except ApiError as err:
        exists = getattr(err.error, "is_shared_link_already_exists", None)
        if exists is not None and exists():
            links = client.sharing_list_shared_links(
                path=dropbox_path, direct_only=True).links
            if links:
                url = links[0].url
            else:
                raise
        else:
            raise
    # replace www.dropbox with dl.dropboxusercontent in URL
    return url.replace('www.dropbox', 'dl.dropboxusercontent')


def meet_of(filename):
    """Two-digit meet number from a media filename such as '02-1.jpg' or
    '2_intro.mp4'; '00' if the name does not start with a number."""
    base = str(filename).split(".")[0].replace("_", "-").replace(" ", "-")
    try:
        return str(int(base.split("-")[0])).zfill(2)
    except Exception:
        return "00"


def read_media_csv(path):
    """Return a list of (meet, file, url) rows from media.csv (header skipped)."""
    rows = []
    with open(path, 'r', encoding='utf-8', newline='') as mf:
        reader = csv.reader(mf)
        next(reader, None)
        for row in reader:
            if len(row) >= 3:
                # tolerate an unquoted comma inside the URL
                rows.append((row[0].strip(), row[1], ','.join(row[2:]).strip()))
    return rows


# walk through the media directory and get a sharing link for each file
dropbox_root = os.environ.get("DROPBOX_LOCAL_DIR") or os.path.expanduser("~/Dropbox")
dbmedia_dir = os.path.join(dropbox_root, "teaching", "m-" + off_id) + "/"
filedict = {}
# path to local media.csv in site data (normalize + in path)
dbmedia_csv = datadir.replace("+","_") + "media.csv"
# read existing media.csv (if present) to reuse known URLs
existing = {}
if os.path.exists(dbmedia_csv):
  try:
    for _meet, fname, url in read_media_csv(dbmedia_csv):
      if url:
        existing[fname] = url
  except Exception as e:
    print(f"Warning: failed to read existing media.csv: {e}")
for root, subdirs, files in os.walk(dbmedia_dir):
    print(root)
    for filename in files:
        if (filename != ".DS_Store"):
            file_path = os.path.join(root, filename)
            # path as the Dropbox API wants it: relative to the Dropbox root,
            # leading "/", always "/"-separated (correct for subdirectories too)
            dbp = "/" + os.path.relpath(file_path, dropbox_root).replace(os.sep, "/")
            try:
                print(dbp)
                # reuse existing URL if present (no API call needed)
                if existing.get(filename):
                    filedict[filename] = existing[filename]
                    continue
                # try simple normalization fallbacks: underscore <-> hyphen
                alt = None
                if "_" in filename:
                  alt = filename.replace("_","-")
                elif "-" in filename:
                  alt = filename.replace("-","_")
                if alt and existing.get(alt):
                  # reuse the existing URL for the alternate name
                  filedict[filename] = existing[alt]
                  existing[filename] = existing[alt]
                  continue
                # try replacing spaces with hyphen
                if " " in filename:
                  alt2 = filename.replace(" ", "-")
                  if existing.get(alt2):
                    filedict[filename] = existing[alt2]
                    existing[filename] = existing[alt2]
                    continue
                # nothing known: create (or look up) a shared link
                shared_url = get_shared_url(dbx, dbp)
                filedict[filename] = shared_url
                # add to existing map so new entries are preserved
                existing[filename] = shared_url
            except ApiError as err:
                print(f"{filename}: {err}")


# write sharing link details to csv file in _data directory of site
with open(dbmedia_csv, "w", encoding='utf-8', newline='') as data_file:
  writer = csv.writer(data_file, lineterminator="\n")
  writer.writerow(["meet", "file", "URL"])
  # Use the keys from the combined `existing`/filedict map so we include preserved URLs
  # Sort by filename (column 2) for predictable ordering
  for w in sorted(existing.keys()):
    row = [meet_of(w), w, existing.get(w, '')]
    print(",".join(row))
    writer.writerow(row)


def _filter_filenames_for_meet_from_names(meet, names):
  """Filter an iterable of filenames, returning those that belong to meet.
  Matches filenames starting with the meet number, optionally zero-padded,
  followed by '-' or '_' (e.g. '02-1.jpg', '2_intro.mp4', '20-5.jpg')."""
  try:
    meet_str = str(int(meet))
  except Exception:
    meet_str = str(meet)
  pattern = re.compile(rf'^0*{re.escape(meet_str)}(?:[-_]).*', re.IGNORECASE)
  return {fn for fn in names if fn != ".DS_Store" and pattern.match(fn)}


def _collect_media_csv_for_meet(meet, csvpath):
  """Return set of filenames listed in media.csv for the given meet (numeric or padded)."""
  want = set()
  if not os.path.exists(csvpath):
    return want
  try:
    for meetcol, fname, _url in read_media_csv(csvpath):
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

# ---------------------------------------------------------------------------
# One-time setup note: getting DB_APP_KEY and DB_REFRESH_TOKEN
#
# 1. In the Dropbox app console, open the app's Permissions tab and enable
#    account_info.read and sharing.write (and files.metadata.read if you add
#    file listing later); click Submit.
# 2. Run once, anywhere:
#
#      from dropbox import DropboxOAuth2FlowNoRedirect
#      flow = DropboxOAuth2FlowNoRedirect("<APP_KEY>", use_pkce=True,
#                                         token_access_type="offline")
#      print("Visit:", flow.start())
#      print("DB_REFRESH_TOKEN =", flow.finish(input("Code: ").strip()).refresh_token)
#
# 3. Put these two lines in ~/.secrets and run: chmod 600 ~/.secrets
#
#      DB_APP_KEY=<APP_KEY>
#      DB_REFRESH_TOKEN=<the refresh token printed above>
#
# If you change the app's permissions later, repeat steps 2-3; an existing
# refresh token keeps the scopes it was issued with.
# ---------------------------------------------------------------------------
