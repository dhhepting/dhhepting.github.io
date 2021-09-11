import math
import numpy as np

def ext_outer_d(vertices, edges):
    #### exterior of large "d": 6 vertices CW
    print('#### exterior of large "d"')
    ## top centre (1)
    print (vertices[0][0],vertices[0][1])
    ## bottom centre (2)
    print (vertices[0][0],vertices[3][1])
    ## bottom left (3)
    print (vertices[4][0],vertices[4][1])
    ## lower left (4)
    print (vertices[5][0],vertices[5][1])
    ## back to origin (5)
    l1 = [vertices[5][1]/vertices[5][0], -1, 0]
    l2 = [1, 0, 18]
    mid_d = np.cross(l1, l2)
    midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
    print (midl[0], midl[1])
    ## back to top (near) centre (6)
    l1 = edges[6]
    top_d = np.cross(l1, l2)
    topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
    print (topl[0], topl[1])

def int_outer_d(vertices,edges):
    #### interior of large "d"
    print('#### interior of "d"')
    ## top stem (1)
    l1 = [vertices[5][1]/vertices[5][0], -1, 0]
    l2 = [1, 0, 18]
    mid_d = np.cross(l1, l2)
    midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
    print (midl[0],midl[1]+18)
    ## bottom stem (2)
    print(midl[0],vertices[3][1]-18)
    ## d bottom loop (from angle) (3)
    dblang = math.radians((128 + 4.0/7.0)/2.0)
    botl = [vertices[4][0] + 18.0/math.tan(dblang), vertices[4][1] - 18.0]
    print (botl[0],botl[1])
    ## d top loop (4)
    l1 = [edges[4][0],-1, botl[1] - edges[4][0] * botl[0]]
    l2 = [vertices[5][1]/vertices[5][0], -1,(midl[1] + 18.0) - (vertices[5][1]/vertices[5][0]) * midl[0]]
    tlp_d = np.cross(l1, l2)
    tlpl = [tlp_d[0]/tlp_d[2],tlp_d[1]/tlp_d[2]]
    print (tlpl[0], tlpl[1])

def ext_inlaid_d(vertices, edges):
    #### inlaid exterior of "d"
    print('#### inlaid exterior of "d"')
    ## top centre (1)
    tl1 = edges[6]
    tl1[2] = edges[6][2] + 6.0
    l2 = [1, 0, 6]
    top_d = np.cross(tl1, l2)
    topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
    print (topl[0], topl[1])
    #print (-6.0,vertices[0][1]+6.0)
    ## bottom centre (2)
    print (-6.0,vertices[3][1]-6.0)
    ## bottom left(3)
    dblang = math.radians((128 + 4.0/7.0)/2.0)
    botl = [vertices[4][0] + 6.0/math.tan(dblang), vertices[4][1] - 6.0]
    print (botl[0],botl[1])
    ## lower left
    #print (vertices[5][0],vertices[5][1])
    ## d top loop (4)
    l1 = [vertices[5][1]/vertices[5][0], -1, 0]
    l2 = [1, 0, 18]
    mid_d = np.cross(l1, l2)
    midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
    l1 = [edges[4][0],-1, botl[1] - edges[4][0] * botl[0]]
    l2 = [vertices[5][1]/vertices[5][0], -1,(midl[1] + 6.0) - (vertices[5][1]/vertices[5][0]) * midl[0]]
    tlp_d = np.cross(l1, l2)
    tlpl = [tlp_d[0]/tlp_d[2],tlp_d[1]/tlp_d[2]]
    print (tlpl[0], tlpl[1])
    ## back to origin (5)
    l1 = [vertices[5][1]/vertices[5][0], -1, 6]
    l2 = [1, 0, 12]
    mid_d = np.cross(l1, l2)
    midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
    print (midl[0], midl[1])
    ## back to top (near) centre (6)

    top_d = np.cross(tl1, l2)
    topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
    print (topl[0], topl[1])

