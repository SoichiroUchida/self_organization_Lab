'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ImageFormat,
  ExtrudeMode,
  ExtrudeOptions,
  DEFAULT_EXTRUDE,
  downloadCanvasAsImage,
  buildMesh,
  downloadOBJ,
  downloadSTL,
} from './exportUtils';

interface ExportPanelProps {
  sourceCanvas: HTMLCanvasElement | null;
  onClose: () => void;
  accent?: string;
}

const IMAGE_FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'png',  label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'bmp',  label: 'BMP' },
  { value: 'svg',  label: 'SVG' },
];

const EXTRUDE_MODES: { value: ExtrudeMode; label: string; desc: string }[] = [
  { value: 'heightmap', label: 'Height Map',   desc: '輝度を高さに直接変換。グラデーションな地形。' },
  { value: 'binary',    label: 'Binary',        desc: '閾値で二値化。ON/OFF の2段構造。' },
  { value: 'isoline',   label: 'Isoline',       desc: '等高線状に段階的な高さ帯 (N段)。' },
  { value: 'ridge',     label: 'Ridge / Edge',  desc: 'エッジ検出した輪郭線だけ立ち上げる。' },
  { value: 'inverse',   label: 'Inverse',       desc: '暗い部分が高い。インバート地形。' },
];

