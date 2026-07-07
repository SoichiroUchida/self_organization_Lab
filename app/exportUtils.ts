// ─────────────────────────────────────────────
// Image Export Utilities
// ─────────────────────────────────────────────

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'svg';

export async function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  filename = 'simulation',
): Promise<void> {
  const name = `${filename}.${format}`;

  if (format === 'bmp') {
    const blob = canvasToBMP(canvas);
    triggerDownload(URL.createObjectURL(blob), name);
    return;
  }

  if (format === 'svg') {
    const blob = canvasToSVG(canvas);
    triggerDownload(URL.createObjectURL(blob), name);
    return;
  }

  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeMap[format], 0.95),
  );
  if (!blob) throw new Error('Canvas toBlob returned null');
  triggerDownload(URL.createObjectURL(blob), name);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function canvasToBMP(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // BMP file layout: file header (14) + DIB header (40) + pixel data
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4; // 4-byte aligned
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);

  // File header
  view.setUint8(0, 0x42); view.setUint8(1, 0x4d); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true); // pixel data offset

  // DIB header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative = top-down
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // no compression
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true); // ~72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Pixel data (BGR order, bottom-up not needed since we used negative height)
  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, data[i + 2]); // B
      view.setUint8(offset++, data[i + 1]); // G
      view.setUint8(offset++, data[i]);     // R
    }
    // padding
    for (let p = 0; p < rowSize - width * 3; p++) view.setUint8(offset++, 0);
  }

  return new Blob([buf], { type: 'image/bmp' });
}

function canvasToSVG(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

// ─────────────────────────────────────────────
// 3D Mesh Generation
// ─────────────────────────────────────────────

export type ExtrudeMode =
  | 'heightmap'   // pixel brightness → Z, full surface mesh
  | 'binary'      // threshold: above=raised, below=flat
  | 'isoline'     // N discrete bands (topographic style)
  | 'ridge'       // edge-detect, extrude edges as walls
  | 'inverse';    // dark = high, light = low

export interface ExtrudeOptions {
  mode: ExtrudeMode;
  maxHeight: number;   // max Z in mesh units
  threshold: number;   // 0–1, used by binary and ridge modes
  bands: number;       // number of bands for isoline mode
  resolution: number;  // 1=full, 2=half, 4=quarter (downsampling for speed)
}

export const DEFAULT_EXTRUDE: ExtrudeOptions = {
  mode: 'heightmap',
  maxHeight: 30,
  threshold: 0.5,
  bands: 8,
  resolution: 2,
};

interface Mesh {
  vertices: Float32Array; // x,y,z triplets
  indices: Uint32Array;   // triangle indices
  vertexCount: number;
  triangleCount: number;
}

/** Read canvas pixel data and compute height map [0..1] */
function getHeightMap(
  canvas: HTMLCanvasElement,
  resolution: number,
): { heights: Float32Array; w: number; h: number } {
  const ctx = canvas.getContext('2d')!;
  const w = Math.max(1, Math.floor(canvas.width / resolution));
  const h = Math.max(1, Math.floor(canvas.height / resolution));

  // Draw downsampled into offscreen canvas
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const offCtx = off.getContext('2d')!;
  offCtx.drawImage(canvas, 0, 0, w, h);
  const { data } = offCtx.getImageData(0, 0, w, h);

  const heights = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    heights[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  }
  return { heights, w, h };
}

function applyMode(heights: Float32Array, opts: ExtrudeOptions): Float32Array {
  const n = heights.length;
  const out = new Float32Array(n);

  switch (opts.mode) {
    case 'heightmap':
      for (let i = 0; i < n; i++) out[i] = heights[i];
      break;

    case 'inverse':
      for (let i = 0; i < n; i++) out[i] = 1 - heights[i];
      break;

    case 'binary':
      for (let i = 0; i < n; i++)
        out[i] = heights[i] >= opts.threshold ? 1 : 0;
      break;

    case 'isoline': {
      const b = Math.max(2, opts.bands);
      for (let i = 0; i < n; i++) {
        out[i] = Math.floor(heights[i] * b) / b;
      }
      break;
    }

    case 'ridge': {
      // Simple Sobel edge magnitude → threshold
      const tmp = new Float32Array(n);
      // heights index not yet loaded as w×h so just return the source
      // (actual Sobel applied in buildMesh where w/h are known)
      for (let i = 0; i < n; i++) tmp[i] = heights[i];
      return tmp;
    }
  }
  return out;
}

function sobelEdge(heights: Float32Array, w: number, h: number, threshold: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -heights[(y - 1) * w + (x - 1)] + heights[(y - 1) * w + (x + 1)]
        - 2 * heights[y * w + (x - 1)] + 2 * heights[y * w + (x + 1)]
        - heights[(y + 1) * w + (x - 1)] + heights[(y + 1) * w + (x + 1)];
      const gy =
        -heights[(y - 1) * w + (x - 1)] - 2 * heights[(y - 1) * w + x] - heights[(y - 1) * w + (x + 1)]
        + heights[(y + 1) * w + (x - 1)] + 2 * heights[(y + 1) * w + x] + heights[(y + 1) * w + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy) * 0.25;
      out[idx] = mag >= threshold ? mag : 0;
    }
  }
  return out;
}