def int_inlaid_d(vertices, edges):
    #### interior of inlaid "d"
    print('#### interior of inlaid "d" (4 vertices CW)')
    ## top stem (1)
    l1 = [vertices[5][1]/vertices[5][0], -1, 0]
    l2 = [1, 0, 12]
    mid_d = np.cross(l1, l2)
    midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
    print (-12,midl[1]+12.0)
    ## bottom stem (2)
    print(-12,vertices[3][1]-12)
    ## d bottom loop (from angle) (3)
    dblang = math.radians((128 + 4.0/7.0)/2.0)
    botl = [vertices[4][0] + 12.0/math.tan(dblang), vertices[4][1] - 12.0]
    print (botl[0],botl[1])
    ## d top loop (4)
    l1 = [edges[4][0],-1, botl[1] - edges[4][0] * botl[0]]
    l2 = [vertices[5][1]/vertices[5][0], -1,(midl[1] + 12.0) - (vertices[5][1]/vertices[5][0]) * midl[0]]
    tlp_d = np.cross(l1, l2)
    tlpl = [tlp_d[0]/tlp_d[2],tlp_d[1]/tlp_d[2]]
    print (tlpl[0], tlpl[1])

def outer_h(vertices,edges):
    #### exterior of "h"
    print('#### exterior "h"')
    ## top centre (1)
    print (vertices[0][0],vertices[0][1])
    ## bottom centre (2)
    print (vertices[0][0],vertices[3][1])
    ## bottom stem (3)
    print (18.0,vertices[3][1])
    ## middle stem (4)
    l1 = [vertices[2][1]/vertices[2][0], -1, 0]
    l2 = [1, 0, -18]
    mid_h = np.cross(l1, l2)
    midl = [mid_h[0]/mid_h[2], mid_h[1]/mid_h[2]]
    print (midl[0],midl[1]+18)
    ## top inside of hook (5)
    dblang = math.radians((128 + 4.0/7.0)/2.0)
    botl = [vertices[3][0] - 18.0/math.tan(dblang), vertices[3][1] - 18.0]
    l1 = [edges[2][0],-1, botl[1] - edges[2][0] * botl[0]]
    l2 = [vertices[2][1]/vertices[2][0], -1,(midl[1] + 18.0) - (vertices[2][1]/vertices[2][0]) * midl[0]]
    tlp_h = np.cross(l1, l2)
    tlpl = [tlp_h[0]/tlp_h[2],tlp_h[1]/tlp_h[2]]
    print (tlpl[0], tlpl[1])
    ## bottom inside of hook (6)
    base = [0, -1, vertices[3][1]]
    bh_int = edges[2][0] * tlpl[0] - tlpl[1]
    bh_l = [edges[2][0],edges[2][1],-bh_int]
    bl_h = np.cross(base, bh_l)
    bll = [bl_h[0]/bl_h[2],bl_h[1]/bl_h[2]]
    print (bll[0],bll[1])
    ## bottom outside of hook (7)
    print (vertices[3][0],vertices[3][1])
    print ("fraction:", 18.0/(vertices[3][0]-bll[0]))
    ## top outside of hook (8)
    print (vertices[2][0],vertices[2][1])
    ## upper middle stem (9)
    print (midl[0], midl[1])
    ## top stem (10)
    tl1 = edges[0]
    l2 = [1, 0, -18]
    top_h = np.cross(tl1, l2)
    topl = [top_h[0]/top_h[2], top_h[1]/top_h[2]]
    print (topl[0], topl[1])