export default function ExportPanel({ sourceCanvas, onClose, accent = '#60a5fa' }: ExportPanelProps) {
  const [imgFormat, setImgFormat] = useState<ImageFormat>('png');
  const [opts, setOpts] = useState<ExtrudeOptions>(DEFAULT_EXTRUDE);
  const [previewDirty, setPreviewDirty] = useState(true);
  const [imgError, setImgError] = useState('');
  const [meshError, setMeshError] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const rafRef = useRef<number>(0);

  // Initialize Three.js scene
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const W = container.clientWidth || 480;
    const H = container.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(50, 80, 60);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-50, 20, -40);
    scene.add(fill);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
    camera.position.set(0, -120, 80);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Rebuild 3D mesh whenever options change or panel opens
  const rebuildPreview = useCallback(() => {
    if (!sourceCanvas || !sceneRef.current) return;
    setIsBuilding(true);
    setMeshError('');

    try {
      const mesh = buildMesh(sourceCanvas, opts);

      // Remove old mesh
      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        (meshRef.current.material as THREE.Material).dispose();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(accent),
        shininess: 40,
        side: THREE.DoubleSide,
        wireframe: false,
      });

      const threeMesh = new THREE.Mesh(geometry, material);
      sceneRef.current.add(threeMesh);
      meshRef.current = threeMesh;

      // Reset camera to fit
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(0, -120, 80);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.target.set(0, 0, opts.maxHeight / 2);
        controlsRef.current.update();
      }
    } catch (e) {
      setMeshError(String(e));
    } finally {
      setIsBuilding(false);
      setPreviewDirty(false);
    }
  }, [sourceCanvas, opts, accent]);

  useEffect(() => {
    if (previewDirty) rebuildPreview();
  }, [previewDirty, rebuildPreview]);

  const handleOptsChange = (patch: Partial<ExtrudeOptions>) => {
    setOpts((prev) => ({ ...prev, ...patch }));
    setPreviewDirty(true);
  };

  const handleDownloadImage = async () => {
    if (!sourceCanvas) return;
    setImgError('');
    try {
      await downloadCanvasAsImage(sourceCanvas, imgFormat);
    } catch (e) {
      setImgError(String(e));
    }
  };

  const handleDownloadOBJ = () => {
    if (!sourceCanvas) return;
    setMeshError('');
    try {
      downloadOBJ(buildMesh(sourceCanvas, opts));
    } catch (e) {
      setMeshError(String(e));
    }
  };

  const handleDownloadSTL = () => {
    if (!sourceCanvas) return;
    setMeshError('');
    try {
      downloadSTL(buildMesh(sourceCanvas, opts));
    } catch (e) {
      setMeshError(String(e));
    }
  };

  // ─── styles ──────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
  };

  const dialogStyle: React.CSSProperties = {
    background: '#0d0d14',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    width: 'min(96vw, 980px)',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
  };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#475569', marginBottom: 12,
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8, border: '1px solid',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  return (
    <div style={panelStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialogStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Export</span>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: settings */}
          <div style={{
            width: 280, padding: '20px 20px', borderRight: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24,
          }}>

            {/* ── Image Download ── */}
            <section>
              <div style={sectionHead}>Image Download</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {IMAGE_FORMATS.map((f) => (
                  <button key={f.value}
                    onClick={() => setImgFormat(f.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 6,
                      border: `1px solid ${imgFormat === f.value ? accent : 'rgba(255,255,255,0.1)'}`,
                      background: imgFormat === f.value ? `${accent}18` : 'transparent',
                      color: imgFormat === f.value ? accent : '#64748b',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={handleDownloadImage} style={{
                ...btnBase,
                background: `${accent}14`, color: accent,
                borderColor: `${accent}40`, width: '100%', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download {imgFormat.toUpperCase()}
              </button>
              {imgError && <div style={{ marginTop: 6, fontSize: 11, color: '#f87171' }}>{imgError}</div>}
            </section>

            {/* ── 3D Extrude Mode ── */}
            <section>
              <div style={sectionHead}>Extrude Mode</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EXTRUDE_MODES.map((m) => (
                  <button key={m.value}
                    onClick={() => handleOptsChange({ mode: m.value })}
                    style={{
                      padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                      border: `1px solid ${opts.mode === m.value ? accent : 'rgba(255,255,255,0.07)'}`,
                      background: opts.mode === m.value ? `${accent}12` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: opts.mode === m.value ? accent : '#94a3b8' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── 3D Parameters ── */}
            <section>
              <div style={sectionHead}>3D Parameters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PanelSlider
                  label="Max Height" value={opts.maxHeight} display={`${opts.maxHeight}`}
                  min={1} max={80} step={1} accent={accent}
                  onChange={(v) => handleOptsChange({ maxHeight: v })} />
                {(opts.mode === 'binary' || opts.mode === 'ridge') && (
                  <PanelSlider
                    label="Threshold" value={opts.threshold} display={opts.threshold.toFixed(2)}
                    min={0.05} max={0.95} step={0.05} accent={accent}
                    onChange={(v) => handleOptsChange({ threshold: v })} />
                )}
                {opts.mode === 'isoline' && (
                  <PanelSlider
                    label="Bands" value={opts.bands} display={`${opts.bands}`}
                    min={2} max={20} step={1} accent={accent}
                    onChange={(v) => handleOptsChange({ bands: v })} />
                )}
                <PanelSlider
                  label="Resolution" value={opts.resolution} display={`1/${opts.resolution}`}
                  min={1} max={8} step={1} accent={accent}
                  onChange={(v) => handleOptsChange({ resolution: v })} />
              </div>
            </section>

            {/* ── 3D Export ── */}
            <section>
              <div style={sectionHead}>3D Export</div>
              {meshError && <div style={{ marginBottom: 8, fontSize: 11, color: '#f87171' }}>{meshError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDownloadOBJ} style={{
                  ...btnBase, flex: 1, justifyContent: 'center',
                  background: 'rgba(52,211,153,0.08)', color: '#34d399',
                  borderColor: 'rgba(52,211,153,0.25)',
                }}>OBJ</button>
                <button onClick={handleDownloadSTL} style={{
                  ...btnBase, flex: 1, justifyContent: 'center',
                  background: 'rgba(251,191,36,0.08)', color: '#fbbf24',
                  borderColor: 'rgba(251,191,36,0.25)',
                }}>STL</button>
              </div>
            </section>
          </div>

          {/* Right: 3D preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                3D Preview
              </span>
              {isBuilding && (
                <span style={{ fontSize: 11, color: '#fbbf24' }}>Building…</span>
              )}
              <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>
                Drag to rotate · Scroll to zoom
              </span>
            </div>
            <div ref={previewRef} style={{ flex: 1, minHeight: 300 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelSlider({ label, value, display, min, max, step, accent, onChange }: {
  label: string; value: number; display: string;
  min: number; max: number; step: number; accent: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)', color: accent }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-track" style={{ accentColor: accent } as React.CSSProperties} />
    </div>
  );
}
