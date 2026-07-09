// ─────────────────────────────────────────────
// Color mode types & palette utilities
// ─────────────────────────────────────────────
export type ColorMode = 'color' | 'grayscale' | 'navy' | 'orange';

// Convert an RGB color to the target palette.
// navy mode: preserve luminance but shift hue toward navy (#1a2a4a) for dark and light gray for bright.
// orange mode: same but accent color is orange (#e07020).
export function applyPalette(r: number, g: number, b: number, mode: ColorMode): [number, number, number] {
  if (mode === 'color') return [r, g, b];
  // Luminance (perceived brightness, 0-255)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (mode === 'grayscale') {
    const v = Math.round(lum);
    return [v, v, v];
  }
  if (mode === 'navy') {
    // Dark tones → navy, bright tones → near-white
    const t = lum / 255;
    const nr = Math.round(26 * (1 - t) + 210 * t);
    const ng = Math.round(42 * (1 - t) + 220 * t);
    const nb = Math.round(74 * (1 - t) + 235 * t);
    return [nr, ng, nb];
  }
  // orange mode
  const t = lum / 255;
  const nr = Math.round(20 * (1 - t) + 224 * t);
  const ng = Math.round(15 * (1 - t) + 180 * t);
  const nb = Math.round(10 * (1 - t) + 120 * t);
  return [nr, ng, nb];
}

// 1. 波・共鳴: Chladni Figures
export class ChladniPlate {
  width: number; height: number;
  particles: { x: number; y: number }[];
  constructor(width: number, height: number, numParticles: number) {
    this.width = width; this.height = height;
    this.particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * width, y: Math.random() * height,
    }));
  }
  getVibration(x: number, y: number, n: number, m: number): number {
    const nx = (x / this.width) * Math.PI, ny = (y / this.height) * Math.PI;
    return Math.sin(n * nx) * Math.sin(m * ny) - Math.sin(m * nx) * Math.sin(n * ny);
  }
  update(params: { n: number; m: number; intensity: number }) {
    const { n, m, intensity } = params;
    for (const p of this.particles) {
      const eps = 1.0;
      const v0 = Math.abs(this.getVibration(p.x, p.y, n, m));
      const vx = Math.abs(this.getVibration(p.x + eps, p.y, n, m));
      const vy = Math.abs(this.getVibration(p.x, p.y + eps, n, m));
      p.x -= (vx - v0) / eps * intensity * 0.05;
      p.y -= (vy - v0) / eps * intensity * 0.05;
      p.x += (Math.random() - 0.5) * v0 * 1.0;
      p.y += (Math.random() - 0.5) * v0 * 1.0;
      if (p.x < 0) p.x = 0; if (p.x > this.width) p.x = this.width;
      if (p.y < 0) p.y = 0; if (p.y > this.height) p.y = this.height;
    }
  }
  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const [br, bg, bb] = applyPalette(15, 23, 42, mode);
    const [pr, pg, pb] = applyPalette(226, 232, 240, mode);
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
    for (const p of this.particles) ctx.fillRect(p.x, p.y, 1.5, 1.5);
  }
}

// 2. 流体力学的不安定性: Rayleigh-Bénard Convection
export class ConvectionCell {
  width: number; height: number;
  temp: Float32Array; nextTemp: Float32Array;
  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.temp = new Float32Array(width * height).fill(0);
    this.nextTemp = new Float32Array(width * height).fill(0);
  }
  update(params: { rayleigh: number; cooling: number }) {
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const i = y * this.width + x;
        let t = (this.temp[i-1]+this.temp[i+1]+this.temp[i-this.width]+this.temp[i+this.width]) * 0.25;
        if (y > this.height - 5) t += params.rayleigh;
        if (y < 5) t -= params.cooling;
        if (this.temp[i+this.width] > t) t += 0.1 * params.rayleigh;
        if (this.temp[i-this.width] < t) t -= 0.1 * params.cooling;
        this.nextTemp[i] = t;
      }
    }
    for (let i = 0; i < this.temp.length; i++)
      if (Math.random() < 0.01) this.nextTemp[i] += (Math.random()-0.5)*0.5;
    const tmp = this.temp; this.temp = this.nextTemp; this.nextTemp = tmp;
  }
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    for (let i = 0; i < this.temp.length; i++) {
      const idx = i*4, t = this.temp[i];
      const [r, g, b] = applyPalette(
        Math.min(255,Math.max(0,50+t*200)),
        Math.min(255,Math.max(0,50+t*50)),
        Math.min(255,Math.max(0,200-t*150)),
        mode
      );
      imgData.data[idx]=r; imgData.data[idx+1]=g; imgData.data[idx+2]=b; imgData.data[idx+3]=255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

// 3. 反応拡散系: Turing / Gray-Scott
export class ReactionDiffusion {
  width: number; height: number;
  u: Float32Array; v: Float32Array;
  nextU: Float32Array; nextV: Float32Array;
  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.u = new Float32Array(width*height).fill(1.0);
    this.v = new Float32Array(width*height).fill(0.0);
    this.nextU = new Float32Array(width*height);
    this.nextV = new Float32Array(width*height);
    const spots = Math.max(4, Math.floor((width*height)/1600));
    for (let s = 0; s < spots; s++) {
      const cx = Math.floor(Math.random()*width), cy = Math.floor(Math.random()*height);
      const r = Math.floor(width/12);
      for (let y = cy-r; y < cy+r; y++) for (let x = cx-r; x < cx+r; x++) {
        const yi=(y+height)%height, xi=(x+width)%width;
        this.v[yi*width+xi]=1.0; this.u[yi*width+xi]=0.5;
      }
    }
  }
  update(params: { f: number; k: number; Du: number; Dv: number }) {
    const W=this.width, H=this.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i=y*W+x, u=this.u[i], v=this.v[i], uvv=u*v*v;
      const xr=(x+1)%W, xl=(x-1+W)%W, yd=(y+1)%H, yu=(y-1+H)%H;
      const lapU=this.u[y*W+xr]+this.u[y*W+xl]+this.u[yu*W+x]+this.u[yd*W+x]-4*u;
      const lapV=this.v[y*W+xr]+this.v[y*W+xl]+this.v[yu*W+x]+this.v[yd*W+x]-4*v;
      this.nextU[i]=Math.max(0,Math.min(1,u+params.Du*lapU-uvv+params.f*(1-u)));
      this.nextV[i]=Math.max(0,Math.min(1,v+params.Dv*lapV+uvv-(params.f+params.k)*v));
    }
    let t=this.u; this.u=this.nextU; this.nextU=t;
    t=this.v; this.v=this.nextV; this.nextV=t;
  }
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    let minV=1,maxV=0;
    for (let i=0;i<this.v.length;i++){if(this.v[i]<minV)minV=this.v[i];if(this.v[i]>maxV)maxV=this.v[i];}
    const range=Math.max(maxV-minV,0.001);
    for (let i=0;i<this.u.length;i++){
      const t=(this.v[i]-minV)/range, idx=i*4;
      const [r,g,b]=applyPalette(Math.floor(t*20),Math.floor(20+t*235),Math.floor(30+t*180),mode);
      imgData.data[idx]=r; imgData.data[idx+1]=g; imgData.data[idx+2]=b; imgData.data[idx+3]=255;
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 4. 弾性・力学的不安定性: Swift-Hohenberg (Buckling & Wrinkling)
export class BucklingChain {
  width: number; height: number;
  w: Float32Array; wt: Float32Array;
  N: number;
  constructor(width: number, height: number, _segments: number) {
    this.width=width; this.height=height; this.N=64;
    this.w=new Float32Array(this.N*this.N);
    this.wt=new Float32Array(this.N*this.N);
    this._seed();
  }
  _seed() {
    for (let i=0;i<this.w.length;i++){this.w[i]=(Math.random()-0.5)*0.05;this.wt[i]=0;}
  }
  reset() { this._seed(); }
  _lap(arr: Float32Array, x: number, y: number): number {
    const N=this.N, xr=(x+1)%N, xl=(x-1+N)%N, yd=(y+1)%N, yu=(y-1+N)%N;
    return arr[y*N+xr]+arr[y*N+xl]+arr[yd*N+x]+arr[yu*N+x]-4*arr[y*N+x];
  }
  update(params: { compression: number; stiffness: number }) {
    const N=this.N, eps=params.compression, k0sq=params.stiffness*0.2;
    const dt=0.008, substeps=15;
    for (let s=0;s<substeps;s++){
      for (let y=0;y<N;y++) for (let x=0;x<N;x++){
        const i=y*N+x; this.wt[i]=this._lap(this.w,x,y)+k0sq*this.w[i];
      }
      for (let y=0;y<N;y++) for (let x=0;x<N;x++){
        const i=y*N+x, wi=this.w[i];
        const sh2=this._lap(this.wt,x,y)+k0sq*this.wt[i];
        this.w[i]+=(eps*wi-sh2-wi*wi*wi)*dt;
      }
    }
  }
  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const N=this.N, cw=this.width/N, ch=this.height/N;
    let maxW=1e-4;
    for (let i=0;i<this.w.length;i++){const a=Math.abs(this.w[i]);if(a>maxW)maxW=a;}
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){
      const t=this.w[y*N+x]/maxW;
      let cr,cg,cb;
      if(t>=0){cr=Math.floor(15+t*225);cg=Math.floor(5+t*65);cb=Math.floor(20+t*15);}
      else{const s=-t;cr=Math.floor(10+s*50);cg=Math.floor(5+s*15);cb=Math.floor(20+s*220);}
      const [r,g,b]=applyPalette(cr,cg,cb,mode);
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(Math.floor(x*cw),Math.floor(y*ch),Math.ceil(cw)+1,Math.ceil(ch)+1);
    }
    const [sr,sg,sb]=applyPalette(255,255,255,mode);
    ctx.strokeStyle=`rgba(${sr},${sg},${sb},0.22)`; ctx.lineWidth=0.8;
    for (let y=0;y<N-1;y++) for (let x=0;x<N-1;x++){
      const a=this.w[y*N+x],b2=this.w[y*N+x+1],c=this.w[(y+1)*N+x];
      if(a*b2<0){const fx=(x+a/(a-b2))*cw;ctx.beginPath();ctx.moveTo(fx,y*ch);ctx.lineTo(fx,(y+1)*ch);ctx.stroke();}
      if(a*c<0){const fy=(y+a/(a-c))*ch;ctx.beginPath();ctx.moveTo(x*cw,fy);ctx.lineTo((x+1)*cw,fy);ctx.stroke();}
    }
  }
}

