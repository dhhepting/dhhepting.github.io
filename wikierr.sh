# does the wiki_starts_generated data exist for this offering, and what keys?
find _data -path '*CS-428*202610*' -iname '*wiki*'
grep -rn 'wiki_starts_generated\|week3-critique' _data/teaching/CS-428/202610/ 2>/dev/null
