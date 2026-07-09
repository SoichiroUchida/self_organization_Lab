'use client';

import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import ExportPanel from './ExportPanel';
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
  GameOfLife,
  ElementaryCA,
  LangtonsAnt,
  WireWorld,
  Boids,
  BelousovZhabotinsky,
  ForestFire,
  Percolation,
  Lenia,
  SchellingSegregation,
  AbelianSandpile,
  Murmuration,
  HodgepodgeMachine,
  type ColorMode,
} from './SimulationModels';

// ─────────────────────────────────────────────
// Color mode context
// ─────────────────────────────────────────────
const ColorModeContext = createContext<ColorMode>('color');
const useColorMode = () => useContext(ColorModeContext);

const COLOR_MODE_LABELS: { id: ColorMode; label: string }[] = [
  { id: 'color',     label: 'Color' },
  { id: 'grayscale', label: 'Gray' },
  { id: 'navy',      label: 'Navy' },
  { id: 'orange',    label: 'Orange' },
];

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
    id: 'gameoflife',
    name: "Conway's Game of Life",
    principle: 'セルオートマトン',
    formula: 'B3/S23\n誕生: 隣接3 → 生　生存: 隣接2or3 → 生',
    formulaLabel: "Conway's Rules (B3/S23)",
    desc: '生・死の2状態と最近傍8セルのみで定義される最小限のルールから、グライダー・振動子・静止パターン・グライダーガンといった多様な構造が自発的に創発する。チューリング完全であることも示されている。',
    accent: '#4ade80', accentBg: 'rgba(74,222,128,0.08)', previewDim: 200,
  },
  {
    id: 'elementaryca',
    name: 'Elementary CA',
    principle: 'ウォルフラム1次元CA',
    formula: '(l, c, r) → rule[(l≪2)|(c≪1)|r]\nRule 30: カオス　Rule 110: チューリング完全',
    formulaLabel: 'Wolfram Elementary Cellular Automaton',
    desc: '3セルの近傍パターン8通りを1ビットずつ指定するルール番号(0–255)で次状態が決まる最も単純なCA。Rule 30はランダムに見えるカオスを生成し貝殻模様の起源とも。Rule 110はチューリング完全、Rule 90はシェルピンスキー三角形を作る。',
    accent: '#94a3b8', accentBg: 'rgba(148,163,184,0.08)', previewDim: 300,
  },
  {
    id: 'langtonsant',
    name: "Langton's Ant",
    principle: 'チューリングマシン的CA',
    formula: '白マス: 右折・黒反転\n黒マス: 左折・白反転',
    formulaLabel: "Langton's Ant — 2-State 2-Symbol Turmite",
    desc: 'たった2つのルールで動くアリが約10,000ステップのカオス的な軌跡の後、自発的に周期104の「高速道路」と呼ばれる規則的な直進パターンを形成する。単純さからの複雑性創発の典型例。',
    accent: '#f97316', accentBg: 'rgba(249,115,22,0.08)', previewDim: 200,
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
  {
    id: 'wireworld',
    name: 'WireWorld',
    principle: '電子回路CA',
    formula: '銅線→頭(1or2隣接頭のとき)\n頭→尾　尾→銅線',
    formulaLabel: 'Fredkin / Berlekamp WireWorld Rules',
    desc: '空・銅線・電子頭・電子尾の4状態だけで定義されるCA。配線パターンの設計によりANDゲート・ORゲート・時計・コンピュータまで構築できる電子回路シミュレータ。',
    accent: '#fbbf24', accentBg: 'rgba(251,191,36,0.08)', previewDim: 200,
  },
  {
    id: 'boids',
    name: 'Boids Flocking',
    principle: '群れ・集団行動',
    formula: 'v_i ← v_i + w_s·F_sep + w_a·F_ali + w_c·F_coh',
    formulaLabel: 'Reynolds Flocking Rules',
    desc: '分離（衝突回避）・整列（方向揃え）・結合（群れ中心引力）の3ルールだけから、鳥の群れのような流動的な集団行動が創発する。中央制御なしで生まれる秩序の典型例。',
    accent: '#93c5fd', accentBg: 'rgba(147,197,253,0.08)', previewDim: 300,
  },
  {
    id: 'belousovzhabotinsky',
    name: 'Belousov-Zhabotinsky',
    principle: '化学振動・非平衡反応',
    formula: '∂a/∂t = D∇²a + k₁a(1-a) - ab\n∂b/∂t = 0.02(a - k₂b)',
    formulaLabel: 'Oregonator-like Reaction-Diffusion',
    desc: 'マロン酸の臭素酸化という化学反応で観察される非平衡振動。活性化因子と抑制因子の競合から螺旋波・ターゲットパターンが自発形成される。非線形化学の象徴的な実験。',
    accent: '#f472b6', accentBg: 'rgba(244,114,182,0.08)', previewDim: 200,
  },
  {
    id: 'forestfire',
    name: 'Forest Fire',
    principle: '自己組織化臨界・相転移',
    formula: 'P(fire|neighbor burning) = 1\nP(ignite|lightning) = f\nP(regrow) = p',
    formulaLabel: 'Drossel-Schwabl Forest Fire Model',
    desc: '木・燃焼中・更地の3状態CA。木の密度が臨界値 p_c ≈ 0.593 を超えると燃え広がりが浸透（パーコレーション）し、任意規模の山火事が発生するべき乗則分布を示す。',
    accent: '#fb923c', accentBg: 'rgba(251,146,60,0.08)', previewDim: 200,
  },
  {
    id: 'percolation',
    name: 'Percolation',
    principle: '格子浸透・臨界現象',
    formula: 'P(site open) = p\np_c ≈ 0.593 (square lattice)',
    formulaLabel: 'Site Percolation on Square Lattice',
    desc: '確率pで格子点を開き、上端から下端まで流れが連通するか調べる。臨界点 p_c ≈ 0.593 でクラスターが自己相似なフラクタル構造（フラクタル次元 D≈1.896）を示す。',
    accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.08)', previewDim: 200,
  },
  {
    id: 'lenia',
    name: 'Lenia',
    principle: '連続セルオートマトン',
    formula: 'A^(t+Δt) = clip(A^t + Δt·G(K★A^t))\nG(u) = 2e^{-(u-μ)²/2σ²} - 1',
    formulaLabel: 'Continuous Cellular Automaton (Chan, 2019)',
    desc: '離散的なGame of Lifeを実数・連続時間・滑らかなカーネルへ拡張したCA。ベル型の成長関数と環状カーネルの組み合わせから、アメーバ・クラゲ・回転体など"生命様"の自律移動パターンが創発する。',
    accent: '#34d399', accentBg: 'rgba(52,211,153,0.08)', previewDim: 200,
  },
  {
    id: 'schelling',
    name: 'Schelling Segregation',
    principle: '社会的自己組織化',
    formula: 'happy ⟺ same/(same+diff) ≥ τ\nunhappy → random empty cell',
    formulaLabel: 'Schelling Tipping Model (1971)',
    desc: '「周囲の30%以上が同種なら満足」という穏やかな閾値でさえ、長時間後には完全な人種・グループ分離が創発する。個人の弱い選好が社会全体の強い分離を生む、ミクロ-マクロのダイナミクス。',
    accent: '#c084fc', accentBg: 'rgba(192,132,252,0.08)', previewDim: 200,
  },
  {
    id: 'sandpile',
    name: 'Abelian Sandpile',
    principle: '自己組織化臨界 (SOC)',
    formula: 'z(x,y) ≥ 4 → z±=−4; neighbors±=+1\navalanche size ~ P(s) ∝ s^{-τ}',
    formulaLabel: 'Bak-Tang-Wiesenfeld Sandpile (1987)',
    desc: '中心に砂粒を積み上げると4以上で崩壊が起き、連鎖的なアバランシェが発生する。臨界状態が外部調整なしに自発的に維持され（SOC）、崩壊サイズがべき乗則に従う。1/fノイズの起源仮説。',
    accent: '#a3e635', accentBg: 'rgba(163,230,53,0.08)', previewDim: 200,
  },
  {
    id: 'murmuration',
    name: 'Murmuration',
    principle: '3D群れ飛行・集団整列',
    formula: 'Boids in ℝ³ + perspective projection\n強磁場的集団整列の3次元版',
    formulaLabel: '3D Reynolds Boids with Perspective',
    desc: 'スターリング（ムクドリ）の群れ飛行を3Dで再現。遠近投影で球状クラウドの膨張・収縮・波動が見える。数百羽の局所的な相互作用から、まるで一つの生物のような流動的な形状変化が創発する。',
    accent: '#bfdbfe', accentBg: 'rgba(191,219,254,0.08)', previewDim: 300,
  },
  {
    id: 'hodgepodge',
    name: 'Hodgepodge Machine',
    principle: '化学振動CA・BZ類似',
    formula: 'ill→sick: a_new = [Σill/k₁ + Σsick/k₂]\nsick→healthy: → 0  healthy: +g',
    formulaLabel: 'Gerhardt-Schuster-Madore Rules (1990)',
    desc: 'Gerhardt らが提案した多状態CA。病気・回復・健康の状態遷移ルールにより、Belousov-Zhabotinsky反応と視覚的に酷似した螺旋波・ターゲットパターンが自発的に出現する。',
    accent: '#e879f9', accentBg: 'rgba(232,121,249,0.08)', previewDim: 200,
  },
];