// 5. 最小化原理: Voronoi Relaxation
export class VoronoiRelaxation {
  width: number; height: number;
  points: {x:number;y:number;color:string}[];
  constructor(width: number, height: number, nPoints: number) {
    this.width=width; this.height=height;
    this.points=Array.from({length:nPoints},()=>({
      x:Math.random()*width,y:Math.random()*height,
      color:`hsl(${Math.random()*360},60%,40%)`
    }));
  }
  update(params: { relaxation: number }) {
    const lr=params.relaxation;
    for(let i=0;i<this.points.length;i++){
      let fx=0,fy=0;
      for(let j=0;j<this.points.length;j++){
        if(i===j)continue;
        const dx=this.points[i].x-this.points[j].x, dy=this.points[i].y-this.points[j].y;
        const d2=dx*dx+dy*dy;
        if(d2<15000){fx+=dx/(d2*0.1+1);fy+=dy/(d2*0.1+1);}
      }
      if(this.points[i].x<10)fx+=2;if(this.points[i].x>this.width-10)fx-=2;
      if(this.points[i].y<10)fy+=2;if(this.points[i].y>this.height-10)fy-=2;
      this.points[i].x+=fx*lr; this.points[i].y+=fy*lr;
    }
  }
  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const res=8;
    for(let y=0;y<this.height;y+=res) for(let x=0;x<this.width;x+=res){
      let minDist=Infinity,pt=this.points[0];
      for(const p of this.points){const d=(p.x-x)**2+(p.y-y)**2;if(d<minDist){minDist=d;pt=p;}}
      if(mode==='color'){ctx.fillStyle=pt.color;}
      else{
        // parse hsl from color string
        const m=pt.color.match(/hsl\((\d+(?:\.\d+)?),(\d+)%,(\d+)%\)/);
        if(m){
          const [,,sl,ll]=[0,...m].map(Number);
          const h=Number(m[1])/360, s=sl/100, l=ll/100;
          const q=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q;
          const hue2rgb=(p3:number,q3:number,t3:number)=>{
            let t=((t3%1)+1)%1;
            if(t<1/6)return p3+(q3-p3)*6*t;
            if(t<1/2)return q3;
            if(t<2/3)return p3+(q3-p3)*(2/3-t)*6;
            return p3;
          };
          const cr=Math.round(hue2rgb(p2,q,h+1/3)*255);
          const cg=Math.round(hue2rgb(p2,q,h)*255);
          const cb=Math.round(hue2rgb(p2,q,h-1/3)*255);
          const [r,g,b]=applyPalette(cr,cg,cb,mode);
          ctx.fillStyle=`rgb(${r},${g},${b})`;
        } else { ctx.fillStyle=pt.color; }
      }
      ctx.fillRect(x,y,res,res);
    }
    const [dr,dg,db]=applyPalette(0,0,0,mode);
    ctx.fillStyle=`rgb(${dr},${dg},${db})`;
    for(const p of this.points){ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}
  }
}

// 6. 対称性の破れ: Ising Model
export class IsingModel {
  size: number; spins: Int8Array;
  constructor(size: number) {
    this.size=size; this.spins=new Int8Array(size*size);
    for(let i=0;i<this.spins.length;i++) this.spins[i]=Math.random()>0.5?1:-1;
  }
  update(params: { T: number }, steps=30000) {
    for(let s=0;s<steps;s++){
      const idx=Math.floor(Math.random()*this.spins.length);
      const x=idx%this.size, y=Math.floor(idx/this.size);
      const up=y===0?this.size-1:y-1, down=y===this.size-1?0:y+1;
      const left=x===0?this.size-1:x-1, right=x===this.size-1?0:x+1;
      const nb=this.spins[up*this.size+x]+this.spins[down*this.size+x]+this.spins[y*this.size+left]+this.spins[y*this.size+right];
      const dE=2*this.spins[idx]*nb;
      if(dE<=0||Math.random()<Math.exp(-dE/params.T)) this.spins[idx]*=-1;
    }
  }
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    for(let i=0;i<this.spins.length;i++){
      const val=this.spins[i]===1?255:30, idx=i*4;
      const [r,g,b]=applyPalette(val,val,val,mode);
      imgData.data[idx]=r;imgData.data[idx+1]=g;imgData.data[idx+2]=b;imgData.data[idx+3]=255;
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 7. 集団運動: Vicsek Model
export class VicsekModel {
  width: number; height: number;
  particles: {x:number;y:number;a:number}[];
  constructor(width: number, height: number, N: number) {
    this.width=width; this.height=height;
    this.particles=Array.from({length:N},()=>({x:Math.random()*width,y:Math.random()*height,a:Math.random()*2*Math.PI}));
  }
  update(params: { v: number; r: number; noise: number }) {
    const r2=params.r*params.r;
    for(const p of this.particles){
      let sumSin=0,sumCos=0,count=0;
      for(const o of this.particles){
        let dx=o.x-p.x, dy=o.y-p.y;
        if(dx>this.width/2)dx-=this.width; if(dx<-this.width/2)dx+=this.width;
        if(dy>this.height/2)dy-=this.height; if(dy<-this.height/2)dy+=this.height;
        if(dx*dx+dy*dy<r2){sumSin+=Math.sin(o.a);sumCos+=Math.cos(o.a);count++;}
      }
      if(count>0) p.a=Math.atan2(sumSin/count,sumCos/count)+(Math.random()-0.5)*params.noise;
    }
    for(const p of this.particles){
      p.x+=Math.cos(p.a)*params.v; p.y+=Math.sin(p.a)*params.v;
      if(p.x<0)p.x+=this.width; if(p.x>=this.width)p.x-=this.width;
      if(p.y<0)p.y+=this.height; if(p.y>=this.height)p.y-=this.height;
    }
  }
  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const [br,bg,bb]=applyPalette(15,23,42,mode);
    const [pr,pg,pb]=applyPalette(56,189,248,mode);
    ctx.fillStyle=`rgb(${br},${bg},${bb})`; ctx.fillRect(0,0,this.width,this.height);
    ctx.fillStyle=`rgb(${pr},${pg},${pb})`;
    for(const p of this.particles){
      ctx.beginPath();
      ctx.moveTo(p.x+Math.cos(p.a)*6,p.y+Math.sin(p.a)*6);
      ctx.lineTo(p.x+Math.cos(p.a+2.5)*4,p.y+Math.sin(p.a+2.5)*4);
      ctx.lineTo(p.x+Math.cos(p.a-2.5)*4,p.y+Math.sin(p.a-2.5)*4);
      ctx.fill();
    }
  }
}

// 8. 結晶成長: DLA (Diffusion-Limited Aggregation)
// ランダムウォークする粒子が既存の結晶に触れると固着し、フラクタル状のデンドライト（樹枝状結晶）を形成する
export class CrystalGrowth {
  width: number; height: number;
  grid: Uint8Array;   // 0=空, 1=結晶
  walkers: {x:number;y:number}[];
  crystalCount: number;
  maxWalkers: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.grid=new Uint8Array(width*height);
    this.walkers=[];
    this.crystalCount=0;
    this.maxWalkers=300;
    // 核（核形成）: 中心に小さなシードクラスター
    const cx=Math.floor(width/2), cy=Math.floor(height/2);
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
      const x=cx+dx, y=cy+dy;
      if(x>=0&&x<width&&y>=0&&y<height){this.grid[y*width+x]=1;this.crystalCount++;}
    }
    this._spawnWalkers(this.maxWalkers);
  }

  _spawnWalkers(n: number) {
    for(let i=0;i<n;i++) this._spawnOne();
  }

  _spawnOne() {
    // 外周からランダムにスポーン
    const side=Math.floor(Math.random()*4);
    let x=0,y=0;
    if(side===0){x=Math.floor(Math.random()*this.width);y=0;}
    else if(side===1){x=this.width-1;y=Math.floor(Math.random()*this.height);}
    else if(side===2){x=Math.floor(Math.random()*this.width);y=this.height-1;}
    else{x=0;y=Math.floor(Math.random()*this.height);}
    this.walkers.push({x,y});
  }

  reset() {
    this.grid=new Uint8Array(this.width*this.height);
    this.walkers=[];
    this.crystalCount=0;
    const cx=Math.floor(this.width/2), cy=Math.floor(this.height/2);
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
      const x=cx+dx, y=cy+dy;
      if(x>=0&&x<this.width&&y>=0&&y<this.height){this.grid[y*this.width+x]=1;this.crystalCount++;}
    }
    this._spawnWalkers(this.maxWalkers);
  }

  update(params: { stickiness: number; drift: number }) {
    const W=this.width, H=this.height;
    const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]; // 8-connected
    const toRemove: number[]=[];
    const cx=Math.floor(W/2), cy=Math.floor(H/2);

    // Move each walker multiple steps per frame for speed
    for(let wi=0;wi<this.walkers.length;wi++){
      const w=this.walkers[wi];
      const steps=3;
      for(let s=0;s<steps;s++){
        // Biased random walk toward center
        const ddx=cx-w.x, ddy=cy-w.y;
        const dist=Math.sqrt(ddx*ddx+ddy*ddy)+1;
        const bias=params.drift*0.015;
        const r=Math.random();
        if(r<0.25+bias*ddx/dist) w.x++;
        else if(r<0.5+bias*ddy/dist) w.y++;
        else if(r<0.75) w.x--;
        else w.y--;
        // Bounce off walls
        if(w.x<=0)w.x=1; if(w.x>=W-1)w.x=W-2;
        if(w.y<=0)w.y=1; if(w.y>=H-1)w.y=H-2;
      }

      // Check 8-connected neighborhood
      let touches=false;
      for(const [ddx2,ddy2] of dirs){
        const nx=w.x+ddx2, ny=w.y+ddy2;
        if(nx>=0&&nx<W&&ny>=0&&ny<H&&this.grid[ny*W+nx]===1){touches=true;break;}
      }
      if(touches&&Math.random()<params.stickiness){
        this.grid[w.y*W+w.x]=1;
        this.crystalCount++;
        toRemove.push(wi);
      }
    }
    for(let i=toRemove.length-1;i>=0;i--) this.walkers.splice(toRemove[i],1);
    while(this.walkers.length<this.maxWalkers&&this.crystalCount<this.width*this.height*0.45)
      this._spawnOne();
  }

  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const W=this.width, H=this.height;
    const [br,bg,bb]=applyPalette(2,5,16,mode);
    ctx.fillStyle=`rgb(${br},${bg},${bb})`;
    ctx.fillRect(0,0,W,H);

    const imgData=ctx.createImageData(W,H);
    const cx=Math.floor(W/2), cy=Math.floor(H/2);
    const maxDist=Math.sqrt(cx*cx+cy*cy);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const i=y*W+x;
      if(this.grid[i]===1){
        const dist=Math.sqrt((x-cx)**2+(y-cy)**2)/maxDist;
        const cr=Math.floor(180*(1-dist)+100*dist);
        const cg=Math.floor(220*(1-dist)+80*dist);
        const cb=Math.floor(255);
        const [r,g,b]=applyPalette(cr,cg,cb,mode);
        imgData.data[i*4]=r; imgData.data[i*4+1]=g; imgData.data[i*4+2]=b; imgData.data[i*4+3]=255;
      } else {
        imgData.data[i*4]=br; imgData.data[i*4+1]=bg; imgData.data[i*4+2]=bb; imgData.data[i*4+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);

    const [wr,wg,wb]=applyPalette(100,150,255,mode);
    for(const w of this.walkers){
      ctx.fillStyle=`rgba(${wr},${wg},${wb},0.25)`;
      ctx.fillRect(w.x,w.y,1,1);
    }
  }
}

