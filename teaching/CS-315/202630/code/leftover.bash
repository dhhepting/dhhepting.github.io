grep -L 'type="module" src="[^"/]*\.js"' m-textbook/*/*.html    # pages with no module main script
grep -n '<script src=\|type="text/javascript" src=' m-textbook/*/*.html   # leftover classic scripts
