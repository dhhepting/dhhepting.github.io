
# 1. No hyphen literals should remain anywhere:
grep -rn "meeting-pages" _plugins lib _includes _layouts _config*.yml   # expect: no output

# 2. Rebuild (these paths are composed at build time — no need to
#    re-run meetings:pages or table:sync_all):
bundle exec rake build

# 3. Confirm dead internal links are gone:
bundle exec rake        # full default; test:html is where these would surface