// 9. 相分離: Cahn-Hilliard (スピノーダル分解)
// 均一混合物が自発的に２相に分離していく過程。表面張力と拡散のバランスで特徴的なスケールが選ばれる
export class CahnHilliard {
  width: number; height: number;
  phi: Float32Array;   // 秩序パラメータ (-1=A相, +1=B相)
  mu: Float32Array;    // 化学ポテンシャル
  N: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=128;
    this.phi=new Float32Array(this.N*this.N);
    this.mu=new Float32Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    for(let i=0;i<this.phi.length;i++) this.phi[i]=(Math.random()-0.5)*0.1;
  }

  reset() { this._seed(); }

  _lap(arr: Float32Array, x: number, y: number): number {
    const N=this.N, xr=(x+1)%N, xl=(x-1+N)%N, yd=(y+1)%N, yu=(y-1+N)%N;
    return arr[y*N+xr]+arr[y*N+xl]+arr[yd*N+x]+arr[yu*N+x]-4*arr[y*N+x];
  }

  update(params: { mobility: number; interfaceWidth: number }) {
    const N=this.N;
    const M=params.mobility;       // モビリティ (拡散速度)
    const kappa=params.interfaceWidth*0.5; // 界面エネルギー係数
    const dt=0.5;

    // μ = dF/dφ = φ³ - φ - κ∇²φ
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const i=y*N+x, p=this.phi[i];
      this.mu[i]=p*p*p-p-kappa*this._lap(this.phi,x,y);
    }
    // ∂φ/∂t = M∇²μ
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const i=y*N+x;
      this.phi[i]+=M*this._lap(this.mu,x,y)*dt;
      this.phi[i]=Math.max(-1.5,Math.min(1.5,this.phi[i]));
    }
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.max(-1,Math.min(1,this.phi[y*N+x]));
      let cr,cg,cb;
      if(t>0){cr=Math.floor(240*t+20*(1-t));cg=Math.floor(120*t+20*(1-t));cb=Math.floor(10*t+20*(1-t));}
      else{const s=-t;cr=Math.floor(20*(1-s)+5*s);cg=Math.floor(80*(1-s)+30*s);cb=Math.floor(180*(1-s)+240*s);}
      const near=1-Math.abs(t);
      cr=Math.floor(cr+near*180); cg=Math.floor(cg+near*180); cb=Math.floor(cb+near*180);
      const [r,g,b]=applyPalette(Math.min(255,cr),Math.min(255,cg),Math.min(255,cb),mode);
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b; imgData.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 10. 興奮性媒質: FitzHugh-Nagumo (スパイラル波)
// 神経細胞の発火と回復を模したモデル。拡散と結合することでスパイラル波やターゲットパターンが出現
export class ExcitableMedia {
  width: number; height: number;
  u: Float32Array;  // 興奮変数 (膜電位に対応)
  v: Float32Array;  // 回復変数 (不応性)
  N: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=100;
    this.u=new Float32Array(this.N*this.N).fill(0);
    this.v=new Float32Array(this.N*this.N).fill(0);
    this._seed();
  }

  _seed() {
    const N=this.N;
    // スパイラル波のシード: 左半分を興奮状態に
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      if(x<N/2) this.u[y*N+x]=2.0;
      if(y<N/2) this.v[y*N+x]=0.5;
    }
  }

  reset() {
    this.u.fill(0); this.v.fill(0); this._seed();
  }

  _lap(arr: Float32Array, x: number, y: number): number {
    const N=this.N, xr=(x+1)%N, xl=(x-1+N)%N, yd=(y+1)%N, yu=(y-1+N)%N;
    return arr[y*N+xr]+arr[y*N+xl]+arr[yd*N+x]+arr[yu*N+x]-4*arr[y*N+x];
  }

  update(params: { epsilon: number; beta: number }) {
    const N=this.N;
    const Du=1.0, Dv=0.0;  // u は拡散する、v は拡散しない
    const eps=params.epsilon;  // 時定数比（小さいと興奮が速い）
    const beta=params.beta;    // 回復変数の平衡値
    const dt=0.05;
    const substeps=5;

    for(let s=0;s<substeps;s++){
      const newU=new Float32Array(N*N);
      const newV=new Float32Array(N*N);
      for(let y=0;y<N;y++) for(let x=0;x<N;x++){
        const i=y*N+x, u=this.u[i], v=this.v[i];
        const lapU=this._lap(this.u,x,y);
        // FitzHugh-Nagumo: ∂u/∂t = Du∇²u + u(1-u)(u-a) - v (simplified)
        // ∂v/∂t = ε(u - β·v)
        const dudt=Du*lapU + u*(1-u*u) - v;
        const dvdt=eps*(u - beta*v);
        newU[i]=Math.max(-2,Math.min(2, u+dudt*dt));
        newV[i]=Math.max(-2,Math.min(2, v+dvdt*dt));
      }
      this.u.set(newU); this.v.set(newV);
    }
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const u=this.u[y*N+x], v=this.v[y*N+x];
      const un=Math.max(0,Math.min(1,(u+1)/3));
      const vn=Math.max(0,Math.min(1,(v+0.5)/2));
      const [r,g,b]=applyPalette(
        Math.floor(un*255*(1-vn*0.5)),
        Math.floor(un*240),
        Math.floor(30+vn*180*(1-un)),
        mode
      );
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b; imgData.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 11. ネマティック液晶: Nematic Liquid Crystal
export class NematicLC {
  width: number; height: number;
  theta: Float32Array; size: number;
  constructor(size: number) {
    this.size=size; this.width=size; this.height=size;
    this.theta=new Float32Array(size*size);
    for(let i=0;i<this.theta.length;i++) this.theta[i]=Math.random()*Math.PI;
  }
  update(params: { J: number; noise: number }) {
    const {J,noise}=params, N=this.size;
    const steps=N*N;
    for(let s=0;s<steps;s++){
      const i=Math.floor(Math.random()*N*N);
      const x=i%N, y=Math.floor(i/N);
      const right=y*N+((x+1)%N), left=y*N+((x-1+N)%N);
      const down=((y+1)%N)*N+x, up=((y-1+N)%N)*N+x;
      const th=this.theta[i];
      const E_old=-(Math.cos(2*(th-this.theta[right]))+Math.cos(2*(th-this.theta[left]))+Math.cos(2*(th-this.theta[down]))+Math.cos(2*(th-this.theta[up])));
      const thNew=th+(Math.random()-0.5)*noise;
      const E_new=-(Math.cos(2*(thNew-this.theta[right]))+Math.cos(2*(thNew-this.theta[left]))+Math.cos(2*(thNew-this.theta[down]))+Math.cos(2*(thNew-this.theta[up])));
      const dE=E_new-E_old;
      if(dE<0||Math.random()<Math.exp(-dE/J)) this.theta[i]=((thNew%Math.PI)+Math.PI)%Math.PI;
    }
  }
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.size;
    const [br,bg,bb]=applyPalette(8,10,25,mode);
    for(let i=0;i<imgData.data.length;i+=4){imgData.data[i]=br;imgData.data[i+1]=bg;imgData.data[i+2]=bb;imgData.data[i+3]=255;}
    ctx.putImageData(imgData,0,0);
    const cellW=imgData.width/N, cellH=imgData.height/N;
    const rodHalf=Math.min(cellW,cellH)*0.45;
    const hsl2rgb=(h:number,s:number,l:number):[number,number,number]=>{
      const q=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q;
      const hue2=(p3:number,q3:number,t:number)=>{
        const t2=((t%1)+1)%1;
        if(t2<1/6)return p3+(q3-p3)*6*t2;
        if(t2<1/2)return q3;
        if(t2<2/3)return p3+(q3-p3)*(2/3-t2)*6;
        return p3;
      };
      return [Math.round(hue2(p2,q,h+1/3)*255),Math.round(hue2(p2,q,h)*255),Math.round(hue2(p2,q,h-1/3)*255)];
    };
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const th=this.theta[y*N+x];
      const right=this.theta[y*N+((x+1)%N)], down=this.theta[((y+1)%N)*N+x];
      const order=(Math.cos(2*(th-right))+Math.cos(2*(th-down))+2)/4;
      const hue=(th/Math.PI);
      const [cr,cg,cb]=hsl2rgb(hue,0.7,(15+order*20)/100);
      const [r,g,b]=applyPalette(cr,cg,cb,mode);
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(x*cellW,y*cellH,cellW+1,cellH+1);
    }
    const skip=Math.max(1,Math.floor(N/40));
    ctx.lineWidth=Math.max(1,cellW*0.25);
    for(let y=0;y<N;y+=skip) for(let x=0;x<N;x+=skip){
      const th=this.theta[y*N+x];
      const cx2=(x+0.5)*cellW, cy2=(y+0.5)*cellH;
      const dx2=Math.cos(th)*rodHalf*skip*0.8, dy2=Math.sin(th)*rodHalf*skip*0.8;
      const right=this.theta[y*N+((x+1)%N)], down=this.theta[((y+1)%N)*N+x];
      const order=((Math.cos(2*(th-right))+Math.cos(2*(th-down)))+2)/4;
      const [lr,lg,lb]=applyPalette(...hsl2rgb(th/Math.PI,1,(70+order*25)/100),mode);
      const alpha=(0.4+order*0.6).toFixed(2);
      ctx.strokeStyle=`rgba(${lr},${lg},${lb},${alpha})`;
      ctx.beginPath();ctx.moveTo(cx2-dx2,cy2-dy2);ctx.lineTo(cx2+dx2,cy2+dy2);ctx.stroke();
    }
    for(let y=1;y<N-1;y+=2) for(let x=1;x<N-1;x+=2){
      const th00=this.theta[y*N+x], th10=this.theta[y*N+x+1];
      const th11=this.theta[(y+1)*N+x+1], th01=this.theta[(y+1)*N+x];
      const diffs=[angDiffNematic(th10,th00),angDiffNematic(th11,th10),angDiffNematic(th01,th11),angDiffNematic(th00,th01)];
      const winding=diffs.reduce((a,b2)=>a+b2,0)/Math.PI;
      const w=Math.round(winding*2)/2;
      if(Math.abs(w)>=0.4){
        ctx.beginPath();ctx.arc((x+1)*cellW,(y+1)*cellH,cellW*1.2,0,Math.PI*2);
        const [dr,dg,db]=w>0?applyPalette(255,220,80,mode):applyPalette(100,200,255,mode);
        ctx.fillStyle=`rgba(${dr},${dg},${db},0.55)`;ctx.fill();
      }
    }
  }
}