export function buildMesh(canvas: HTMLCanvasElement, opts: ExtrudeOptions): Mesh {
  const { heights: raw, w, h } = getHeightMap(canvas, opts.resolution);

  let heights: Float32Array;
  if (opts.mode === 'ridge') {
    heights = sobelEdge(raw, w, h, opts.threshold);
  } else {
    heights = applyMode(raw, opts);
  }

  // Build a grid mesh: (w × h) vertices, 2 triangles per quad
  const vertexCount = w * h;
  const triangleCount = (w - 1) * (h - 1) * 2;
  const vertices = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(triangleCount * 3);

  const scaleX = 100 / w;
  const scaleY = 100 / h;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vi = (y * w + x) * 3;
      vertices[vi]     = (x - w / 2) * scaleX;
      vertices[vi + 1] = (y - h / 2) * scaleY;
      vertices[vi + 2] = heights[y * w + x] * opts.maxHeight;
    }
  }

  let ti = 0;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = y * w + x;
      const tr = tl + 1;
      const bl = tl + w;
      const br = bl + 1;
      indices[ti++] = tl; indices[ti++] = bl; indices[ti++] = tr;
      indices[ti++] = tr; indices[ti++] = bl; indices[ti++] = br;
    }
  }

  return { vertices, indices, vertexCount, triangleCount };
}

// ─────────────────────────────────────────────
// OBJ Export
// ─────────────────────────────────────────────

export function meshToOBJ(mesh: Mesh): string {
  const lines: string[] = ['# Self-Organization Lab export', 'o simulation'];
  const { vertices, indices } = mesh;

  for (let i = 0; i < mesh.vertexCount; i++) {
    const x = vertices[i * 3].toFixed(4);
    const y = vertices[i * 3 + 1].toFixed(4);
    const z = vertices[i * 3 + 2].toFixed(4);
    lines.push(`v ${x} ${y} ${z}`);
  }

  for (let i = 0; i < mesh.triangleCount; i++) {
    const a = indices[i * 3] + 1;     // OBJ is 1-indexed
    const b = indices[i * 3 + 1] + 1;
    const c = indices[i * 3 + 2] + 1;
    lines.push(`f ${a} ${b} ${c}`);
  }

  return lines.join('\n');
}

export function downloadOBJ(mesh: Mesh, filename = 'simulation') {
  const text = meshToOBJ(mesh);
  const blob = new Blob([text], { type: 'text/plain' });
  triggerDownload(URL.createObjectURL(blob), `${filename}.obj`);
}

// ─────────────────────────────────────────────
// STL Export (binary)
// ─────────────────────────────────────────────

export function meshToSTLBinary(mesh: Mesh): ArrayBuffer {
  const { vertices, indices, triangleCount } = mesh;
  const headerSize = 80;
  const countSize = 4;
  const triSize = 50; // 12 (normal) + 3×12 (verts) + 2 (attr)
  const buf = new ArrayBuffer(headerSize + countSize + triangleCount * triSize);
  const view = new DataView(buf);

  // 80-byte header
  const header = 'Self-Organization Lab STL export';
  for (let i = 0; i < Math.min(header.length, 80); i++) {
    view.setUint8(i, header.charCodeAt(i));
  }
  view.setUint32(80, triangleCount, true);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const ai = indices[i * 3] * 3;
    const bi = indices[i * 3 + 1] * 3;
    const ci = indices[i * 3 + 2] * 3;

    // Compute face normal
    const ax = vertices[ai], ay = vertices[ai + 1], az = vertices[ai + 2];
    const bx = vertices[bi], by = vertices[bi + 1], bz = vertices[bi + 2];
    const cx = vertices[ci], cy = vertices[ci + 1], cz = vertices[ci + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    view.setFloat32(offset, nx / len, true); offset += 4;
    view.setFloat32(offset, ny / len, true); offset += 4;
    view.setFloat32(offset, nz / len, true); offset += 4;

    view.setFloat32(offset, ax, true); offset += 4;
    view.setFloat32(offset, ay, true); offset += 4;
    view.setFloat32(offset, az, true); offset += 4;

    view.setFloat32(offset, bx, true); offset += 4;
    view.setFloat32(offset, by, true); offset += 4;
    view.setFloat32(offset, bz, true); offset += 4;

    view.setFloat32(offset, cx, true); offset += 4;
    view.setFloat32(offset, cy, true); offset += 4;
    view.setFloat32(offset, cz, true); offset += 4;

    view.setUint16(offset, 0, true); offset += 2; // attribute byte count
  }

  return buf;
}

export function downloadSTL(mesh: Mesh, filename = 'simulation') {
  const buf = meshToSTLBinary(mesh);
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  triggerDownload(URL.createObjectURL(blob), `${filename}.stl`);
}
