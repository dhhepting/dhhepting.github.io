#! /bin/bash
echo `ls -1 gallery-fragments/????-??-* | wc -l` "items"
cat $(ls gallery-fragments/????-* | sort -n -r) > index.html
echo "gallery/index.html created"