function angDiffNematic(a: number, b: number): number {
  let d=a-b;
  while(d>Math.PI/2)d-=Math.PI;
  while(d<-Math.PI/2)d+=Math.PI;
  return d;
}

// 12. スライムモールド: Physarum Polycephalum (輸送ネットワーク)
// エージェントが走化性で動き、フェロモントレイルを強化することで最短経路ネットワークが創発
export class Physarum {
  width: number; height: number;
  trail: Float32Array;   // フェロモンフィールド
  agents: {x:number;y:number;angle:number}[];
  N: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=Math.floor(width);
    this.trail=new Float32Array(this.N*this.N);
    this.agents=[];
    this.reset();
  }

  reset() {
    this.trail.fill(0);
    this.agents=[];
    const cx=this.N/2, cy=this.N/2, r=this.N*0.2;
    const count=Math.floor(this.N*this.N*0.25);
    for(let i=0;i<count;i++){
      const a=Math.random()*2*Math.PI, d=Math.random()*r;
      this.agents.push({x:cx+Math.cos(a)*d, y:cy+Math.sin(a)*d, angle:a});
    }
  }

  _sense(x: number, y: number, angle: number, sensorAngle: number, sensorDist: number): number {
    const sa=angle+sensorAngle;
    const sx=Math.round(x+Math.cos(sa)*sensorDist);
    const sy=Math.round(y+Math.sin(sa)*sensorDist);
    const N=this.N;
    const nx=((sx%N)+N)%N, ny=((sy%N)+N)%N;
    return this.trail[ny*N+nx];
  }

  update(params: { sensorAngle: number; speed: number; deposit: number }) {
    const N=this.N;
    const sAngle=params.sensorAngle * Math.PI / 180;
    const sDist=9;
    const speed=params.speed;
    const dep=params.deposit;
    const rotAngle=Math.PI/8;

    for(const a of this.agents){
      // 前方・左前・右前のフェロモンを感知
      const fwd=this._sense(a.x,a.y,a.angle,0,sDist);
      const lft=this._sense(a.x,a.y,a.angle,-sAngle,sDist);
      const rgt=this._sense(a.x,a.y,a.angle,+sAngle,sDist);

      if(fwd>lft&&fwd>rgt){/* まっすぐ */}
      else if(fwd<lft&&fwd<rgt){a.angle+=(Math.random()<0.5?-1:1)*rotAngle;}
      else if(rgt>lft){a.angle+=rotAngle;}
      else if(lft>rgt){a.angle-=rotAngle;}

      // 移動
      a.x+=Math.cos(a.angle)*speed;
      a.y+=Math.sin(a.angle)*speed;
      a.x=((a.x%N)+N)%N; a.y=((a.y%N)+N)%N;

      // フェロモン堆積
      const ix=Math.floor(a.x), iy=Math.floor(a.y);
      this.trail[iy*N+ix]=Math.min(1,this.trail[iy*N+ix]+dep);
    }

    // 拡散と減衰
    const diffused=new Float32Array(N*N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const i=y*N+x;
      const xr=(x+1)%N, xl=(x-1+N)%N, yd=(y+1)%N, yu=(y-1+N)%N;
      const avg=(this.trail[i]+this.trail[y*N+xr]+this.trail[y*N+xl]+this.trail[yd*N+x]+this.trail[yu*N+x])/5;
      diffused[i]=Math.max(0,avg*0.95);  // 減衰
    }
    this.trail.set(diffused);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.min(1,this.trail[y*N+x]*3);
      const t2=t*t;
      const [r,g,b]=applyPalette(Math.floor(t2*255),Math.floor(t*200+t2*55),Math.floor(t*30),mode);
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b; imgData.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 13. 都市発展: Urban Growth Model
// 人口密度に依存した確率的成長 + 道路ネットワーク形成 (Eden model + DLA hybrid)
export class UrbanGrowth {
  width: number; height: number;
  land: Uint8Array;    // 0=空地, 1=住宅, 2=道路, 3=商業
  density: Float32Array;  // 局所人口密度
  N: number;
  age: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=100;
    this.land=new Uint8Array(this.N*this.N);
    this.density=new Float32Array(this.N*this.N);
    this.age=0;
    this._seed();
  }

  _seed() {
    const N=this.N;
    const cx=Math.floor(N/2), cy=Math.floor(N/2);
    // 中心に初期商業核
    for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++){
      const x=cx+dx, y=cy+dy;
      if(x>=0&&x<N&&y>=0&&y<N){
        const d=Math.abs(dx)+Math.abs(dy);
        this.land[y*N+x]=d<=3?3:1;
        this.density[y*N+x]=0.9-d*0.05;
      }
    }
    // 初期道路（十字 + 対角）
    for(let i=0;i<N;i++){
      if(Math.abs(i-cx)<=N*0.4){this.land[cy*N+i]=2;this.land[i*N+cx]=2;}
    }
    // 追加の放射状道路
    for(let k=0;k<4;k++){
      const angle=k*Math.PI/4+Math.PI/8;
      for(let r=5;r<N*0.45;r++){
        const x=Math.round(cx+Math.cos(angle)*r), y=Math.round(cy+Math.sin(angle)*r);
        if(x>0&&x<N-1&&y>0&&y<N-1) this.land[y*N+x]=2;
      }
    }
  }

  reset() {
    this.land.fill(0); this.density.fill(0); this.age=0; this._seed();
  }

  update(params: { growthRate: number; sprawl: number }) {
    const N=this.N;
    this.age++;

    // 密度の拡散
    const newDensity=new Float32Array(N*N);
    for(let y=1;y<N-1;y++) for(let x=1;x<N-1;x++){
      const i=y*N+x;
      const avg=(this.density[i]+this.density[i-1]+this.density[i+1]+this.density[i-N]+this.density[i+N])/5;
      newDensity[i]=Math.min(1,avg*0.98+0.002*(this.land[i]>0?1:0));
    }
    this.density.set(newDensity);

    // 成長イテレーション
    const iterations=Math.floor(params.growthRate*20);
    for(let it=0;it<iterations;it++){
      const rx=1+Math.floor(Math.random()*(N-2));
      const ry=1+Math.floor(Math.random()*(N-2));
      const ri=ry*N+rx;
      if(this.land[ri]>0)continue;

      // 周囲の開発状況を確認
      const neighbors=[
        this.land[ri-1],this.land[ri+1],
        this.land[ri-N],this.land[ri+N],
      ];
      const devCount=neighbors.filter(v=>v>0).length;
      if(devCount===0)continue;

      const roadNear=neighbors.some(v=>v===2);
      const prob=this.density[ri]*params.growthRate*(roadNear?2:params.sprawl);
      if(Math.random()<prob){
        // 道路沿いは商業、その他は住宅
        if(roadNear&&this.density[ri]>0.4) this.land[ri]=3;
        else this.land[ri]=1;
        this.density[ri]=0.6;
      }
    }

    // 道路拡張（定期的）
    if(this.age%15===0){
      const numRoads=Math.floor(params.growthRate*3);
      for(let r=0;r<numRoads;r++){
        // 既存の道路から延伸
        let rx=0,ry=0,found=false;
        for(let attempt=0;attempt<50;attempt++){
          const ti=Math.floor(Math.random()*N*N);
          if(this.land[ti]===2){rx=ti%N;ry=Math.floor(ti/N);found=true;break;}
        }
        if(!found)continue;
        const dir=Math.floor(Math.random()*4);
        const dx2=[0,0,1,-1][dir], dy2=[1,-1,0,0][dir];
        const len=3+Math.floor(Math.random()*8);
        for(let i=0;i<len;i++){
          const nx=rx+dx2*i, ny=ry+dy2*i;
          if(nx>0&&nx<N-1&&ny>0&&ny<N-1) this.land[ny*N+nx]=2;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    const cw=this.width/N, ch=this.height/N;
    const [bgr,bgg,bgb]=applyPalette(10,18,10,mode);
    ctx.fillStyle=`rgb(${bgr},${bgg},${bgb})`; ctx.fillRect(0,0,this.width,this.height);

    const hsl2rgb=(h:number,s:number,l:number):[number,number,number]=>{
      const q=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q;
      const hue2=(p3:number,q3:number,t:number)=>{
        const t2=((t%1)+1)%1;
        if(t2<1/6)return p3+(q3-p3)*6*t2;
        if(t2<1/2)return q3;
        if(t2<2/3)return p3+(q3-p3)*(2/3-t2)*6;
        return p3;
      };
      return [Math.round(hue2(p2,q,h+1/3)*255),Math.round(hue2(p2,q,h)*255),Math.round(hue2(p2,q,h-1/3)*255)];
    };

    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const v=this.land[y*N+x];
      if(v===0){
        const d=this.density[y*N+x];
        if(d>0.05){
          const [r,g,b]=applyPalette(30,60,20,mode);
          ctx.fillStyle=`rgba(${r},${g},${b},${d*0.5})`;ctx.fillRect(x*cw,y*ch,cw,ch);
        }
      } else if(v===1){
        const age=Math.random()*0.3;
        const [r,g,b]=applyPalette(...hsl2rgb(35/360,(50+age*30)/100,(25+this.density[y*N+x]*25)/100),mode);
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x*cw,y*ch,cw,ch);
      } else if(v===2){
        const [r,g,b]=applyPalette(42,42,53,mode);
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x*cw,y*ch,cw,ch);
        const [lr,lg,lb]=applyPalette(180,170,130,mode);
        ctx.fillStyle=`rgba(${lr},${lg},${lb},0.3)`; ctx.fillRect(x*cw+cw*0.35,y*ch+ch*0.35,cw*0.3,ch*0.3);
      } else if(v===3){
        const [r,g,b]=applyPalette(...hsl2rgb(210/360,0.8,(20+this.density[y*N+x]*30)/100),mode);
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x*cw,y*ch,cw,ch);
      }
    }
  }
}