def inlaid_h(vertices,edges):
    #### exterior of "h"
    print('#### inlaid "h"')
    ## top centre (1)
    tl1 = edges[0]
    tl1[2] = edges[0][2] + 6.0
    l2 = [1, 0, -6]
    top_d = np.cross(tl1, l2)
    topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
    print (topl[0], topl[1])
    #print (vertices[0][0]+6,vertices[0][1])
    ## bottom centre (2)
    print (vertices[0][0]+6,vertices[3][1]-6)
    ## bottom stem (3)
    print (12.0,vertices[3][1]-6)
    ## middle stem (4)
    l1 = [vertices[2][1]/vertices[2][0], -1, 0]
    l2 = [1, 0, -12]
    mid_h = np.cross(l1, l2)
    midl = [mid_h[0]/mid_h[2], mid_h[1]/mid_h[2]]
    print (midl[0],midl[1]+12)


    ## top inside of hook (5)
    dblang = math.radians((128 + 4.0/7.0)/2.0)
    botl = [vertices[3][0] - 18.0/math.tan(dblang), vertices[3][1] - 18.0]
    l1 = [edges[2][0],-1, botl[1] - edges[2][0] * botl[0]]
    l2 = [vertices[2][1]/vertices[2][0], -1,(midl[1] + 18.0) - (vertices[2][1]/vertices[2][0]) * midl[0]]
    tlp_h = np.cross(l1, l2)
    tlpl = [tlp_h[0]/tlp_h[2],tlp_h[1]/tlp_h[2]]
    #print (tlpl[0], tlpl[1])
    print("76.41167848238412", "29.440466980802423")
    ## bottom inside of hook (6)
    base = [0, -1, vertices[3][1]-6]
    bh_int = edges[2][0] * tlpl[0] - tlpl[1]
    bh_l = [edges[2][0],edges[2][1],-bh_int]
    bl_h = np.cross(base, bh_l)
    bll = [bl_h[0]/bl_h[2],bl_h[1]/bl_h[2]]
    #print (bll[0],bll[1]-6)
    sixint = edges[2][0] * 76.41167848238412 - 29.440466980802423
    sixl = [edges[2][0],edges[2][1],-sixint]
    six_h = np.cross(base, sixl)
    ll6 = [six_h[0]/six_h[2],six_h[1]/six_h[2]]
    print (ll6[0],ll6[1])
    ## bottom outside of hook (7)
    #print (vertices[3][0],vertices[3][1]-6)
    sevint = edges[2][0] * 86.95223485028323 - 25.846280188216937
    sevl = [edges[2][0],edges[2][1],-sevint]
    sev_h = np.cross(base, sevl)
    ll7 = [sev_h[0]/sev_h[2],sev_h[1]/sev_h[2]]
    print (ll7[0],ll7[1])
    ## top outside of hook (8)
    #print (vertices[2][0],vertices[2][1])
    print("86.95223485028323 25.846280188216937")

    ## upper middle stem (9)
    print (midl[0], midl[1]+6)
    ## top stem (10)
    tl1 = edges[0]
    l2 = [1, 0, -12]
    top_h = np.cross(tl1, l2)
    topl = [top_h[0]/top_h[2], top_h[1]/top_h[2]]
    print (topl[0], topl[1])


twopi = 2.0 * math.pi

# regular heptagon vertices CW
# 0 = top
# 1 = right-upper
# 2 = right-lower
# 3 = bottom-right
# 4 = bottom-left
# 5 = left-lower
# 6 = left-upper
vertices = []
for i in range (7):
    vertices.append([])
    ang = (i * (twopi/7.0)) - (math.pi/2.0)
    xpos = math.cos(ang)*100.0
    if (abs(xpos) < 0.00001):
        xpos = 0.0
    vertices[i].append(xpos)
    ypos = math.sin(ang)*100.0
    if (abs(ypos) < 0.00001):
        ypos = 0.0
    vertices[i].append(ypos)
    #print (vertices[i][0], ",", vertices[i][1])
