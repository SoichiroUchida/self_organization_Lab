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
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#e2e8f0';
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
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    for (let i = 0; i < this.temp.length; i++) {
      const idx = i*4, t = this.temp[i];
      imgData.data[idx]   = Math.min(255,Math.max(0,50+t*200));
      imgData.data[idx+1] = Math.min(255,Math.max(0,50+t*50));
      imgData.data[idx+2] = Math.min(255,Math.max(0,200-t*150));
      imgData.data[idx+3] = 255;
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
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    let minV=1,maxV=0;
    for (let i=0;i<this.v.length;i++){if(this.v[i]<minV)minV=this.v[i];if(this.v[i]>maxV)maxV=this.v[i];}
    const range=Math.max(maxV-minV,0.001);
    for (let i=0;i<this.u.length;i++){
      const t=(this.v[i]-minV)/range, idx=i*4;
      imgData.data[idx]=Math.floor(t*20);
      imgData.data[idx+1]=Math.floor(20+t*235);
      imgData.data[idx+2]=Math.floor(30+t*180);
      imgData.data[idx+3]=255;
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
  draw(ctx: CanvasRenderingContext2D) {
    const N=this.N, cw=this.width/N, ch=this.height/N;
    let maxW=1e-4;
    for (let i=0;i<this.w.length;i++){const a=Math.abs(this.w[i]);if(a>maxW)maxW=a;}
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){
      const t=this.w[y*N+x]/maxW;
      let r,g,b;
      if(t>=0){r=Math.floor(15+t*225);g=Math.floor(5+t*65);b=Math.floor(20+t*15);}
      else{const s=-t;r=Math.floor(10+s*50);g=Math.floor(5+s*15);b=Math.floor(20+s*220);}
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(Math.floor(x*cw),Math.floor(y*ch),Math.ceil(cw)+1,Math.ceil(ch)+1);
    }
    ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=0.8;
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
  draw(ctx: CanvasRenderingContext2D) {
    const res=8;
    for(let y=0;y<this.height;y+=res) for(let x=0;x<this.width;x+=res){
      let minDist=Infinity,pt=this.points[0];
      for(const p of this.points){const d=(p.x-x)**2+(p.y-y)**2;if(d<minDist){minDist=d;pt=p;}}
      ctx.fillStyle=pt.color; ctx.fillRect(x,y,res,res);
    }
    ctx.fillStyle='#000';
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
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    for(let i=0;i<this.spins.length;i++){
      const val=this.spins[i]===1?255:30, idx=i*4;
      imgData.data[idx]=val;imgData.data[idx+1]=val;imgData.data[idx+2]=val;imgData.data[idx+3]=255;
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
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,this.width,this.height);
    ctx.fillStyle='#38bdf8';
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

  draw(ctx: CanvasRenderingContext2D) {
    const W=this.width, H=this.height;
    ctx.fillStyle='#020510';
    ctx.fillRect(0,0,W,H);

    // 結晶をグラデーションで描画（核からの距離で色を変える）
    const imgData=ctx.createImageData(W,H);
    const cx=Math.floor(W/2), cy=Math.floor(H/2);
    const maxDist=Math.sqrt(cx*cx+cy*cy);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const i=y*W+x;
      if(this.grid[i]===1){
        const dist=Math.sqrt((x-cx)**2+(y-cy)**2)/maxDist;
        // 内側=白~青、外側=青~紫のグラデーション (デンドライト的)
        const r=Math.floor(180*(1-dist)+100*dist);
        const g=Math.floor(220*(1-dist)+80*dist);
        const b=Math.floor(255);
        imgData.data[i*4]=r; imgData.data[i*4+1]=g; imgData.data[i*4+2]=b; imgData.data[i*4+3]=255;
      } else {
        imgData.data[i*4]=2; imgData.data[i*4+1]=5; imgData.data[i*4+2]=16; imgData.data[i*4+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);

    // ウォーカー（拡散粒子）を薄く表示
    for(const w of this.walkers){
      ctx.fillStyle='rgba(100,150,255,0.25)';
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

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    // A相(φ<0)=深い青、B相(φ>0)=暖かいオレンジ、界面=白
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.max(-1,Math.min(1,this.phi[y*N+x]));
      let r,g,b;
      if(t>0){r=Math.floor(240*t+20*(1-t));g=Math.floor(120*t+20*(1-t));b=Math.floor(10*t+20*(1-t));}
      else{const s=-t;r=Math.floor(20*(1-s)+5*s);g=Math.floor(80*(1-s)+30*s);b=Math.floor(180*(1-s)+240*s);}
      // 界面強調
      const near=1-Math.abs(t);
      r=Math.floor(r+near*180); g=Math.floor(g+near*180); b=Math.floor(b+near*180);
      for(let dy=0;dy<scaleY;dy++) for(let dx=0;dx<scaleX;dx++){
        const px=x*scaleX+dx, py=y*scaleY+dy;
        if(px<imgData.width&&py<imgData.height){
          const i=(py*imgData.width+px)*4;
          imgData.data[i]=Math.min(255,r); imgData.data[i+1]=Math.min(255,g);
          imgData.data[i+2]=Math.min(255,b); imgData.data[i+3]=255;
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

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const u=this.u[y*N+x], v=this.v[y*N+x];
      // u: -1..2 → 色: 静止=暗紺、興奮=明るい黄緑、回復=紫
      const un=Math.max(0,Math.min(1,(u+1)/3));
      const vn=Math.max(0,Math.min(1,(v+0.5)/2));
      const r=Math.floor(un*255*(1-vn*0.5));
      const g=Math.floor(un*240);
      const b=Math.floor(30+vn*180*(1-un));
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
  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.size;
    for(let i=0;i<imgData.data.length;i+=4){imgData.data[i]=8;imgData.data[i+1]=10;imgData.data[i+2]=25;imgData.data[i+3]=255;}
    ctx.putImageData(imgData,0,0);
    const cellW=imgData.width/N, cellH=imgData.height/N;
    const rodHalf=Math.min(cellW,cellH)*0.45;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const th=this.theta[y*N+x];
      const right=this.theta[y*N+((x+1)%N)], down=this.theta[((y+1)%N)*N+x];
      const order=(Math.cos(2*(th-right))+Math.cos(2*(th-down))+2)/4;
      const hue=(th/Math.PI)*360;
      ctx.fillStyle=`hsl(${hue},70%,${15+order*20}%)`;
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
      ctx.strokeStyle=`hsla(${(th/Math.PI)*360},100%,${70+order*25}%,${0.4+order*0.6})`;
      ctx.beginPath();ctx.moveTo(cx2-dx2,cy2-dy2);ctx.lineTo(cx2+dx2,cy2+dy2);ctx.stroke();
    }
    for(let y=1;y<N-1;y+=2) for(let x=1;x<N-1;x+=2){
      const th00=this.theta[y*N+x], th10=this.theta[y*N+x+1];
      const th11=this.theta[(y+1)*N+x+1], th01=this.theta[(y+1)*N+x];
      const diffs=[angDiffNematic(th10,th00),angDiffNematic(th11,th10),angDiffNematic(th01,th11),angDiffNematic(th00,th01)];
      const winding=diffs.reduce((a,b)=>a+b,0)/Math.PI;
      const w=Math.round(winding*2)/2;
      if(Math.abs(w)>=0.4){
        ctx.beginPath();ctx.arc((x+1)*cellW,(y+1)*cellH,cellW*1.2,0,Math.PI*2);
        ctx.fillStyle=w>0?'rgba(255,220,80,0.55)':'rgba(100,200,255,0.55)';ctx.fill();
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

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.min(1,this.trail[y*N+x]*3); // 3x boost for visibility
      const t2=t*t;
      const r=Math.floor(t2*255);
      const g=Math.floor(t*200+t2*55);
      const b=Math.floor(t*30);
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

  draw(ctx: CanvasRenderingContext2D) {
    const N=this.N;
    const cw=this.width/N, ch=this.height/N;
    // 背景: 暗い緑（未開発）
    ctx.fillStyle='#0a120a'; ctx.fillRect(0,0,this.width,this.height);

    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const v=this.land[y*N+x];
      if(v===0){
        // 密度に応じて薄く色付け
        const d=this.density[y*N+x];
        if(d>0.05){ctx.fillStyle=`rgba(30,60,20,${d*0.5})`;ctx.fillRect(x*cw,y*ch,cw,ch);}
      } else if(v===1){
        // 住宅: 薄いオレンジ〜黄色
        const age=Math.random()*0.3;
        ctx.fillStyle=`hsl(35,${50+age*30}%,${25+this.density[y*N+x]*25}%)`;
        ctx.fillRect(x*cw,y*ch,cw,ch);
      } else if(v===2){
        // 道路: グレー
        ctx.fillStyle='#2a2a35'; ctx.fillRect(x*cw,y*ch,cw,ch);
        ctx.fillStyle='rgba(180,170,130,0.3)'; ctx.fillRect(x*cw+cw*0.35,y*ch+ch*0.35,cw*0.3,ch*0.3);
      } else if(v===3){
        // 商業: 青白く輝く
        ctx.fillStyle=`hsl(210,80%,${20+this.density[y*N+x]*30}%)`;
        ctx.fillRect(x*cw,y*ch,cw,ch);
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

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.N;
    let maxH=0.1;
    for(let i=0;i<this.height_field.length;i++) if(this.height_field[i]>maxH) maxH=this.height_field[i];

    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const t=Math.min(1,this.height_field[y*N+x]/maxH);
      // 砂漠の色: 暗い茶〜明るい砂色
      const r=Math.floor(20+t*210), g=Math.floor(15+t*160), b=Math.floor(5+t*60);
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

  draw(ctx: CanvasRenderingContext2D, imgData: ImageData) {
    const N=this.N;
    const scaleX=Math.floor(imgData.width/N), scaleY=Math.floor(imgData.height/N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const s=this.grid[y*N+x];
      let r=8,g=10,b=20;
      if(s===1){r=255;g=240;b=100;}   // 発火: 明るい黄
      else if(s===2){r=60;g=20;b=120;} // 不応期: 紫
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
