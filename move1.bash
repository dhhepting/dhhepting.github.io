# --- set SRC to one directory from the list above, then run the whole block ---
SRC="teaching/CS-205/201810/1_offweb"

case "$SRC" in
  */1_offweb)             ARCHIVE="_offweb" ;;
  */0_nonweb|*/0-nonweb)  ARCHIVE="_nonweb" ;;
  *) echo "unrecognized marker: $SRC" ; ARCHIVE="" ;;
esac

PARENT="$(dirname "$SRC")"          # drops the marker segment
DEST="$ARCHIVE/$PARENT"             # e.g. _offweb/teaching/CS-280

if [ -z "$ARCHIVE" ]; then :; elif [ -e "$DEST" ]; then
  echo "merge: $SRC -> existing $DEST"
  rsync -a "$SRC/" "$DEST/"
  git add "$DEST"
  git rm -r "$SRC"
else
  echo "move: $SRC -> $DEST"
  mkdir -p "$(dirname "$DEST")"
  git mv "$SRC" "$DEST"
fi