// 14. 砂丘: Barchan Dune (風による砂の自己組織化)
// 風によって運ばれる砂粒が衝突・堆積・なだれを繰り返すことで、三日月形のバルカン砂丘が出現
export class SandDune {
  width: number; height: number;
  height_field: Float32Array;  // 砂の高さ
  N: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=100;
    this.height_field=new Float32Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    const N=this.N;
    // 初期砂丘のシード
    for(let i=0;i<8;i++){
      const cx=10+Math.floor(Math.random()*(N-20));
      const cy=10+Math.floor(Math.random()*(N-20));
      const r=3+Math.floor(Math.random()*5);
      for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
        if(x>=0&&x<N&&y>=0&&y<N){
          const d=Math.sqrt((x-cx)**2+(y-cy)**2);
          if(d<r) this.height_field[y*N+x]+=Math.max(0,(r-d)*0.8);
        }
      }
    }
  }

  reset() { this.height_field.fill(0); this._seed(); }

  update(params: { windSpeed: number; angle: number }) {
    const N=this.N;
    const windAngle=params.angle*Math.PI/180;
    const wx=Math.cos(windAngle), wy=Math.sin(windAngle);
    const speed=params.windSpeed;

    const newH=new Float32Array(this.height_field);

    // サルテーション（砂の跳躍輸送）
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const h=this.height_field[y*N+x];
      if(h<0.05)continue;
      const erode=Math.min(h*0.05*speed,0.3);
      newH[y*N+x]-=erode;
      // 風下への堆積
      const tx=Math.round(x+wx*(2+h*2)), ty=Math.round(y+wy*(2+h*2));
      if(tx>=0&&tx<N&&ty>=0&&ty<N) newH[ty*N+tx]+=erode;
    }

    // 風上から新しい砂を供給
    if(Math.random()<0.3*speed){
      const sx=wx<0?N-1:0, sy=Math.floor(Math.random()*N);
      newH[sy*N+sx]+=0.5*speed;
    }

    // なだれ（斜面安定化: 傾斜が閾値を超えると崩れる）
    const angle_thresh=0.6;
    for(let y=1;y<N-1;y++) for(let x=1;x<N-1;x++){
      const i=y*N+x;
      for(const [ddx,ddy] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const ni=(y+ddy)*N+(x+ddx);
        if(ni<0||ni>=N*N)continue;
        const diff=newH[i]-newH[ni];
        if(diff>angle_thresh){const transfer=diff*0.2;newH[i]-=transfer;newH[ni]+=transfer;}
      }
    }

    // 境界での消滅
    for(let i=0;i<N;i++){
      newH[i]=0; newH[(N-1)*N+i]=0; newH[i*N]=0; newH[i*N+N-1]=0;
    }

    this.height_field.set(newH);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    let maxH=0.1;
    for(let i=0;i<this.height_field.length;i++) if(this.height_field[i]>maxH) maxH=this.height_field[i];

    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.min(1,this.height_field[y*N+x]/maxH);
      const [r,g,b]=applyPalette(Math.floor(20+t*210),Math.floor(15+t*160),Math.floor(5+t*60),mode);
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b; imgData.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 15. 神経発火パターン: Hodgkin-Huxley Simplified (Brian's Brain CA)
// 3状態セルオートマトン: 発火→不応期→静止。空間的な興奮波とスパイラルが出現
export class BriansBrain {
  width: number; height: number;
  grid: Uint8Array;    // 0=静止, 1=発火, 2=不応期
  N: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=120;
    this.grid=new Uint8Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    for(let i=0;i<this.grid.length;i++)
      this.grid[i]=Math.random()<0.30?1:Math.random()<0.15?2:0;
  }

  reset() { this._seed(); }

  update(params: { threshold: number; density: number }) {
    const N=this.N;
    const thr=Math.round(params.threshold);
    const newGrid=new Uint8Array(N*N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const i=y*N+x, s=this.grid[i];
      if(s===1){newGrid[i]=2;}
      else if(s===2){newGrid[i]=0;}
      else{
        let fires=0;
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
          if(dx===0&&dy===0)continue;
          const nx=((x+dx)%N+N)%N, ny=((y+dy)%N+N)%N;
          if(this.grid[ny*N+nx]===1) fires++;
        }
        // density controls spontaneous excitation at dead ends to keep patterns alive
        if(fires>=thr) newGrid[i]=1;
        else if(fires===0&&Math.random()<params.density*0.0001) newGrid[i]=1;
      }
    }
    this.grid.set(newGrid);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const s=this.grid[y*N+x];
      let cr=8,cg=10,cb=20;
      if(s===1){cr=255;cg=240;cb=100;}
      else if(s===2){cr=60;cg=20;cb=120;}
      const [r,g,b]=applyPalette(cr,cg,cb,mode);
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=r; imgData.data[i+1]=g; imgData.data[i+2]=b; imgData.data[i+3]=255;
        }
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 16. Conway's Game of Life
// 誕生: 死んだセルの生きた隣が3 → 生。生存: 生きたセルの生きた隣が2か3 → 生。
// 単純な局所ルールからグライダー・振動子・静物・ガンなど多様な構造が創発する。
export class GameOfLife {
  width: number; height: number;
  N: number;
  grid: Uint8Array;
  next: Uint8Array;
  age:  Uint16Array;

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.N = 200;
    this.grid = new Uint8Array(this.N * this.N);
    this.next = new Uint8Array(this.N * this.N);
    this.age  = new Uint16Array(this.N * this.N);
    this._seed();
  }

  _seed() {
    this.grid.fill(0); this.age.fill(0);
    for (let i = 0; i < this.grid.length; i++)
      this.grid[i] = Math.random() < 0.35 ? 1 : 0;
  }

  reset() { this._seed(); }

  setPattern(name: 'random' | 'glider' | 'rpentomino' | 'acorn' | 'gospergun') {
    this.grid.fill(0); this.age.fill(0);
    const N = this.N, cx = N >> 1, cy = N >> 1;
    const set = (dx: number, dy: number) => {
      this.grid[((cy+dy+N)%N)*N + ((cx+dx+N)%N)] = 1;
    };
    if (name === 'random') { this._seed(); return; }
    if (name === 'glider') {
      [[0,-1],[1,0],[-1,1],[0,1],[1,1]].forEach(([dx,dy]) => set(dx,dy));
    } else if (name === 'rpentomino') {
      [[0,-1],[1,-1],[-1,0],[0,0],[0,1]].forEach(([dx,dy]) => set(dx,dy));
    } else if (name === 'acorn') {
      [[-3,0],[-2,-1],[0,1],[1,0],[2,0],[3,0],[4,0]].forEach(([dx,dy]) => set(dx,dy));
    } else if (name === 'gospergun') {
      const cells = [
        [1,5],[1,6],[2,5],[2,6],
        [11,5],[11,6],[11,7],[12,4],[12,8],[13,3],[13,9],[14,3],[14,9],
        [15,6],[16,4],[16,8],[17,5],[17,6],[17,7],[18,6],
        [21,3],[21,4],[21,5],[22,3],[22,4],[22,5],[23,2],[23,6],[25,1],[25,2],[25,6],[25,7],
        [35,3],[35,4],[36,3],[36,4],
      ];
      const ox = cx - 18, oy = cy - 4;
      cells.forEach(([dx,dy]) => { this.grid[((oy+dy+N)%N)*N+((ox+dx+N)%N)]=1; });
    }
  }

  update(_params: Record<string, never>) {
    const N = this.N;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            n += this.grid[((y+dy+N)%N)*N + ((x+dx+N)%N)];
          }
        const alive = this.grid[y*N+x];
        this.next[y*N+x] = (!alive && n===3)||(alive&&(n===2||n===3)) ? 1 : 0;
      }
    }
    const tmp = this.grid; this.grid = this.next; this.next = tmp;
    for (let i = 0; i < N*N; i++)
      this.age[i] = this.grid[i] ? Math.min(this.age[i]+1, 255) : 0;
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N = this.N;
    const sw = imgData.width / N, sh = imgData.height / N;
    const d = imgData.data;
    const [br,bg,bb]=applyPalette(8,10,18,mode);
    for (let i = 0; i < d.length; i += 4) { d[i]=br; d[i+1]=bg; d[i+2]=bb; d[i+3]=255; }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!this.grid[y*N+x]) continue;
        const t = this.age[y*N+x] / 255;
        const [r,g,b]=applyPalette(Math.floor(80+t*160),Math.floor(200+t*55),Math.floor(120+t*110),mode);
        const px0=Math.floor(x*sw), px1=Math.floor((x+1)*sw);
        const py0=Math.floor(y*sh), py1=Math.floor((y+1)*sh);
        for (let py=py0; py<py1; py++)
          for (let px=px0; px<px1; px++) {
            const i=(py*imgData.width+px)*4;
            d[i]=r; d[i+1]=g; d[i+2]=b;
          }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

