/**
 * ═══════════════════════════════════════════════════════
 *  SOLAR SYSTEM 3D SIMULATION
 *  Three.js WebGL — Full Moon Systems Edition
 * ═══════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════
//  SECTION 1: NOISE & MATH UTILITIES
// ═══════════════════════════════════════════════════════

function hash2(x, y) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix+1, iy), c = hash2(ix, iy+1), d = hash2(ix+1, iy+1);
  return a + (b-a)*ux + (c-a)*uy + (a-b-c+d)*ux*uy;
}
function fbm(x, y, oct=5, lac=2, gain=0.5) {
  let v=0, amp=0.5, freq=1;
  for (let i=0; i<oct; i++) { v += smoothNoise(x*freq, y*freq)*amp; amp*=gain; freq*=lac; }
  return v;
}
const lerp   = (a, b, t) => a + (b-a)*t;
const clamp  = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerpColor = (c1, c2, t) => [
  Math.floor(lerp(c1[0],c2[0],t)), Math.floor(lerp(c1[1],c2[1],t)), Math.floor(lerp(c1[2],c2[2],t))
];

// ═══════════════════════════════════════════════════════
//  SECTION 2: PROCEDURAL TEXTURE GENERATION
// ═══════════════════════════════════════════════════════

function makeCanvas(W, H) { const c=document.createElement('canvas'); c.width=W; c.height=H; return c; }

function pixelTexture(type) {
  const W=512, H=256;
  const canvas=makeCanvas(W,H), ctx=canvas.getContext('2d'), img=ctx.createImageData(W,H), d=img.data;
  const sp=(x,y,r,g,b,a=255)=>{const i=(y*W+x)*4;d[i]=clamp(r,0,255);d[i+1]=clamp(g,0,255);d[i+2]=clamp(b,0,255);d[i+3]=a;};
  const gp=(x,y)=>{const i=(y*W+x)*4;return[d[i],d[i+1],d[i+2]];};
  const bp=(x,y,r,g,b,t)=>{const[pr,pg,pb]=gp(x,y);sp(x,y,Math.floor(lerp(pr,r,t)),Math.floor(lerp(pg,g,t)),Math.floor(lerp(pb,b,t)));};

  if (type==='sun') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=fbm(x/W*9,y/H*4.5,7,2.1,0.55)*0.6+fbm(x/W*9+17,y/H*4.5+5,5,2,0.5)*0.3+fbm(x/W*18,y/H*9+9,4,2,0.45)*0.1;sp(x,y,255,clamp(Math.floor(lerp(140,235,t)),0,255),clamp(Math.floor(lerp(0,60,t*t)),0,255));}
    for(let s=0;s<12;s++){const sx=Math.floor(100+Math.random()*(W-200)),sy=Math.floor(H*0.25+Math.random()*H*0.5),sr=8+Math.random()*20;for(let dy=-sr;dy<=sr;dy++)for(let dx=-sr;dx<=sr;dx++){const dist=Math.sqrt(dx*dx+dy*dy)/sr;if(dist<1)bp((sx+dx+W)%W,clamp(sy+dy,0,H-1),180,70,0,Math.pow(1-dist,1.5)*0.55);}}
  }
  else if (type==='mercury') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*9,y/H*4.5,7,2.1,0.55);const v=Math.floor(lerp(95,185,n));sp(x,y,v,v-5,v-12);}
    for(let i=0;i<100;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*16;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr){const px=(cx+dx+W)%W,py=clamp(cy+dy,0,H-1);const dark=dist>cr*0.78?lerp(gp(px,py)[0],210,0.5):lerp(gp(px,py)[0],82,0.65);bp(px,py,dark,dark-4,dark-10,0.85);}}}
  }
  else if (type==='venus') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n1=fbm(x/W*7,y/H*3.5,6,2,0.5),n2=fbm(x/W*7+8,y/H*3.5+3,5,2.2,0.45),n3=fbm(x/W*10+20,y/H*2,4,2,0.4);sp(x,y,clamp(Math.floor(lerp(190,248,n1*0.7+n2*0.3)),0,255),clamp(Math.floor(lerp(145,215,n1*0.5+n3*0.5)),0,255),clamp(Math.floor(lerp(50,130,n3)),0,255));}
  }
  else if (type==='earth') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dn=fbm(x/W*6+30,y/H*3+12,4,2,0.5);sp(x,y,Math.floor(lerp(5,25,dn)),Math.floor(lerp(30,75,dn)),Math.floor(lerp(115,165,dn)));}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const land=fbm(x/W*5.8+1.6,y/H*2.9+0.8,7,2,0.52);if(land>0.504){const t=clamp((land-0.504)/0.12,0,1),hi=fbm(x/W*11+4,y/H*5+2,4,2,0.48)>0.54;let r,g,b;if(t<0.3){r=Math.floor(lerp(25,60,t/0.3));g=Math.floor(lerp(80,115,t/0.3));b=55;}else if(t<0.7){const et=(t-0.3)/0.4;r=Math.floor(lerp(60,105,et));g=Math.floor(lerp(115,100,et));b=58;}else{const ht=(t-0.7)/0.3;r=Math.floor(lerp(105,155,ht));g=Math.floor(lerp(100,125,ht));b=Math.floor(lerp(60,100,ht));}if(hi&&t>0.5){r=Math.floor(lerp(r,140,0.4));g=Math.floor(lerp(g,115,0.4));b=Math.floor(lerp(b,105,0.4));}sp(x,y,r,g,b);}}
    for(let y=0;y<H;y++){const lat=Math.abs((y/H-0.5)*Math.PI);if(lat>1.25){const it=clamp((lat-1.25)/0.3,0,1);for(let x=0;x<W;x++)bp(x,y,235,245,255,it);}}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=clamp((fbm(x/W*9+40,y/H*4.5+22,6,2.1,0.52)*0.65+fbm(x/W*6+55,y/H*6+30,4,2,0.5)*0.35-0.46)/0.12,0,1);if(c>0)bp(x,y,255,255,255,c*0.82);}
  }
  else if (type==='mars') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n1=fbm(x/W*8,y/H*4,6,2,0.52),n2=fbm(x/W*8+10,y/H*4+4,5,2.1,0.48);sp(x,y,clamp(Math.floor(lerp(145,205,n1)),0,255),clamp(Math.floor(lerp(48,88,n1*0.7+n2*0.3)),0,255),clamp(Math.floor(lerp(28,58,n2*0.4)),0,255));}
    const vmY=Math.floor(H*0.52);for(let x=Math.floor(W*0.35);x<Math.floor(W*0.68);x++){const xf=(x-W*0.35)/(W*0.33),cy=vmY+Math.floor(Math.sin(xf*Math.PI)*8),w=10+Math.floor(Math.sin(xf*Math.PI*3)*4);for(let dy=-w;dy<=w;dy++)bp(x,clamp(cy+dy,0,H-1),100,42,22,Math.pow(1-Math.abs(dy)/w,1.5)*0.55);}
    for(let y=0;y<H;y++){const lat=Math.abs((y/H-0.5)*Math.PI);if(lat>1.32){const it=clamp((lat-1.32)/0.18,0,1);for(let x=0;x<W;x++)bp(x,y,245,238,255,it*0.9);}}
    for(let i=0;i<50;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=3+Math.random()*12;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.8?210:110,dist>cr*0.8?80:38,dist>cr*0.8?40:18,0.45);}}
  }
  else if (type==='jupiter') {
    const bands=[{y:0.00,col:[235,200,155]},{y:0.07,col:[185,148,105]},{y:0.15,col:[245,218,172]},{y:0.24,col:[175,130,90]},{y:0.33,col:[218,185,140]},{y:0.43,col:[170,122,82]},{y:0.52,col:[240,212,168]},{y:0.62,col:[175,130,92]},{y:0.70,col:[225,190,148]},{y:0.80,col:[180,138,98]},{y:0.88,col:[238,208,162]},{y:1.00,col:[210,172,128]}];
    for(let y=0;y<H;y++){const yf=y/H;let c1=bands[0].col,c2=bands[1].col,bt=0;for(let b=0;b<bands.length-1;b++)if(yf>=bands[b].y&&yf<bands[b+1].y){bt=(yf-bands[b].y)/(bands[b+1].y-bands[b].y);c1=bands[b].col;c2=bands[b+1].col;break;}const base=lerpColor(c1,c2,bt);for(let x=0;x<W;x++){const n1=fbm(x/W*14,y/H*5,5,2.1,0.5),n2=fbm(x/W*7+25,y/H*15,4,2,0.45),turb=(n1*0.65+n2*0.35-0.25)*60;sp(x,y,clamp(base[0]+turb,0,255),clamp(base[1]+turb*0.85,0,255),clamp(base[2]+turb*0.6,0,255));}}
    const gX=Math.floor(W*0.62),gY=Math.floor(H*0.56),gRX=36,gRY=19;for(let dy=-gRY-8;dy<=gRY+8;dy++)for(let dx=-gRX-8;dx<=gRX+8;dx++){const ex=(dx/gRX)**2+(dy/gRY)**2;if(ex<1.35){const t=clamp(1-ex*0.8,0,1),px=(gX+dx+W)%W,py=clamp(gY+dy,0,H-1);ex<1.0?bp(px,py,198,75,48,t*0.92):bp(px,py,215,110,70,(1.35-ex)/0.35*0.7);}}
  }
  else if (type==='saturn') {
    const bands=[{y:0.00,col:[235,215,168]},{y:0.10,col:[210,188,142]},{y:0.22,col:[248,228,182]},{y:0.34,col:[205,182,136]},{y:0.46,col:[240,220,175]},{y:0.58,col:[208,185,140]},{y:0.70,col:[238,218,172]},{y:0.82,col:[215,192,148]},{y:0.92,col:[230,208,165]},{y:1.00,col:[218,196,152]}];
    for(let y=0;y<H;y++){const yf=y/H;let c1=bands[0].col,c2=bands[1].col,bt=0;for(let b=0;b<bands.length-1;b++)if(yf>=bands[b].y&&yf<bands[b+1].y){bt=(yf-bands[b].y)/(bands[b+1].y-bands[b].y);c1=bands[b].col;c2=bands[b+1].col;break;}const base=lerpColor(c1,c2,bt);for(let x=0;x<W;x++){const n=fbm(x/W*10,y/H*4,4,2,0.48)*0.18;sp(x,y,clamp(base[0]+(n-0.09)*45,0,255),clamp(base[1]+(n-0.09)*38,0,255),clamp(base[2]+(n-0.09)*25,0,255));}}
  }
  else if (type==='uranus') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*5,y/H*2.5,4,2,0.45)*0.12,lat=(y/H-0.5),limb=Math.pow(Math.abs(lat)*1.8,2.5)*0.35;sp(x,y,clamp(Math.floor(75+n*30+limb*28),0,255),clamp(Math.floor(208+n*22-limb*38),0,255),clamp(Math.floor(218+n*18-limb*28),0,255));}
  }
  else if (type==='neptune') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n1=fbm(x/W*7,y/H*3.5,6,2,0.52),n2=fbm(x/W*7+9,y/H*3.5+4,5,2.1,0.48),n3=fbm(x/W*5+18,y/H*8,4,2,0.45);let r=clamp(Math.floor(28+n1*40),0,255),g=clamp(Math.floor(72+n1*55),0,255),b=clamp(Math.floor(175+n1*55),0,255);const storm=clamp((n2*0.6+n3*0.4-0.62)/0.1,0,1);if(storm>0){r=Math.floor(lerp(r,210,storm*0.9));g=Math.floor(lerp(g,225,storm*0.9));b=Math.floor(lerp(b,255,storm*0.9));}const dsDist=Math.sqrt((x/W-0.35)**2+((y/H-0.42)*1.5)**2);if(dsDist<0.07){const dt=(0.07-dsDist)/0.07;r=Math.floor(lerp(r,15,dt*0.7));g=Math.floor(lerp(g,35,dt*0.7));b=Math.floor(lerp(b,110,dt*0.7));}sp(x,y,r,g,b);}
  }
  // ── MOON TEXTURES ──────────────────────────────────
  else if (type==='moon') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*8,y/H*4,7,2.1,0.55);const v=Math.floor(lerp(105,188,n));sp(x,y,v,v,v-6);}
    const mares=[{x:0.28,y:0.38,r:0.14},{x:0.52,y:0.42,r:0.10},{x:0.38,y:0.52,r:0.08},{x:0.68,y:0.35,r:0.07},{x:0.18,y:0.54,r:0.09}];
    for(const mare of mares){const mx=Math.floor(mare.x*W),my=Math.floor(mare.y*H),mr=Math.floor(mare.r*Math.min(W,H*2));for(let dy=-mr;dy<=mr;dy++)for(let dx=-mr;dx<=mr;dx++){const dist=Math.sqrt(dx*dx+dy*dy)/mr;if(dist<1)bp((mx+dx+W)%W,clamp(my+dy,0,H-1),82,82,88,Math.pow(1-dist,0.6)*0.62);}}
    for(let i=0;i<75;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*18;for(let dy=-cr-1;dy<=cr+1;dy++)for(let dx=-cr-1;dx<=cr+1;dx++){const dist=Math.sqrt(dx*dx+dy*dy),px=(cx+dx+W)%W,py=clamp(cy+dy,0,H-1);if(dist<cr)bp(px,py,88,88,94,0.6);else if(dist<cr+1.5)bp(px,py,210,210,208,0.5);}}
  }
  else if (type==='moon_io') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n1=fbm(x/W*8,y/H*4,5,2,0.5),n2=fbm(x/W*8+10,y/H*4+5,4,2.1,0.48),n3=fbm(x/W*16+3,y/H*12,4,2,0.45);let r,g,b;if(n1<0.42){r=Math.floor(lerp(30,80,n1/0.42));g=Math.floor(lerp(18,45,n1/0.42));b=Math.floor(lerp(8,20,n1/0.42));}else if(n1<0.55){const t=(n1-0.42)/0.13;r=Math.floor(lerp(80,200,t));g=Math.floor(lerp(45,160,t));b=Math.floor(lerp(20,30,t));}else{r=Math.floor(lerp(200,255,n2));g=Math.floor(lerp(160,215,n2));b=Math.floor(lerp(30,55,n2));}const sulfur=clamp((n3-0.52)/0.08,0,1);if(sulfur>0){r=Math.floor(lerp(r,240,sulfur*0.8));g=Math.floor(lerp(g,230,sulfur*0.6));b=Math.floor(lerp(b,80,sulfur*0.5));}sp(x,y,r,g,b);}
    for(let i=0;i<18;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=3+Math.random()*12;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy)/cr;if(dist<1)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),25,15,8,Math.pow(1-dist,0.8)*0.85);}}
  }
  else if (type==='moon_europa') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*6,y/H*3,4,2,0.48)*0.06;sp(x,y,clamp(Math.floor(215+n*60),0,255),clamp(Math.floor(228+n*50),0,255),clamp(Math.floor(245+n*30),0,255));}
    for(let c=0;c<35;c++){let px=Math.random()*W,py=Math.random()*H;let angle=Math.random()*Math.PI*2;const steps=40+Math.floor(Math.random()*80),lineCol=Math.random()<0.5?[155,125,98]:[125,98,165];for(let s=0;s<steps;s++){angle+=(Math.random()-0.5)*0.4;px=(px+Math.cos(angle)*3+W)%W;py=clamp(py+Math.sin(angle)*3,0,H-1);const w=1+Math.random()*1.5;for(let dy=-w;dy<=w;dy++)for(let dx=-w;dx<=w;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<w)bp((Math.floor(px)+dx+W)%W,clamp(Math.floor(py)+dy,0,H-1),lineCol[0],lineCol[1],lineCol[2],(1-dist/w)*0.65);}}}
  }
  else if (type==='moon_ganymede') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*7,y/H*3.5,6,2,0.52);const v=Math.floor(lerp(68,145,n));sp(x,y,clamp(v+8,0,255),clamp(v+5,0,255),clamp(v,0,255));}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const reg=fbm(x/W*4+5,y/H*2+3,4,2,0.5);if(reg>0.55)bp(x,y,175,168,155,clamp((reg-0.55)/0.12,0,1)*0.7);}
    for(let i=0;i<60;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*10;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.8?195:75,dist>cr*0.8?188:72,dist>cr*0.8?178:68,0.5);}}
  }
  else if (type==='moon_callisto') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*8,y/H*4,6,2,0.52);const v=Math.floor(lerp(38,88,n));sp(x,y,v+4,v+2,v);}
    for(let i=0;i<90;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*14;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.82?195:42,dist>cr*0.82?188:40,dist>cr*0.82?175:38,0.65);}}
  }
  else if (type==='moon_titan') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*6,y/H*3,5,2,0.5),lat=(y/H-0.5)*2,limb=Math.pow(Math.abs(lat),2.2)*0.3;sp(x,y,clamp(Math.floor(210+n*25-limb*55),0,255),clamp(Math.floor(135+n*20-limb*45),0,255),clamp(Math.floor(55+n*15-limb*25),0,255));}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const haze=fbm(x/W*9+20,y/H*4.5+8,4,2,0.45);bp(x,y,225,148,62,clamp((haze-0.44)/0.16,0,1)*0.35);}
  }
  else if (type==='moon_enceladus') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*6,y/H*3,4,2,0.45)*0.05;sp(x,y,clamp(Math.floor(238+n*30),0,255),clamp(Math.floor(242+n*25),0,255),clamp(Math.floor(255+n*10),0,255));}
    for(let c=0;c<8;c++){const cy=Math.floor(H*(0.35+c*0.04));for(let x=0;x<W;x++){const wave=Math.sin(x/W*Math.PI*4+c*0.8)*6;for(let dy=-2;dy<=2;dy++)bp(x,clamp(cy+Math.floor(wave)+dy,0,H-1),168,195,225,0.5*(1-Math.abs(dy)/2.5));}}
  }
  else if (type==='moon_triton') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*7,y/H*3.5,5,2,0.48);sp(x,y,clamp(Math.floor(195+n*45),0,255),clamp(Math.floor(168+n*38),0,255),clamp(Math.floor(165+n*35),0,255));}
    for(let i=0;i<50;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=4+Math.random()*12;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy)/cr;if(dist<1&&dist>0.7)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),148,122,120,0.45);}}
    for(let y=Math.floor(H*0.78);y<H;y++){const it=clamp((y/H-0.78)/0.22,0,1);for(let x=0;x<W;x++)bp(x,y,238,230,225,it*0.9);}
  }
  else if (type==='moon_phobos') {
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*9,y/H*4.5,6,2.1,0.55);const v=Math.floor(lerp(60,115,n));sp(x,y,v+5,v+2,v);}
    for(let i=0;i<55;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*10;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.8?155:42,dist>cr*0.8?148:40,dist>cr*0.8?140:38,0.7);}}
  }
  else if (type==='moon_grey') {
    const ox=Math.random()*20, oy=Math.random()*10;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*8+ox,y/H*4+oy,5,2,0.5);const v=Math.floor(lerp(75,165,n));sp(x,y,v,v-2,v-5);}
    for(let i=0;i<40;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=1+Math.random()*8;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.78?185:58,dist>cr*0.78?180:56,dist>cr*0.78?175:52,0.6);}}
  }
  else if (type==='moon_icy') {
    const ox=Math.random()*15, oy=Math.random()*8;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W*6+ox,y/H*3+oy,4,2,0.45)*0.07;sp(x,y,clamp(Math.floor(195+n*50),0,255),clamp(Math.floor(208+n*42),0,255),clamp(Math.floor(228+n*28),0,255));}
    for(let i=0;i<25;i++){const cx=Math.floor(Math.random()*W),cy=Math.floor(Math.random()*H),cr=2+Math.random()*9;for(let dy=-cr;dy<=cr;dy++)for(let dx=-cr;dx<=cr;dx++){const dist=Math.sqrt(dx*dx+dy*dy);if(dist<cr)bp((cx+dx+W)%W,clamp(cy+dy,0,H-1),dist>cr*0.78?240:155,dist>cr*0.78?245:165,dist>cr*0.78?255:188,0.55);}}
  }

  ctx.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping;
  return tex;
}

function ringTexture() {
  const W=1024,H=4,canvas=makeCanvas(W,H),ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H),d=img.data;
  for(let x=0;x<W;x++){const t=x/W;let r=0,g=0,b=0,a=0;if(t<0.08){a=Math.floor(t/0.08*18);r=195;g=180;b=152;}else if(t<0.19){a=Math.floor(lerp(18,65,(t-0.08)/0.11));r=208;g=192;b=162;}else if(t<0.22){a=Math.floor(lerp(65,12,(t-0.19)/0.03));r=185;g=170;b=145;}else if(t<0.25){a=8;r=160;g=148;b=125;}else if(t<0.28){a=Math.floor(lerp(8,55,(t-0.25)/0.03));r=225;g=208;b=172;}else if(t<0.55){const bt=(t-0.28)/0.27,wave=Math.sin(bt*80)*0.15;a=clamp(Math.floor(175+wave*60+smoothNoise(t*60,0.5)*30),80,240);r=clamp(Math.floor(235+wave*25),0,255);g=clamp(Math.floor(215+wave*20),0,255);b=clamp(Math.floor(172+wave*15),0,255);}else if(t<0.59){const ct=(t-0.55)/0.04;a=Math.floor(lerp(175,12,ct));r=185;g=168;b=138;}else if(t<0.83){const at=(t-0.59)/0.24,wave=Math.sin(at*55)*0.12;a=clamp(Math.floor(lerp(165,95,at)+wave*35),40,200);r=225;g=205;b=165;}else if(t<0.87){a=Math.floor(lerp(95,18,(t-0.83)/0.04));r=200;g=182;b=148;}else{a=Math.floor(lerp(18,0,(t-0.87)/0.13));r=210;g=192;b=155;}for(let y=0;y<H;y++){const i=(y*W+x)*4;d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=a;}}
  ctx.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=THREE.ClampToEdgeWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;return tex;
}

// ═══════════════════════════════════════════════════════
//  SECTION 3: SCENE BOOTSTRAP
// ═══════════════════════════════════════════════════════

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.01, 8000);
camera.position.set(0, 80, 175);

const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance', logarithmicDepthBuffer:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.outputColorSpace  = THREE.SRGBColorSpace;

// ── Lighting ──────────────────────────────────────────
// Strong ambient keeps dark-sides visible
scene.add(new THREE.AmbientLight(0x334466, 7.0));
// Hemisphere fills shadows with a warm/cool gradient
scene.add(new THREE.HemisphereLight(0x4466bb, 0x223322, 2.5));
// Primary sun point light
const sunLight = new THREE.PointLight(0xfff5e0, 9.0, 0, 1.05);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near=0.5; sunLight.shadow.camera.far=800; sunLight.shadow.bias=-0.001;
scene.add(sunLight);
// Warm fill — scattered solar wind glow
scene.add(new THREE.PointLight(0xff9933, 2.2, 0, 1.5));

// ── Starfield ─────────────────────────────────────────
(function(){
  const COUNT=20000,pos=new Float32Array(COUNT*3),col=new Float32Array(COUNT*3);
  for(let i=0;i<COUNT;i++){const inB=Math.random()<0.4;let x,y,z;if(inB){const t=Math.random()*Math.PI*2,r=900+Math.random()*300;x=r*Math.cos(t);y=r*Math.tan((Math.random()-0.5)*0.45);z=r*Math.sin(t);}else{const t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1),r=850+Math.random()*350;x=r*Math.sin(p)*Math.cos(t);y=r*Math.sin(p)*Math.sin(t);z=r*Math.cos(p);}pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;const rnd=Math.random();if(rnd<0.04){col[i*3]=0.72;col[i*3+1]=0.78;col[i*3+2]=1.0;}else if(rnd<0.09){col[i*3]=0.95;col[i*3+1]=0.95;col[i*3+2]=1.0;}else if(rnd<0.14){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.82;}else if(rnd<0.20){col[i*3]=1.0;col[i*3+1]=0.88;col[i*3+2]=0.68;}else if(rnd<0.27){col[i*3]=1.0;col[i*3+1]=0.68;col[i*3+2]=0.35;}else if(rnd<0.31){col[i*3]=1.0;col[i*3+1]=0.35;col[i*3+2]=0.22;}else{const v=0.7+Math.random()*0.3;col[i*3]=v;col[i*3+1]=v;col[i*3+2]=v*1.04;}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:0.65,vertexColors:true,transparent:true,opacity:0.88,sizeAttenuation:true,depthWrite:false})));
})();

// ── Sun ───────────────────────────────────────────────
const SUN_R=5.2;
const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(SUN_R,64,64),new THREE.MeshBasicMaterial({map:pixelTexture('sun')}));
sunMesh.name='SUN'; scene.add(sunMesh);
[{s:1.06,o:0.22,c:0xffee88},{s:1.15,o:0.10,c:0xffaa44},{s:1.30,o:0.055,c:0xff8833},{s:1.55,o:0.025,c:0xff6622},{s:2.10,o:0.010,c:0xff4411}]
  .forEach(({s,o,c})=>sunMesh.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_R*s,32,32),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}))));

// ── Orbit path builders ───────────────────────────────
function buildOrbitPath(sma,ecc,color=0x1a3560,opacity=0.35,segs=320){
  const pts=[],b=sma*Math.sqrt(1-ecc*ecc),c=sma*ecc;
  for(let i=0;i<=segs;i++){const theta=(i/segs)*Math.PI*2;pts.push(new THREE.Vector3(sma*Math.cos(theta)-c,0,b*Math.sin(theta)));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
}
function buildCirclePath(r,color=0x223355,opacity=0.22){
  const pts=[];for(let i=0;i<=128;i++){const t=(i/128)*Math.PI*2;pts.push(new THREE.Vector3(r*Math.cos(t),0,r*Math.sin(t)));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
}

// ═══════════════════════════════════════════════════════
//  SECTION 4: PLANET DEFINITIONS
// ═══════════════════════════════════════════════════════

const PLANET_DEFS=[
  // Radii boosted for visual clarity. Inner planets 2.2×, gas giants 1.5×, ice giants 1.6×
  // Orbits slightly compressed so outer planets remain comfortably in view
  {name:'Mercury',texture:'mercury',radius:0.85, sma:9,  ecc:0.206,period:0.241, rotSpeed:0.003, tilt:0.03, navColor:'#aaaaaa',stats:{type:'Terrestrial Planet',distance:'57.9M km from Sun',diameter:'4,879 km',period:'88 Earth days',moons:'0'}},
  {name:'Venus',  texture:'venus',  radius:2.0,  sma:14.5,ecc:0.007,period:0.615, rotSpeed:-0.001,tilt:177.4,navColor:'#e8b84b',atmosphere:{color:0xffcc66,opacity:0.18},stats:{type:'Terrestrial Planet',distance:'108.2M km from Sun',diameter:'12,104 km',period:'224.7 Earth days',moons:'0'}},
  {name:'Earth',  texture:'earth',  radius:2.1,  sma:20, ecc:0.017,period:1.0,   rotSpeed:0.01,  tilt:23.5, navColor:'#3a8fff',atmosphere:{color:0x4499ff,opacity:0.20},stats:{type:'Terrestrial Planet',distance:'149.6M km from Sun',diameter:'12,742 km',period:'365.25 Earth days',moons:'1'}},
  {name:'Mars',   texture:'mars',   radius:1.15, sma:28, ecc:0.093,period:1.88,  rotSpeed:0.009, tilt:25.2, navColor:'#c1440e',stats:{type:'Terrestrial Planet',distance:'227.9M km from Sun',diameter:'6,779 km',period:'687 Earth days',moons:'2'}},
  {name:'Jupiter',texture:'jupiter',radius:5.2,  sma:44, ecc:0.049,period:11.86, rotSpeed:0.04,  tilt:3.1,  navColor:'#d4a473',stats:{type:'Gas Giant',distance:'778.5M km from Sun',diameter:'139,820 km',period:'11.86 Earth years',moons:'95'}},
  {name:'Saturn', texture:'saturn', radius:4.4,  sma:62, ecc:0.057,period:29.46, rotSpeed:0.038, tilt:26.7, navColor:'#e4c98a',hasRings:true,stats:{type:'Gas Giant',distance:'1.43B km from Sun',diameter:'116,460 km',period:'29.46 Earth years',moons:'146'}},
  {name:'Uranus', texture:'uranus', radius:3.2,  sma:80, ecc:0.046,period:84.01, rotSpeed:-0.025,tilt:97.8, navColor:'#7de8e8',atmosphere:{color:0x55dddd,opacity:0.14},stats:{type:'Ice Giant',distance:'2.87B km from Sun',diameter:'50,724 km',period:'84 Earth years',moons:'28'}},
  {name:'Neptune',texture:'neptune',radius:3.0,  sma:97, ecc:0.009,period:164.8, rotSpeed:0.028, tilt:28.3, navColor:'#3f54ba',atmosphere:{color:0x3355cc,opacity:0.16},stats:{type:'Ice Giant',distance:'4.50B km from Sun',diameter:'49,244 km',period:'164.8 Earth years',moons:'16'}},
];

// ═══════════════════════════════════════════════════════
//  SECTION 5: MOON SYSTEM DEFINITIONS
// ═══════════════════════════════════════════════════════

const MOON_DEFS={
  Earth:{
    named:[
      {name:'Moon',      radius:0.55,dist:4.8, period:0.0748, incl:5.1,  tex:'moon',           color:0xddddcc},
    ],
    small:[]
  },
  Mars:{
    named:[
      {name:'Phobos',    radius:0.18,dist:2.8, period:0.00876,incl:1.1,  tex:'moon_phobos',    color:0x887766},
      {name:'Deimos',    radius:0.14,dist:4.2, period:0.0163, incl:1.8,  tex:'moon_phobos',    color:0x998877},
    ],
    small:[]
  },
  Jupiter:{
    named:[
      {name:'Io',        radius:0.55,dist:9.0, period:0.00484,incl:0.04, tex:'moon_io',        color:0xffcc33},
      {name:'Europa',    radius:0.46,dist:12.0,period:0.00972,incl:0.47, tex:'moon_europa',    color:0xddeeff},
      {name:'Ganymede',  radius:0.72,dist:16.0,period:0.0196, incl:0.18, tex:'moon_ganymede',  color:0x99887a},
      {name:'Callisto',  radius:0.65,dist:21.5,period:0.0457, incl:0.19, tex:'moon_callisto',  color:0x665544},
      {name:'Amalthea',  radius:0.14,dist:6.8, period:0.00204,incl:0.4,  tex:'moon_grey',      color:0x884422},
      {name:'Thebe',     radius:0.12,dist:7.8, period:0.00257,incl:1.1,  tex:'moon_grey',      color:0x775533},
    ],
    small:{count:89, distRange:[24,70], periodRange:[0.06,3.0]}
  },
  Saturn:{
    named:[
      {name:'Mimas',     radius:0.18,dist:7.5, period:0.00626,incl:1.6,  tex:'moon_icy',       color:0xe0ddd5},
      {name:'Enceladus', radius:0.22,dist:9.0, period:0.00877,incl:0.01, tex:'moon_enceladus', color:0xf5f5ff},
      {name:'Tethys',    radius:0.32,dist:10.8,period:0.0129, incl:1.1,  tex:'moon_icy',       color:0xd8d5cc},
      {name:'Dione',     radius:0.36,dist:12.8,period:0.0183, incl:0.02, tex:'moon_icy',       color:0xccc8be},
      {name:'Rhea',      radius:0.44,dist:15.5,period:0.0292, incl:0.35, tex:'moon_grey',      color:0xc5c2b8},
      {name:'Titan',     radius:0.72,dist:22.0,period:0.0694, incl:0.35, tex:'moon_titan',     color:0xff9944},
      {name:'Hyperion',  radius:0.20,dist:27.5,period:0.115,  incl:0.6,  tex:'moon_grey',      color:0xaa9988},
      {name:'Iapetus',   radius:0.44,dist:36.0,period:0.267,  incl:15.5, tex:'moon_grey',      color:0x887755},
      {name:'Phoebe',    radius:0.20,dist:50.0,period:1.51,   incl:174,  tex:'moon_grey',      color:0x665544},
    ],
    small:{count:137, distRange:[38,120], periodRange:[0.3,8.0]}
  },
  Uranus:{
    named:[
      {name:'Miranda',   radius:0.16,dist:5.5, period:0.00946,incl:4.2,  tex:'moon_icy',       color:0xccbbaa},
      {name:'Ariel',     radius:0.28,dist:7.5, period:0.0168, incl:0.26, tex:'moon_icy',       color:0xd5c8b8},
      {name:'Umbriel',   radius:0.28,dist:9.5, period:0.0248, incl:0.13, tex:'moon_grey',      color:0x887766},
      {name:'Titania',   radius:0.38,dist:13.0,period:0.0472, incl:0.08, tex:'moon_grey',      color:0xb8a898},
      {name:'Oberon',    radius:0.38,dist:17.0,period:0.0766, incl:0.07, tex:'moon_grey',      color:0x998877},
    ],
    small:{count:23, distRange:[19,48], periodRange:[0.09,1.2]}
  },
  Neptune:{
    named:[
      {name:'Naiad',     radius:0.10,dist:4.5, period:0.00208,incl:4.7,  tex:'moon_grey',      color:0x778899},
      {name:'Thalassa',  radius:0.10,dist:5.0, period:0.00241,incl:0.2,  tex:'moon_grey',      color:0x667788},
      {name:'Despina',   radius:0.12,dist:5.7, period:0.00289,incl:0.1,  tex:'moon_grey',      color:0x778899},
      {name:'Galatea',   radius:0.14,dist:6.6, period:0.00344,incl:0.1,  tex:'moon_grey',      color:0x667788},
      {name:'Larissa',   radius:0.16,dist:7.5, period:0.00441,incl:0.2,  tex:'moon_grey',      color:0x778899},
      {name:'Proteus',   radius:0.20,dist:9.0, period:0.00456,incl:0.5,  tex:'moon_grey',      color:0x666655},
      {name:'Triton',    radius:0.52,dist:12.5,period:0.0164, incl:157,  tex:'moon_triton',    color:0xffeecc},
      {name:'Nereid',    radius:0.16,dist:26.0,period:1.1,    incl:7.2,  tex:'moon_grey',      color:0xaaaaaa},
    ],
    small:{count:8, distRange:[28,80], periodRange:[1.2,10.0]}
  }
};

// ═══════════════════════════════════════════════════════
//  SECTION 6: BUILD PLANETS
// ═══════════════════════════════════════════════════════

const texCache={};
const getTex=(n)=>{ if(!texCache[n])texCache[n]=pixelTexture(n); return texCache[n]; };

// Pre-cache all textures before first render
['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune',
 'moon','moon_io','moon_europa','moon_ganymede','moon_callisto','moon_titan',
 'moon_enceladus','moon_triton','moon_phobos','moon_grey','moon_icy'].forEach(getTex);

const planets=[], orbitLines=[], planetMeshes=[];
let earthPlanet=null;

PLANET_DEFS.forEach((def,idx)=>{
  // Emissive tint per planet so they glow faintly even on dark sides
  const emissiveMap={Mercury:0x221108,Venus:0x332211,Earth:0x081828,Mars:0x2a0800,Jupiter:0x1a0e06,Saturn:0x1a1408,Uranus:0x041818,Neptune:0x030a22};
  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(def.radius,64,32),
    new THREE.MeshStandardMaterial({
      map:getTex(def.texture),
      roughness:def.name==='Mercury'?0.80:def.name==='Earth'?0.50:0.62,
      metalness:0.02,
      emissive:new THREE.Color(emissiveMap[def.name]||0x000000),
      emissiveIntensity:1.0,
    })
  );
  mesh.castShadow=mesh.receiveShadow=true;
  mesh.rotation.z=THREE.MathUtils.degToRad(def.tilt);
  mesh.userData.planet=def; mesh.userData.idx=idx;

  if(def.atmosphere) mesh.add(new THREE.Mesh(new THREE.SphereGeometry(def.radius*1.032,32,32),new THREE.MeshBasicMaterial({color:def.atmosphere.color,transparent:true,opacity:def.atmosphere.opacity,side:THREE.FrontSide,depthWrite:false,blending:THREE.AdditiveBlending})));

  // Rim glow — additive sphere slightly larger than planet, back-facing
  const rimColors={Mercury:0x554433,Venus:0xffcc44,Earth:0x2266ff,Mars:0xff4411,Jupiter:0xddaa66,Saturn:0xeedd88,Uranus:0x44ddcc,Neptune:0x2244ff};
  const rimMesh=new THREE.Mesh(
    new THREE.SphereGeometry(def.radius*1.08,32,32),
    new THREE.MeshBasicMaterial({color:rimColors[def.name]||0x446688,transparent:true,opacity:0.22,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false})
  );
  mesh.add(rimMesh);

  if(def.hasRings){
    const rIn=def.radius*1.25,rOut=def.radius*2.55;
    const rGeo=new THREE.RingGeometry(rIn,rOut,180,6);
    const uvA=rGeo.attributes.uv,posA=rGeo.attributes.position;
    for(let i=0;i<posA.count;i++){const v=new THREE.Vector3().fromBufferAttribute(posA,i);uvA.setXY(i,(v.length()-rIn)/(rOut-rIn),0.5);}
    uvA.needsUpdate=true;
    const rings=new THREE.Mesh(rGeo,new THREE.MeshBasicMaterial({map:ringTexture(),side:THREE.DoubleSide,transparent:true,depthWrite:false}));
    rings.rotation.x=Math.PI/2; mesh.add(rings);
  }

  const orbit=buildOrbitPath(def.sma,def.ecc);
  scene.add(orbit); orbitLines.push(orbit);

  const pivot=new THREE.Group(); pivot.add(mesh); scene.add(pivot);
  const planet={def,mesh,pivot,c:def.sma*def.ecc,angle:(idx/PLANET_DEFS.length)*Math.PI*2+Math.random()*0.5,orbitLine:orbit};
  planets.push(planet); planetMeshes.push(mesh);
  if(def.name==='Earth') earthPlanet=planet;
});

// ═══════════════════════════════════════════════════════
//  SECTION 7: BUILD MOON SYSTEMS
// ═══════════════════════════════════════════════════════

const moonSystems={};        // keyed by planet name
const moonOrbitLines=[];
const allMoonMeshes=[];      // for raycasting
const BASE_MOON_SPEED=0.0022;

// Shared low-poly sphere geometry pool
const moonGeoPool={};
const getMoonGeo=(r,segs=12)=>{
  const k=r.toFixed(3)+':'+segs;
  if(!moonGeoPool[k]) moonGeoPool[k]=new THREE.SphereGeometry(r,segs,segs);
  return moonGeoPool[k];
};

planets.forEach(planet=>{
  const pName=planet.def.name;
  const def=MOON_DEFS[pName];
  if(!def) return;

  const sys={named:[],small:[]};

  // ── Named / major moons ─────────────────────────────
  def.named.forEach(mDef=>{
    const retrograde=mDef.incl>90;
    const inclRad=THREE.MathUtils.degToRad(retrograde?180-mDef.incl:mDef.incl);

    const mesh=new THREE.Mesh(
      getMoonGeo(mDef.radius,18),
      new THREE.MeshStandardMaterial({map:getTex(mDef.tex),roughness:0.85,metalness:0,emissive:new THREE.Color(0x080808),emissiveIntensity:1.0})
    );
    mesh.castShadow=mesh.receiveShadow=true;
    mesh.name=mDef.name;
    mesh.userData.moonName=mDef.name;
    mesh.userData.parentPlanet=pName;
    scene.add(mesh);
    allMoonMeshes.push(mesh);

    // Orbit ring
    const orb=buildCirclePath(mDef.dist,0x1a3055,0.18);
    scene.add(orb);
    moonOrbitLines.push(orb);

    sys.named.push({
      def:mDef, mesh, orbitPath:orb,
      angle:Math.random()*Math.PI*2,
      speed:BASE_MOON_SPEED/mDef.period,
      dist:mDef.dist, inclRad, retrograde
    });
  });

  // ── Small / irregular moons ─────────────────────────
  if(def.small && def.small.count>0){
    const{count,distRange,periodRange}=def.small;
    for(let i=0;i<count;i++){
      const dist   =distRange[0]+Math.random()*(distRange[1]-distRange[0]);
      const period =periodRange[0]+Math.random()*(periodRange[1]-periodRange[0]);
      const r      =0.03+Math.random()*0.05;
      const incl   =(Math.random()-0.5)*160;
      const retrograde=Math.abs(incl)>90;
      const inclRad=THREE.MathUtils.degToRad(Math.abs(incl)>90?180-Math.abs(incl):Math.abs(incl));
      const gv     =0.35+Math.random()*0.30;
      const mesh   =new THREE.Mesh(
        getMoonGeo(r,8),
        new THREE.MeshStandardMaterial({color:new THREE.Color(gv,gv*0.97,gv*0.93),roughness:0.92,metalness:0})
      );
      scene.add(mesh);
      sys.small.push({mesh,angle:Math.random()*Math.PI*2,speed:BASE_MOON_SPEED/period,dist,inclRad,retrograde,phaseOff:Math.random()*Math.PI*2});
    }
  }

  moonSystems[pName]=sys;
});

// ═══════════════════════════════════════════════════════
//  SECTION 8: PLANET NAV UI
// ═══════════════════════════════════════════════════════

const navList=document.getElementById('nav-list');
PLANET_DEFS.forEach((def,i)=>{
  const btn=document.createElement('button');
  btn.className='nav-planet-btn';
  btn.innerHTML=`<span class="nav-planet-dot" style="background:${def.navColor};box-shadow:0 0 5px ${def.navColor};"></span><span>${def.name.toUpperCase()}</span>`;
  btn.addEventListener('click',()=>focusPlanet(planets[i]));
  navList.appendChild(btn);
});

// ═══════════════════════════════════════════════════════
//  SECTION 9: CONTROLS & STATE
// ═══════════════════════════════════════════════════════

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.055;
controls.minDistance=0.5; controls.maxDistance=700;
controls.zoomSpeed=0.9; controls.rotateSpeed=0.6; controls.panSpeed=0.8;

let isPaused=false, timeScale=1.0, showOrbits=true, showLabels=true;
let selectedPlanet=null, isFocused=false;
const clock=new THREE.Clock();
const BASE_SPEED=0.0022;

// ── Raycaster ─────────────────────────────────────────
const raycaster=new THREE.Raycaster();
const mouse2d=new THREE.Vector2();
const tooltip=document.getElementById('tooltip');
let hoveredMesh=null;

window.addEventListener('mousemove',e=>{
  mouse2d.x=(e.clientX/window.innerWidth)*2-1;
  mouse2d.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse2d,camera);
  const hits=raycaster.intersectObjects([...planetMeshes,sunMesh,...allMoonMeshes],true);
  if(hits.length>0&&showLabels){
    const obj=hits[0].object;
    const isSun=(obj===sunMesh||obj.parent===sunMesh);
    const label=isSun?'THE SUN':obj.userData.moonName?`${obj.userData.moonName} · ${obj.userData.parentPlanet}`:obj.userData.planet?.name.toUpperCase();
    if(label){tooltip.textContent=label;tooltip.classList.add('visible');tooltip.style.left=(e.clientX+18)+'px';tooltip.style.top=(e.clientY-14)+'px';document.body.style.cursor='pointer';hoveredMesh=obj;return;}
  }
  tooltip.classList.remove('visible'); document.body.style.cursor='default'; hoveredMesh=null;
});

window.addEventListener('click',()=>{
  if(!hoveredMesh) return;
  raycaster.setFromCamera(mouse2d,camera);
  const hits=raycaster.intersectObjects(planetMeshes,true);
  if(hits.length>0){const obj=hits[0].object;if(obj.userData.planet!==undefined&&obj.userData.idx!==undefined)focusPlanet(planets[obj.userData.idx]);}
});

function focusPlanet(planet){
  selectedPlanet=planet; isFocused=true;
  const def=planet.def;
  document.getElementById('panel-type').textContent=def.stats.type.toUpperCase();
  document.getElementById('panel-name').textContent=def.name;
  document.getElementById('panel-stats').innerHTML=Object.entries(def.stats).filter(([k])=>k!=='type').map(([k,v])=>`<div class="stat-item"><div class="stat-label">${k.toUpperCase()}</div><div class="stat-value">${v}</div></div>`).join('');
  document.getElementById('panel').classList.remove('hidden');
  const pos=planet.mesh.getWorldPosition(new THREE.Vector3());
  const dist=Math.max(def.radius*6,8);
  tweenCamera(pos.clone().add(new THREE.Vector3(dist*0.8,dist*0.45,dist*0.8)),pos);
}

function tweenCamera(destPos,destTarget){
  const sP=camera.position.clone(),sT=controls.target.clone();let t=0;
  (function step(){t=Math.min(t+0.018,1);const e=1-Math.pow(1-t,3.5);camera.position.lerpVectors(sP,destPos,e);controls.target.lerpVectors(sT,destTarget,e);controls.update();if(t<1)requestAnimationFrame(step);})();
}

document.getElementById('panel-close').addEventListener('click',()=>{document.getElementById('panel').classList.add('hidden');selectedPlanet=null;isFocused=false;});
document.getElementById('btn-pause').addEventListener('click',()=>{isPaused=!isPaused;document.getElementById('pause-icon').textContent=isPaused?'▶':'⏸';document.getElementById('pause-text').textContent=isPaused?'PLAY':'PAUSE';if(!isPaused)clock.getDelta();});
document.getElementById('speed-slider').addEventListener('input',e=>{timeScale=parseFloat(e.target.value);document.getElementById('speed-display').textContent=timeScale.toFixed(1)+'×';});
document.getElementById('orbit-toggle').addEventListener('change',e=>{showOrbits=e.target.checked;orbitLines.forEach(l=>l.visible=showOrbits);moonOrbitLines.forEach(l=>l.visible=showOrbits);});
document.getElementById('labels-toggle').addEventListener('change',e=>{showLabels=e.target.checked;if(!showLabels)tooltip.classList.remove('visible');});

// ── Loading screen ────────────────────────────────────
const ldFill=document.getElementById('ld-fill'),ldPct=document.getElementById('ld-pct'),loadingEl=document.getElementById('loading');
let prog=0;
const ldTimer=setInterval(()=>{prog+=(100-prog)*0.15+Math.random()*3;if(prog>=100){prog=100;clearInterval(ldTimer);setTimeout(()=>{loadingEl.classList.add('fade-out');setTimeout(()=>loadingEl.style.display='none',1000);},400);}ldFill.style.width=prog+'%';ldPct.textContent=Math.floor(prog)+'%';},60);

// ═══════════════════════════════════════════════════════
//  SECTION 10: ANIMATION
// ═══════════════════════════════════════════════════════

const _wp=new THREE.Vector3();

function updateMoons(dt){
  planets.forEach(planet=>{
    const sys=moonSystems[planet.def.name];
    if(!sys) return;
    planet.mesh.getWorldPosition(_wp);
    const px=_wp.x, py=_wp.y, pz=_wp.z;

    // Named moons
    sys.named.forEach(m=>{
      if(dt>0) m.angle += m.speed*(m.retrograde?-1:1)*dt*60;
      const ca=Math.cos(m.angle), sa=Math.sin(m.angle);
      const ci=Math.cos(m.inclRad), si=Math.sin(m.inclRad);
      m.mesh.position.set(px+m.dist*ca, py+m.dist*sa*si, pz+m.dist*sa*ci);
      if(dt>0) m.mesh.rotation.y+=0.008*dt*60;
      // Orbit ring follows planet
      m.orbitPath.position.set(px,py,pz);
      m.orbitPath.rotation.x=m.inclRad;
    });

    // Small irregular moons
    sys.small.forEach(m=>{
      if(dt>0) m.angle+=m.speed*(m.retrograde?-1:1)*dt*60;
      const ang=m.angle+m.phaseOff;
      const ca=Math.cos(ang), sa=Math.sin(ang);
      const ci=Math.cos(m.inclRad), si=Math.sin(m.inclRad);
      m.mesh.position.set(px+m.dist*ca, py+m.dist*sa*si, pz+m.dist*sa*ci);
    });
  });
}

function animate(){
  requestAnimationFrame(animate);
  const rawDt=clock.getDelta();
  const dt=isPaused?0:Math.min(rawDt,0.05)*timeScale;
  const time=clock.getElapsedTime();

  sunMesh.rotation.y+=0.0008*(isPaused?0:timeScale);
  sunMesh.scale.setScalar(1+Math.sin(time*1.1)*0.012+Math.sin(time*2.7)*0.006);

  planets.forEach(planet=>{
    if(dt>0) planet.angle+=(BASE_SPEED/planet.def.period)*dt*60;
    const r=planet.def.sma*(1-planet.def.ecc*planet.def.ecc)/(1+planet.def.ecc*Math.cos(planet.angle));
    planet.mesh.position.x=r*Math.cos(planet.angle);
    planet.mesh.position.z=r*Math.sin(planet.angle);
    if(dt>0) planet.mesh.rotation.y+=planet.def.rotSpeed*dt*60;
  });

  updateMoons(dt);

  if(isFocused&&selectedPlanet){selectedPlanet.mesh.getWorldPosition(_wp);controls.target.lerp(_wp,0.04);}
  controls.update();
  renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));});

animate();