type ModelId = typeof MODELS[number]['id'];

// ─────────────────────────────────────────────
// Default parameters
// ─────────────────────────────────────────────
const DEFAULT_PARAMS = {
  gameoflife:   {} as Record<string, never>,
  elementaryca: { rule: 30 },
  langtonsant:  { speed: 50, ants: 1 },
  wireworld:    {} as Record<string, never>,
  boids:        { separation: 0.05, alignment: 1.0, cohesion: 1.0, radius: 40 },
  belousovzhabotinsky: { k1: 2.0, k2: 3.0, diffA: 0.12 },
  forestfire:   { density: 0.6, regrowth: 1.0, lightning: 5.0 },
  percolation:  { p: 0.59 },
  lenia:        { mu: 0.15, sigma: 0.017, dt: 0.1 },
  schelling:    { tolerance: 0.35 },
  sandpile:     { rate: 5 },
  murmuration:  { sep: 0.05, ali: 1.0, coh: 1.0 },
  hodgepodge:   { k1: 2.0, k2: 3.0, gParam: 1 },
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
  const colorMode = useColorMode();

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
      case 'brainsbrain':  modelRef.current = new BriansBrain(dim, dim); break;
      case 'gameoflife':   modelRef.current = new GameOfLife(dim, dim); break;
      case 'elementaryca': modelRef.current = new ElementaryCA(dim, dim); break;
      case 'langtonsant':  modelRef.current = new LangtonsAnt(dim, dim); break;
      case 'wireworld':    modelRef.current = new WireWorld(dim, dim); break;
      case 'boids':        modelRef.current = new Boids(dim, dim); break;
      case 'belousovzhabotinsky': modelRef.current = new BelousovZhabotinsky(dim, dim); break;
      case 'forestfire':   modelRef.current = new ForestFire(dim, dim); break;
      case 'percolation':  modelRef.current = new Percolation(dim, dim); break;
      case 'lenia':        modelRef.current = new Lenia(dim, dim); break;
      case 'schelling':    modelRef.current = new SchellingSegregation(dim, dim); break;
      case 'sandpile':     modelRef.current = new AbelianSandpile(dim, dim); break;
      case 'murmuration':  modelRef.current = new Murmuration(dim, dim); break;
      case 'hodgepodge':   modelRef.current = new HodgepodgeMachine(dim, dim); break;
    }

    const needsImgData = ['turing','ising','convection','nematic','cahnhilliard','excitable','physarum','sanddune','brainsbrain','gameoflife','elementaryca','langtonsant','wireworld','belousovzhabotinsky','forestfire','percolation','lenia','schelling','sandpile','hodgepodge'];
    if (needsImgData.includes(model.id)) imgRef.current = ctx.createImageData(dim, dim);

    const p = DEFAULT_PARAMS[model.id as keyof typeof DEFAULT_PARAMS] as never;

    const loop = () => {
      switch (model.id) {
        case 'chladni':
          (modelRef.current as ChladniPlate).update(p);
          (modelRef.current as ChladniPlate).draw(ctx, undefined, colorMode); break;
        case 'convection':
          (modelRef.current as ConvectionCell).update(p);
          if (imgRef.current)(modelRef.current as ConvectionCell).draw(ctx, imgRef.current, colorMode); break;
        case 'turing':
          for (let i = 0; i < 20; i++)(modelRef.current as ReactionDiffusion).update(p);
          if (imgRef.current)(modelRef.current as ReactionDiffusion).draw(ctx, imgRef.current, colorMode); break;
        case 'buckling':
          (modelRef.current as BucklingChain).update(p);
          (modelRef.current as BucklingChain).draw(ctx, undefined, colorMode); break;
        case 'voronoi':
          (modelRef.current as VoronoiRelaxation).update(p);
          (modelRef.current as VoronoiRelaxation).draw(ctx, undefined, colorMode); break;
        case 'ising':
          (modelRef.current as IsingModel).update(p, 15000);
          if (imgRef.current)(modelRef.current as IsingModel).draw(ctx, imgRef.current, colorMode); break;
        case 'vicsek':
          (modelRef.current as VicsekModel).update(p);
          (modelRef.current as VicsekModel).draw(ctx, undefined, colorMode); break;
        case 'nematic':
          for (let i = 0; i < 3; i++)(modelRef.current as NematicLC).update(p);
          if (imgRef.current)(modelRef.current as NematicLC).draw(ctx, imgRef.current, colorMode); break;
        case 'crystal':
          for (let i = 0; i < 5; i++)(modelRef.current as CrystalGrowth).update(p);
          (modelRef.current as CrystalGrowth).draw(ctx, undefined, colorMode); break;
        case 'cahnhilliard':
          for (let i = 0; i < 8; i++)(modelRef.current as CahnHilliard).update(p);
          if (imgRef.current)(modelRef.current as CahnHilliard).draw(ctx, imgRef.current, colorMode); break;
        case 'excitable':
          (modelRef.current as ExcitableMedia).update(p);
          if (imgRef.current)(modelRef.current as ExcitableMedia).draw(ctx, imgRef.current, colorMode); break;
        case 'physarum':
          for (let i = 0; i < 3; i++)(modelRef.current as Physarum).update(p);
          if (imgRef.current)(modelRef.current as Physarum).draw(ctx, imgRef.current, colorMode); break;
        case 'urban':
          (modelRef.current as UrbanGrowth).update(p);
          (modelRef.current as UrbanGrowth).draw(ctx, undefined, colorMode); break;
        case 'sanddune':
          for (let i = 0; i < 3; i++)(modelRef.current as SandDune).update(p);
          if (imgRef.current)(modelRef.current as SandDune).draw(ctx, imgRef.current, colorMode); break;
        case 'brainsbrain':
          (modelRef.current as BriansBrain).update(p);
          if (imgRef.current)(modelRef.current as BriansBrain).draw(ctx, imgRef.current, colorMode); break;
        case 'gameoflife':
          (modelRef.current as GameOfLife).update(p);
          if (imgRef.current)(modelRef.current as GameOfLife).draw(ctx, imgRef.current, colorMode); break;
        case 'elementaryca':
          (modelRef.current as ElementaryCA).update(p);
          if (imgRef.current)(modelRef.current as ElementaryCA).draw(ctx, imgRef.current, colorMode); break;
        case 'langtonsant':
          (modelRef.current as LangtonsAnt).update(p);
          if (imgRef.current)(modelRef.current as LangtonsAnt).draw(ctx, imgRef.current, colorMode); break;
        case 'wireworld':
          (modelRef.current as WireWorld).update(p);
          if (imgRef.current)(modelRef.current as WireWorld).draw(ctx, imgRef.current, colorMode); break;
        case 'boids':
          (modelRef.current as Boids).update(p);
          (modelRef.current as Boids).draw(ctx, undefined, colorMode); break;
        case 'belousovzhabotinsky':
          for (let i=0;i<3;i++)(modelRef.current as BelousovZhabotinsky).update(p);
          if (imgRef.current)(modelRef.current as BelousovZhabotinsky).draw(ctx, imgRef.current, colorMode); break;
        case 'forestfire':
          (modelRef.current as ForestFire).update(p);
          if (imgRef.current)(modelRef.current as ForestFire).draw(ctx, imgRef.current, colorMode); break;
        case 'percolation':
          (modelRef.current as Percolation).update(p);
          if (imgRef.current)(modelRef.current as Percolation).draw(ctx, imgRef.current, colorMode); break;
        case 'lenia':
          (modelRef.current as Lenia).update(p);
          if (imgRef.current)(modelRef.current as Lenia).draw(ctx, imgRef.current, colorMode); break;
        case 'schelling':
          (modelRef.current as SchellingSegregation).update(p);
          if (imgRef.current)(modelRef.current as SchellingSegregation).draw(ctx, imgRef.current, colorMode); break;
        case 'sandpile':
          (modelRef.current as AbelianSandpile).update(p);
          if (imgRef.current)(modelRef.current as AbelianSandpile).draw(ctx, imgRef.current, colorMode); break;
        case 'murmuration':
          (modelRef.current as Murmuration).update(p);
          (modelRef.current as Murmuration).draw(ctx, undefined, colorMode); break;
        case 'hodgepodge':
          (modelRef.current as HodgepodgeMachine).update(p);
          if (imgRef.current)(modelRef.current as HodgepodgeMachine).draw(ctx, imgRef.current, colorMode); break;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const delay = setTimeout(() => { rafRef.current = requestAnimationFrame(loop); }, index * 100);
    return () => { clearTimeout(delay); cancelAnimationFrame(rafRef.current); };
  }, [model.id, model.previewDim, index, colorMode]);

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
function SimulationView({ modelId, onBack, colorMode, setColorMode }: {
  modelId: ModelId; onBack: () => void;
  colorMode: ColorMode; setColorMode: (m: ColorMode) => void;
}) {
  const model = MODELS.find((m) => m.id === modelId)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 680 : true
  );

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
  const golRef         = useRef<GameOfLife | null>(null);
  const ecaRef         = useRef<ElementaryCA | null>(null);
  const antRef         = useRef<LangtonsAnt | null>(null);
  const wireworldRef   = useRef<WireWorld | null>(null);
  const boidsRef       = useRef<Boids | null>(null);
  const bzRef          = useRef<BelousovZhabotinsky | null>(null);
  const forestRef      = useRef<ForestFire | null>(null);
  const percolRef      = useRef<Percolation | null>(null);
  const leniaRef       = useRef<Lenia | null>(null);
  const schellingRef   = useRef<SchellingSegregation | null>(null);
  const sandpileRef    = useRef<AbelianSandpile | null>(null);
  const murmuRef       = useRef<Murmuration | null>(null);
  const hodgepodgeRef  = useRef<HodgepodgeMachine | null>(null);
  const imgDataRef     = useRef<ImageData | null>(null);

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
  const [eca,  setEca]  = useState(DEFAULT_PARAMS.elementaryca);
  const [ant,  setAnt]  = useState(DEFAULT_PARAMS.langtonsant);
  const [boids,  setBoids]   = useState(DEFAULT_PARAMS.boids);
  const [bz,     setBz]      = useState(DEFAULT_PARAMS.belousovzhabotinsky);
  const [forest, setForest]  = useState(DEFAULT_PARAMS.forestfire);
  const [percol, setPercol]  = useState(DEFAULT_PARAMS.percolation);
  const [lenia,  setLenia]   = useState(DEFAULT_PARAMS.lenia);
  const [schell, setSchell]  = useState(DEFAULT_PARAMS.schelling);
  const [pile,   setPile]    = useState(DEFAULT_PARAMS.sandpile);
  const [murmu,  setMurmu]   = useState(DEFAULT_PARAMS.murmuration);
  const [hodge,  setHodge]   = useState(DEFAULT_PARAMS.hodgepodge);

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
      case 'gameoflife':  return { w: 300, h: 300 };
      case 'elementaryca':return { w: 300, h: 300 };
      case 'langtonsant': return { w: 300, h: 300 };
      case 'wireworld':   return { w: 300, h: 300 };
      case 'boids':       return { w: 400, h: 400 };
      case 'belousovzhabotinsky': return { w: 300, h: 300 };
      case 'forestfire':  return { w: 300, h: 300 };
      case 'percolation': return { w: 300, h: 300 };
      case 'lenia':       return { w: 256, h: 256 };
      case 'schelling':   return { w: 300, h: 300 };
      case 'sandpile':    return { w: 300, h: 300 };
      case 'murmuration': return { w: 400, h: 400 };
      case 'hodgepodge':  return { w: 300, h: 300 };
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
      case 'gameoflife':  golRef.current?.reset(); break;
      case 'elementaryca':ecaRef.current?.reset(eca.rule); break;
      case 'langtonsant': antRef.current?.reset(ant.ants); break;
      case 'wireworld':   wireworldRef.current  = new WireWorld(300, 300); break;
      case 'boids':       boidsRef.current      = new Boids(400, 400); break;
      case 'belousovzhabotinsky': bzRef.current = new BelousovZhabotinsky(300, 300); break;
      case 'forestfire':  forestRef.current     = new ForestFire(300, 300); break;
      case 'percolation': percolRef.current?.regenerate(percol.p); break;
      case 'lenia':       leniaRef.current      = new Lenia(256, 256); break;
      case 'schelling':   schellingRef.current  = new SchellingSegregation(300, 300); break;
      case 'sandpile':    sandpileRef.current   = new AbelianSandpile(300, 300); break;
      case 'murmuration': murmuRef.current      = new Murmuration(400, 400); break;
      case 'hodgepodge':  hodgepodgeRef.current = new HodgepodgeMachine(300, 300); break;
    }
  }, [modelId, eca.rule, ant.ants, percol.p]);

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
    golRef.current       = new GameOfLife(300, 300);
    ecaRef.current       = new ElementaryCA(300, 300);
    antRef.current       = new LangtonsAnt(300, 300);
    wireworldRef.current  = new WireWorld(300, 300);
    boidsRef.current      = new Boids(400, 400);
    bzRef.current         = new BelousovZhabotinsky(300, 300);
    forestRef.current     = new ForestFire(300, 300);
    percolRef.current     = new Percolation(300, 300);
    leniaRef.current      = new Lenia(256, 256);
    schellingRef.current  = new SchellingSegregation(300, 300);
    sandpileRef.current   = new AbelianSandpile(300, 300);
    murmuRef.current      = new Murmuration(400, 400);
    hodgepodgeRef.current = new HodgepodgeMachine(300, 300);

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
            chladniRef.current?.update(cp); chladniRef.current?.draw(ctx, undefined, colorMode); break;
          case 'convection':
            convRef.current?.update(conv); convRef.current?.draw(ctx, img, colorMode); break;
          case 'turing':
            for (let i = 0; i < 15; i++) rdRef.current?.update(rd);
            rdRef.current?.draw(ctx, img, colorMode); break;
          case 'buckling':
            buckRef.current?.update(buck); buckRef.current?.draw(ctx, undefined, colorMode); break;
          case 'voronoi':
            voronoiRef.current?.update(vor); voronoiRef.current?.draw(ctx, undefined, colorMode); break;
          case 'ising':
            isingRef.current?.update(ising, 40000); isingRef.current?.draw(ctx, img, colorMode); break;
          case 'vicsek':
            vicsekRef.current?.update(vic); vicsekRef.current?.draw(ctx, undefined, colorMode); break;
          case 'nematic':
            for (let i = 0; i < 5; i++) nematicRef.current?.update(nem);
            nematicRef.current?.draw(ctx, img, colorMode); break;
          case 'crystal':
            for (let i = 0; i < 8; i++) crystalRef.current?.update(crys);
            crystalRef.current?.draw(ctx, undefined, colorMode); break;
          case 'cahnhilliard':
            for (let i = 0; i < 10; i++) cahnRef.current?.update(cahn);
            cahnRef.current?.draw(ctx, img, colorMode); break;
          case 'excitable':
            excitRef.current?.update(excit); excitRef.current?.draw(ctx, img, colorMode); break;
          case 'physarum':
            for (let i = 0; i < 4; i++) physarumRef.current?.update(phy);
            physarumRef.current?.draw(ctx, img, colorMode); break;
          case 'urban':
            urbanRef.current?.update(urb); urbanRef.current?.draw(ctx, undefined, colorMode); break;
          case 'sanddune':
            for (let i = 0; i < 3; i++) duneRef.current?.update(dune);
            duneRef.current?.draw(ctx, img, colorMode); break;
          case 'brainsbrain':
            brainRef.current?.update(brain); brainRef.current?.draw(ctx, img, colorMode); break;
          case 'gameoflife':
            golRef.current?.update({}); golRef.current?.draw(ctx, img, colorMode); break;
          case 'elementaryca':
            ecaRef.current?.update(eca); ecaRef.current?.draw(ctx, img, colorMode); break;
          case 'langtonsant':
            antRef.current?.update(ant); antRef.current?.draw(ctx, img, colorMode); break;
          case 'wireworld':
            wireworldRef.current?.update({}); wireworldRef.current?.draw(ctx, img, colorMode); break;
          case 'boids':
            boidsRef.current?.update(boids); boidsRef.current?.draw(ctx, undefined, colorMode); break;
          case 'belousovzhabotinsky':
            for (let i=0;i<3;i++) bzRef.current?.update(bz);
            bzRef.current?.draw(ctx, img, colorMode); break;
          case 'forestfire':
            forestRef.current?.update(forest); forestRef.current?.draw(ctx, img, colorMode); break;
          case 'percolation':
            percolRef.current?.update(percol); percolRef.current?.draw(ctx, img, colorMode); break;
          case 'lenia':
            leniaRef.current?.update(lenia); leniaRef.current?.draw(ctx, img, colorMode); break;
          case 'schelling':
            schellingRef.current?.update(schell); schellingRef.current?.draw(ctx, img, colorMode); break;
          case 'sandpile':
            sandpileRef.current?.update(pile); sandpileRef.current?.draw(ctx, img, colorMode); break;
          case 'murmuration':
            murmuRef.current?.update(murmu); murmuRef.current?.draw(ctx, undefined, colorMode); break;
          case 'hodgepodge':
            hodgepodgeRef.current?.update(hodge); hodgepodgeRef.current?.draw(ctx, img, colorMode); break;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [modelId, running, cp, conv, rd, buck, vor, ising, vic, nem, crys, cahn, excit, phy, urb, dune, brain, eca, ant, boids, bz, forest, percol, lenia, schell, pile, murmu, hodge, getDim, colorMode]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showExport && (
        <ExportPanel
          sourceCanvas={canvasRef.current}
          onClose={() => setShowExport(false)}
          accent={model.accent}
        />
      )}

      {/* ── Header ── */}
      <header className="sim-header">
        <button onClick={onBack} style={{
          display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
          border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94a3b8',
          fontSize:13,cursor:'pointer',fontWeight:500,transition:'all 0.15s ease',flexShrink:0,
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color='#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color='#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.1)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H4M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="btn-pill-label">Gallery</span>
        </button>

        <div className="sim-header-title">
          <span className="tag" style={{ color:model.accent,borderColor:`${model.accent}40`,background:model.accentBg,flexShrink:0 }}>
            {model.principle}
          </span>
          <h1>{model.name}</h1>
        </div>

        <div className="sim-header-actions">
          <ColorModeSwitcher colorMode={colorMode} setColorMode={setColorMode} />
          {running && <div className="live-dot" />}
          <button onClick={resetCurrent} className="btn-pill"
            style={{ background:'rgba(255,255,255,0.04)',color:'#94a3b8',borderColor:'rgba(255,255,255,0.12)' }}>
            <span className="btn-pill-label">Reset</span>
            <svg className="btn-pill-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1.5 6a4.5 4.5 0 1 0 1-2.78M1.5 2v2h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={() => setRunning(!running)} className="btn-pill"
            style={{
              background: running?'rgba(251,191,36,0.08)':'rgba(52,211,153,0.08)',
              color: running?'#fbbf24':'#34d399',
              borderColor: running?'rgba(251,191,36,0.25)':'rgba(52,211,153,0.25)',
            }}>
            <span className="btn-pill-label">{running ? 'Pause' : 'Resume'}</span>
            {running
              ? <svg className="btn-pill-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor"/><rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor"/></svg>
              : <svg className="btn-pill-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
            }
          </button>
          <button onClick={() => setShowExport(true)} className="btn-pill"
            style={{ background:`${model.accent}14`,color:model.accent,borderColor:`${model.accent}40` }}>
            <span className="btn-pill-label">Export</span>
            <svg className="btn-pill-icon" width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Sidebar toggle — only shown on wider screens via CSS */}
          <button
            className={`sidebar-toggle${sidebarOpen ? ' open' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="btn-pill-label">{sidebarOpen ? 'Hide' : 'Params'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="sim-main" style={{ flex:1 }}>
        {/* Canvas column */}
        <div className="sim-canvas-col">
          <div className="sim-panel sim-canvas-wrap"
            style={{ background:`radial-gradient(ellipse at center, ${model.accentBg} 0%, var(--surface) 70%)` }}>
            <canvas ref={canvasRef}
              style={{ boxShadow:`0 0 40px ${model.accent}22` }} />
          </div>
          <div className="formula-box" style={{ borderColor:`${model.accent}30`,color:model.accent }}>
            <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8,opacity:0.6 }}>
              {model.formulaLabel}
            </div>
            {model.formula.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
        <div className="sim-panel sim-sidebar">
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

            {modelId==='gameoflife' && (
              <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                <div style={{ fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#475569',marginBottom:4 }}>Patterns</div>
                {(['random','glider','rpentomino','acorn','gospergun'] as const).map((name) => (
                  <button key={name} onClick={()=>golRef.current?.setPattern(name)}
                    style={{ padding:'8px 12px',borderRadius:7,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',color:'#94a3b8',fontSize:12,cursor:'pointer',textAlign:'left',transition:'all 0.15s ease' }}
                    onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(74,222,128,0.08)';(e.currentTarget as HTMLButtonElement).style.color=model.accent;}}
                    onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLButtonElement).style.color='#94a3b8';}}
                  >{{random:'Random',glider:'Glider',rpentomino:'R-Pentomino',acorn:'Acorn',gospergun:'Gosper Gun'}[name]}</button>
                ))}
                <ResetBtn onClick={()=>golRef.current?.reset()} label="Random Reseed" />
              </div>
            )}

            {modelId==='elementaryca' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Rule Number" value={eca.rule} display={`Rule ${eca.rule}`} min={0} max={255} step={1} accent={model.accent} onChange={(v)=>setEca({...eca,rule:v})} />
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                  {([30,90,110,184,54,18,22,45] as const).map((r)=>(
                    <button key={r} onClick={()=>setEca({rule:r})}
                      style={{ padding:'4px 10px',borderRadius:6,border:`1px solid ${eca.rule===r?model.accent:'rgba(255,255,255,0.1)'}`,background:eca.rule===r?`${model.accent}18`:'transparent',color:eca.rule===r?model.accent:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(148,163,184,0.06)',border:'1px solid rgba(148,163,184,0.15)',fontSize:11,color:'#94a3b8',lineHeight:1.8 }}>
                  30: カオス・貝殻模様<br/>
                  90: シェルピンスキー三角形<br/>
                  110: チューリング完全
                </div>
                <ResetBtn onClick={()=>ecaRef.current?.reset(eca.rule)} label="Reset" />
              </div>
            )}

            {modelId==='langtonsant' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Speed (steps/frame)" value={ant.speed} display={`${ant.speed}`} min={1} max={500} step={1} accent={model.accent} onChange={(v)=>setAnt({...ant,speed:v})} />
                <SliderField label="Number of Ants" value={ant.ants} display={`${ant.ants}`} min={1} max={8} step={1} accent={model.accent} onChange={(v)=>setAnt({...ant,ants:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(249,115,22,0.05)',border:'1px solid rgba(249,115,22,0.15)',fontSize:11,color:'#fdba74',lineHeight:1.8 }}>
                  <span style={{ color:'#f87171' }}>●</span> アリの現在位置<br/>
                  白: 未訪問　黒: 訪問済<br/>
                  〜10,000ステップで高速道路出現
                </div>
                <ResetBtn onClick={()=>antRef.current?.reset(ant.ants)} label="Reset" />
              </div>
            )}

            {modelId==='wireworld' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',fontSize:11,color:'#fcd34d',lineHeight:1.8 }}>
                  <span style={{ color:'#fbbf24' }}>■</span> 銅線（Copper）<br/>
                  <span style={{ color:'#60a5fa' }}>■</span> 電子ヘッド<br/>
                  <span style={{ color:'#ef4444' }}>■</span> 電子テール<br/>
                  <span style={{ color:'#1e1b4b' }}>■</span> 空（Empty）
                </div>
                <ResetBtn onClick={()=>{wireworldRef.current=new WireWorld(300,300);}} label="New Circuit" />
              </div>
            )}

            {modelId==='boids' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Separation" value={boids.separation} display={boids.separation.toFixed(2)} min={0.01} max={0.2} step={0.01} accent={model.accent} onChange={(v)=>setBoids({...boids,separation:v})} />
                <SliderField label="Alignment" value={boids.alignment} display={boids.alignment.toFixed(2)} min={0.0} max={3.0} step={0.05} accent={model.accent} onChange={(v)=>setBoids({...boids,alignment:v})} />
                <SliderField label="Cohesion" value={boids.cohesion} display={boids.cohesion.toFixed(2)} min={0.0} max={3.0} step={0.05} accent={model.accent} onChange={(v)=>setBoids({...boids,cohesion:v})} />
                <SliderField label="Radius" value={boids.radius} display={`${boids.radius}px`} min={10} max={120} step={5} accent={model.accent} onChange={(v)=>setBoids({...boids,radius:v})} />
                <ResetBtn onClick={()=>{boidsRef.current=new Boids(400,400);}} label="Respawn Flock" />
              </div>
            )}

            {modelId==='belousovzhabotinsky' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="k₁ (reaction)" value={bz.k1} display={bz.k1.toFixed(1)} min={0.5} max={5.0} step={0.1} accent={model.accent} onChange={(v)=>setBz({...bz,k1:v})} />
                <SliderField label="k₂ (inhibition)" value={bz.k2} display={bz.k2.toFixed(1)} min={0.5} max={6.0} step={0.1} accent={model.accent} onChange={(v)=>setBz({...bz,k2:v})} />
                <SliderField label="Diffusion A" value={bz.diffA} display={bz.diffA.toFixed(2)} min={0.01} max={0.5} step={0.01} accent={model.accent} onChange={(v)=>setBz({...bz,diffA:v})} />
                <ResetBtn onClick={()=>{bzRef.current=new BelousovZhabotinsky(300,300);}} label="New Reaction" />
              </div>
            )}

            {modelId==='forestfire' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Tree Density" value={forest.density} display={forest.density.toFixed(2)} min={0.1} max={0.9} step={0.05} accent={model.accent} onChange={(v)=>setForest({...forest,density:v})} />
                <SliderField label="Regrowth Rate ×10⁻³" value={forest.regrowth} display={forest.regrowth.toFixed(1)} min={0.1} max={5.0} step={0.1} accent={model.accent} onChange={(v)=>setForest({...forest,regrowth:v})} />
                <SliderField label="Lightning ×10⁻⁵" value={forest.lightning} display={forest.lightning.toFixed(1)} min={0.5} max={20} step={0.5} accent={model.accent} onChange={(v)=>setForest({...forest,lightning:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.15)',fontSize:11,color:'#86efac',lineHeight:1.8 }}>
                  <span style={{ color:'#22c55e' }}>■</span> 木　<span style={{ color:'#ef4444' }}>■</span> 燃焼中<br/>
                  <span style={{ color:'#6b7280' }}>■</span> 灰　<span style={{ color:'#0a0a0f' }}>■</span> 空地
                </div>
                <ResetBtn onClick={()=>{forestRef.current=new ForestFire(300,300);}} label="New Forest" />
              </div>
            )}

            {modelId==='percolation' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Open Probability (p)" value={percol.p} display={percol.p.toFixed(2)} min={0.3} max={0.9} step={0.01} accent={model.accent} onChange={(v)=>setPercol({...percol,p:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.15)',fontSize:11,color:'#a5b4fc',lineHeight:1.8 }}>
                  臨界確率 pc ≈ 0.593<br/>
                  <span style={{ color:'#60a5fa' }}>■</span> 浸透クラスター（上から到達）<br/>
                  <span style={{ color:'#e2e8f0' }}>■</span> 未到達の開孔
                </div>
                <ResetBtn onClick={()=>percolRef.current?.regenerate(percol.p)} label="Regenerate" />
              </div>
            )}

            {modelId==='lenia' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Growth Center (μ)" value={lenia.mu} display={lenia.mu.toFixed(3)} min={0.05} max={0.4} step={0.005} accent={model.accent} onChange={(v)=>setLenia({...lenia,mu:v})} />
                <SliderField label="Growth Width (σ)" value={lenia.sigma} display={lenia.sigma.toFixed(3)} min={0.005} max={0.08} step={0.001} accent={model.accent} onChange={(v)=>setLenia({...lenia,sigma:v})} />
                <SliderField label="Time Step (dt)" value={lenia.dt} display={lenia.dt.toFixed(2)} min={0.01} max={0.5} step={0.01} accent={model.accent} onChange={(v)=>setLenia({...lenia,dt:v})} />
                <ResetBtn onClick={()=>{leniaRef.current=new Lenia(256,256);}} label="New Organism" />
              </div>
            )}

            {modelId==='schelling' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Tolerance Threshold" value={schell.tolerance} display={schell.tolerance.toFixed(2)} min={0.1} max={0.9} step={0.05} accent={model.accent} onChange={(v)=>setSchell({...schell,tolerance:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)',fontSize:11,color:'#fcd34d',lineHeight:1.8 }}>
                  <span style={{ color:'#f97316' }}>■</span> グループA　<span style={{ color:'#818cf8' }}>■</span> グループB<br/>
                  Tolerance: 同種の隣人の最小割合
                </div>
                <ResetBtn onClick={()=>{schellingRef.current=new SchellingSegregation(300,300);}} label="New Population" />
              </div>
            )}

            {modelId==='sandpile' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Drop Rate (grains/frame)" value={pile.rate} display={`${pile.rate}`} min={1} max={50} step={1} accent={model.accent} onChange={(v)=>setPile({...pile,rate:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(168,85,247,0.05)',border:'1px solid rgba(168,85,247,0.15)',fontSize:11,color:'#d8b4fe',lineHeight:1.8 }}>
                  砂粒は中心に落ち、高さ≥4で崩壊（avalanche）<br/>
                  自己組織化臨界状態（SOC）を形成
                </div>
                <ResetBtn onClick={()=>{sandpileRef.current=new AbelianSandpile(300,300);}} label="Reset Pile" />
              </div>
            )}

            {modelId==='murmuration' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="Separation" value={murmu.sep} display={murmu.sep.toFixed(2)} min={0.01} max={0.2} step={0.01} accent={model.accent} onChange={(v)=>setMurmu({...murmu,sep:v})} />
                <SliderField label="Alignment" value={murmu.ali} display={murmu.ali.toFixed(2)} min={0.0} max={3.0} step={0.05} accent={model.accent} onChange={(v)=>setMurmu({...murmu,ali:v})} />
                <SliderField label="Cohesion" value={murmu.coh} display={murmu.coh.toFixed(2)} min={0.0} max={3.0} step={0.05} accent={model.accent} onChange={(v)=>setMurmu({...murmu,coh:v})} />
                <ResetBtn onClick={()=>{murmuRef.current=new Murmuration(400,400);}} label="Respawn" />
              </div>
            )}

            {modelId==='hodgepodge' && (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                <SliderField label="k₁ (infection)" value={hodge.k1} display={hodge.k1.toFixed(1)} min={0.5} max={6.0} step={0.5} accent={model.accent} onChange={(v)=>setHodge({...hodge,k1:v})} />
                <SliderField label="k₂ (recovery)" value={hodge.k2} display={hodge.k2.toFixed(1)} min={0.5} max={6.0} step={0.5} accent={model.accent} onChange={(v)=>setHodge({...hodge,k2:v})} />
                <SliderField label="g (illness effect)" value={hodge.gParam} display={`${hodge.gParam}`} min={1} max={10} step={1} accent={model.accent} onChange={(v)=>setHodge({...hodge,gParam:v})} />
                <div style={{ padding:'10px 14px',borderRadius:8,background:'rgba(236,72,153,0.05)',border:'1px solid rgba(236,72,153,0.15)',fontSize:11,color:'#f9a8d4',lineHeight:1.8 }}>
                  Gerhardt-Schuster モデル<br/>
                  螺旋波・複雑な伝播パターン
                </div>
                <ResetBtn onClick={()=>{hodgepodgeRef.current=new HodgepodgeMachine(300,300);}} label="Reset" />
              </div>
            )}
          </div>
        </div>
        )}
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
// Color mode switcher component
// ─────────────────────────────────────────────
function ColorModeSwitcher({ colorMode, setColorMode }: {
  colorMode: ColorMode; setColorMode: (m: ColorMode) => void;
}) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:4,padding:'3px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)' }}>
      {COLOR_MODE_LABELS.map(({ id, label }) => {
        const active = colorMode === id;
        const dotColor = id==='navy'?'#4a7ab5':id==='orange'?'#e07020':id==='grayscale'?'#888':'#6ee';
        return (
          <button
            key={id}
            onClick={() => setColorMode(id)}
            title={label}
            style={{
              padding:'4px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,
              transition:'all 0.15s ease',
              background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: active ? '#e2e8f0' : '#64748b',
              display:'flex',alignItems:'center',gap:5,
            }}
          >
            <span style={{ width:7,height:7,borderRadius:'50%',background:dotColor,flexShrink:0,opacity:active?1:0.5 }} />
            <span className="btn-pill-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Gallery View
// ─────────────────────────────────────────────
function GalleryView({ onSelect, colorMode, setColorMode }: {
  onSelect: (id: ModelId) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
}) {
  return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column' }}>
      <header style={{
        padding:'60px 40px 40px',textAlign:'center',
        background:'radial-gradient(ellipse at 50% 0%, rgba(79,110,247,0.12) 0%, transparent 70%)',
        borderBottom:'1px solid var(--border)',position:'relative',
      }}>
        <div style={{ position:'absolute',top:20,right:24 }}>
          <ColorModeSwitcher colorMode={colorMode} setColorMode={setColorMode} />
        </div>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,padding:'4px 14px',borderRadius:9999,
          border:'1px solid rgba(190, 197, 233, 0.3)',background:'rgba(79,110,247,0.08)',
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
          秩序はどのように生まれるか。
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
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  return (
    <ColorModeContext.Provider value={colorMode}>
      {selected ? (
        <SimulationView modelId={selected} onBack={() => setSelected(null)} colorMode={colorMode} setColorMode={setColorMode} />
      ) : (
        <GalleryView onSelect={(id) => setSelected(id)} colorMode={colorMode} setColorMode={setColorMode} />
      )}
    </ColorModeContext.Provider>
  );
}
