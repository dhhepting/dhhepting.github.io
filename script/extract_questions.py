#!/usr/bin/env python3
import re
from pathlib import Path

src = Path(' _data/teaching/CS-280/202610/CS-280-202610-final.tex'.strip())
out_dir = src.parent / 'QuestionBank'
new_main = src.parent / (src.stem + '-split.tex')

text = src.read_text()

m_begin = re.search(r"\\begin\{questions\}", text)
if not m_begin:
    print('No \begin{questions} found')
    raise SystemExit(1)
begin_idx = m_begin.end()

m_end = re.search(r"\\end\{questions\}", text)
if not m_end:
    print('No \end{questions} found')
    raise SystemExit(1)
end_idx = m_end.start()

questions_block = text[begin_idx:end_idx]
# find question blocks
pattern = re.compile(r'(^\\question\b.*?)(?=^\\question\b|\Z)', re.S | re.M)
blocks = pattern.findall(questions_block)

out_dir.mkdir(parents=True, exist_ok=True)

files = []
for i, blk in enumerate(blocks, start=1):
    name = f'2024-final-q{i:03d}.tex'
    path = out_dir / name
    # strip leading/trailing whitespace/newlines
    content = blk.strip() + '\n'
    path.write_text(content)
    files.append(name)

# build new questions section with \input lines
inputs = '\n'
for i in range(1, len(blocks)+1):
    inputs += f'\\input{{QuestionBank/2024-final-q{i:03d}}}\n\n'

new_text = text[:begin_idx] + '\n' + inputs + '\n' + text[end_idx:]
new_main.write_text(new_text)

print('Wrote', len(blocks), 'questions to', out_dir)
print('Wrote new main file', new_main)
