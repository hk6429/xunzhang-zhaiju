// js/grid.js — 5×5 字格渲染與 Pointer Events 拖曳選字
// 方向僅 E（→）與 S（↓），拖曳時 snap 到其一並即時預覽。

export function pathKey(path) {
  return path.map(([r, c]) => `${r},${c}`).join('|');
}

/**
 * 依 SCHEMA 由 start + dir + 字數推得路徑。
 * @returns {Array<[number, number]>|null} 超出邊界回 null
 */
export function targetPath(target, length, size) {
  const [r0, c0] = target.start;
  const path = [];
  for (let i = 0; i < length; i++) {
    const r = target.dir === 'S' ? r0 + i : r0;
    const c = target.dir === 'E' ? c0 + i : c0;
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    path.push([r, c]);
  }
  return path;
}

/**
 * 建立盤面。
 * @param {HTMLElement} container
 * @param {string[][]} gridData 5×5 單字
 * @param {{ onSelect(path: Array<[number,number]>): void }} handlers
 */
export function createGrid(container, gridData, handlers = {}) {
  const size = gridData.length;
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  const cells = []; // cells[r][c] → element
  for (let r = 0; r < size; r++) {
    cells.push([]);
    for (let c = 0; c < size; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.textContent = gridData[r][c];
      el.dataset.r = String(r);
      el.dataset.c = String(c);
      container.appendChild(el);
      cells[r].push(el);
    }
  }

  const cellAt = (r, c) => cells[r][c];
  const eachInPath = (path, fn) => path.forEach(([r, c]) => fn(cellAt(r, c)));

  // ── 拖曳選字 ──────────────────────────
  let anchor = null;       // [r, c]
  let previewPath = [];
  let activePointer = null;

  function cellFromPoint(x, y) {
    const rect = container.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const cw = rect.width / size;
    const ch = rect.height / size;
    const c = Math.min(size - 1, Math.max(0, Math.floor((x - rect.left) / cw)));
    const r = Math.min(size - 1, Math.max(0, Math.floor((y - rect.top) / ch)));
    return [r, c];
  }

  function computePath(from, to) {
    const [r0, c0] = from;
    const [r1, c1] = to;
    const dE = c1 - c0;
    const dS = r1 - r0;
    // snap：位移較大的軸決定方向；反向（負值）視為 0 長度
    let dir, len;
    if (Math.abs(dE) >= Math.abs(dS)) {
      dir = 'E';
      len = Math.max(0, dE);
    } else {
      dir = 'S';
      len = Math.max(0, dS);
    }
    const path = [];
    for (let i = 0; i <= len; i++) {
      const r = dir === 'S' ? r0 + i : r0;
      const c = dir === 'E' ? c0 + i : c0;
      if (r >= size || c >= size) break;
      path.push([r, c]);
    }
    return path;
  }

  function setPreview(path) {
    eachInPath(previewPath, (el) => el.classList.remove('preview'));
    previewPath = path;
    eachInPath(previewPath, (el) => el.classList.add('preview'));
  }

  function onPointerDown(ev) {
    if (activePointer !== null) return;
    const hit = cellFromPoint(ev.clientX, ev.clientY);
    if (!hit) return;
    activePointer = ev.pointerId;
    anchor = hit;
    setPreview([hit]);
    try { container.setPointerCapture(ev.pointerId); } catch { /* 舊瀏覽器忽略 */ }
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (ev.pointerId !== activePointer || !anchor) return;
    const hit = cellFromPoint(ev.clientX, ev.clientY);
    if (!hit) return;
    setPreview(computePath(anchor, hit));
  }

  function onPointerUp(ev) {
    if (ev.pointerId !== activePointer) return;
    const path = previewPath;
    setPreview([]);
    anchor = null;
    activePointer = null;
    if (path.length >= 2 && typeof handlers.onSelect === 'function') {
      handlers.onSelect(path);
    }
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);

  // ── 公開操作 ──────────────────────────
  return {
    /** 永久高亮找到的句子（colorIdx 循環五色） */
    markFound(path, colorIdx) {
      eachInPath(path, (el) => {
        el.classList.remove('hint-circle');
        el.classList.add('found', `found-${((colorIdx % 5) + 5) % 5}`);
      });
    },
    /** 整句路徑閃爍 ms 毫秒（提示：flash） */
    flashPath(path, ms = 2000) {
      eachInPath(path, (el) => el.classList.add('flash'));
      setTimeout(() => eachInPath(path, (el) => el.classList.remove('flash')), ms);
    },
    /** 圈出首字（提示：circle） */
    circleCell(r, c) {
      cellAt(r, c).classList.add('hint-circle');
    },
    /** 比對失敗短暫紅閃 */
    flashInvalid(path, ms = 400) {
      eachInPath(path, (el) => el.classList.add('invalid'));
      setTimeout(() => eachInPath(path, (el) => el.classList.remove('invalid')), ms);
    },
    destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.innerHTML = '';
    },
  };
}
