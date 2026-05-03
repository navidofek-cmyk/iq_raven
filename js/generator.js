// Draws a single shape onto a canvas context
// shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'star'
// fill:  'empty' | 'filled' | 'striped'
// size:  0.3 – 0.9 (fraction of cell)
// color: css color string

function drawShape(ctx, shape, fill, size, color, cx, cy, cellSize, rotation = 0) {
  const r = (cellSize * size) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(-r, -r, r * 2, r * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case 'cross': {
      const t = r * 0.3;
      ctx.rect(-t, -r, t * 2, r * 2);
      ctx.rect(-r, -t, r * 2, t * 2);
      break;
    }
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
                : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      break;
  }

  if (fill === 'filled') {
    ctx.fill();
  } else if (fill === 'empty') {
    ctx.stroke();
  } else if (fill === 'striped') {
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1.5;
    for (let y = -r; y <= r; y += r * 0.35) {
      ctx.beginPath();
      ctx.moveTo(-r, y);
      ctx.lineTo(r, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ── Rule system ─────────────────────────────────────────────────────────────

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'cross'];
const FILLS  = ['empty', 'striped', 'filled'];
const COLORS = ['#1a1a2e', '#e63946', '#2a9d8f'];
const SIZES  = [0.35, 0.55, 0.75];

// Each "rule type" defines how attributes vary across the 3×3 grid.
// A puzzle is built by picking 1–3 independent rules and deriving all 9 cells.

const RULE_TYPES = [
  // shape cycles along rows
  { id: 'shape_row',  attr: 'shape',    mode: 'row_cycle' },
  // shape cycles along cols
  { id: 'shape_col',  attr: 'shape',    mode: 'col_cycle' },
  // fill cycles along rows
  { id: 'fill_row',   attr: 'fill',     mode: 'row_cycle' },
  // fill cycles along cols
  { id: 'fill_col',   attr: 'fill',     mode: 'col_cycle' },
  // size increases along rows
  { id: 'size_row',   attr: 'size',     mode: 'row_cycle' },
  // color cycles along rows
  { id: 'color_row',  attr: 'color',    mode: 'row_cycle' },
  // rotation increases along rows (triangles/diamonds)
  { id: 'rot_row',    attr: 'rotation', mode: 'row_inc',  values: [0, 45, 90] },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build attribute arrays for a rule given the rule type and chosen values
function buildAttrSequence(rule, chosen) {
  // chosen is an array of 3 values (one per row or col)
  // mode: 'row_cycle' → same value in each row, cycles across rows
  //       'col_cycle' → same value in each col, cycles across cols
  //       'row_inc'   → increases across row, same pattern each row
  const grid = [];
  for (let r = 0; r < 3; r++) {
    grid.push([]);
    for (let c = 0; c < 3; c++) {
      if (rule.mode === 'row_cycle') grid[r].push(chosen[r]);
      else if (rule.mode === 'col_cycle') grid[r].push(chosen[c]);
      else if (rule.mode === 'row_inc')   grid[r].push(chosen[c]);
    }
  }
  return grid;
}

// Generate a puzzle matrix (3×3 array of cell descriptors) with a given difficulty
// difficulty: 1 (1 rule), 2 (2 rules), 3 (3 rules)
function generatePuzzle(difficulty) {
  difficulty = Math.min(3, Math.max(1, difficulty));

  // Start with fixed baseline
  let cells = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({
      shape: 'circle',
      fill:  'filled',
      size:  0.55,
      color: '#1a1a2e',
      rotation: 0,
    }))
  );

  // Pick non-conflicting rules
  const shuffledRules = shuffle(RULE_TYPES);
  const usedAttrs = new Set();
  const activeRules = [];

  for (const rule of shuffledRules) {
    if (activeRules.length >= difficulty) break;
    if (usedAttrs.has(rule.attr)) continue;
    usedAttrs.add(rule.attr);
    activeRules.push(rule);
  }

  // Apply each rule
  for (const rule of activeRules) {
    let chosen;
    if (rule.attr === 'shape')    chosen = shuffle(SHAPES).slice(0, 3);
    else if (rule.attr === 'fill')  chosen = shuffle(FILLS).slice(0, 3);
    else if (rule.attr === 'size')  chosen = shuffle(SIZES).slice(0, 3);
    else if (rule.attr === 'color') chosen = shuffle(COLORS).slice(0, 3);
    else if (rule.attr === 'rotation') chosen = rule.values || [0, 45, 90];

    const grid = buildAttrSequence(rule, chosen);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        cells[r][c][rule.attr] = grid[r][c];
  }

  return cells;
}

// Render a single cell descriptor onto a canvas element
function renderCell(canvas, cell, cellSize = 110) {
  canvas.width  = cellSize;
  canvas.height = cellSize;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cellSize, cellSize);

  if (!cell) return; // missing cell placeholder

  drawShape(
    ctx,
    cell.shape,
    cell.fill,
    cell.size,
    cell.color,
    cellSize / 2,
    cellSize / 2,
    cellSize,
    cell.rotation || 0
  );
}

// Generate 6 answer choices: 1 correct + 5 distractors
function generateChoices(correctCell, difficulty) {
  const choices = [correctCell];

  // rotation looks identical on symmetric shapes (circle, square, cross) — skip it
  const symmetricShapes = ['circle', 'square', 'cross'];
  const distractorAttrs = symmetricShapes.includes(correctCell.shape)
    ? ['shape', 'fill', 'size', 'color']
    : ['shape', 'fill', 'size', 'color', 'rotation'];

  while (choices.length < 6) {
    const base = { ...correctCell };
    // mutate 1 attribute for easy, 1-2 for harder
    const numMutations = difficulty === 1 ? 1 : Math.random() > 0.5 ? 1 : 2;
    const attrs = shuffle(distractorAttrs).slice(0, numMutations);

    for (const attr of attrs) {
      if (attr === 'shape')    base.shape    = pickRandom(SHAPES.filter(s => s !== base.shape));
      if (attr === 'fill')     base.fill     = pickRandom(FILLS.filter(f => f !== base.fill));
      if (attr === 'size')     base.size     = pickRandom(SIZES.filter(s => s !== base.size));
      if (attr === 'color')    base.color    = pickRandom(COLORS.filter(c => c !== base.color));
      if (attr === 'rotation') base.rotation = pickRandom([0, 45, 90, 135].filter(r => r !== base.rotation));
    }

    // avoid exact duplicate of existing choice
    const isDupe = choices.some(c =>
      c.shape === base.shape && c.fill === base.fill &&
      c.size  === base.size  && c.color === base.color &&
      c.rotation === base.rotation
    );
    if (!isDupe) choices.push(base);
  }

  return shuffle(choices);
}
