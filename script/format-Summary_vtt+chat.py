#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
from datetime import datetime, timedelta
from pathlib import Path

import webvtt

import yaml
from yaml import SafeDumper

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
DL_DIR = "/Users/hepting/Downloads/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 3):
	print(sys.argv[0], 'must be invoked with <course>/<semester> <mtg-nbr>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

d ={}
# try opening summary file for meeting
jcrs_id = reldir[0].replace("+","_")
summdir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/summary')
try:
    os.makedirs(summdir)
except OSError as e:
    # path already exists
    pass
summfile = summdir + '/' + sys.argv[2].zfill(2) + '.yml'
joff_id = jcrs_id + '-' + reldir[1]

try:
    with open(summfile, 'x') as yaml_file:
        d['offering'] = {}
        d['offering']['id'] = joff_id
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print(sys.argv[0],': ', summfile, 'exists')
    with open(summfile, 'r') as yaml_file:
        d = yaml.safe_load(yaml_file)


ng = {}
seqnbr = 0
if ('Zoom-Audio-Transcript' not in d):
    d['Zoom-Audio-Transcript'] = []
    ospkr = ''
    msgstr = ''
    VTT_SRC = DL_DIR + joff_id + '/' + sys.argv[2].zfill(2) + '.vtt'
    print(VTT_SRC)
    for caption in webvtt.read(VTT_SRC):
        txtseg = caption.text.split(':')
        tsl = len(txtseg)
        if (tsl == 1):
            spkr = 'Unknown'
            msg = txtseg[0]
        if (tsl == 2):
            spkr = txtseg[0]
            msg = txtseg[1]
        if (spkr != ospkr):
            if (ospkr != ''):
                snamekey = ospkr.strip()
                if snamekey not in ng:
                    ng[snamekey] = seqnbr
                    seqnbr += 1
                if snamekey == 'Daryl Hepting' or snamekey == 'Daryl (heptingd)':
                    person_id = 'DHH'
                elif snamekey == 'Unknown':
                    person_id = '???'
                else:
                    person_id = 'S'+str(ng[snamekey]).zfill(2)
                e = {}
                e['desc'] = msgstr.strip()
                e['persid'] = person_id
                d['Zoom-Audio-Transcript'].append(e)
                msgstr = ''
            ospkr = spkr
        msgstr += msg
else:
    print ('Zoom-Audio-Transcript already present.')

if ('Zoom-Chat-Transcript' not in d):
    d['Zoom-Chat-Transcript'] = []
    CHAT_SRC = DL_DIR + joff_id + '/' + sys.argv[2].zfill(2) + '.txt'
    print(CHAT_SRC)
    with open(CHAT_SRC,'r') as ctf:
        for line in ctf:
            npline = line.split('\t')
            if (len(npline) > 2):
                sname = npline[1][:-1]
                msg = npline[2]
                snamekey = sname.strip()
                if snamekey not in ng:
                    ng[snamekey] = seqnbr
                    seqnbr += 1
                if snamekey == 'Daryl Hepting' or snamekey == 'Daryl (heptingd)':
                    person_id = 'DHH'
                else:
                    person_id = 'S'+str(ng[snamekey]).zfill(2)
                e = {}
                e['desc'] = msg.strip()
                e['persid'] = person_id
                d['Zoom-Chat-Transcript'].append(e)
else:
    print ('Zoom-Chat-Transcript already present.')
with open(summfile, 'w') as yaml_file:
    yaml.safe_dump(d, yaml_file, default_flow_style=False)