// 17. Elementary Cellular Automaton (Wolfram 1次元CA)
// 3セル近傍(2³=8パターン)からルール番号(0-255)で次状態を決定し、時間を下方向にスクロール表示。
// Rule 30: カオス的乱数源、Rule 90: シェルピンスキー三角形、Rule 110: チューリング完全
export class ElementaryCA {
  width: number; height: number;
  N: number;
  rowCount: number;
  rows: Uint8Array[];
  currentRule: number;

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.N = 300;
    this.rowCount = 200;
    this.rows = [];
    this.currentRule = 30;
    this._seed(30);
  }

  _seed(rule: number) {
    this.currentRule = rule;
    this.rows = [];
    const first = new Uint8Array(this.N);
    first[Math.floor(this.N / 2)] = 1;
    this.rows.push(first);
    for (let r = 1; r < this.rowCount; r++) this._step(rule);
  }

  reset(rule: number) { this._seed(rule); }

  _step(rule: number) {
    const prev = this.rows[this.rows.length - 1];
    const next = new Uint8Array(this.N);
    for (let x = 0; x < this.N; x++) {
      const l = prev[(x-1+this.N)%this.N], c = prev[x], r = prev[(x+1)%this.N];
      next[x] = (rule >> ((l<<2)|(c<<1)|r)) & 1;
    }
    this.rows.push(next);
    if (this.rows.length > this.rowCount) this.rows.shift();
  }

  update(params: { rule: number }) {
    const rule = Math.round(params.rule);
    if (rule !== this.currentRule) { this._seed(rule); return; }
    this._step(rule);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const W = imgData.width, H = imgData.height, d = imgData.data;
    const rowH = H / this.rowCount, cellW = W / this.N;
    const [br,bg,bb]=applyPalette(8,10,18,mode);
    for (let i = 0; i < d.length; i += 4) { d[i]=br; d[i+1]=bg; d[i+2]=bb; d[i+3]=255; }
    for (let r = 0; r < this.rows.length; r++) {
      const row = this.rows[r];
      const displayR = this.rowCount - this.rows.length + r;
      const py0=Math.floor(displayR*rowH), py1=Math.floor((displayR+1)*rowH);
      const bright = Math.floor(60 + (r/this.rows.length)*195);
      const [pr,pg,pb]=applyPalette(bright,bright,bright,mode);
      for (let x = 0; x < this.N; x++) {
        if (!row[x]) continue;
        const px0=Math.floor(x*cellW), px1=Math.floor((x+1)*cellW);
        for (let py=py0; py<py1; py++)
          for (let px=px0; px<px1; px++) {
            const i=(py*W+px)*4;
            d[i]=pr; d[i+1]=pg; d[i+2]=pb;
          }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

// 18. Langton's Ant
// 白マス: 右折して黒に反転。黒マス: 左折して白に反転。たった2ルールから約10,000ステップ後に
// 「高速道路」と呼ばれる周期104の規則的な直進パターンが自発的に出現する。
export class LangtonsAnt {
  width: number; height: number;
  N: number;
  grid: Uint8Array;
  ants: { x: number; y: number; dir: number }[];
  stepCount: number;

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.N = 200;
    this.grid = new Uint8Array(this.N * this.N);
    this.ants = [];
    this.stepCount = 0;
    this._seed(1);
  }

  _seed(antCount: number) {
    this.grid.fill(0); this.ants = []; this.stepCount = 0;
    const half = Math.floor(this.N / 2);
    for (let i = 0; i < antCount; i++) {
      const off = antCount > 1 ? Math.floor(Math.random()*30 - 15) : 0;
      this.ants.push({ x: (half+off+this.N)%this.N, y: half, dir: 0 });
    }
  }

  reset(antCount: number) { this._seed(antCount); }

  update(params: { speed: number; ants: number }) {
    const antCount = Math.max(1, Math.round(params.ants));
    if (this.ants.length !== antCount) this._seed(antCount);
    const steps = Math.max(1, Math.round(params.speed));
    const N = this.N;
    const DX=[0,1,0,-1], DY=[-1,0,1,0];
    for (let s = 0; s < steps; s++) {
      for (const ant of this.ants) {
        const i = ant.y*N + ant.x;
        if (this.grid[i]===0) { ant.dir=(ant.dir+1)&3; this.grid[i]=1; }
        else                  { ant.dir=(ant.dir+3)&3; this.grid[i]=0; }
        ant.x = ((ant.x+DX[ant.dir])+N)%N;
        ant.y = ((ant.y+DY[ant.dir])+N)%N;
      }
      this.stepCount++;
    }
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N = this.N;
    const sw = imgData.width/N, sh = imgData.height/N;
    const d = imgData.data;
    const [wr,wg,wb]=applyPalette(220,230,245,mode);
    const [dr,dg,db]=applyPalette(10,12,20,mode);
    const [ar,ag,ab]=applyPalette(255,60,60,mode);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const black = this.grid[y*N+x];
        const px0=Math.floor(x*sw), px1=Math.floor((x+1)*sw);
        const py0=Math.floor(y*sh), py1=Math.floor((y+1)*sh);
        const r=black?wr:dr, g=black?wg:dg, b=black?wb:db;
        for (let py=py0; py<py1; py++)
          for (let px=px0; px<px1; px++) {
            const i=(py*imgData.width+px)*4;
            d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=255;
          }
      }
    }
    for (const ant of this.ants) {
      const px0=Math.floor(ant.x*sw), px1=Math.floor((ant.x+1)*sw);
      const py0=Math.floor(ant.y*sh), py1=Math.floor((ant.y+1)*sh);
      for (let py=py0; py<py1; py++)
        for (let px=px0; px<px1; px++) {
          const i=(py*imgData.width+px)*4;
          d[i]=ar; d[i+1]=ag; d[i+2]=ab; d[i+3]=255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

// 19. WireWorld — 電子回路セルオートマトン
// 4状態: 空・銅線・電子頭・電子尾。電子が銅線を伝播し、論理ゲートを構成できる
export class WireWorld {
  width: number; height: number;
  N: number;
  grid: Uint8Array;   // 0=empty 1=copper 2=head 3=tail
  next: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.N = 120;
    this.grid = new Uint8Array(this.N * this.N);
    this.next = new Uint8Array(this.N * this.N);
    this._buildCircuit();
  }

  _buildCircuit() {
    const N = this.N, g = this.grid;
    g.fill(0);
    const drawH = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x++) g[y*N+x] = 1;
    };
    const drawV = (x: number, y0: number, y1: number) => {
      for (let y = y0; y <= y1; y++) g[y*N+x] = 1;
    };
    // loop oscillator 1
    drawH(10,10,50); drawV(50,10,30); drawH(30,10,50); drawV(10,10,30);
    g[10*N+11]=2; g[10*N+12]=3;
    // loop oscillator 2 (larger)
    drawH(45,20,80); drawV(80,45,75); drawH(75,20,80); drawV(20,45,75);
    g[45*N+21]=2; g[45*N+22]=3;
    // signal line with branch
    drawH(20,60,110); drawV(85,20,50); drawH(50,65,110);
    g[20*N+61]=2; g[20*N+62]=3;
    // small loop
    drawH(88,30,70); drawV(70,88,108); drawH(108,30,70); drawV(30,88,108);
    g[88*N+31]=2; g[88*N+32]=3;
  }

  reset() { this._buildCircuit(); }

  update(_params: Record<string, never>) {
    const N = this.N, g = this.grid, n = this.next;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y*N+x, s = g[i];
        if (s === 0) { n[i] = 0; continue; }
        if (s === 2) { n[i] = 3; continue; }
        if (s === 3) { n[i] = 1; continue; }
        let heads = 0;
        for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
          if (dx===0&&dy===0) continue;
          if (g[((y+dy+N)%N)*N+((x+dx+N)%N)]===2) heads++;
        }
        n[i] = (heads===1||heads===2) ? 2 : 1;
      }
    }
    const tmp = this.grid; this.grid = this.next; this.next = tmp;
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    const rawColors:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[6,8,16],[40,30,8],[255,210,40],[255,80,20]];
    const colors=rawColors.map(([r,g,b])=>applyPalette(r,g,b,mode)) as [[number,number,number],[number,number,number],[number,number,number],[number,number,number]];
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const [r,g,b]=colors[this.grid[y*N+x]];
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 20. Boids — Reynolds フロッキング
// 分離(Separation)・整列(Alignment)・結合(Cohesion)の3ルールで群れ飛行が創発する
export class Boids {
  width: number; height: number;
  agents: { x:number; y:number; vx:number; vy:number }[];

  constructor(width: number, height: number) {
    this.width = width; this.height = height;
    this.agents = [];
    this._seed(200);
  }

  _seed(n: number) {
    this.agents = [];
    for (let i=0;i<n;i++) {
      const a=Math.random()*Math.PI*2, sp=1+Math.random()*1.5;
      this.agents.push({ x:Math.random()*this.width, y:Math.random()*this.height,
        vx:Math.cos(a)*sp, vy:Math.sin(a)*sp });
    }
  }

  reset() { this._seed(200); }

