import numpy as np
xf = []
def gasket(pv,cxf,depth,level):
    if level > 0:
        gasket(np.matmul(cxf,pv),xf[0],depth,level-1)
        gasket(np.matmul(cxf,pv),xf[1],depth,level-1)
        gasket(np.matmul(cxf,pv),xf[2],depth,level-1)
    else:
        print ('  AttributeBegin\n  Material \"diffuse\"')
        leaf = np.matmul(cxf,pv)
        print('    Translate',leaf[0],leaf[1],leaf[2])
        print('    Shape \"sphere\" \"float radius\" [',0.5**depth,']\n  AttributeEnd')

def translate(x,y,z):
    return (np.array([[1.0,0.0,0.0,x],
                  [0.0,1.0,0.0,y],
                  [0.0,0.0,1.0,z],
                  [0.0,0.0,0.0,1.0]]))


scale = np.array([[0.5,0.0,0.0,0.0],
                  [0.0,0.5,0.0,0.0],
                  [0.0,0.0,0.5,0.0],
                  [0.0,0.0,0.0,1.0]])

ident = np.array([[1,0.0,0.0,0.0],
                  [0.0,1,0.0,0.0],
                  [0.0,0.0,1,0.0],
                  [0.0,0.0,0.0,1]])

xf.append(translate(-0.5,0,-0.2887) @ scale @ translate(0.5,0,0.2887))
xf.append(translate(0.5,0,-0.2887) @ scale @ translate(-0.5,0,0.2887))
xf.append(translate(0,0,0.5774) @ scale @ translate(0,0,-0.5774))

print('ObjectBegin \"gasket\"')
sp = np.array([0,0,0,1])
gasket(sp,ident,7,7)
print('ObjectEnd')
