// 新手與無障礙增強層：不持有遊戲資料，只管理焦點、偏好與漸進式介面。
const $ = (id) => document.getElementById(id);
const ONBOARDING_KEY = 'xzzj_onboarding_seen_v1';
const SCENE_KEY = 'xzzj_game_scene_seen_v1';
const MODE_KEY = 'xzzj_play_mode_v1';

let lastDialogOpener = null;

function focusableElements(root) {
  return [...root.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), '
      + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
}

function openDialog(dialog) {
  if (!dialog || !dialog.classList.contains('hidden')) return;
  lastDialogOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.classList.remove('hidden');
  dialog.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    const target = focusableElements(dialog)[0] || dialog.querySelector('.modal');
    target?.focus();
  });
}

function closeDialog(dialog, rememberOnboarding = false) {
  if (!dialog) return;
  dialog.classList.add('hidden');
  dialog.setAttribute('aria-hidden', 'true');
  if (rememberOnboarding) {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* storage may be unavailable */ }
  }
  if (lastDialogOpener?.isConnected) lastDialogOpener.focus();
  lastDialogOpener = null;
}

function activeDialog() {
  const dialogs = [...document.querySelectorAll('.modal-backdrop[role="dialog"]')];
  return dialogs.reverse().find((dialog) => !dialog.classList.contains('hidden')) || null;
}

function bindDialogs() {
  const dialogs = document.querySelectorAll('.modal-backdrop[role="dialog"]');
  dialogs.forEach((dialog) => {
    dialog.setAttribute('aria-hidden', String(dialog.classList.contains('hidden')));
    const observer = new MutationObserver(() => {
      const isHidden = dialog.classList.contains('hidden');
      dialog.setAttribute('aria-hidden', String(isHidden));
      if (!isHidden) {
        lastDialogOpener = document.activeElement instanceof HTMLElement ? document.activeElement : lastDialogOpener;
        requestAnimationFrame(() => (focusableElements(dialog)[0] || dialog.querySelector('.modal'))?.focus());
      } else if (lastDialogOpener?.isConnected) {
        lastDialogOpener.focus();
        lastDialogOpener = null;
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['class'] });

    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog || dialog.dataset.staticDialog === 'true') return;
      const closeButton = dialog.querySelector('.modal-close');
      if (closeButton) closeButton.click();
    });
  });

  document.addEventListener('keydown', (event) => {
    const dialog = activeDialog();
    if (!dialog) return;

    if (event.key === 'Escape' && dialog.dataset.staticDialog !== 'true') {
      const closeButton = dialog.querySelector('.modal-close');
      if (closeButton) {
        event.preventDefault();
        closeButton.click();
      }
      return;
    }

    if (event.key !== 'Tab') return;
    const items = focusableElements(dialog);
    if (!items.length) {
      event.preventDefault();
      dialog.querySelector('.modal')?.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function bindOnboarding() {
  const dialog = $('modal-onboarding');
  const skip = $('btn-skip-onboarding');
  const start = $('btn-start-onboarding');
  if (!dialog || !skip || !start) return;

  const finish = () => closeDialog(dialog, true);
  skip.addEventListener('click', finish);
  start.addEventListener('click', () => {
    finish();
    const firstLevelButton = document.querySelector('.chamber-enter-btn:not([disabled])');
    if (firstLevelButton) firstLevelButton.click();
    else $('chamber-list')?.focus({ preventScroll: false });
  });

  let seen = false;
  try { seen = localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { /* noop */ }
  if (!seen) window.setTimeout(() => openDialog(dialog), 550);
}

function bindMobileControls() {
  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = $(button.dataset.scrollTarget);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
    });
  });
  $('btn-mobile-game-exit')?.addEventListener('click', () => $('btn-back-map')?.click());
  $('btn-dismiss-play-tip')?.addEventListener('click', () => $('play-instruction-tip')?.classList.add('hidden'));
  $('btn-rest-dismiss')?.addEventListener('click', () => $('rest-reminder')?.classList.add('hidden'));
}

function bindSceneDisclosure() {
  const details = $('game-scene-details');
  const gameView = $('view-game');
  if (!details || !gameView) return;
  let sceneSeen = false;
  try { sceneSeen = localStorage.getItem(SCENE_KEY) === '1'; } catch { /* noop */ }

  const observer = new MutationObserver(() => {
    if (gameView.classList.contains('hidden')) return;
    // 主要玩法要先進入視線；故事場景仍可由玩家自行展開閱讀。
    details.open = false;
    if (!sceneSeen) {
      sceneSeen = true;
      try { localStorage.setItem(SCENE_KEY, '1'); } catch { /* noop */ }
    }
  });
  observer.observe(gameView, { attributes: true, attributeFilter: ['class'] });
}

function bindModeSelector() {
  const selector = $('play-mode-selector');
  const status = $('play-mode-status');
  if (!selector) return;
  let selected = 'standard';
  try { selected = localStorage.getItem(MODE_KEY) || selected; } catch { /* noop */ }
  const initial = selector.querySelector(`input[value="${selected}"]`) || selector.querySelector('[value="standard"]');
  if (initial) initial.checked = true;

  const labels = { explore: '探索', standard: '標準', challenge: '挑戰' };
  const update = (value) => {
    if (status) status.textContent = `目前使用${labels[value] || '標準'}模式。`;
    try { localStorage.setItem(MODE_KEY, value); } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent('xzzj:play-mode-change', { detail: { mode: value } }));
  };
  update(initial?.value || 'standard');
  selector.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'play-mode') update(event.target.value);
  });
}

function syncNavigationState() {
  const buttons = document.querySelectorAll('.nav-btn[data-view]');
  const apply = () => buttons.forEach((button) => {
    if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  apply();
  buttons.forEach((button) => new MutationObserver(apply).observe(button, {
    attributes: true,
    attributeFilter: ['class'],
  }));
}

bindDialogs();
bindOnboarding();
bindMobileControls();
bindSceneDisclosure();
bindModeSelector();
syncNavigationState();

export { openDialog, closeDialog };