  update(params: { separation:number; alignment:number; cohesion:number; radius:number }) {
    const { separation, alignment, cohesion, radius } = params;
    const W=this.width, H=this.height, bs=this.agents, n=bs.length;
    const maxSp=3.5, minSp=0.5;
    for (let i=0;i<n;i++) {
      const b=bs[i];
      let sx=0,sy=0, ax=0,ay=0, cx=0,cy=0, count=0;
      for (let j=0;j<n;j++) {
        if (i===j) continue;
        const o=bs[j];
        let dx=o.x-b.x, dy=o.y-b.y;
        if (dx>W/2) dx-=W; if (dx<-W/2) dx+=W;
        if (dy>H/2) dy-=H; if (dy<-H/2) dy+=H;
        const d2=dx*dx+dy*dy;
        if (d2>radius*radius) continue;
        const d=Math.sqrt(d2)||1;
        sx-=dx/d; sy-=dy/d;
        ax+=o.vx; ay+=o.vy;
        cx+=dx; cy+=dy; count++;
      }
      if (count>0) {
        b.vx+=separation*sx/count + alignment*(ax/count-b.vx)*0.05 + cohesion*cx/count*0.001;
        b.vy+=separation*sy/count + alignment*(ay/count-b.vy)*0.05 + cohesion*cy/count*0.001;
      }
      const sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;
      const cl=Math.min(maxSp,Math.max(minSp,sp));
      b.vx=b.vx/sp*cl; b.vy=b.vy/sp*cl;
      b.x=(b.x+b.vx+W)%W; b.y=(b.y+b.vy+H)%H;
    }
  }

  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const [br,bg,bb]=applyPalette(6,6,10,mode);
    const [pr,pg,pb]=applyPalette(147,197,253,mode);
    ctx.fillStyle=`rgb(${br},${bg},${bb})`; ctx.fillRect(0,0,this.width,this.height);
    for (const b of this.agents) {
      const a=Math.atan2(b.vy,b.vx);
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(-3,2.5); ctx.lineTo(-3,-2.5); ctx.closePath();
      ctx.fillStyle=`rgba(${pr},${pg},${pb},0.85)`; ctx.fill(); ctx.restore();
    }
  }
}

// 21. Belousov-Zhabotinsky (簡易CA)
// 興奮-不応-静止の連鎖でBZ反応の螺旋ターゲット波を再現する
export class BelousovZhabotinsky {
  width: number; height: number;
  N: number;
  a: Float32Array; b: Float32Array;
  na: Float32Array; nb: Float32Array;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=200;
    this.a=new Float32Array(this.N*this.N);
    this.b=new Float32Array(this.N*this.N);
    this.na=new Float32Array(this.N*this.N);
    this.nb=new Float32Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    for (let i=0;i<this.N*this.N;i++) {
      this.a[i]=Math.random(); this.b[i]=Math.random()*0.3;
    }
  }

  reset() { this._seed(); }

  update(params: { k1:number; k2:number; diffA:number }) {
    const {k1,k2,diffA}=params;
    const N=this.N;
    for (let y=1;y<N-1;y++) for (let x=1;x<N-1;x++) {
      const i=y*N+x, ai=this.a[i], bi=this.b[i];
      const la=(this.a[i-1]+this.a[i+1]+this.a[i-N]+this.a[i+N])*0.25-ai;
      const na=Math.max(0,Math.min(1, ai + diffA*la + k1*ai*(1-ai) - ai*bi));
      const nb=Math.max(0,Math.min(1, bi + 0.02*(ai - k2*bi)));
      this.na[i]=na; this.nb[i]=nb;
    }
    const ta=this.a; this.a=this.na; this.na=ta;
    const tb=this.b; this.b=this.nb; this.nb=tb;
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const a=this.a[y*N+x], b=this.b[y*N+x];
      const [r,g,bl]=applyPalette(Math.floor(a*255),Math.floor((1-b)*180),Math.floor(b*255),mode);
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=bl;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 22. Forest Fire CA
// 木・燃焼・更地の3状態。臨界密度付近でパーコレーション的な相転移が起きる
export class ForestFire {
  width: number; height: number;
  N: number;
  grid: Uint8Array;   // 0=empty 1=tree 2=burning 3=ash
  next: Uint8Array;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=200;
    this.grid=new Uint8Array(this.N*this.N);
    this.next=new Uint8Array(this.N*this.N);
    this._seed(0.6);
  }

  _seed(density: number) {
    for (let i=0;i<this.grid.length;i++) this.grid[i]=Math.random()<density?1:0;
    for (let x=0;x<this.N;x++) this.grid[x]=Math.random()<density?2:0;
  }

  reset(density: number) { this._seed(density); }

  update(params: { density:number; regrowth:number; lightning:number }) {
    const {density,regrowth,lightning}=params;
    const N=this.N, g=this.grid, n=this.next;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const i=y*N+x, s=g[i];
      if (s===0) { n[i]=Math.random()<regrowth*0.001?1:0; }
      else if (s===2) { n[i]=3; }
      else if (s===3) { n[i]=Math.random()<regrowth*0.005?1:0; }
      else {
        let fire=false;
        for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
          if (dx===0&&dy===0) continue;
          if (g[((y+dy+N)%N)*N+((x+dx+N)%N)]===2) { fire=true; break; }
        }
        n[i]=(fire||Math.random()<lightning*0.00001)?2:1;
      }
    }
    for (let x=0;x<N;x++) if (n[x]===1&&Math.random()<0.003) n[x]=2;
    const tmp=this.grid; this.grid=this.next; this.next=tmp;
    let anyFire=false;
    for (let i=0;i<this.grid.length;i++) if (this.grid[i]===2){anyFire=true;break;}
    if (!anyFire) this._seed(density);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    const rawColors:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[8,12,8],[20,80,20],[255,120,20],[40,25,10]];
    const colors=rawColors.map(([r,g,b])=>applyPalette(r,g,b,mode)) as [[number,number,number],[number,number,number],[number,number,number],[number,number,number]];
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const [r,g,b]=colors[this.grid[y*N+x]];
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 23. Percolation — 格子浸透
// 確率pでサイトを開き、上端から下端まで流れが「浸透」するか確かめる。
// 臨界点 p_c ≈ 0.593 でクラスターが自己相似フラクタルになる。
export class Percolation {
  width: number; height: number;
  N: number;
  sites: Uint8Array;  // 0=closed 1=open 2=wetted
  currentP: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=200;
    this.sites=new Uint8Array(this.N*this.N);
    this.currentP=0.59;
    this._generate(0.59);
  }

  _generate(p: number) {
    const N=this.N, s=this.sites;
    this.currentP=p;
    for (let i=0;i<s.length;i++) s[i]=Math.random()<p?1:0;
    const q: number[]=[];
    for (let x=0;x<N;x++) if (s[x]===1) { s[x]=2; q.push(x); }
    while (q.length) {
      const i=q.shift()!;
      const x=i%N, y=Math.floor(i/N);
      for (const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]] as [number,number][]) {
        const nx=x+dx, ny=y+dy;
        if (nx<0||nx>=N||ny<0||ny>=N) continue;
        const ni=ny*N+nx;
        if (s[ni]===1) { s[ni]=2; q.push(ni); }
      }
    }
  }

  reset() { this._generate(this.currentP); }
  update(params: { p:number }) { void params; }
  regenerate(p: number) { this._generate(p); }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const s=this.sites[y*N+x];
      const [r,g,b]=applyPalette(s===2?40:s===1?200:12, s===2?120:s===1?210:14, s===2?255:s===1?230:20, mode);
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 24. Lenia — 連続セルオートマトン
// 滑らかな近傍カーネルと成長関数で生命様の自律移動パターンを生成する
export class Lenia {
  width: number; height: number;
  N: number;
  grid: Float32Array;
  kernel: Float32Array;
  R: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=128; this.R=13;
    this.grid=new Float32Array(this.N*this.N);
    this.kernel=new Float32Array((2*this.R+1)*(2*this.R+1));
    this._buildKernel();
    this._seed();
  }

  _buildKernel() {
    const R=this.R, k=this.kernel, size=2*R+1;
    let sum=0;
    for (let dy=-R;dy<=R;dy++) for (let dx=-R;dx<=R;dx++) {
      const r=Math.sqrt(dx*dx+dy*dy)/R;
      const v=r<=1?Math.exp(4*(1-1/(4*r*(1-r)+1e-9))):0;
      k[(dy+R)*size+(dx+R)]=v; sum+=v;
    }
    for (let i=0;i<k.length;i++) k[i]/=sum;
  }

  _seed() {
    const N=this.N; this.grid.fill(0);
    const cx=N>>1, cy=N>>1, r=20;
    for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++) {
      if (dx*dx+dy*dy>r*r) continue;
      const dist=Math.sqrt(dx*dx+dy*dy)/r;
      this.grid[(cy+dy)*N+(cx+dx)]=Math.max(0,1-dist*1.5)*(0.8+Math.random()*0.2);
    }
  }

  reset() { this._seed(); }

  update(params: { mu:number; sigma:number; dt:number }) {
    const {mu,sigma,dt}=params;
    const N=this.N, R=this.R, g=this.grid, k=this.kernel, kSize=2*R+1;
    const next=new Float32Array(N*N);
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      let conv=0;
      for (let dy=-R;dy<=R;dy++) for (let dx=-R;dx<=R;dx++) {
        conv+=g[((y+dy+N)%N)*N+((x+dx+N)%N)]*k[(dy+R)*kSize+(dx+R)];
      }
      const growth=2*Math.exp(-(conv-mu)*(conv-mu)/(2*sigma*sigma))-1;
      next[y*N+x]=Math.max(0,Math.min(1,g[y*N+x]+dt*growth));
    }
    this.grid=next;
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const v=this.grid[y*N+x];
      const [r,g,b]=applyPalette(Math.floor(v*80),Math.floor(v*200),Math.floor(80+v*170),mode);
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 25. Schelling Segregation — 社会的分離モデル
// 「ほんの少し同種の隣人がいれば十分」という閾値が、社会全体の完全分離を引き起こす
export class SchellingSegregation {
  width: number; height: number;
  N: number;
  grid: Int8Array;   // 0=empty -1=groupA 1=groupB
  happyRatio: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=100;
    this.grid=new Int8Array(this.N*this.N);
    this.happyRatio=0;
    this._seed(0.45,0.45);
  }

  _seed(densA: number, densB: number) {
    for (let i=0;i<this.grid.length;i++) {
      const r=Math.random();
      this.grid[i]=r<densA?-1:r<densA+densB?1:0;
    }
  }

  reset() { this._seed(0.45,0.45); }

  update(params: { tolerance:number }) {
    const {tolerance}=params;
    const N=this.N, g=this.grid;
    const unhappy: number[]=[], empty: number[]=[];
    let happy=0, total=0;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const i=y*N+x, s=g[i];
      if (s===0) { empty.push(i); continue; }
      total++;
      let same=0,diff=0;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        if (dx===0&&dy===0) continue;
        const ns=g[((y+dy+N)%N)*N+((x+dx+N)%N)];
        if (ns!==0) { if (ns===s) same++; else diff++; }
      }
      const neighbors=same+diff;
      if (neighbors===0||same/neighbors>=tolerance) happy++;
      else unhappy.push(i);
    }
    this.happyRatio=total>0?happy/total:1;
    for (let i=unhappy.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [unhappy[i],unhappy[j]]=[unhappy[j],unhappy[i]];
    }
    const moves=Math.min(unhappy.length,empty.length);
    for (let i=0;i<moves;i++) {
      const from=unhappy[i], to=empty[Math.floor(Math.random()*empty.length)];
      g[to]=g[from]; g[from]=0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const s=this.grid[y*N+x];
      const [r,g,b]=applyPalette(s===-1?220:s===1?60:14, s===-1?80:s===1?160:16, s===-1?60:s===1?240:22, mode);
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 26. Abelian Sandpile — 自己組織化臨界 (SOC)
// 砂粒を積み上げると臨界状態が自発的に維持され、任意サイズの崩壊が発生する
export class AbelianSandpile {
  width: number; height: number;
  N: number;
  grid: Int32Array;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=150;
    this.grid=new Int32Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    const N=this.N, cx=N>>1, cy=N>>1;
    this.grid.fill(0);
    for (let i=0;i<N*N*2;i++) {
      const x=cx+Math.floor(Math.random()*10-5);
      const y=cy+Math.floor(Math.random()*10-5);
      if (x>=0&&x<N&&y>=0&&y<N) this.grid[y*N+x]++;
    }
    this._relax(200000);
  }

  _relax(maxIter: number) {
    const N=this.N, g=this.grid;
    for (let iter=0;iter<maxIter;iter++) {
      let fired=false;
      for (let y=1;y<N-1;y++) for (let x=1;x<N-1;x++) {
        if (g[y*N+x]>=4) {
          g[y*N+x]-=4; fired=true;
          g[y*N+x-1]++; g[y*N+x+1]++;
          g[(y-1)*N+x]++; g[(y+1)*N+x]++;
        }
      }
      if (!fired) break;
    }
  }

  reset() { this._seed(); }

  update(params: { rate:number }) {
    const rate=Math.max(1,Math.round(params.rate));
    const N=this.N, cx=N>>1, cy=N>>1;
    for (let i=0;i<rate;i++) {
      const ox=Math.floor(Math.random()*5-2), oy=Math.floor(Math.random()*5-2);
      const px=(cx+ox+N)%N, py=(cy+oy+N)%N;
      this.grid[py*N+px]++;
    }
    this._relax(5000);
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    const rawPalette:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[8,10,18],[30,100,60],[80,180,100],[200,230,80],[255,255,200]];
    const palette=rawPalette.map(([r,g,b])=>applyPalette(r,g,b,mode)) as typeof rawPalette;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const v=Math.min(4,Math.max(0,this.grid[y*N+x]));
      const [r,g,b]=palette[v];
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

// 27. Murmuration — 3D群れ飛行（スターリング）
// Boidsの3Dバージョン。遠近投影で球状クラウドが回転・変形する集団行動を表現する
export class Murmuration {
  width: number; height: number;
  birds: { x:number; y:number; z:number; vx:number; vy:number; vz:number }[];

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.birds=[];
    this._seed(500);
  }

  _seed(n: number) {
    this.birds=[];
    for (let i=0;i<n;i++) {
      const a=Math.random()*Math.PI*2, b=Math.random()*Math.PI*2, sp=1+Math.random();
      this.birds.push({
        x:(Math.random()-0.5)*300, y:(Math.random()-0.5)*300, z:(Math.random()-0.5)*300,
        vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, vz:Math.cos(b)*sp
      });
    }
  }

  reset() { this._seed(500); }

  update(params: { sep:number; ali:number; coh:number }) {
    const {sep,ali,coh}=params;
    const bs=this.birds, n=bs.length, R=60;
    const maxSp=2.5, minSp=0.8;
    for (let i=0;i<n;i++) {
      const b=bs[i];
      let sx=0,sy=0,sz=0, ax=0,ay=0,az=0, cx=0,cy=0,cz=0, cnt=0;
      for (let j=0;j<n;j++) {
        if (i===j) continue;
        const o=bs[j];
        const dx=o.x-b.x, dy=o.y-b.y, dz=o.z-b.z;
        const d2=dx*dx+dy*dy+dz*dz;
        if (d2>R*R) continue;
        const d=Math.sqrt(d2)||1;
        sx-=dx/d; sy-=dy/d; sz-=dz/d;
        ax+=o.vx; ay+=o.vy; az+=o.vz;
        cx+=dx; cy+=dy; cz+=dz; cnt++;
      }
      if (cnt>0) {
        b.vx+=sep*sx/cnt+ali*(ax/cnt-b.vx)*0.05+coh*cx/cnt*0.0008;
        b.vy+=sep*sy/cnt+ali*(ay/cnt-b.vy)*0.05+coh*cy/cnt*0.0008;
        b.vz+=sep*sz/cnt+ali*(az/cnt-b.vz)*0.05+coh*cz/cnt*0.0008;
      }
      b.vx-=b.x*0.0005; b.vy-=b.y*0.0005; b.vz-=b.z*0.0005;
      const sp=Math.sqrt(b.vx**2+b.vy**2+b.vz**2)||1;
      const cl=Math.min(maxSp,Math.max(minSp,sp));
      b.vx=b.vx/sp*cl; b.vy=b.vy/sp*cl; b.vz=b.vz/sp*cl;
      b.x+=b.vx; b.y+=b.vy; b.z+=b.vz;
    }
  }

  draw(ctx: CanvasRenderingContext2D, _img?: ImageData, mode: ColorMode = 'color') {
    const W=this.width, H=this.height;
    const [br,bg,bb]=applyPalette(6,6,10,mode);
    ctx.fillStyle=`rgba(${br},${bg},${bb},0.25)`; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2, fov=400;
    const [pr,pg,pb]=applyPalette(180,210,255,mode);
    for (const b of this.birds) {
      const z=b.z+fov;
      if (z<=0) continue;
      const sx=cx+b.x*fov/z, sy=cy+b.y*fov/z;
      const size=Math.max(0.5,2.5*fov/z);
      const sp=Math.sqrt(b.vx**2+b.vy**2+b.vz**2);
      const alpha=Math.min(1,0.4+0.6*sp/2.5);
      ctx.beginPath(); ctx.arc(sx,sy,size,0,Math.PI*2);
      ctx.fillStyle=`rgba(${pr},${pg},${pb},${alpha.toFixed(2)})`; ctx.fill();
    }
  }
}

