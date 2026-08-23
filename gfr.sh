# install the tool
brew install git-filter-repo

# then (AFTER a backup) remove the biggest offenders from all history, e.g.:
git filter-repo --strip-blobs-bigger-than 10M
