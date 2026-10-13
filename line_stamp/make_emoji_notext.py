# 文字なし版のLINE絵文字（180x180）。元画像の上部の文字を消し、白フチを付け直す
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage
from make import outline, fit

# 画像ごとに (この行より上は全部消す, この行までは帽子などの無彩色の暗部と肌だけ残す)
CUT = {1:(350,386), 2:(248,280), 3:(216,272), 4:(270,296),
       5:(233,264), 6:(248,274), 7:(263,288), 8:(220,264)}

def strip_text(a, top, bottom):
    rgb=a[:,:,:3].astype(int); r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    chroma=rgb.max(-1)-rgb.min(-1)
    dark=(chroma<35)&(rgb.max(-1)<120)
    skin=(r>200)&(g>145)&(g<215)&(b>105)&(b<190)&(r-b>40)&(r-b<115)
    y=np.arange(a.shape[0])[:,None]
    kill=(y<top)|((y<bottom)&~dark&~skin)
    a[np.broadcast_to(kill,a.shape[:2])]=0
    return a

def drop_white_border(a):
    # 外側から繋がっている白（元のステッカー風の白フチ）を透明に
    bgish=(a[:,:,3]<25)|((a[:,:,:3].min(-1)>215)&(a[:,:,3]>0))
    lab,_=ndimage.label(bgish)
    edge=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    a[np.isin(lab,edge[edge>0])]=0
    return a

def drop_specks(a, bottom, min_area=60):
    # 小さなゴミと、文字を消した帯の中に収まっている消し残りを除去
    lab,n=ndimage.label(a[:,:,3]>0)
    area=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
    boxes=ndimage.find_objects(lab)
    bad=[k+1 for k in range(n) if area[k]<min_area or boxes[k][0].stop<bottom+8]
    a[np.isin(lab,bad)]=0
    return a

if __name__=='__main__':
    os.makedirs('emoji_notext',exist_ok=True)
    for i,f in enumerate(sorted(glob.glob('src/*_src.png')),1):
        a=np.array(Image.open(f).convert('RGBA'))
        a[a[:,:,3]<=24]=0
        a=drop_specks(drop_white_border(strip_text(a,*CUT[i])),CUT[i][1])
        im=outline(Image.fromarray(a),12)
        im.save(f'emoji_notext/_{i:02d}_full.png')
        fit(im,180,180,4).save(f'emoji_notext/{i:03d}.png',optimize=True)
    fit(Image.open('emoji_notext/_02_full.png'),96,74,2).save('emoji_notext/tab.png',optimize=True)
