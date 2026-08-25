# keep the Mac cruft from coming back
cat >> .gitignore <<'EOF'
.DS_Store
Icon?
.FBCIndex
.FBCLockFolder/
.iod
EOF

# untrack the plain-named junk (in git pathspecs, * spans slashes)
git rm -r --cached --ignore-unmatch '*.DS_Store' '*.FBCIndex' '*.FBCSemaphoreFile' '*.iod'

# Icon files need special handling for the trailing carriage return
git ls-files -z | perl -0ne 'print if /\/Icon\r\z/' | xargs -0 git rm --cached
