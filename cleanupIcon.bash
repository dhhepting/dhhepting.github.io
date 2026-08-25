# Icon files need special handling for the trailing carriage return
git ls-files -z | grep '"' | grep Icon

git ls-files | perl -0ne 'print if /\/Icon\r\z/' | xargs -0 git rm --cached
git ls-files | grep '"' | grep Icon

