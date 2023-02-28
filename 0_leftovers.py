
# if offering is found, use semester data to make meetings list
'''
with open(SITE_DIR + '_data/teaching/semesters.csv', newline='') as semfile:
    semreader = csv.DictReader(semfile)
    sem_found = 0
    for row in semreader:
        if (row['semester'] == reldir[1]):
            sem_found = 1
            # find out no-class-days first
            ncd = row['no-class-days'].split(',')
            ncdlist = []
            for dd in ncd:
                ncdate = datetime.strptime(dd, '%d-%b-%y')
                ncdlist.append(datetime.strftime(ncdate,'%a-%d-%b-%Y').split('-'))
            # get term-start and class-end dates
            sday = datetime.strptime(row['term-start'], '%d-%b-%y')
            ced = datetime.strptime(row['class-end'], '%d-%b-%y')
            break
if sem_found == 0:
    print(sys.argv[0],': semester ' + reldir[1] + ' not found in semesters file')
    sys.exit()

jcrs_id = reldir[0].replace('+','_')
offdatadir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
try:
    os.makedirs(offdatadir)
except OSError as e:
    # path already exists
    pass
planfile = offdatadir + '/plan.yml'
mtgsfile = offdatadir + '/meetings.csv'
joff_id = jcrs_id + '-' + reldir[1]
mtgctr = 1
try:
    with open(planfile, 'x') as yaml_file:
        d = {}
        d['offering'] = {}
        d['offering']['id'] = joff_id
        while (sday <= ced):
            datelist = datetime.strftime(sday,'%a-%d-%b-%Y').split('-')
            if (datelist[0] in mtgdays) and datelist not in ncdlist:
                d[mtgctr] = {}
                e = {}
                e['kaku'] = 'knowledge area / knowledge unit'
                e['topics'] = 'list of topics'
                e['outcomes'] = 'list of outcomes'
                e['notes'] = 'name of webpage with notes'
                d[mtgctr]['BOK'] = [e]
                d[mtgctr]['date'] = '-'.join(datelist)
                d[mtgctr]['theme'] = 'theme'
                mtgctr += 1
            sday = sday + timedelta(days=1)
        d['offering']['meetings'] = mtgctr - 1
        yaml.dump(d, yaml_file, default_flow_style=False)
        try:
            with open(mtgsfile,'w') as mf:
                mf.write('meeting,total_mtgs,date,file\n')
                for mm in range (1, mtgctr):
                    #print(mm)
                    mtg_date = d[mm]['date']
                    mtg_fname = str(mm).zfill(2) + '_' + mtg_date + '.html'
                    mf.write(str(mm).zfill(2) + ',' + str(mtgctr - 1) + ',' + mtg_date + ',' + mtg_fname + '\n')
        except:
            print('exceptions')
except:
    print(sys.argv[0],': plan.yml exists')
'''
