from PIL import Image, ImageFilter
import numpy as np, glob, os
W,H,M=370,320,10
def clean(im):
    a=np.array(im.convert('RGBA'))
    a[a[:,:,3]<=24]=0                      # 背景の半透明ノイズを完全透明に
    return Image.fromarray(a)
def outline(im,r):
    al=im.split()[3].point(lambda v:255 if v>0 else 0).filter(ImageFilter.MaxFilter(2*r+1)).filter(ImageFilter.GaussianBlur(1))
    bg=Image.new('RGBA',im.size,(255,255,255,0)); bg.putalpha(al)
    return Image.alpha_composite(bg,im)
def fit(im,w,h,m):
    im=im.crop(im.getbbox())
    s=min((w-2*m)/im.width,(h-2*m)/im.height)
    im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    c=Image.new('RGBA',(w,h),(0,0,0,0)); c.alpha_composite(im,((w-im.width)//2,(h-im.height)//2))
    a=np.array(c); a[a[:,:,3]<=8]=0; return Image.fromarray(a)
if __name__=='__main__':
    os.makedirs('out',exist_ok=True)
    srcs=sorted(glob.glob('src/*_src.png'))
    for i,f in enumerate(srcs,1):
        im=clean(Image.open(f))
        if i==3: im=outline(im,14)          # 「うーん…」の文字に白フチを追加（ダークモード対策）
        fit(im,W,H,M).save(f'out/{i:02d}.png',optimize=True)
    best=clean(Image.open(srcs[1]))  # いいね！をメイン/タブに
    fit(best,240,240,8).save('out/main.png',optimize=True)
    fit(best,96,74,2).save('out/tab.png',optimize=True)
