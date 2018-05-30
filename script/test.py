import re
import os
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone

from pybtex.database import BibliographyData, Entry
from pybtex.database import parse_file

bib_data = parse_file('../research/works/works.bib')

ed = {}
for entry in bib_data.entries.values():
	entry_data = BibliographyData()
	entry_data.entries[entry.key] = entry
	edstr = entry_data.to_string('bibtex')
	lines = edstr.split("\n")
	lc = 0
	for l in lines:
		fields = l.split("=")
		if len(fields) == 1:
			if fields[0] != "":
				ed[lc] = fields[0]
				lc += 1
			else:
				pass
		else:
			ed[fields[0].strip()] = fields[1]
for k in ed.keys():
	print (k)

# now to format them properly
print (ed[0])
ed.pop(0, None)
print ("\tAuthor = " + ed["Author"])
ed.pop("Author", None)
print ("\tTitle = " + ed["Title"])
ed.pop("Title", None)
print ("\tUrl = " + "\\\"{{" + (ed["Url"])[:-1] + "| absolute_url }}\\\",")
ed.pop("Url", None)
ed.pop("Date-Added",None)
ed.pop("Date-Modified",None)
ed.pop("W-Type",None)
ed.pop("W-Projects",None)
for k in ed:
	if k != 1:
		print("\t"+k+" = "+ed[k])
	else:
		print (ed[1])


