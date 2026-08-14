
# see where the archive copy already sits, so you merge to the right place
ls -la _nonweb/teaching/CS-428+828/ 2>/dev/null

SRC="teaching/CS-428+828/0_nonweb"
DEST="_nonweb/teaching/CS-428+828/0_nonweb"     # match where existing archived content is

rsync -a "$SRC/" "$DEST/"
git add "$DEST"
git rm -r "$SRC"
