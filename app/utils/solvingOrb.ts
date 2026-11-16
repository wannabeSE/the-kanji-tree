interface Dot {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Ink value: 0 = darkest ink on paper. Mirrored on dark themes. */
  white: number;
  a?: number;
}

interface RubikOpts {
  latRings: number;
  lonDensity: number;
  moveCount: number;
  rBase: number;
  rDepth: number;
  rActive: number;
  inkFar: number;
  inkSpan: number;
  rsPow: number;
  rMin: number;
}

interface Move {
  axis: 0 | 1 | 2;
  lo: number;
  hi: number;
  ang: number;
}

export const SOLVING_SIZE = 64;
/** Baked speed of the 64px solving preset. */
export const SOLVING_SPEED = 1.82;

const BASE: RubikOpts = {
  latRings: 15,
  lonDensity: 40,
  moveCount: 14,
  rBase: 0.6,
  rDepth: 1.7,
  rActive: 0.3,
  inkFar: 0.62,
  inkSpan: 0.54,
  rsPow: 0.6,
  rMin: 0.3,
};

/** 64px solving preset: count 0.35, radius 1.05, same rules as thinking-orbs. */
function resolveSolving(): RubikOpts {
  const count = 0.35;
  const radius = 1.05;
  const rt = Math.sqrt(count);
  return {
    ...BASE,
    latRings: Math.max(2, Math.round(BASE.latRings * rt)),
    lonDensity: Math.max(2, Math.round(BASE.lonDensity * rt)),
    rBase: BASE.rBase * radius,
    rDepth: BASE.rDepth * radius,
    rActive: BASE.rActive * radius,
  };
}

const OPTS = resolveSolving();

function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function makeProj(
  yaw: number,
  tilt: number,
  cx: number,
  cy: number,
  scale: number,
) {
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cyw = Math.cos(yaw);
  return (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cyw + z * sy;
    const z1 = -x * sy + z * cyw;
    const y1 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    return [cx + x1 * scale, cy - y1 * scale, z2];
  };
}

function radiusScale(size: number, pow: number): number {
  return (size / 300) ** pow;
}

function solveCycle(
  time: number,
  count: number,
  slotDur: number,
  rest: number,
) {
  const cyc = 2 * count * slotDur + rest;
  const tc = time % cyc;
  const amount = new Array<number>(count).fill(0);
  let active = -1;
  if (tc < 2 * count * slotDur) {
    const slot = Math.floor(tc / slotDur);
    const p = (tc - slot * slotDur) / slotDur;
    const cl = Math.min(1, p / 0.7);
    const ep = 1 - (1 - cl) ** 3;
    if (slot < count) {
      for (let i = 0; i < slot; i++) amount[i] = 1;
      amount[slot] = ep;
      active = slot;
    } else {
      const u = 2 * count - 1 - slot;
      for (let i = 0; i < u; i++) amount[i] = 1;
      amount[u] = 1 - ep;
      active = u;
    }
  }
  return { amount, active };
}

function applyMoves(
  pt3: [number, number, number],
  moves: Move[],
  sc: { amount: number[]; active: number },
): [number, number, number, boolean] {
  let [x, y, z] = pt3;
  let inActive = false;
  for (let i = 0; i < moves.length; i++) {
    if (sc.amount[i]! <= 0) continue;
    const mv = moves[i]!;
    const coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
    if (coord < mv.lo || coord >= mv.hi) continue;
    if (i === sc.active) inActive = true;
    const a = mv.ang * sc.amount[i]!;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (mv.axis === 0) {
      const y2 = y * ca - z * sa;
      z = y * sa + z * ca;
      y = y2;
    } else if (mv.axis === 1) {
      const x2 = x * ca + z * sa;
      z = -x * sa + z * ca;
      x = x2;
    } else {
      const x2 = x * ca - y * sa;
      y = x * sa + y * ca;
      x = x2;
    }
  }
  return [x, y, z, inActive];
}

function makeMoves(count: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3)) as 0 | 1 | 2;
    const lo = -1.0 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
    const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi: lo + 0.5, ang: (dir * Math.PI) / 2 });
  }
  return moves;
}

function frameRubik(size: number, t: number, o: RubikOpts): Dot[] {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.82;
  const pt = makeProj(t * 0.55, 0.35 + 0.1 * Math.sin(t * 0.9), cx, cy, R);
  const rs = radiusScale(size, o.rsPow);
  const moves = makeMoves(o.moveCount);
  const sc = solveCycle(t, o.moveCount, 0.42, 1.2);

  const dots: Dot[] = [];
  for (let li = 0; li <= o.latRings; li++) {
    const lat = -Math.PI / 2 + (li / o.latRings) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * o.lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = (lj / lonCount) * 2 * Math.PI;
      const [x, y, z, inActive] = applyMoves(
        [cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon)],
        moves,
        sc,
      );
      const [px, py, zr] = pt(x, y, z);
      const depth = (zr + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: zr,
        r: (o.rBase + o.rDepth * depth + (inActive ? o.rActive : 0)) * rs,
        white: o.inkFar - o.inkSpan * depth - (inActive ? 0.14 : 0),
      });
    }
  }

  const visible: Dot[] = [];
  for (const d of dots) {
    if ((d.a ?? 1) < 0.02) continue;
    d.r = Math.max(o.rMin, d.r);
    visible.push(d);
  }
  visible.sort((a, b) => a.z - b.z);
  return visible;
}

/** Paint one solving frame. `dark` mirrors ink so near dots read bright. */
export function drawSolving(
  ctx: CanvasRenderingContext2D,
  size: number,
  t: number,
  dark: boolean,
) {
  for (const d of frameRubik(size, t, OPTS)) {
    const alpha = d.a ?? 1;
    const w = Math.min(1, Math.max(0, d.white));
    const g = Math.round((dark ? 1 - w : w) * 255);
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
