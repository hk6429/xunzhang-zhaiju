// js/grid.js — 字格渲染：full＝拖曳選字；cross＝填字格（v2）
// 方向僅 E（→）與 S（↓）。full 拖曳時 snap 到其一並即時預覽。

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
 * @param {Array<Array<string|null>>} gridData full＝全字元；cross＝目標格字元、其餘 null
 * @param {{ onSelect(path): void, onCellTap([r,c]): void }} handlers
 * @param {{ mode?: 'full'|'cross', revealed?: Array<[number,number]> }} opts
 */
export function createGrid(container, gridData, handlers = {}, opts = {}) {
  const mode = opts.mode === 'cross' ? 'cross' : 'full';
  const revealedKeys = new Set((opts.revealed || []).map(([r, c]) => `${r},${c}`));
  const size = gridData.length;
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
  container.style.setProperty('--grid-n', String(size)); // 供 CSS 依尺寸縮放字級
  container.style.gap = size >= 10 ? '3px' : (size >= 8 ? '4px' : '');
  container.classList.toggle('grid-cross', mode === 'cross');
  container.setAttribute('role', 'grid');
  container.setAttribute('aria-rowcount', String(size));
  container.setAttribute('aria-colcount', String(size));
  const defaultGridLabel = mode === 'full'
    ? '字陣盤面。按 Enter 選起點，再用向右或向下鍵延伸，按 Enter 送出。'
    : '填字盤面。用方向鍵移動，按 Enter 選擇詞條後輸入答案。';
  container.setAttribute('aria-label', defaultGridLabel);

  const cells = []; // cells[r][c] → element
  for (let r = 0; r < size; r++) {
    cells.push([]);
    for (let c = 0; c < size; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = String(r);
      el.dataset.c = String(c);
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-rowindex', String(r + 1));
      el.setAttribute('aria-colindex', String(c + 1));
      el.tabIndex = -1;
      if (mode === 'cross') {
        const ch = gridData[r][c];
        if (ch == null) {
          el.classList.add('empty'); // 不渲染內容，透明佔位
        } else if (revealedKeys.has(`${r},${c}`)) {
          el.classList.add('revealed'); // 預先顯示（交叉點）
          el.textContent = ch;
        } else {
          el.classList.add('blank'); // 空白框待填
        }
      } else {
        el.textContent = gridData[r][c];
      }
      const spoken = mode === 'cross' && gridData[r][c] == null ? '空白占位' : (el.textContent || '待填字格');
      el.setAttribute('aria-label', `第 ${r + 1} 列，第 ${c + 1} 欄，${spoken}`);
      container.appendChild(el);
      cells[r].push(el);
    }
  }

  const cellAt = (r, c) => cells[r][c];
  const eachInPath = (path, fn) => path.forEach(([r, c]) => fn(cellAt(r, c)));
  const canFocus = (el) => mode === 'full' || !el.classList.contains('empty');
  const firstFocusable = cells.flat().find(canFocus);
  if (firstFocusable) firstFocusable.tabIndex = 0;

  function cellFromPoint(x, y) {
    const rect = container.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const cw = rect.width / size;
    const ch = rect.height / size;
    const c = Math.min(size - 1, Math.max(0, Math.floor((x - rect.left) / cw)));
    const r = Math.min(size - 1, Math.max(0, Math.floor((y - rect.top) / ch)));
    return [r, c];
  }

  // ── full：拖曳選字 ────────────────────
  let anchor = null;       // [r, c]
  let previewPath = [];
  let activePointer = null;
  let pointerMoved = false;
  let keyboardAnchor = null;

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
    eachInPath(previewPath, (el) => {
      el.classList.remove('preview');
      el.setAttribute('aria-selected', 'false');
    });
    previewPath = path;
    eachInPath(previewPath, (el) => {
      el.classList.add('preview');
      el.setAttribute('aria-selected', 'true');
    });
  }

  function resetKeyboardSelection() {
    keyboardAnchor = null;
    setPreview([]);
    container.setAttribute('aria-label', defaultGridLabel);
  }

  function onPointerDown(ev) {
    if (activePointer !== null) return;
    const hit = cellFromPoint(ev.clientX, ev.clientY);
    if (!hit) return;
    activePointer = ev.pointerId;
    anchor = hit;
    pointerMoved = false;
    setPreview([hit]);
    try { container.setPointerCapture(ev.pointerId); } catch { /* 舊瀏覽器忽略 */ }
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (ev.pointerId !== activePointer || !anchor) return;
    const hit = cellFromPoint(ev.clientX, ev.clientY);
    if (!hit) return;
    if (hit[0] !== anchor[0] || hit[1] !== anchor[1]) pointerMoved = true;
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
    } else if (pointerMoved && typeof handlers.onInvalidSelection === 'function') {
      handlers.onInvalidSelection('direction');
    }
    pointerMoved = false;
  }

  function onPointerCancel() {
    setPreview([]);
    anchor = null;
    activePointer = null;
    pointerMoved = false;
  }

  // ── cross：點格選詞 ───────────────────
  function onCrossClick(ev) {
    const hit = cellFromPoint(ev.clientX, ev.clientY);
    if (!hit) return;
    const el = cellAt(hit[0], hit[1]);
    if (el.classList.contains('empty')) return;
    if (typeof handlers.onCellTap === 'function') handlers.onCellTap(hit);
  }

  function focusCell(r, c) {
    const next = cellAt(r, c);
    if (!next || !canFocus(next)) return null;
    const current = container.querySelector('.cell[tabindex="0"]');
    if (current) current.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
    return [r, c];
  }

  function onGridKeyDown(ev) {
    const el = ev.target.closest?.('.cell');
    if (!el || !container.contains(el)) return;
    const here = [Number(el.dataset.r), Number(el.dataset.c)];
    const moves = {
      ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0],
    };
    if (moves[ev.key]) {
      ev.preventDefault();
      if (mode === 'full' && keyboardAnchor && (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp')) {
        resetKeyboardSelection();
        handlers.onInvalidSelection?.('direction');
        return;
      }
      const [dr, dc] = moves[ev.key];
      const moved = focusCell(
        Math.max(0, Math.min(size - 1, here[0] + dr)),
        Math.max(0, Math.min(size - 1, here[1] + dc)),
      );
      if (mode === 'full' && keyboardAnchor && moved) setPreview(computePath(keyboardAnchor, moved));
      return;
    }
    if (ev.key === 'Escape' && keyboardAnchor) {
      ev.preventDefault();
      resetKeyboardSelection();
      return;
    }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (mode === 'cross') {
      handlers.onCellTap?.(here);
      return;
    }
    if (!keyboardAnchor) {
      keyboardAnchor = here;
      setPreview([here]);
      container.setAttribute('aria-label', `已選第 ${here[0] + 1} 列、第 ${here[1] + 1} 欄為起點。請按向右或向下鍵延伸，再按 Enter 送出。`);
      return;
    }
    const path = previewPath.slice();
    resetKeyboardSelection();
    if (path.length >= 2) handlers.onSelect?.(path);
    else handlers.onInvalidSelection?.('direction');
  }

  if (mode === 'full') {
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerCancel);
  } else {
    container.addEventListener('click', onCrossClick);
  }
  container.addEventListener('keydown', onGridKeyDown);

  let activePath = []; // cross 選中詞的路徑高亮

  // ── 公開操作 ──────────────────────────
  return {
    /** 永久高亮找到的句子（colorIdx 循環五色） */
    markFound(path, colorIdx) {
      eachInPath(path, (el) => {
        el.classList.remove('hint-circle', 'active');
        el.classList.add('found', `found-${((colorIdx % 5) + 5) % 5}`);
        el.setAttribute('aria-label', `${el.getAttribute('aria-label')}，已找到`);
      });
    },
    /** 整句路徑閃爍 ms 毫秒（提示：flash，full 用） */
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
    /** cross：填入一格字（正常字色） */
    setChar(r, c, ch) {
      const el = cellAt(r, c);
      el.textContent = ch;
      el.classList.remove('peek');
      el.classList.add('filled');
    },
    /** cross：該格是否已有字（含 revealed） */
    isFilled(r, c) {
      const el = cellAt(r, c);
      return el.classList.contains('filled') || el.classList.contains('revealed');
    },
    /** cross：暫顯答案字 ms 毫秒後隱回（提示：flash） */
    tempChar(r, c, ch, ms = 2000) {
      const el = cellAt(r, c);
      if (el.classList.contains('filled') || el.classList.contains('revealed')) return;
      el.textContent = ch;
      el.classList.add('peek');
      setTimeout(() => {
        if (el.classList.contains('peek')) {
          el.classList.remove('peek');
          el.textContent = '';
        }
      }, ms);
    },
    /** cross：選中詞路徑高亮（傳 [] 清除） */
    setActivePath(path) {
      eachInPath(activePath, (el) => el.classList.remove('active'));
      activePath = path || [];
      eachInPath(activePath, (el) => el.classList.add('active'));
    },
    destroy() {
      if (mode === 'full') {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointercancel', onPointerCancel);
      } else {
        container.removeEventListener('click', onCrossClick);
      }
      container.removeEventListener('keydown', onGridKeyDown);
      container.classList.remove('grid-cross');
      container.innerHTML = '';
    },
  };
}
