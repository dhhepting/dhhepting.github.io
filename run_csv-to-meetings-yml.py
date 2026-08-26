
# 1. preview WITHOUT writing — always do this first
python3 csv-to-meetings-yml.py _data/teaching/CS-280/202510/meetings.csv --stdout

# 2. when it looks right, write it (won't clobber an existing meetings.yml)
python3 csv-to-meetings-yml.py _data/teaching/CS-280/202510/meetings.csv

# 3. only if you intend to replace an existing file
python3 csv-to-meetings-yml.py _data/teaching/CS-280/202510/meetings.csv --force:

#!/usr/bin/env python3
# csv-to-meetings-yml.py — one-time migration: meetings.csv -> meetings.yml
# Transcribes ONLY the irreducible fields; derived fields (week, file, totals)
# are intentionally dropped — they're computed at build time by MeetingPageFields.
# Refuses to overwrite an existing meetings.yml unless --force is given.
