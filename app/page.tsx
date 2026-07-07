'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChladniPlate,
  ConvectionCell,
  ReactionDiffusion,
  BucklingChain,
  VoronoiRelaxation,
  IsingModel,
  VicsekModel,
  NematicLC,
  CrystalGrowth,
  CahnHilliard,
  ExcitableMedia,
  Physarum,
  UrbanGrowth,
  SandDune,
  BriansBrain,
} from './SimulationModels';

// ─────────────────────────────────────────────
// Model definitions
// ─────────────────────────────────────────────
const MODELS = [
  {
    id: 'chladni',
    name: 'Chladni Figures',
    principle: '波・共鳴',
    formula: 'sin(nπx/L)sin(mπy/L) − sin(mπx/L)sin(nπy/L) = 0',
    formulaLabel: 'Standing Wave Nodal Lines',
    desc: '定在波の節（振幅ゼロの面）に砂粒が集積することで幾何学的な対称パターンが現れる。「強制された自己組織化」の典型例。',
    accent: '#60a5fa', accentBg: 'rgba(96,165,250,0.08)', previewDim: 200,
  },
  {
    id: 'turing',
    name: 'Turing / Gray-Scott',
    principle: '反応拡散系',
    formula: '∂u/∂t = Dᵤ∇²u − uv² + f(1−u)\n∂v/∂t = D_v∇²v + uv² − (f+k)v',
    formulaLabel: 'Reaction-Diffusion Equations',
    desc: '局所的な自己触媒反応と長距離拡散による抑制の競合から、等間隔のスポットや迷路状縞模様が自発的に出現する。',
    accent: '#34d399', accentBg: 'rgba(52,211,153,0.08)', previewDim: 128,
  },
  {
    id: 'crystal',
    name: 'Crystal Growth (DLA)',
    principle: '拡散律速凝集',
    formula: 'P_stick = s · 1_{neighbor=crystal}\nRandom Walk → Contact → Aggregate',
    formulaLabel: 'Diffusion-Limited Aggregation',
    desc: '溶液中をランダムウォークした粒子が既存の結晶に触れると固着し、フラクタル次元 D≈1.71 のデンドライト（樹枝状結晶）を形成する。拡散律速の競合が複雑な枝分かれを生む。',
    accent: '#7dd3fc', accentBg: 'rgba(125,211,252,0.08)', previewDim: 200,
  },
  {
    id: 'cahnhilliard',
    name: 'Spinodal Decomposition',
    principle: '相分離',
    formula: '∂φ/∂t = M∇²μ\nμ = φ³ − φ − κ∇²φ',
    formulaLabel: 'Cahn-Hilliard Equation',
    desc: '均一に混合した２成分系が臨界点を通過すると、自発的に２相に分離していく。表面張力（κ）と拡散（M）のバランスで特徴的な長さスケールが選ばれる。',
    accent: '#fb923c', accentBg: 'rgba(251,146,60,0.08)', previewDim: 128,
  },
  {
    id: 'excitable',
    name: 'Spiral Waves',
    principle: '興奮性媒質',
    formula: '∂u/∂t = D∇²u + u(1−u²) − v\n∂v/∂t = ε(u − βv)',
    formulaLabel: 'FitzHugh-Nagumo Equations',
    desc: '神経細胞の発火・回復を模した興奮性媒質で、局所的な不均質が自発的にスパイラル波やターゲットパターンを生む。心臓の不整脈や化学反応波の原型。',
    accent: '#f472b6', accentBg: 'rgba(244,114,182,0.08)', previewDim: 100,
  },
  {
    id: 'physarum',
    name: 'Slime Mould Network',
    principle: 'スティグマジー・輸送最適化',
    formula: 'σ_ij(t+Δt) = f(Q_ij) · σ_ij(t)\nΔσ ∝ |flux| − decay',
    formulaLabel: 'Physarum Polycephalum Model',
    desc: '粘菌エージェントがフェロモン（トレイル）を探知・強化しながら移動することで、全体設計なしに最短経路ネットワークが創発する。東京の鉄道網と一致することで有名。',
    accent: '#a3e635', accentBg: 'rgba(163,230,53,0.08)', previewDim: 150,
  },
  {
    id: 'urban',
    name: 'Urban Growth',
    principle: '都市発展・集積経済',
    formula: 'P_grow(x) ∝ ρ(x) · road_bonus\ndρ/dt = D∇²ρ + growth',
    formulaLabel: 'Stochastic Urban Growth Model',
    desc: '人口密度・道路アクセス・集積効果の局所的な相互作用から、全体計画なしに住宅地・商業地・道路ネットワークが自発的に分化・形成される。',
    accent: '#fbbf24', accentBg: 'rgba(251,191,36,0.08)', previewDim: 100,
  },
  {
    id: 'sanddune',
    name: 'Barchan Dunes',
    principle: '風食・堆積',
    formula: 'dh/dt = −∇·q_s + erosion\nq_s ∝ (u_wind − u_th)^n',
    formulaLabel: 'Aeolian Sand Transport',
    desc: '風によって跳ぶ砂粒（サルテーション）が衝突・堆積・なだれを繰り返すことで、三日月形のバルカン砂丘が周期的に出現する。砂漠に秩序をもたらす風の自己組織化。',
    accent: '#d97706', accentBg: 'rgba(217,119,6,0.08)', previewDim: 100,
  },
  {
    id: 'brainsbrain',
    name: "Brian's Brain",
    principle: '神経様オートマトン',
    formula: 'on → refractory → off\noff → on  iff  Σ(on-neighbors) = θ',
    formulaLabel: '3-State Cellular Automaton',
    desc: '発火・不応期・静止の３状態のみで定義される最小限のルールから、持続的なスパイラル波・グライダー・振動子が自発的に出現する。神経回路網の原型モデル。',
    accent: '#c084fc', accentBg: 'rgba(192,132,252,0.08)', previewDim: 120,
  },
  {
    id: 'buckling',
    name: 'Buckling & Wrinkling',
    principle: '弾性・力学的不安定性',
    formula: '∂w/∂t = εw − (∇² + q₀²)²w − w³',
    formulaLabel: 'Swift-Hohenberg Equation',
    desc: '圧縮応力と曲げ剛性の競合により、系がエネルギーを逃すために自発的に空間的な波打ち構造を生む。座屈の臨界点で秩序が出現する。',
    accent: '#f43f5e', accentBg: 'rgba(244,63,94,0.08)', previewDim: 400,
  },
  {
    id: 'ising',
    name: 'Ising Model',
    principle: '対称性の自発的破れ',
    formula: 'H = −J Σᵢⱼ sᵢsⱼ\nP(flip) = min(1, e^{−ΔE/kT})',
    formulaLabel: 'Metropolis Algorithm',
    desc: '臨界温度 Tc ≈ 2.269 以下でスピンが自発磁化し、フラクタル的な境界をもつドメインへと相転移する。秩序-無秩序転移の原型。',
    accent: '#e879f9', accentBg: 'rgba(232,121,249,0.08)', previewDim: 200,
  },
  {
    id: 'vicsek',
    name: 'Vicsek Model',
    principle: '集団運動・フロッキング',
    formula: 'θᵢ(t+1) = ⟨θⱼ⟩_{|rᵢ−rⱼ|<r} + ηξᵢ',
    formulaLabel: 'Polar Flocking Transition',
    desc: 'ランダムなノイズ環境下で、近傍粒子との方向整合だけから巨視的な集団運動（フロッキング転移）が自発的に出現する。',
    accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.08)', previewDim: 400,
  },
  {
    id: 'nematic',
    name: 'Nematic Liquid Crystal',
    principle: '液晶秩序・位相欠陥',
    formula: 'H = −J Σᵢⱼ cos²(θᵢ−θⱼ)\n= −J/2 Σ cos(2(θᵢ−θⱼ))',
    formulaLabel: 'XY-type Nematic Hamiltonian',
    desc: '棒状分子が向きを揃えようとするネマティック相互作用から配向ドメインが出現し、±½ 位相欠陥（ディスクリネーション）が対をなして生成・消滅する。',
    accent: '#818cf8', accentBg: 'rgba(129,140,248,0.08)', previewDim: 150,
  },
  {
    id: 'voronoi',
    name: 'Lloyd / Voronoi',
    principle: '最小化原理',
    formula: 'd(x, pᵢ) < d(x, pⱼ)  ∀j≠i\n→ Lloyd relaxation',
    formulaLabel: 'Centroidal Voronoi Tessellation',
    desc: '点同士の反発力（エネルギー最小化）と境界拘束の均衡によって、空間が均等な多角形タイルへと自発的に分割される。',
    accent: '#a78bfa', accentBg: 'rgba(167,139,250,0.08)', previewDim: 400,
  },
  {
    id: 'convection',
    name: 'Rayleigh-Bénard',
    principle: '流体力学的不安定性',
    formula: 'Ra = αgΔTL³ / νκ  >  Ra_c ≈ 1708',
    formulaLabel: 'Rayleigh Number',
    desc: '下から加熱された流体が臨界温度差を超えると、自発的に規則正しい対流セルを形成する。熱エネルギーを空間秩序に変換する。',
    accent: '#f97316', accentBg: 'rgba(249,115,22,0.08)', previewDim: 100,
  },
];