### calculate equations of lines (edges)
# regular heptagon vertices CW
# 0 = right-upper - top
# 1 = right-lower - right-upper
# 2 = right-bottom - right-lower
# 3 = left-bottom - right-bottom
# 4 = left-lower - left-bottom
# 5 = left-upper - left-lower
# 6 = top - left-upper
edges = []
for i in range (7):
    edges.append([])
    dx = vertices[(i+1)%7][0] - vertices[i][0]
    dy = vertices[(i+1)%7][1] - vertices[i][1]
    slope = dy/dx
    edges[i].append(slope)
    edges[i].append(-1)
    edges[i].append(vertices[i][1] - slope * vertices[i][0])

ext_outer_d(vertices, edges)
ext_inlaid_d(vertices, edges)
int_inlaid_d(vertices, edges)
int_outer_d(vertices, edges)

outer_h(vertices,edges)
inlaid_h(vertices,edges)





# #### inlaid "h"
# print('#### inlaid "h"')
# ## top centre (1)
# tl1 = edges[0]
# tl1[2] = edges[0][2] + 6.0
# l2 = [1, 0, -6]
# top_d = np.cross(tl1, l2)
# topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
# print (topl[0], topl[1])
# ## bottom centre (2)
# print (6.0,vertices[3][1]-6.0)
# ## bottom left (3)
# print (12.0,vertices[3][1]-6.0)
# botl = [vertices[3][0] - 6.0/math.tan(dblang), vertices[3][1] - 6.0]
# print (botl[0],botl[1])
# ## lower left
# #print (vertices[5][0],vertices[5][1])
# ## d top loop (4)
# ## top stem (4)
# print (12,midl[1]+6.0)
# ## inside hook (5)
# print (-tlpl[0], tlpl[1])
# ## bottom inside hook (6)
# botl = [vertices[4][0] + 6.0/math.tan(dblang), vertices[4][1] - 6.0]
# print (-botl[0],botl[1])
# print (-botl[0] + 6,botl[1])
# print(-12,vertices[3][1]-6)
# l1 = [edges[4][0],-1, botl[1] - edges[4][0] * botl[0]]
# l2 = [vertices[5][1]/vertices[5][0], -1,(midl[1] + 6.0) - (vertices[5][1]/vertices[5][0]) * midl[0]]
# tlp_d = np.cross(l1, l2)
# tlpl = [tlp_d[0]/tlp_d[2],tlp_d[1]/tlp_d[2]]
# print (tlpl[0], tlpl[1])
# ## back to origin (5)
# l1 = [vertices[5][1]/vertices[5][0], -1, 6]
# l2 = [1, 0, -12]
# mid_d = np.cross(l1, l2)
# midl = [mid_d[0]/mid_d[2], mid_d[1]/mid_d[2]]
# print (midl[0], midl[1])
# ## back to top (near) centre (6)
#
# top_d = np.cross(tl1, l2)
# topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
# print (topl[0], topl[1])

# #### inlaid interior of "d"
# #print('#### inlaid interior of "d"')
# ## top stem
# print (-12,midl[1]+6.0)
# ## bottom stem
# print(-12,vertices[3][1]-12)
# ## d bottom loop (from angle)
# #dblang = math.radians((128 + 4.0/7.0)/2.0)
# botl = [vertices[4][0] + 12.0/math.tan(dblang), vertices[4][1] - 12.0]
# print (botl[0],botl[1])
# ## d top loop
# l1 = [edges[4][0],-1, botl[1] - edges[4][0] * botl[0]]
# l2 = [vertices[5][1]/vertices[5][0], -1,(midl[1] + 6.0) - (vertices[5][1]/vertices[5][0]) * midl[0]]
# tlp_d = np.cross(l1, l2)
# tlpl = [tlp_d[0]/tlp_d[2],tlp_d[1]/tlp_d[2]]
# print (tlpl[0], tlpl[1])
#
# l2 = [1, 0, 12]
# top_d = np.cross(tl1, l2)
# topl = [top_d[0]/top_d[2], top_d[1]/top_d[2]]
# print (topl[0], topl[1])