// 28. Hodgepodge Machine — ポッドポッジCA
// Gerhardt & Schuster の多状態CA。螺旋・ターゲットパターンが自発形成される
export class HodgepodgeMachine {
  width: number; height: number;
  N: number;
  grid: Uint8Array; next: Uint8Array;
  states: number;

  constructor(width: number, height: number) {
    this.width=width; this.height=height;
    this.N=200; this.states=20;
    this.grid=new Uint8Array(this.N*this.N);
    this.next=new Uint8Array(this.N*this.N);
    this._seed();
  }

  _seed() {
    const k=this.states;
    for (let i=0;i<this.grid.length;i++) this.grid[i]=Math.floor(Math.random()*k);
  }

  reset() { this._seed(); }

  update(params: { k1:number; k2:number; gParam:number }) {
    const {k1,k2,gParam}=params;
    const N=this.N, k=this.states, grid=this.grid, next=this.next;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const i=y*N+x, s=grid[i];
      if (s===k-1) { next[i]=0; continue; }
      if (s===0) {
        let ill=0, sum=0, cnt=0;
        for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
          if (dx===0&&dy===0) continue;
          const ns=grid[((y+dy+N)%N)*N+((x+dx+N)%N)];
          if (ns>0&&ns<k-1) ill++;
          sum+=ns; cnt++;
        }
        next[i]=ill>0?Math.min(k-1,Math.floor(sum/(cnt||1)/k1+ill/k2)):0;
      } else {
        let sum=s, cnt=1;
        for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
          if (dx===0&&dy===0) continue;
          sum+=grid[((y+dy+N)%N)*N+((x+dx+N)%N)]; cnt++;
        }
        next[i]=Math.min(k-1,Math.floor(sum/(cnt||1))+gParam);
      }
    }
    const tmp=this.grid; this.grid=this.next; this.next=tmp;
  }

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData, mode: ColorMode = 'color') {
    const N=this.N, k=this.states, sw=imgData.width/N, sh=imgData.height/N, d=imgData.data;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const t=this.grid[y*N+x]/k;
      const hue=t*360;
      const cr=Math.floor(128+127*Math.cos(hue*Math.PI/180));
      const cg=Math.floor(128+127*Math.cos((hue-120)*Math.PI/180));
      const cb=Math.floor(128+127*Math.cos((hue-240)*Math.PI/180));
      const [r,g,b]=applyPalette(cr,cg,cb,mode);
      const px0=Math.floor(x*sw),px1=Math.floor((x+1)*sw);
      const py0=Math.floor(y*sh),py1=Math.floor((y+1)*sh);
      for (let py=py0;py<py1;py++) for (let px=px0;px<px1;px++) {
        const i=(py*imgData.width+px)*4; d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
  }
}

