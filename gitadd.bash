#ls -la _nonweb/teaching/ 2>/dev/null   # is there already a _nonweb/teaching/0_nonweb?
ls -la _offweb/teaching/ 2>/dev/null   # is there already a _offweb/teaching/1_offweb?
#ls -la _nonweb/teaching/0_nonweb/ 2>/dev/null
ls -la _offweb/teaching/1_offweb/ 2>/dev/null

SRC=teaching/1_offweb
DEST=_offweb/teaching/1_offweb        # keep the marker segment; match where content already is

rsync -a "$SRC/" "$DEST/"
git add "$DEST"
git rm -r "$SRC"
