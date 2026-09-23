#!/usr/bin/env python3
"""
clean_transcript.py — Clean meeting/lecture audio transcripts for posting to the wiki.

Input format (one cue = two lines, blank line between cues):

    10:05:28 --> 10:05:30
    Daryl Hepting: Okay.

What it does
------------
1. Strips the "HH:MM:SS --> HH:MM:SS" timestamp lines.
2. Maps speaker names to short labels (default: "Daryl Hepting" -> "DH").
3. Merges cues into flowing paragraphs using a PUNCTUATION-FIRST rule so that
   long dramatic pauses inside one sentence do NOT split it:
     - Always join when the previous cue ends mid-sentence (no . ! ? or an
       ellipsis) OR the next cue starts lowercase — regardless of the gap.
     - Otherwise start a new paragraph only at a clean sentence boundary when
       the silence gap is >= --break-gap seconds (default 10).
     - A speaker change always starts a new paragraph.
4. Applies text substitutions (default: "your courses" -> "UR courses").
5. Trims leading filler ("Um,"/"Uh,").
6. Best-effort tags an embedded student turn when a question and its answer are
   mashed into one cue (question sentence directly followed by No/Yes/Yeah/...).
   Conservative by design; verify the results.
7. Replaces one or more time ranges with a single placeholder line — use this
   for audio of a video played in class (e.g. the Grace Hopper clip).

The speaker label is printed only when the speaker changes, so consecutive
paragraphs by the same person read as plain prose.

Usage
-----
    python3 clean_transcript.py INPUT.txt -o OUTPUT.txt
    python3 clean_transcript.py INPUT.txt \
        --exclude "10:42:55-10:52:44=Grace Hopper video (Letterman), played in class; omitted"

Options (all repeatable where noted):
    -o, --output PATH        Output file (default: INPUT with -clean suffix).
    --break-gap N            Paragraph-break gap in seconds at sentence ends (default 10).
    --speaker "Name=Label"   Speaker name -> label. First one is the primary. (repeatable)
    --sub "find=replace"     Case-insensitive word-boundary substitution. (repeatable)
    --exclude "S-E=Text"     Replace cues whose start is in [S,E] with "[Text]". (repeatable)
    --no-student-detect      Turn off embedded-student splitting.
    --no-filler-trim         Keep leading "Um,"/"Uh,".
"""
import argparse, re, sys, os

TS = re.compile(r'^(\d{2}):(\d{2}):(\d{2})\s*-->\s*(\d{2}):(\d{2}):(\d{2})$')
ANSWER = re.compile(r'^(No|Yes|Yeah|Yep|Nope|Right|Correct|Exactly)\b')


def to_secs(hms):
    h, m, s = (int(x) for x in hms.split(':'))
    return h * 3600 + m * 60 + s


