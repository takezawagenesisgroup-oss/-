# LINE絵文字（長押しリアクション用）: 180x180 透過PNG 001〜, タブ 96x74
import glob, os
from make import clean, outline, fit
from PIL import Image
os.makedirs('emoji',exist_ok=True)
srcs=sorted(glob.glob('src/*_src.png'))
for i,f in enumerate(srcs,1):
    im=clean(Image.open(f))
    if i==3: im=outline(im,14)
    fit(im,180,180,4).save(f'emoji/{i:03d}.png',optimize=True)
fit(clean(Image.open(srcs[1])),96,74,2).save('emoji/tab.png',optimize=True)
