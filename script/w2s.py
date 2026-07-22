for i in range(1024):
    for j in range(1024):
        hpd = 1.0 / 1024.0
        pd = 1.0 / 512.0
        ci = -1 + hpd + i * pd
        cj = -1 + hpd + j * pd
        if i == 1023:
            if j != 1023:
                print (i,j,ci,cj,'[',ci-hpd,ci+hpd,']','[',cj-hpd,cj+hpd,')')
            if j == 1023:
                print (i,j,ci,cj,'[',ci-hpd,ci+hpd,']','[',cj-hpd,cj+hpd,']')
        if j == 1023 and i!=1023:
            print (i,j,ci,cj,'[',ci-hpd,ci+hpd,')','[',cj-hpd,cj+hpd,']')
        if i < 1023 and j < 1023:
           print (i,j,ci,cj,'[',ci-hpd,ci+hpd,')','[',cj-hpd,cj+hpd,')')
print((-1-(-1))/2.0*1024)
print((0-(-1))/2.0*1024)
print((1-(-1))/2.0*1024)
print((1.001-(-1))/2.0*1024)