type ModelId = typeof MODELS[number]['id'];

// ─────────────────────────────────────────────
// Default parameters
// ─────────────────────────────────────────────
const DEFAULT_PARAMS = {
  chladni:     { n: 3, m: 2, intensity: 25 },
  convection:  { rayleigh: 0.6, cooling: 0.6 },
  turing:      { f: 0.055, k: 0.062, Du: 0.2097, Dv: 0.105 },
  buckling:    { compression: 0.4, stiffness: 1.0 },
  voronoi:     { relaxation: 0.3 },
  ising:       { T: 2.4 },
  vicsek:      { v: 1, r: 25, noise: 0.3 },
  nematic:     { J: 0.5, noise: 0.6 },
  crystal:     { stickiness: 0.8, drift: 0.5 },
  cahnhilliard:{ mobility: 0.1, interfaceWidth: 1.0 },
  excitable:   { epsilon: 0.1, beta: 0.5 },
  physarum:    { sensorAngle: 45, speed: 1.0, deposit: 0.04 },
  urban:       { growthRate: 0.4, sprawl: 0.3 },
  sanddune:    { windSpeed: 0.6, angle: 0 },
  brainsbrain: { threshold: 2, density: 0.8 },
};

// ─────────────────────────────────────────────
// Gallery Card
// ─────────────────────────────────────────────
function GalleryCard({ model, onClick, index }: {
  model: typeof MODELS[number]; onClick: () => void; index: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef  = useRef<unknown>(null);
  const imgRef    = useRef<ImageData | null>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dim = model.previewDim;
    canvas.width = dim; canvas.height = dim;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    switch (model.id) {
      case 'chladni':     modelRef.current = new ChladniPlate(dim, dim, 2000); break;
      case 'convection':  modelRef.current = new ConvectionCell(dim, dim); break;
      case 'turing':      modelRef.current = new ReactionDiffusion(dim, dim); break;
      case 'buckling':    modelRef.current = new BucklingChain(dim, dim, 50); break;
      case 'voronoi':     modelRef.current = new VoronoiRelaxation(dim, dim, 40); break;
      case 'ising':       modelRef.current = new IsingModel(dim); break;
      case 'vicsek':      modelRef.current = new VicsekModel(dim, dim, 200); break;
      case 'nematic':     modelRef.current = new NematicLC(dim); break;
      case 'crystal':     modelRef.current = new CrystalGrowth(dim, dim); break;
      case 'cahnhilliard':modelRef.current = new CahnHilliard(dim, dim); break;
      case 'excitable':   modelRef.current = new ExcitableMedia(dim, dim); break;
      case 'physarum':    modelRef.current = new Physarum(dim, dim); break;
      case 'urban':       modelRef.current = new UrbanGrowth(dim, dim); break;
      case 'sanddune':    modelRef.current = new SandDune(dim, dim); break;
      case 'brainsbrain': modelRef.current = new BriansBrain(dim, dim); break;
    }

    const needsImgData = ['turing','ising','convection','nematic','cahnhilliard','excitable','physarum','sanddune','brainsbrain'];
    if (needsImgData.includes(model.id)) imgRef.current = ctx.createImageData(dim, dim);

    const p = DEFAULT_PARAMS[model.id as keyof typeof DEFAULT_PARAMS] as never;

    const loop = () => {
      switch (model.id) {
        case 'chladni':
          (modelRef.current as ChladniPlate).update(p);
          (modelRef.current as ChladniPlate).draw(ctx); break;
        case 'convection':
          (modelRef.current as ConvectionCell).update(p);
          if (imgRef.current)(modelRef.current as ConvectionCell).draw(ctx, imgRef.current); break;
        case 'turing':
          for (let i = 0; i < 20; i++)(modelRef.current as ReactionDiffusion).update(p);
          if (imgRef.current)(modelRef.current as ReactionDiffusion).draw(ctx, imgRef.current); break;
        case 'buckling':
          (modelRef.current as BucklingChain).update(p);
          (modelRef.current as BucklingChain).draw(ctx); break;
        case 'voronoi':
          (modelRef.current as VoronoiRelaxation).update(p);
          (modelRef.current as VoronoiRelaxation).draw(ctx); break;
        case 'ising':
          (modelRef.current as IsingModel).update(p, 15000);
          if (imgRef.current)(modelRef.current as IsingModel).draw(ctx, imgRef.current); break;
        case 'vicsek':
          (modelRef.current as VicsekModel).update(p);
          (modelRef.current as VicsekModel).draw(ctx); break;
        case 'nematic':
          for (let i = 0; i < 3; i++)(modelRef.current as NematicLC).update(p);
          if (imgRef.current)(modelRef.current as NematicLC).draw(ctx, imgRef.current); break;
        case 'crystal':
          for (let i = 0; i < 5; i++)(modelRef.current as CrystalGrowth).update(p);
          (modelRef.current as CrystalGrowth).draw(ctx); break;
        case 'cahnhilliard':
          for (let i = 0; i < 8; i++)(modelRef.current as CahnHilliard).update(p);
          if (imgRef.current)(modelRef.current as CahnHilliard).draw(ctx, imgRef.current); break;
        case 'excitable':
          (modelRef.current as ExcitableMedia).update(p);
          if (imgRef.current)(modelRef.current as ExcitableMedia).draw(ctx, imgRef.current); break;
        case 'physarum':
          for (let i = 0; i < 3; i++)(modelRef.current as Physarum).update(p);
          if (imgRef.current)(modelRef.current as Physarum).draw(ctx, imgRef.current); break;
        case 'urban':
          (modelRef.current as UrbanGrowth).update(p);
          (modelRef.current as UrbanGrowth).draw(ctx); break;
        case 'sanddune':
          for (let i = 0; i < 3; i++)(modelRef.current as SandDune).update(p);
          if (imgRef.current)(modelRef.current as SandDune).draw(ctx, imgRef.current); break;
        case 'brainsbrain':
          (modelRef.current as BriansBrain).update(p);
          if (imgRef.current)(modelRef.current as BriansBrain).draw(ctx, imgRef.current); break;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const delay = setTimeout(() => { rafRef.current = requestAnimationFrame(loop); }, index * 100);
    return () => { clearTimeout(delay); cancelAnimationFrame(rafRef.current); };
  }, [model.id, model.previewDim, index]);

  return (
    <div
      className="gallery-card animate-fadeup"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open ${model.name} simulation`}
    >
      <canvas ref={canvasRef} />
      <div className="card-overlay">
        <div className="tag">{model.principle}</div>
        <div className="card-title">{model.name}</div>
        <div className="card-subtitle">{model.formulaLabel}</div>
      </div>
      <div style={{
        position:'absolute',top:14,right:14,width:32,height:32,borderRadius:'50%',
        background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',
        opacity:0,transition:'opacity 0.2s ease',
      }} className="card-arrow">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Simulation View
// ─────────────────────────────────────────────
function SimulationView({ modelId, onBack }: { modelId: ModelId; onBack: () => void }) {
  const model = MODELS.find((m) => m.id === modelId)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);

  // Model refs
  const chladniRef  = useRef<ChladniPlate | null>(null);
  const convRef     = useRef<ConvectionCell | null>(null);
  const rdRef       = useRef<ReactionDiffusion | null>(null);
  const buckRef     = useRef<BucklingChain | null>(null);
  const voronoiRef  = useRef<VoronoiRelaxation | null>(null);
  const isingRef    = useRef<IsingModel | null>(null);
  const vicsekRef   = useRef<VicsekModel | null>(null);
  const nematicRef  = useRef<NematicLC | null>(null);
  const crystalRef  = useRef<CrystalGrowth | null>(null);
  const cahnRef     = useRef<CahnHilliard | null>(null);
  const excitRef    = useRef<ExcitableMedia | null>(null);
  const physarumRef = useRef<Physarum | null>(null);
  const urbanRef    = useRef<UrbanGrowth | null>(null);
  const duneRef     = useRef<SandDune | null>(null);
  const brainRef    = useRef<BriansBrain | null>(null);
  const imgDataRef  = useRef<ImageData | null>(null);

  // Parameter states
  const [cp,   setCp]   = useState(DEFAULT_PARAMS.chladni);
  const [conv, setConv] = useState(DEFAULT_PARAMS.convection);
  const [rd,   setRd]   = useState(DEFAULT_PARAMS.turing);
  const [buck, setBuck] = useState(DEFAULT_PARAMS.buckling);
  const [vor,  setVor]  = useState(DEFAULT_PARAMS.voronoi);
  const [ising,setIsing]= useState(DEFAULT_PARAMS.ising);
  const [vic,  setVic]  = useState(DEFAULT_PARAMS.vicsek);
  const [nem,  setNem]  = useState(DEFAULT_PARAMS.nematic);
  const [crys, setCrys] = useState(DEFAULT_PARAMS.crystal);
  const [cahn, setCahn] = useState(DEFAULT_PARAMS.cahnhilliard);
  const [excit,setExcit]= useState(DEFAULT_PARAMS.excitable);
  const [phy,  setPhy]  = useState(DEFAULT_PARAMS.physarum);
  const [urb,  setUrb]  = useState(DEFAULT_PARAMS.urban);
  const [dune, setDune] = useState(DEFAULT_PARAMS.sanddune);
  const [brain,setBrain]= useState(DEFAULT_PARAMS.brainsbrain);

  // Canvas dimensions per model
  const getDim = useCallback(() => {
    switch (modelId) {
      case 'ising':       return { w: 200, h: 200 };
      case 'turing':      return { w: 256, h: 256 };
      case 'convection':  return { w: 100, h: 100 };
      case 'nematic':     return { w: 300, h: 300 };
      case 'crystal':     return { w: 200, h: 200 };
      case 'cahnhilliard':return { w: 256, h: 256 };
      case 'excitable':   return { w: 300, h: 300 };
      case 'physarum':    return { w: 300, h: 300 };
      case 'urban':       return { w: 300, h: 300 };
      case 'sanddune':    return { w: 300, h: 300 };
      case 'brainsbrain': return { w: 300, h: 300 };
      default:            return { w: 400, h: 400 };
    }
  }, [modelId]);

  const resetCurrent = useCallback(() => {
    switch (modelId) {
      case 'chladni':     chladniRef.current  = new ChladniPlate(400, 400, 3000); break;
      case 'convection':  convRef.current     = new ConvectionCell(100, 100); break;
      case 'turing':      rdRef.current       = new ReactionDiffusion(256, 256); break;
      case 'buckling':    buckRef.current?.reset(); break;
      case 'voronoi':     voronoiRef.current  = new VoronoiRelaxation(400, 400, 50); break;
      case 'ising':       isingRef.current    = new IsingModel(200); break;
      case 'vicsek':      vicsekRef.current   = new VicsekModel(400, 400, 600); break;
      case 'nematic':     nematicRef.current  = new NematicLC(300); break;
      case 'crystal':     crystalRef.current  = new CrystalGrowth(200, 200); break;
      case 'cahnhilliard':cahnRef.current?.reset(); break;
      case 'excitable':   excitRef.current?.reset(); break;
      case 'physarum':    physarumRef.current?.reset(); break;
      case 'urban':       urbanRef.current?.reset(); break;
      case 'sanddune':    duneRef.current?.reset(); break;
      case 'brainsbrain': brainRef.current?.reset(); break;
    }
  }, [modelId]);

  const initModels = useCallback(() => {
    chladniRef.current  = new ChladniPlate(400, 400, 3000);
    convRef.current     = new ConvectionCell(100, 100);
    rdRef.current       = new ReactionDiffusion(256, 256);
    buckRef.current     = new BucklingChain(400, 400, 50);
    voronoiRef.current  = new VoronoiRelaxation(400, 400, 50);
    isingRef.current    = new IsingModel(200);
    vicsekRef.current   = new VicsekModel(400, 400, 600);
    nematicRef.current  = new NematicLC(300);
    crystalRef.current  = new CrystalGrowth(200, 200);
    cahnRef.current     = new CahnHilliard(256, 256);
    excitRef.current    = new ExcitableMedia(300, 300);
    physarumRef.current = new Physarum(300, 300);
    urbanRef.current    = new UrbanGrowth(300, 300);
    duneRef.current     = new SandDune(300, 300);
    brainRef.current    = new BriansBrain(300, 300);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const { w, h } = getDim();
        imgDataRef.current = ctx.createImageData(w, h);
      }
    }
  }, [getDim]);

  useEffect(() => { initModels(); }, [initModels]);

  // Recreate imgData when model changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const { w, h } = getDim();
    imgDataRef.current = ctx.createImageData(w, h);
  }, [modelId, getDim]);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { rafId = requestAnimationFrame(loop); return; }

      const { w, h } = getDim();
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      if (!imgDataRef.current || imgDataRef.current.width !== w) {
        imgDataRef.current = ctx.createImageData(w, h);
      }
      const img = imgDataRef.current;

      if (running) {
        switch (modelId) {
          case 'chladni':
            chladniRef.current?.update(cp); chladniRef.current?.draw(ctx); break;
          case 'convection':
            convRef.current?.update(conv); convRef.current?.draw(ctx, img); break;
          case 'turing':
            for (let i = 0; i < 15; i++) rdRef.current?.update(rd);
            rdRef.current?.draw(ctx, img); break;
          case 'buckling':
            buckRef.current?.update(buck); buckRef.current?.draw(ctx); break;
          case 'voronoi':
            voronoiRef.current?.update(vor); voronoiRef.current?.draw(ctx); break;
          case 'ising':
            isingRef.current?.update(ising, 40000); isingRef.current?.draw(ctx, img); break;
          case 'vicsek':
            vicsekRef.current?.update(vic); vicsekRef.current?.draw(ctx); break;
          case 'nematic':
            for (let i = 0; i < 5; i++) nematicRef.current?.update(nem);
            nematicRef.current?.draw(ctx, img); break;
          case 'crystal':
            for (let i = 0; i < 8; i++) crystalRef.current?.update(crys);
            crystalRef.current?.draw(ctx); break;
          case 'cahnhilliard':
            for (let i = 0; i < 10; i++) cahnRef.current?.update(cahn);
            cahnRef.current?.draw(ctx, img); break;
          case 'excitable':
            excitRef.current?.update(excit); excitRef.current?.draw(ctx, img); break;
          case 'physarum':
            for (let i = 0; i < 4; i++) physarumRef.current?.update(phy);
            physarumRef.current?.draw(ctx, img); break;
          case 'urban':
            urbanRef.current?.update(urb); urbanRef.current?.draw(ctx); break;
          case 'sanddune':
            for (let i = 0; i < 3; i++) duneRef.current?.update(dune);
            duneRef.current?.draw(ctx, img); break;
          case 'brainsbrain':
            brainRef.current?.update(brain); brainRef.current?.draw(ctx, img); break;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [modelId, running, cp, conv, rd, buck, vor, ising, vic, nem, crys, cahn, excit, phy, urb, dune, brain, getDim]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display:'flex',alignItems:'center',gap:16,padding:'14px 28px',
        borderBottom:'1px solid var(--border)',background:'rgba(6,6,10,0.85)',
        backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50,
      }}>
        <button onClick={onBack} style={{
          display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,
          border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94a3b8',
          fontSize:13,cursor:'pointer',fontWeight:500,transition:'all 0.15s ease',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color='#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color='#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.1)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H4M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Gallery
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span className="tag" style={{ color:model.accent,borderColor:`${model.accent}40`,background:model.accentBg }}>
              {model.principle}
            </span>
            <h1 style={{ fontSize:18,fontWeight:700,color:'#f1f5f9' }}>{model.name}</h1>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          {running && <div className="live-dot" />}
          <button onClick={resetCurrent} className="btn-pill"
            style={{ background:'rgba(255,255,255,0.04)',color:'#94a3b8',borderColor:'rgba(255,255,255,0.12)' }}>
            Reset
          </button>
          <button onClick={() => setRunning(!running)} className="btn-pill"
            style={{
              background: running?'rgba(251,191,36,0.08)':'rgba(52,211,153,0.08)',
              color: running?'#fbbf24':'#34d399',
              borderColor: running?'rgba(251,191,36,0.25)':'rgba(52,211,153,0.25)',
            }}>
            {running ? 'Pause' : 'Resume'}
          </button>
        </div>
      </header>

      <main style={{ flex:1,display:'flex',gap:16,padding:'16px 20px',overflow:'hidden' }}>
        <div style={{ flex:1,display:'flex',flexDirection:'column',gap:16 }}>
          <div className="sim-panel" style={{
            flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24,overflow:'hidden',
            background:`radial-gradient(ellipse at center, ${model.accentBg} 0%, var(--surface) 70%)`,
          }}>
            <canvas ref={canvasRef} style={{
              maxWidth:'100%',maxHeight:'100%',objectFit:'contain',
              borderRadius:8,imageRendering:'pixelated',
              boxShadow:`0 0 40px ${model.accent}22`,
            }} />
          </div>
          <div className="formula-box" style={{ borderColor:`${model.accent}30`,color:model.accent }}>
            <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8,opacity:0.6 }}>
              {model.formulaLabel}
            </div>
            {model.formula.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>

        <div className="sim-panel" style={{ width:300,padding:24,display:'flex',flexDirection:'column',gap:20,overflowY:'auto' }}>
          <div>
            <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#475569',marginBottom:10 }}>
              Description
            </div>
            <p style={{ fontSize:13,color:'#94a3b8',lineHeight:1.7 }}>{model.desc}</p>
          </div>

          <div style={{ borderTop:'1px solid var(--border)',paddingTop:20 }}>
            <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#475569',marginBottom:16 }}>
              Parameters
            </div>

            {modelId==='chladni' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Mode N" value={cp.n} display={String(cp.n)} min={1} max={10} step={1} accent={model.accent} onChange={(v)=>setCp({...cp,n:v})} />
                <SliderField label="Mode M" value={cp.m} display={String(cp.m)} min={1} max={10} step={1} accent={model.accent} onChange={(v)=>setCp({...cp,m:v})} />
                <ResetBtn onClick={()=>{chladniRef.current=new ChladniPlate(400,400,3000);}} label="Respawn Sand" />
              </div>
            )}

            {modelId==='convection' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Heating (Rayleigh)" value={conv.rayleigh} display={conv.rayleigh.toFixed(2)} min={0.1} max={2.0} step={0.1} accent={model.accent} onChange={(v)=>setConv({...conv,rayleigh:v})} />
                <SliderField label="Cooling Rate" value={conv.cooling} display={conv.cooling.toFixed(2)} min={0.1} max={2.0} step={0.1} accent={model.accent} onChange={(v)=>setConv({...conv,cooling:v})} />
                <ResetBtn onClick={()=>{convRef.current=new ConvectionCell(100,100);}} label="Reset Fluid" />
              </div>
            )}

            {modelId==='turing' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Feed Rate (f)" value={rd.f} display={rd.f.toFixed(4)} min={0.01} max={0.08} step={0.001} accent={model.accent} onChange={(v)=>setRd({...rd,f:v})} />
                <SliderField label="Kill Rate (k)" value={rd.k} display={rd.k.toFixed(4)} min={0.04} max={0.075} step={0.001} accent={model.accent} onChange={(v)=>setRd({...rd,k:v})} />
                <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
                  <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#475569',marginBottom:10 }}>Presets</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {[{label:'Spots',f:0.055,k:0.062},{label:'Stripes',f:0.035,k:0.065},{label:'Labyrinth',f:0.037,k:0.060}].map((p)=>(
                      <button key={p.label} onClick={()=>setRd({...rd,f:p.f,k:p.k})}
                        style={{ padding:'8px 12px',borderRadius:7,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',color:'#94a3b8',fontSize:12,cursor:'pointer',textAlign:'left',transition:'all 0.15s ease' }}
                        onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(52,211,153,0.08)';(e.currentTarget as HTMLButtonElement).style.color=model.accent;}}
                        onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLButtonElement).style.color='#94a3b8';}}
                      >{p.label} — f={p.f}, k={p.k}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {modelId==='crystal' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Stickiness (s)" value={crys.stickiness} display={crys.stickiness.toFixed(2)} min={0.1} max={1.0} step={0.05} accent={model.accent} onChange={(v)=>setCrys({...crys,stickiness:v})} />
                <SliderField label="Inward Drift" value={crys.drift} display={crys.drift.toFixed(2)} min={0.0} max={2.0} step={0.1} accent={model.accent} onChange={(v)=>setCrys({...crys,drift:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(125,211,252,0.05)',border:'1px solid rgba(125,211,252,0.15)',fontSize:12,color:'#7dd3fc',lineHeight:1.6 }}>
                  低 stickiness = より細かい枝分かれ<br/>
                  高 drift = よりコンパクトな結晶
                </div>
                <ResetBtn onClick={()=>crystalRef.current?.reset()} label="New Crystal" />
              </div>
            )}

            {modelId==='cahnhilliard' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Mobility (M)" value={cahn.mobility} display={cahn.mobility.toFixed(2)} min={0.01} max={0.5} step={0.01} accent={model.accent} onChange={(v)=>setCahn({...cahn,mobility:v})} />
                <SliderField label="Interface Width (κ)" value={cahn.interfaceWidth} display={cahn.interfaceWidth.toFixed(2)} min={0.2} max={3.0} step={0.1} accent={model.accent} onChange={(v)=>setCahn({...cahn,interfaceWidth:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(251,146,60,0.05)',border:'1px solid rgba(251,146,60,0.15)',fontSize:12,color:'#fdba74',lineHeight:1.6 }}>
                  大 M = 速い相分離<br/>
                  大 κ = 広い界面・大きな構造
                </div>
                <ResetBtn onClick={()=>cahnRef.current?.reset()} label="Remix Phases" />
              </div>
            )}

            {modelId==='excitable' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Time Scale (ε)" value={excit.epsilon} display={excit.epsilon.toFixed(2)} min={0.01} max={0.5} step={0.01} accent={model.accent} onChange={(v)=>setExcit({...excit,epsilon:v})} />
                <SliderField label="Recovery Rate (β)" value={excit.beta} display={excit.beta.toFixed(2)} min={0.1} max={2.0} step={0.05} accent={model.accent} onChange={(v)=>setExcit({...excit,beta:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(244,114,182,0.05)',border:'1px solid rgba(244,114,182,0.15)',fontSize:12,color:'#f9a8d4',lineHeight:1.6 }}>
                  小 ε = 速い回復・細かいスパイラル<br/>
                  大 β = 不応期が長い
                </div>
                <ResetBtn onClick={()=>excitRef.current?.reset()} label="Restart Waves" />
              </div>
            )}

            {modelId==='physarum' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Sensor Angle (°)" value={phy.sensorAngle} display={`${phy.sensorAngle}°`} min={10} max={90} step={5} accent={model.accent} onChange={(v)=>setPhy({...phy,sensorAngle:v})} />
                <SliderField label="Speed" value={phy.speed} display={phy.speed.toFixed(2)} min={0.2} max={3.0} step={0.1} accent={model.accent} onChange={(v)=>setPhy({...phy,speed:v})} />
                <SliderField label="Deposit Rate" value={phy.deposit} display={phy.deposit.toFixed(3)} min={0.005} max={0.1} step={0.005} accent={model.accent} onChange={(v)=>setPhy({...phy,deposit:v})} />
                <ResetBtn onClick={()=>physarumRef.current?.reset()} label="Reset Network" />
              </div>
            )}

            {modelId==='urban' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Growth Rate" value={urb.growthRate} display={urb.growthRate.toFixed(2)} min={0.05} max={1.0} step={0.05} accent={model.accent} onChange={(v)=>setUrb({...urb,growthRate:v})} />
                <SliderField label="Urban Sprawl" value={urb.sprawl} display={urb.sprawl.toFixed(2)} min={0.05} max={1.0} step={0.05} accent={model.accent} onChange={(v)=>setUrb({...urb,sprawl:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',fontSize:11,color:'#fcd34d',lineHeight:1.7 }}>
                  <span style={{ color:'#fb923c' }}>■</span> 商業地（高密度・道路沿い）<br/>
                  <span style={{ color:'#d97706' }}>■</span> 住宅地<br/>
                  <span style={{ color:'#374151' }}>■</span> 道路<br/>
                  <span style={{ color:'#166534' }}>■</span> 未開発地
                </div>
                <ResetBtn onClick={()=>urbanRef.current?.reset()} label="New City" />
              </div>
            )}

            {modelId==='sanddune' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Wind Speed" value={dune.windSpeed} display={dune.windSpeed.toFixed(2)} min={0.1} max={2.0} step={0.1} accent={model.accent} onChange={(v)=>setDune({...dune,windSpeed:v})} />
                <SliderField label="Wind Direction (°)" value={dune.angle} display={`${dune.angle}°`} min={0} max={360} step={15} accent={model.accent} onChange={(v)=>setDune({...dune,angle:v})} />
                <ResetBtn onClick={()=>duneRef.current?.reset()} label="New Desert" />
              </div>
            )}

            {modelId==='brainsbrain' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Fire Threshold (θ)" value={brain.threshold} display={String(brain.threshold)} min={1} max={4} step={1} accent={model.accent} onChange={(v)=>setBrain({...brain,threshold:v})} />
                <SliderField label="Activation Density" value={brain.density} display={brain.density.toFixed(2)} min={0.1} max={1.0} step={0.05} accent={model.accent} onChange={(v)=>setBrain({...brain,density:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(192,132,252,0.05)',border:'1px solid rgba(192,132,252,0.15)',fontSize:11,color:'#d8b4fe',lineHeight:1.7 }}>
                  <span style={{ color:'#fde68a' }}>■</span> 発火中<br/>
                  <span style={{ color:'#7c3aed' }}>■</span> 不応期<br/>
                  <span style={{ color:'#1e1b4b' }}>■</span> 静止
                </div>
                <ResetBtn onClick={()=>brainRef.current?.reset()} label="Reset Neurons" />
              </div>
            )}

            {modelId==='buckling' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="超臨界度 ε (ε>0で座屈)" value={buck.compression} display={buck.compression.toFixed(2)} min={-0.2} max={1.5} step={0.05} accent={model.accent} onChange={(v)=>setBuck({...buck,compression:v})} />
                <SliderField label="優先波数 q₀ (しわの細かさ)" value={buck.stiffness} display={buck.stiffness.toFixed(2)} min={0.3} max={3.0} step={0.1} accent={model.accent} onChange={(v)=>setBuck({...buck,stiffness:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(244,63,94,0.05)',border:'1px solid rgba(244,63,94,0.15)',fontSize:11,color:'#f87171',lineHeight:1.6 }}>
                  ε &lt; 0 : 平坦（安定）<br/>ε = 0 : 臨界点<br/>ε &gt; 0 : しわパターン出現
                </div>
                <ResetBtn onClick={()=>buckRef.current?.reset()} label="Reset Sheet" />
              </div>
            )}

            {modelId==='voronoi' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Relaxation Speed" value={vor.relaxation} display={vor.relaxation.toFixed(2)} min={0.0} max={2.0} step={0.1} accent={model.accent} onChange={(v)=>setVor({...vor,relaxation:v})} />
                <ResetBtn onClick={()=>{voronoiRef.current=new VoronoiRelaxation(400,400,50);}} label="Randomize Seeds" />
              </div>
            )}

            {modelId==='ising' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Temperature (T)" value={ising.T} display={ising.T.toFixed(2)} min={0.1} max={5.0} step={0.05} accent={model.accent} onChange={(v)=>setIsing({...ising,T:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(232,121,249,0.06)',border:'1px solid rgba(232,121,249,0.15)',fontSize:12,color:'#c084fc',lineHeight:1.6 }}>
                  Critical Temp <span style={{ fontFamily:'var(--font-geist-mono)',color:model.accent }}>Tc ≈ 2.269</span>
                </div>
                <ResetBtn onClick={()=>{isingRef.current=new IsingModel(200);}} label="Reset Spins" />
              </div>
            )}

            {modelId==='vicsek' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Noise (η)" value={vic.noise} display={`${vic.noise.toFixed(2)} rad`} min={0} max={3.14} step={0.01} accent={model.accent} onChange={(v)=>setVic({...vic,noise:v})} />
                <SliderField label="Interaction Radius" value={vic.r} display={`${vic.r} px`} min={5} max={100} step={1} accent={model.accent} onChange={(v)=>setVic({...vic,r:v})} />
                <SliderField label="Speed (v)" value={vic.v} display={String(vic.v)} min={1} max={6} step={0.5} accent={model.accent} onChange={(v)=>setVic({...vic,v:v})} />
              </div>
            )}

            {modelId==='nematic' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Coupling Strength (J)" value={nem.J} display={nem.J.toFixed(2)} min={0.1} max={2.0} step={0.05} accent={model.accent} onChange={(v)=>setNem({...nem,J:v})} />
                <SliderField label="Thermal Noise" value={nem.noise} display={nem.noise.toFixed(2)} min={0.1} max={3.0} step={0.05} accent={model.accent} onChange={(v)=>setNem({...nem,noise:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(129,140,248,0.06)',border:'1px solid rgba(129,140,248,0.15)',fontSize:12,color:'#a5b4fc',lineHeight:1.7 }}>
                  <span style={{ color:'#fde68a' }}>●</span> +½ ディスクリネーション<br />
                  <span style={{ color:'#7dd3fc' }}>●</span> −½ ディスクリネーション
                </div>
                <ResetBtn onClick={()=>{nematicRef.current=new NematicLC(300);}} label="Reset Directors" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared UI components
// ─────────────────────────────────────────────
function SliderField({ label, value, display, min, max, step, accent, onChange }: {
  label: string; value: number; display: string;
  min: number; max: number; step: number; accent: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
        <span style={{ fontSize:12,color:'#64748b' }}>{label}</span>
        <span style={{ fontSize:12,fontFamily:'var(--font-geist-mono)',color:accent }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-track" style={{ accentColor:accent } as React.CSSProperties} />
    </div>
  );
}

function ResetBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      width:'100%',padding:'9px',borderRadius:8,
      border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)',
      color:'#64748b',fontSize:12,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',
      cursor:'pointer',transition:'all 0.15s ease',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color='#e2e8f0'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.color='#64748b'; }}
    >{label}</button>
  );
}

// ─────────────────────────────────────────────
// Gallery View
// ─────────────────────────────────────────────
function GalleryView({ onSelect }: { onSelect: (id: ModelId) => void }) {
  return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column' }}>
      <header style={{
        padding:'60px 40px 40px',textAlign:'center',
        background:'radial-gradient(ellipse at 50% 0%, rgba(79,110,247,0.12) 0%, transparent 70%)',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,padding:'4px 14px',borderRadius:9999,
          border:'1px solid rgba(79,110,247,0.3)',background:'rgba(79,110,247,0.08)',
          fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#818cf8',marginBottom:24,
        }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:'#818cf8',display:'inline-block' }} />
          Interactive Simulations
        </div>
        <h1 style={{
          fontSize:'clamp(36px, 5vw, 64px)',fontWeight:800,lineHeight:1.1,letterSpacing:'-0.03em',
          background:'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:16,
        }}>
          Self-Organization Lab
        </h1>
        <p style={{ fontSize:16,color:'#64748b',maxWidth:560,margin:'0 auto',lineHeight:1.7 }}>
          秩序はどのように生まれるか。15の自己組織化原理を、<br />
          リアルタイムシミュレーションで探索する。
        </p>
      </header>

      <main style={{ flex:1,padding:'36px 32px 48px' }}>
        <div style={{
          display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
          gap:20,maxWidth:1400,margin:'0 auto',
        }}>
          {MODELS.map((model, i) => (
            <GalleryCard key={model.id} model={model} index={i} onClick={() => onSelect(model.id as ModelId)} />
          ))}
        </div>
      </main>

      <footer style={{ padding:'20px 40px',borderTop:'1px solid var(--border)',textAlign:'center',fontSize:12,color:'#334155' }}>
        Click any card to open an interactive simulation
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<ModelId | null>(null);
  if (selected) {
    return <SimulationView modelId={selected} onBack={() => setSelected(null)} />;
  }
  return <GalleryView onSelect={(id) => setSelected(id)} />;
}
