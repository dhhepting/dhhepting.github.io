#!/usr/bin/env python3
from pathlib import Path
import re

p = Path(__file__).parents[1] / "_data" / "teaching" / "CS-280" / "202410" / "plan_creole.md"
text = p.read_text()

# 1) Replace markdown links with target attr: [label](url){:target='_blank'} -> [[url|label]]
text = re.sub(r"\[([^\]]+)\]\((https?://[^\)]+?)\)\s*\{\:target=['\"]?_blank['\"]?\}", r"[[\2|\1]]", text)
# 2) Remove any remaining {:target='...'} tokens
text = re.sub(r"\{\:target=['\"][^\}]+['\"]\}", "", text)
# 3) Replace remaining markdown links without target: [label](url) -> [[url|label]]
text = re.sub(r"\[([^\]]+)\]\((https?://[^\)]+?)\)", r"[[\2|\1]]", text)
# 4) Remove stray spaces introduced
text = text.replace(' )',')')

p.write_text(text)
print(f'Updated {p}')
