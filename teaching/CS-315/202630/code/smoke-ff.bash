
python3 smoke_firefox.py .                           # every page, skipping node_modules, dist, .git, downloads
python3 smoke_firefox.py . 'm-textbook/07/*.html'    # a subset
SETTLE=3 python3 smoke_firefox.py . 'm-textbook/**/*.html' | tee smoke.log