def parse(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    cues, i = [], 0
    while i < len(lines):
        m = TS.match(lines[i].strip())
        if m:
            start = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
            end = int(m[4]) * 3600 + int(m[5]) * 60 + int(m[6])
            raw = lines[i + 1] if i + 1 < len(lines) else ''
            if ':' in raw:
                name, text = raw.split(':', 1)
                name, text = name.strip(), text.strip()
            else:
                name, text = '', raw.strip()
            cues.append({'start': start, 'end': end, 'name': name, 'text': text})
            i += 2
        else:
            i += 1
    return cues


def tidy(text, subs, trim_filler):
    for pat, repl in subs:
        text = re.sub(r'\b' + re.escape(pat) + r'\b', repl, text, flags=re.I)
    if trim_filler:
        text = re.sub(r'^(Um|Uh)[,.]?\s+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def ends_final(t):
    t = t.rstrip()
    return t.endswith(('.', '!', '?', '"')) and not t.endswith(('…', '...'))


def starts_lower(t):
    t = t.lstrip()
    return len(t) > 0 and t[0].islower()


def split_embedded(text):
    """Return (list of (speaker_key, text), was_split)."""
    parts = re.findall(r'[^.?!]*[.?!]+|\S[^.?!]*$', text)
    parts = [p.strip() for p in parts if p.strip()]
    seam = None
    for k in range(len(parts) - 1):
        if parts[k].endswith('?') and ANSWER.match(parts[k + 1]):
            seam = k
    if seam is None:
        return [(None, text)], False   # None = primary speaker of the cue
    return [('student', ' '.join(parts[:seam + 1]).strip()),
            (None, ' '.join(parts[seam + 1:]).strip())], True


def convert(path, out, break_gap, speakers, subs, excludes,
            student_detect, trim_filler):
    cues = parse(path)
    primary = next(iter(speakers)) if speakers else None

    def label_for(cue_name, key):
        if key == 'student':
            return '[student]'
        if cue_name in speakers:
            return speakers[cue_name]
        return cue_name or (speakers[primary] if primary else '')

    # Build a flat sequence of items: utterances and placeholders, in order.
    items = []            # each: {'kind':'utt','spk','text','gap'} or {'kind':'ph','text'}
    prev_end = None
    fired = set()         # exclude ranges already placed
    stats = {'excluded_cues': 0, 'splits': 0, 'subs': 0}
    raw_join = ' '.join(c['text'] for c in cues)

    for cue in cues:
        # exclusion check (by cue start time)
        hit = None
        for idx, (s, e, txt) in enumerate(excludes):
            if s <= cue['start'] <= e:
                hit = idx
                break
        if hit is not None:
            stats['excluded_cues'] += 1
            if hit not in fired:
                items.append({'kind': 'ph', 'text': excludes[hit][2]})
                fired.add(hit)
            prev_end = cue['end']
            continue

        before = cue['text']
        cue['text'] = tidy(cue['text'], subs, trim_filler)
        if before != cue['text']:
            stats['subs'] += 1
        if not cue['text']:
            prev_end = cue['end']
            continue

        pieces, was = ([( None, cue['text'])], False)
        if student_detect:
            pieces, was = split_embedded(cue['text'])
        if was:
            stats['splits'] += 1

        gap = (cue['start'] - prev_end) if prev_end is not None else 0
        for pi, (key, text) in enumerate(pieces):
            spk = label_for(cue['name'], key)
            items.append({'kind': 'utt', 'spk': spk, 'text': text,
                          'gap': gap if pi == 0 else 0})
        prev_end = cue['end']

    # Merge adjacent same-speaker utterances into paragraphs.
    # A placeholder is a hard break.
    segs = []   # {'spk','text'} or {'ph': text}
    for it in items:
        if it['kind'] == 'ph':
            segs.append({'ph': it['text']})
            continue
        if segs and 'spk' in segs[-1] and segs[-1]['spk'] == it['spk']:
            pv = segs[-1]['text']
            if (not ends_final(pv)) or starts_lower(it['text']) or it['gap'] < break_gap:
                segs[-1]['text'] = (pv + ' ' + it['text']).strip()
                continue
        segs.append({'spk': it['spk'], 'text': it['text']})

    # Render.
    out_lines, last_spk = [], None
    for seg in segs:
        if 'ph' in seg:
            out_lines.append(f"[{seg['ph']}]")
            last_spk = None
            continue
        if seg['spk'] != last_spk:
            out_lines.append(f"{seg['spk']}: {seg['text']}" if seg['spk'] else seg['text'])
            last_spk = seg['spk']
        else:
            out_lines.append(seg['text'])

    text = '\n\n'.join(out_lines) + '\n'
    open(out, 'w', encoding='utf-8').write(text)

    n_par = sum(1 for s in segs if 'spk' in s)
    n_stu = sum(1 for s in segs if s.get('spk') == '[student]')
    print(f"  input cues:        {len(cues)}")
    print(f"  paragraphs out:    {n_par}")
    print(f"  student turns:     {n_stu}")
    print(f"  embedded splits:   {stats['splits']}")
    print(f"  substitutions:     {stats['subs']} cue(s)")
    print(f"  excluded cues:     {stats['excluded_cues']} "
          f"across {len(fired)} range(s)")
    print(f"  words in / out:    {len(raw_join.split())} / {len(text.split())}")
    print(f"  written:           {out}")
    return out


def kv(s):
    if '=' not in s:
        raise argparse.ArgumentTypeError(f"expected 'key=value', got {s!r}")
    k, v = s.split('=', 1)
    return k.strip(), v.strip()


def excl(s):
    m = re.match(r'^\s*(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})\s*=(.*)$', s)
    if not m:
        raise argparse.ArgumentTypeError(
            f"expected 'HH:MM:SS-HH:MM:SS=text', got {s!r}")
    return to_secs(m[1]), to_secs(m[2]), m[3].strip()


def main():
    ap = argparse.ArgumentParser(description="Clean audio transcripts for the wiki.")
    ap.add_argument('input')
    ap.add_argument('-o', '--output')
    ap.add_argument('--break-gap', type=int, default=10)
    ap.add_argument('--speaker', action='append', type=kv, default=None)
    ap.add_argument('--sub', action='append', type=kv, default=None)
    ap.add_argument('--exclude', action='append', type=excl, default=None)
    ap.add_argument('--no-student-detect', action='store_true')
    ap.add_argument('--no-filler-trim', action='store_true')
    a = ap.parse_args()

    speakers = dict(a.speaker) if a.speaker else {'Daryl Hepting': 'DH'}
    subs = a.sub if a.sub else [('your courses', 'UR courses')]
    excludes = a.exclude or []
    out = a.output or re.sub(r'(\.\w+)?$', r'-clean.txt', a.input, count=1)

    print(f"Cleaning {os.path.basename(a.input)}")
    convert(a.input, out, a.break_gap, speakers, subs, excludes,
            not a.no_student_detect, not a.no_filler_trim)


if __name__ == '__main__':
    main()
