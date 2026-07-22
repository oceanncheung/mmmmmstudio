/* mm.s control panel — sets data-* axes on <html>; persists; live clock;
   mobile control sheet toggle. 2026-07-06 r2 */
(function () {
  var PANEL_MARKER = 'responsive-70';
  var PANEL_OWNER_VERSION = 'responsive-70/root-lifecycle-1';

  function ensureRuntimeLifecycle() {
    var existing = window.__mmsRuntimeLifecycle;
    if (existing && existing.apiVersion === 1 && existing.owners &&
        typeof existing.create === 'function' &&
        typeof existing.replace === 'function' &&
        typeof existing.teardownStale === 'function') {
      return existing;
    }
    if (existing && existing.owners) {
      Object.keys(existing.owners).forEach(function (name) {
        var owner = existing.owners[name];
        if (owner && typeof owner.teardown === 'function') {
          try { owner.teardown(); } catch (e) {}
        }
      });
    }

    var registry = {
      apiVersion: 1,
      owners: Object.create(null)
    };

    registry.create = function (name, ownerRoot, version) {
      var disposed = false;
      var removers = [];
      var cleanups = [];
      var timers = new Set();
      var intervals = new Set();
      var frames = new Set();
      var observers = new Set();
      var owner = {
        name: name,
        root: ownerRoot,
        version: version
      };

      owner.active = function () {
        return !disposed && document.querySelector('.mms') === ownerRoot;
      };
      owner.guard = function (callback) {
        return function () {
          if (!owner.active()) return;
          return callback.apply(this, arguments);
        };
      };
      owner.on = function (target, type, callback, options) {
        if (!target || typeof target.addEventListener !== 'function') return function () {};
        var guarded = owner.guard(callback);
        var capture = typeof options === 'boolean' ? options : Boolean(options && options.capture);
        var removed = false;
        target.addEventListener(type, guarded, options);
        var off = function () {
          if (removed) return;
          removed = true;
          target.removeEventListener(type, guarded, capture);
        };
        removers.push(off);
        return off;
      };
      owner.onMql = function (query, callback) {
        if (!query) return function () {};
        var guarded = owner.guard(callback);
        var removed = false;
        if (typeof query.addEventListener === 'function') query.addEventListener('change', guarded);
        else if (typeof query.addListener === 'function') query.addListener(guarded);
        else return function () {};
        var off = function () {
          if (removed) return;
          removed = true;
          if (typeof query.removeEventListener === 'function') query.removeEventListener('change', guarded);
          else if (typeof query.removeListener === 'function') query.removeListener(guarded);
        };
        removers.push(off);
        return off;
      };
      owner.timeout = function (callback, delay) {
        var id = window.setTimeout(function () {
          timers.delete(id);
          if (owner.active()) callback();
        }, delay);
        timers.add(id);
        return id;
      };
      owner.clearTimeout = function (id) {
        if (!id) return;
        window.clearTimeout(id);
        timers.delete(id);
      };
      owner.interval = function (callback, delay) {
        var guarded = owner.guard(callback);
        var id = window.setInterval(guarded, delay);
        intervals.add(id);
        return id;
      };
      owner.raf = function (callback) {
        var id = window.requestAnimationFrame(function (time) {
          frames.delete(id);
          if (owner.active()) callback(time);
        });
        frames.add(id);
        return id;
      };
      owner.cancelRaf = function (id) {
        if (!id) return;
        window.cancelAnimationFrame(id);
        frames.delete(id);
      };
      owner.observe = function (observer) {
        if (observer && typeof observer.disconnect === 'function') observers.add(observer);
        return observer;
      };
      owner.cleanup = function (callback) {
        if (typeof callback === 'function') cleanups.push(callback);
        return callback;
      };
      owner.teardown = function () {
        if (disposed) return;
        disposed = true;
        removers.splice(0).reverse().forEach(function (remove) {
          try { remove(); } catch (e) {}
        });
        timers.forEach(function (id) { window.clearTimeout(id); });
        timers.clear();
        intervals.forEach(function (id) { window.clearInterval(id); });
        intervals.clear();
        frames.forEach(function (id) { window.cancelAnimationFrame(id); });
        frames.clear();
        observers.forEach(function (observer) {
          try { observer.disconnect(); } catch (e) {}
        });
        observers.clear();
        cleanups.splice(0).reverse().forEach(function (cleanup) {
          try { cleanup(); } catch (e) {}
        });
        if (registry.owners[name] === owner) delete registry.owners[name];
      };
      return owner;
    };
    registry.replace = function (name, owner) {
      var previous = registry.owners[name];
      if (previous && previous !== owner && typeof previous.teardown === 'function') {
        previous.teardown();
      }
      registry.owners[name] = owner;
      return owner;
    };
    registry.teardownStale = function (nextRoot) {
      Object.keys(registry.owners).forEach(function (name) {
        var owner = registry.owners[name];
        if (owner && owner.root !== nextRoot && typeof owner.teardown === 'function') {
          owner.teardown();
        }
      });
    };
    window.__mmsRuntimeLifecycle = registry;
    return registry;
  }

  function scheduleInit() {
    if (window.__mmsPanelBootstrapTimer) return;
    window.__mmsPanelBootstrapTimer = window.setTimeout(function () {
      window.__mmsPanelBootstrapTimer = 0;
      init();
    }, 50);
  }

  function capturePanelDomSignature(rootNode) {
    if (!rootNode) return [];
    return Array.prototype.slice.call(rootNode.querySelectorAll(
      '.mms-mbar, .mms-intro-wrap, [data-media-id]'
    ));
  }

  function sameDomSignature(previous, next) {
    if (!Array.isArray(previous) || previous.length !== next.length) return false;
    return previous.every(function (node, index) { return node === next[index]; });
  }

  function panelOwnerMatchesDom(owner, rootNode) {
    if (!owner || !rootNode || owner.root !== rootNode ||
        owner.version !== PANEL_OWNER_VERSION || !owner.active()) return false;
    var localPanel = rootNode.querySelector('dialog.mms-panel');
    var ownedPanel = owner.panel;
    var panelMatches = localPanel
      ? localPanel === ownedPanel
      : Boolean(ownedPanel && ownedPanel.isConnected && owner.panelSlot &&
          owner.panelSlot.parentNode && rootNode.contains(owner.panelSlot));
    return panelMatches && sameDomSignature(
      owner.domSignature,
      capturePanelDomSignature(rootNode)
    );
  }

  function init() {
  var lifecycleRegistry = ensureRuntimeLifecycle();
  var currentMms = document.querySelector('.mms');
  lifecycleRegistry.teardownStale(currentMms);
  var currentOwner = lifecycleRegistry.owners.panel;
  if (panelOwnerMatchesDom(currentOwner, currentMms)) return;
  var availablePanel = currentMms && currentMms.querySelector('dialog.mms-panel');
  if (!availablePanel && currentOwner && currentOwner.root === currentMms &&
      currentOwner.panel && currentOwner.panel.isConnected && currentOwner.panelSlot &&
      currentMms.contains(currentOwner.panelSlot)) {
    availablePanel = currentOwner.panel;
  }
  if (!currentMms || !availablePanel || !availablePanel.querySelector('[data-theme-set]')) {
    scheduleInit();
    return;
  }
  if (window.__mmsPanelBootstrapTimer) {
    window.clearTimeout(window.__mmsPanelBootstrapTimer);
    window.__mmsPanelBootstrapTimer = 0;
  }
  if (currentOwner && typeof currentOwner.teardown === 'function') currentOwner.teardown();
  var runtime = lifecycleRegistry.create('panel', currentMms, PANEL_OWNER_VERSION);
  lifecycleRegistry.replace('panel', runtime);
  if (currentMms) {
    var currentPanel = currentMms.querySelector('dialog.mms-panel');
    document.querySelectorAll('dialog.mms-panel').forEach(function (candidate) {
      if (currentPanel && candidate !== currentPanel) {
        if (candidate.open) candidate.close();
        candidate.remove();
      }
    });
  }
  window.__mmsPanelVersion = PANEL_MARKER;
  window.__mmsPanelRoot = currentMms;
  var root = document.documentElement;
  var SCALES = ['s', 'm', 'l', 'xl'];
  var THEMES = ['white', 'girly', 'quirky', 'contrast', 'black'];
  var FACES = ['serif', 'sans', 'mono', 'gothic'];
  var SHAPES = ['straight', 'rounded', 'oval'];
  var userAgent = navigator.userAgent || '';
  var isIOS = /iP(ad|hone|od)/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /Safari\//.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS|Firefox/.test(userAgent);
  var earlyPreview = window.__mmsRenderPreview || null;
  var renderPreviewStop = null;
  var SWATCH_NAV_ATTRIBUTE = 'data-mms-swatch-nav';
  root.removeAttribute(SWATCH_NAV_ATTRIBUTE);
  runtime.cleanup(function () { root.removeAttribute(SWATCH_NAV_ATTRIBUTE); });

  /* A swatch receives the dotted gold focus frame only after deliberate
     Arrow-key navigation within the palette. Tab/programmatic focus alone is
     quiet, and the next mouse, pen, or touch contact returns to pointer mode. */
  runtime.on(document, 'keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    var direction = {
      ArrowLeft: -1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowDown: 1
    }[event.key];
    if (!direction) return;
    var active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains('mms-dot')) return;
    var row = active.closest('.row.dots');
    if (!row) return;
    var swatches = Array.prototype.slice.call(row.querySelectorAll('.mms-dot'));
    var index = swatches.indexOf(active);
    if (index < 0 || swatches.length < 2) return;
    event.preventDefault();
    root.setAttribute(SWATCH_NAV_ATTRIBUTE, 'arrow');
    var next = swatches[(index + direction + swatches.length) % swatches.length];
    try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); }
  }, true);
  runtime.on(document, 'pointerdown', function () {
    root.removeAttribute(SWATCH_NAV_ATTRIBUTE);
  }, true);
  runtime.on(document, 'touchstart', function () {
    root.removeAttribute(SWATCH_NAV_ATTRIBUTE);
  }, { capture: true, passive: true });
  function ensureFullBleedViewport() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    var parts = (viewport.getAttribute('content') || 'width=device-width, initial-scale=1')
      .split(',').map(function (part) { return part.trim(); }).filter(Boolean)
      .filter(function (part) { return part.indexOf('viewport-fit=') !== 0; });
    parts.push('viewport-fit=cover');
    viewport.setAttribute('content', parts.join(', '));
    /* A theme-color paints Safari's status/toolbar and overscroll regions with
       a solid swatch. Let the real document continue beneath Safari instead. */
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.remove();
    });
  }

  function apply(axis, value, persist) {
    if (persist !== false && renderPreviewStop) renderPreviewStop(true);
    root.setAttribute('data-' + axis, value);
    if (axis === 'theme' && persist !== false && earlyPreview &&
        typeof earlyPreview.sampleTheme === 'function') {
      earlyPreview.sampleTheme(value);
    }
    if (persist !== false) {
      try { localStorage.setItem('mms-' + axis, value); } catch (e) {}
    }
    var sel = '[data-' + axis + '-set]';
    document.querySelectorAll(sel).forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-' + axis + '-set') === value));
    });
    if (axis === 'scale') {
      var slider = document.getElementById('mms-scale');
      if (slider) slider.value = String(SCALES.indexOf(value));
    }
    runtime.timeout(setBarH, 0);
    scheduleMontranMapFit();
  }

  ensureFullBleedViewport();

  // Restore persisted state. Fresh compact and expanded visits both start at
  // their device-specific Medium modes. Implicit defaults are not stored.
  // palette v2 migration (2026-07-10): old theme ids saved in visitors'
  // localStorage map onto the renamed themes.
  var THEME_MIG = { navy: 'girly', brown: 'quirky', yellow: 'contrast' };
  var previewInProgress = Boolean(earlyPreview &&
    (earlyPreview.active || earlyPreview.status === 'settling'));
  ['theme', 'face', 'scale', 'shape'].forEach(function (axis) {
    var saved = null;
    try { saved = localStorage.getItem('mms-' + axis); } catch (e) {}
    if (axis === 'theme' && saved && THEME_MIG[saved]) saved = THEME_MIG[saved];
    var fallback = { theme: 'white', face: 'serif', scale: 'm', shape: 'straight' }[axis];
    var earlyTarget = earlyPreview && earlyPreview.target && earlyPreview.target[axis];
    var initial = earlyTarget || saved || root.getAttribute('data-' + axis) || fallback;
    if (axis === 'scale' && !saved) initial = fallback;
    if (!previewInProgress) apply(axis, initial, false);
  });
  runtime.on(window, 'pageshow', function () {
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) { meta.remove(); });
  });

  function syncControlState() {
    ['theme', 'face', 'shape'].forEach(function (axis) {
      var value = root.getAttribute('data-' + axis);
      document.querySelectorAll('[data-' + axis + '-set]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-' + axis + '-set') === value));
      });
    });
    var currentScale = root.getAttribute('data-scale') || 'm';
    var currentSlider = document.getElementById('mms-scale');
    if (currentSlider) currentSlider.value = String(SCALES.indexOf(currentScale));
  }
  syncControlState();
  if (earlyPreview && (earlyPreview.active || earlyPreview.status === 'settling')) {
    renderPreviewStop = function () { earlyPreview.cancel(); };
    var syncEarlyPreviewCut = function () { syncControlState(); };
    var stopEarlyPreviewCut = null;
    var stopEarlyPreviewDone = null;
    var finishEarlyPreview = function () {
      renderPreviewStop = null;
      syncControlState();
      if (stopEarlyPreviewCut) stopEarlyPreviewCut();
      if (stopEarlyPreviewDone) stopEarlyPreviewDone();
      runtime.timeout(setBarH, 0);
      scheduleMontranMapFit();
    };
    stopEarlyPreviewCut = runtime.on(document, 'mms-render-preview-cut', syncEarlyPreviewCut);
    stopEarlyPreviewDone = runtime.on(document, 'mms-render-preview-done', finishEarlyPreview);
  }
  runtime.timeout(syncControlState, 100);
  runtime.timeout(syncControlState, 500);
  runtime.timeout(syncControlState, 1500);
  // radio groups
  ['theme', 'face', 'shape'].forEach(function (axis) {
    document.querySelectorAll('[data-' + axis + '-set]').forEach(function (b) {
      runtime.on(b, 'click', function (event) {
        apply(axis, b.getAttribute('data-' + axis + '-set'), true);
        if (axis === 'theme' && event.detail > 0) {
          runtime.timeout(function () {
            if (document.activeElement === b) b.blur();
          }, 0);
        }
      });
    });
  });

  // slider: 4 steps -> scale modes
  var slider = document.getElementById('mms-scale');
  if (slider) runtime.on(slider, 'input', function () { apply('scale', SCALES[+slider.value] || 'm', true); });

  // live clock: every .js-clock element (desktop corner + mobile bar)
  var clocks = document.querySelectorAll('.js-clock');
  function tick() {
    var d = new Date();
    var t = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
    clocks.forEach(function (c) { c.textContent = t; });
  }
  if (clocks.length) { tick(); runtime.interval(tick, 1000); }

  // One native dialog serves two contexts: sticky in the expanded rail and a
  // persistent non-modal viewport tray in compact mode. Compact mode portals
  // the same node under body so Cargo's transformed wrappers cannot trap fixed
  // positioning; expanded mode restores it to this placeholder.
  var panel = document.querySelector('.mms dialog.mms-panel') || document.querySelector('dialog.mms-panel');
  var compactPanel = window.matchMedia('(max-width: 1023px)');
  var lastCompactMode = compactPanel.matches;
  var lastPanelTrigger = null;
  var panelSlot = null;
  if (panel && panel.parentNode) {
    panelSlot = document.createComment('mms-panel-slot');
    panel.parentNode.insertBefore(panelSlot, panel);
  }
  runtime.panel = panel;
  runtime.panelSlot = panelSlot;

  function portalCompactPanel() {
    if (panel && panel.parentNode !== document.body) document.body.appendChild(panel);
  }

  function restoreExpandedPanel() {
    if (!panel) return;
    var shell = document.querySelector('.mms');
    if ((!panelSlot || !panelSlot.parentNode) && shell) {
      panelSlot = document.createComment('mms-panel-slot');
      shell.appendChild(panelSlot);
      runtime.panelSlot = panelSlot;
    }
    if (panelSlot && panelSlot.parentNode && panel.previousSibling !== panelSlot) {
      panelSlot.parentNode.insertBefore(panel, panelSlot.nextSibling);
    }
  }

  function setPanelButtons(open) {
    document.querySelectorAll('[data-panel-toggle]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(open));
      if (b.classList.contains('mms-menu')) {
        b.setAttribute('aria-label', open ? 'close site controls' : 'open site controls');
      }
    });
  }

  function closeCompactPanel(restoreFocus) {
    var wasOpen = root.getAttribute('data-panel') === 'open' || Boolean(panel && panel.open);
    root.removeAttribute('data-panel');
    setPanelButtons(false);
    if (panel) {
      panel.setAttribute('aria-modal', 'false');
      if (panel.open) panel.close();
    }
    if (restoreFocus && lastPanelTrigger && document.contains(lastPanelTrigger)) {
      lastPanelTrigger.focus();
    }
  }

  function openCompactPanel(trigger, keyboardOpen) {
    if (!panel) return;
    lastPanelTrigger = trigger || document.querySelector('[data-panel-toggle]');
    portalCompactPanel();
    panel.setAttribute('aria-modal', 'false');
    root.setAttribute('data-panel', 'open');
    setPanelButtons(true);
    if (!panel.open) panel.show();
    if (keyboardOpen) {
      runtime.timeout(function () {
        var firstControl = panel.querySelector('#mms-scale') || panel.querySelector('button, input');
        if (firstControl) firstControl.focus();
      }, 0);
    }
  }

  function syncPanelMode() {
    if (!panel) return;
    var modeChanged = compactPanel.matches !== lastCompactMode;
    lastCompactMode = compactPanel.matches;
    if (modeChanged) {
      var savedScale = null;
      try { savedScale = localStorage.getItem('mms-scale'); } catch (e) {}
      if (!savedScale) apply('scale', 'm', false);
    }
    if (compactPanel.matches) {
      // Header/type remeasurement calls this after every setting change. Keep
      // an intentionally open compact tray open; only reset when entering
      // compact mode from the always-open desktop panel or when already shut.
      if (root.getAttribute('data-panel') === 'open' && panel.open) {
        portalCompactPanel();
        panel.setAttribute('aria-modal', 'false');
        setPanelButtons(true);
        return;
      }
      closeCompactPanel(false);
      portalCompactPanel();
    } else {
      root.removeAttribute('data-panel');
      if (panel.open) panel.close();
      restoreExpandedPanel();
      panel.setAttribute('aria-modal', 'false');
      if (!panel.open) panel.show();
      setPanelButtons(false);
    }
    postBookletMode();
  }

  var bookletFrame = document.querySelector('iframe[data-slot="montran-booklet"]');
  var bookletShell = null;
  var bookletGesture = null;

  /* Compact booklet gestures belong to the outer river, not the cross-origin
     iframe. The iframe stays native on expanded desktops. On compact screens
     this transparent split overlay lets the browser pan the river normally;
     only a stationary tap in the left or right half posts one page command. */
  function ensureBookletGesture() {
    if (!bookletFrame) return;
    bookletShell = bookletFrame.closest('.mms-booklet-shell');
    if (!bookletShell) {
      bookletShell = document.createElement('div');
      bookletShell.className = 'mms-booklet-shell';
      ['--asset-w', '--asset-h'].forEach(function (property) {
        var value = bookletFrame.style.getPropertyValue(property);
        if (value) bookletShell.style.setProperty(property, value);
      });
      ['data-mobile-profile', 'data-media-id', 'data-shape-policy', 'data-fit'].forEach(function (attribute) {
        var value = bookletFrame.getAttribute(attribute);
        if (value) bookletShell.setAttribute(attribute, value);
        bookletFrame.removeAttribute(attribute);
      });
      bookletFrame.parentNode.insertBefore(bookletShell, bookletFrame);
      bookletShell.appendChild(bookletFrame);
    }
    bookletGesture = bookletShell.querySelector('.mms-booklet-gesture');
    if (!bookletGesture) {
      bookletGesture = document.createElement('div');
      bookletGesture.className = 'mms-booklet-gesture';
      ['previous', 'next'].forEach(function (direction) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'mms-booklet-turn';
        button.setAttribute('data-booklet-turn', direction);
        button.setAttribute('aria-label', direction + ' booklet spread');
        button.tabIndex = -1;
        bookletGesture.appendChild(button);
      });
      bookletShell.appendChild(bookletGesture);
    }
  }
  ensureBookletGesture();

  var bookletTargetOrigin = '*';
  if (bookletFrame) {
    try {
      bookletTargetOrigin = new URL(
        bookletFrame.getAttribute('data-src') || bookletFrame.getAttribute('src') || '',
        window.location.href
      ).origin;
    } catch (e) {}
  }

  function postBookletTurn(direction) {
    if (!bookletFrame || !bookletFrame.contentWindow || !compactPanel.matches) return;
    try {
      bookletFrame.contentWindow.postMessage({
        __mmsBookletTurn: 1,
        position: direction === 'previous' ? 0.25 : 0.75,
        direction: direction
      }, bookletTargetOrigin);
    } catch (e) {}
  }

  if (bookletGesture) {
    var bookletPointer = null;
    var bookletSuppressClickUntil = 0;
    var bookletTurnLockedUntil = 0;
    runtime.on(bookletGesture, 'pointerdown', function (event) {
      if (!compactPanel.matches || event.isPrimary === false ||
          (event.button !== undefined && event.button !== 0)) return;
      var targetButton = event.target && event.target.closest
        ? event.target.closest('[data-booklet-turn]')
        : null;
      bookletPointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: Date.now(),
        direction: targetButton && bookletGesture.contains(targetButton)
          ? targetButton.getAttribute('data-booklet-turn')
          : null,
        moved: false
      };
    }, { passive: true });
    runtime.on(bookletGesture, 'pointermove', function (event) {
      if (!bookletPointer || bookletPointer.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - bookletPointer.x, event.clientY - bookletPointer.y) > 8) {
        bookletPointer.moved = true;
      }
    }, { passive: true });
    function requestCompactBookletTurn(direction) {
      var now = Date.now();
      if (!compactPanel.matches || now < bookletTurnLockedUntil) return;
      bookletTurnLockedUntil = now + 700;
      postBookletTurn(direction);
    }
    function finishBookletPointer(event) {
      if (!bookletPointer || bookletPointer.id !== event.pointerId) return;
      var direction = bookletPointer.direction;
      var moved = bookletPointer.moved ||
        Math.hypot(event.clientX - bookletPointer.x, event.clientY - bookletPointer.y) > 8;
      var elapsed = Date.now() - bookletPointer.time;
      bookletPointer = null;
      /* iOS Safari does not reliably synthesize click after a stationary
         pointer sequence on an element that also permits native panning.
         Commit the turn directly on pointerup; pointercancel and moved
         gestures remain pure river/page scrolling. */
      bookletSuppressClickUntil = Date.now() + 450;
      if (event.type !== 'pointerup' || moved || elapsed > 500 || !direction) return;
      requestCompactBookletTurn(direction);
    }
    runtime.on(bookletGesture, 'pointerup', finishBookletPointer, { passive: true });
    runtime.on(bookletGesture, 'pointercancel', finishBookletPointer, { passive: true });
    bookletGesture.querySelectorAll('[data-booklet-turn]').forEach(function (button) {
      runtime.on(button, 'click', function (event) {
        /* Pointer taps are handled above. Retain a keyboard/programmatic
           fallback without allowing Safari's delayed click to double-turn. */
        if (event.detail !== 0) return;
        var now = Date.now();
        if (!compactPanel.matches || now < bookletSuppressClickUntil || now < bookletTurnLockedUntil) return;
        requestCompactBookletTurn(button.getAttribute('data-booklet-turn'));
      });
    });
  }

  function postBookletMode() {
    if (!bookletFrame || !bookletFrame.contentWindow) return;
    try {
      bookletFrame.contentWindow.postMessage({
        __mmsBookletMode: 1,
        compact: compactPanel.matches
      }, bookletTargetOrigin);
    } catch (e) {}
  }
  if (bookletFrame) runtime.on(bookletFrame, 'load', postBookletMode);
  runtime.on(window, 'message', function (event) {
    if (!bookletFrame || event.source !== bookletFrame.contentWindow ||
        event.origin !== bookletTargetOrigin) return;
    var data = event.data || {};
    if (data.__mmsBookletReady === 1 && data.kind === 'montran-booklet' && data.version === 17) {
      postBookletMode();
    }
  });

  document.querySelectorAll('[data-panel-toggle]').forEach(function (b) {
    runtime.on(b, 'click', function (event) {
      if (!compactPanel.matches) return;
      var keyboard = event.detail === 0;
      if (root.getAttribute('data-panel') === 'open') closeCompactPanel(keyboard);
      else openCompactPanel(b, event.detail === 0);
    });
  });

  /* Rounded and oval media are visually clipped, but their horizontal river
     remains a full rectangular scroller above the sticky header. On iOS that
     river owns taps even in a transparent clipped corner. Forward only a
     completed tap (never pointerdown/touchmove) when it lands inside the
     header toggle's 44px target and outside every visible media silhouette.
     Native horizontal and vertical panning therefore remain untouched. */
  function pointInsideRect(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function pointInsideMediaShape(element, x, y) {
    var rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || !pointInsideRect(rect, x, y)) return false;
    if (element.getAttribute('data-shape-policy') === 'interactive' &&
        !element.classList.contains('mms-booklet-shell')) return true;
    var shape = root.getAttribute('data-shape') || 'straight';
    if (shape === 'oval') {
      var dx = (x - (rect.left + rect.width / 2)) / (rect.width / 2);
      var dy = (y - (rect.top + rect.height / 2)) / (rect.height / 2);
      return (dx * dx) + (dy * dy) <= 1;
    }
    if (shape === 'rounded') {
      var radius = Math.min(
        parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,
        rect.width / 2,
        rect.height / 2
      );
      if (!radius) return true;
      var innerX = Math.max(rect.left + radius, Math.min(x, rect.right - radius));
      var innerY = Math.max(rect.top + radius, Math.min(y, rect.bottom - radius));
      var cornerX = x - innerX;
      var cornerY = y - innerY;
      return (cornerX * cornerX) + (cornerY * cornerY) <= radius * radius;
    }
    return true;
  }

  runtime.on(document, 'click', function (event) {
    if (!event.isTrusted || !compactPanel.matches || root.getAttribute('data-panel') === 'open') return;
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    var river = target && target.closest ? target.closest('.mms-river') : null;
    var toggle = document.querySelector('.mms-menu[data-panel-toggle]');
    if (!river || !toggle) return;

    var toggleRect = toggle.getBoundingClientRect();
    var hitSize = Math.max(44, toggleRect.width, toggleRect.height);
    var toggleHit = {
      left: toggleRect.left + (toggleRect.width - hitSize) / 2,
      right: toggleRect.left + (toggleRect.width + hitSize) / 2,
      top: toggleRect.top + (toggleRect.height - hitSize) / 2,
      bottom: toggleRect.top + (toggleRect.height + hitSize) / 2
    };
    if (!pointInsideRect(toggleHit, event.clientX, event.clientY)) return;

    if (target.closest('.mms-game, .caption, a, button, input')) return;
    var visibleMedia = Array.prototype.some.call(river.querySelectorAll('.mms-frame, [data-shape-policy="interactive"]'), function (media) {
      return pointInsideMediaShape(media, event.clientX, event.clientY);
    });
    if (visibleMedia) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    runtime.timeout(function () { toggle.click(); }, 0);
  }, true);
  document.querySelectorAll('[data-panel-close]').forEach(function (b) {
    runtime.on(b, 'click', function () { closeCompactPanel(true); });
  });
  runtime.on(document, 'click', function (event) {
    if (!compactPanel.matches || root.getAttribute('data-panel') !== 'open' || !panel) return;
    var path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    var insidePanel = path.indexOf(panel) >= 0 || panel.contains(event.target);
    var toggle = event.target && event.target.closest ? event.target.closest('[data-panel-toggle]') : null;
    if (!insidePanel && !toggle) closeCompactPanel(false);
  });
  runtime.on(document, 'keydown', function (event) {
    if (event.key === 'Escape' && compactPanel.matches && root.getAttribute('data-panel') === 'open') {
      event.preventDefault();
      closeCompactPanel(true);
    }
  });
  if (panel) {
    runtime.on(panel, 'close', function () {
      if (compactPanel.matches && root.getAttribute('data-panel') === 'open') {
        root.removeAttribute('data-panel');
        setPanelButtons(false);
      }
    });
  }
  runtime.onMql(compactPanel, syncPanelMode);
  runtime.on(window, 'resize', syncPanelMode);
  runtime.on(window, 'load', syncPanelMode);
  syncPanelMode();

  // iOS/Safari video fallback (2026-07-10): the two ALPHA videos (8bit-girls,
  // mandy hf) ship VP9-alpha webm, which every WebKit browser renders without
  // alpha (or not at all). Those <video>s carry data-mp4 = HEVC-alpha rendition;
  // swap on any iOS browser (all are WebKit, incl. CriOS/FxiOS) or desktop
  // Safari. Opaque videos are plain H.264 mp4 and need no swap.
  // The fallback source is selected only when a video approaches the
  // viewport; assigning every source during init defeated mobile deferral.

  // Heavy media loads within one viewport of view. Videos pause when they
  // leave that range; iframes receive a lifecycle message so WebGL can stop
  // rendering even after its one-time load.
  var loopCover = document.querySelector('[data-media-id="loop-01"]');
  if (loopCover) loopCover.dataset.mobileProfile = 'loop-cover';
  if (bookletShell) bookletShell.dataset.mobileProfile = 'booklet-wide';

  function deferredSource(element) {
    if ((isIOS || isSafari) && element.matches('video[data-mp4]')) {
      return element.getAttribute('data-mp4');
    }
    return element.getAttribute('data-src');
  }
  function isTouchbaesAlphaVideo(element) {
    var frame = element && element.closest ? element.closest('[data-media-id="touchbaes-02"]') : null;
    return Boolean(frame && element.tagName === 'VIDEO');
  }
  function deferredPoster(element) {
    var poster = element.getAttribute('data-poster');
    if (!poster || !isTouchbaesAlphaVideo(element)) return poster;
    /* The original transparent PNG is 1.7 MB. The 720px Freight rendition is
       still at least 2x the asset's maximum settled iPad width while avoiding
       a redundant original-size transfer beside the 2 MB HEVC-alpha video. */
    return poster.replace('/t/original/i/', '/w/720/q/85/i/');
  }
  function activateDeferred(element) {
    if (!element || element.dataset.mmsLoaded === '1') return;
    var source = deferredSource(element);
    if (!source) return;
    element.removeAttribute('src');
    element.dataset.mmsSource = source;
    element.dataset.mmsLoaded = '1';
    var poster = deferredPoster(element);
    if (element.tagName === 'VIDEO') {
      if (isTouchbaesAlphaVideo(element)) element.setAttribute('preload', 'auto');
      if (poster && !element.getAttribute('poster')) element.setAttribute('poster', poster);
      element.muted = true;
      element.defaultMuted = true;
      element.autoplay = true;
      element.playsInline = true;
      element.setAttribute('muted', '');
      element.setAttribute('autoplay', '');
      element.setAttribute('playsinline', '');
      element.setAttribute('webkit-playsinline', '');
    }
    element.setAttribute('src', source);
    if (element.tagName === 'VIDEO') {
      try { element.load(); } catch (e) {}
      runtime.on(element, 'loadedmetadata', function () { requestVideoPlay(element); }, { once: true });
      if (isTouchbaesAlphaVideo(element)) {
        runtime.on(element, 'loadeddata', function () { requestVideoPlay(element); }, { once: true });
      }
      runtime.on(element, 'canplay', function () { requestVideoPlay(element); }, { once: true });
      runtime.on(element, 'playing', function () {
        element.dataset.motionReady = '1';
      }, { once: true });
      runtime.on(element, 'error', function () {
        element.dataset.motionError = '1';
      });
    } else if (element.tagName === 'IFRAME' && poster) {
      element.style.backgroundImage = 'url("' + poster.replace(/"/g, '%22') + '")';
      element.style.backgroundPosition = 'center';
      element.style.backgroundRepeat = 'no-repeat';
      element.style.backgroundSize = 'contain';
    }
  }
  function requestVideoPlay(video) {
    if (!video || video.dataset.mmsLoaded !== '1') return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    try {
      var promise = video.play();
      if (promise && promise.catch) promise.catch(function () {});
    } catch (e) {}
  }
  function setMediaActive(element, active) {
    if (active) activateDeferred(element);
    if (element.tagName === 'VIDEO') {
      if (!active) { try { element.pause(); } catch (e) {} return; }
      requestVideoPlay(element);
    } else if (element.tagName === 'IFRAME' && element.contentWindow && element.dataset.mmsLoaded === '1') {
      try { element.contentWindow.postMessage({ __mmsEmbedVisibility: 1, visible: active }, '*'); } catch (e) {}
    }
  }

  /* A scrubber can move farther than native lazy loading anticipates in one
     pointer frame. Prepare the complete nearby river before it becomes
     interactive so a jump never reveals an empty image/video frame. Actual
     video and iframe sources remain governed by the existing observer. */
  function prewarmRiverMedia(container) {
    if (!container) return;
    container.querySelectorAll('img[loading="lazy"]').forEach(function (image) {
      image.setAttribute('loading', 'eager');
    });
    container.querySelectorAll('video[data-poster], iframe[data-poster]').forEach(function (element) {
      var poster = deferredPoster(element);
      if (!poster) return;
      if (element.tagName === 'VIDEO') {
        if (!element.getAttribute('poster')) element.setAttribute('poster', poster);
        return;
      }
      if (!element.style.backgroundImage) {
        element.style.backgroundImage = 'url("' + poster.replace(/"/g, '%22') + '")';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
        element.style.backgroundSize = 'contain';
      }
    });
  }

  var mediaLoaderStarted = false;
  function startDeferredMedia() {
    if (mediaLoaderStarted) return;
    mediaLoaderStarted = true;
    var deferredMedia = document.querySelectorAll('.mms video[data-src], .mms iframe[data-src]');
    var scrubberDesktopMedia = window.matchMedia(
      '(min-width: 1024px) and (any-hover: hover) and (any-pointer: fine)'
    );
    function prewarmAllRiverMedia() {
      if (!scrubberDesktopMedia.matches) return;
      document.querySelectorAll('.mms-band').forEach(prewarmRiverMedia);
    }
    prewarmAllRiverMedia();
    runtime.onMql(scrubberDesktopMedia, prewarmAllRiverMedia);
    deferredMedia.forEach(function (element) {
      if (element.tagName === 'VIDEO') element.setAttribute('preload', 'none');
    });
    deferredMedia.forEach(function (element) {
      if (element.getAttribute('data-motion-priority') !== 'critical') return;
      if (element.tagName === 'VIDEO') element.setAttribute('preload', 'auto');
      if (element.tagName === 'IFRAME') element.setAttribute('loading', 'eager');
      setMediaActive(element, true);
    });
    if ('IntersectionObserver' in window) {
      var riverPrewarmObserver = runtime.observe(new IntersectionObserver(runtime.guard(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          prewarmRiverMedia(entry.target);
          riverPrewarmObserver.unobserve(entry.target);
        });
      }), { rootMargin: '100% 0px', threshold: 0 }));
      document.querySelectorAll('.mms-band').forEach(function (band) {
        riverPrewarmObserver.observe(band);
      });

      var mediaObserver = runtime.observe(new IntersectionObserver(runtime.guard(function (entries) {
        entries.forEach(function (entry) { setMediaActive(entry.target, entry.isIntersecting); });
      }), { rootMargin: '100% 100%', threshold: 0 }));
      deferredMedia.forEach(function (element) { mediaObserver.observe(element); });

      /* The Touchbaes game sits several items into its horizontal river. Load
         the live iframe when the project band is vertically near, rather than
         waiting until the user has already swiped to the game's x-position.
         This keeps the game deferred during startup while removing the
         poster-to-iframe flash from the visible river. */
      var touchbaesFrame = document.querySelector('.mms iframe[data-embed-kind="touchbaes"]');
      var touchbaesBand = touchbaesFrame && touchbaesFrame.closest('.mms-band');
      if (touchbaesFrame && touchbaesBand && touchbaesFrame.dataset.mmsLoaded !== '1') {
        var touchbaesBandObserver = runtime.observe(new IntersectionObserver(runtime.guard(function (entries) {
          if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
          touchbaesFrame.setAttribute('loading', 'eager');
          setMediaActive(touchbaesFrame, true);
          touchbaesBandObserver.disconnect();
        }), { rootMargin: '100% 0px', threshold: 0 }));
        touchbaesBandObserver.observe(touchbaesBand);
      }
    } else {
      document.querySelectorAll('.mms-band').forEach(prewarmRiverMedia);
      deferredMedia.forEach(function (element) { setMediaActive(element, true); });
    }
  }
  runtime.on(window, 'message', function (event) {
    if (!event.data || event.data.__mmsEmbedReady !== 1) return;
    var frames = document.querySelectorAll('.mms iframe[data-embed-kind]');
    frames.forEach(function (frame) {
      if (event.source !== frame.contentWindow) return;
      if (event.data.kind !== frame.getAttribute('data-embed-kind')) return;
      var expectedOrigin = '';
      try { expectedOrigin = new URL(deferredSource(frame), window.location.href).origin; } catch (e) {}
      if (expectedOrigin && event.origin !== expectedOrigin) return;
      frame.dataset.motionReady = '1';
      frame.style.backgroundImage = 'none';
    });
  });
  startDeferredMedia();
  function resumeVisibleVideos() {
    document.querySelectorAll('.mms video[data-mms-loaded="1"]').forEach(function (video) {
      var rect = video.getBoundingClientRect();
      if (rect.bottom >= -window.innerHeight && rect.top <= window.innerHeight * 2) requestVideoPlay(video);
    });
  }
  runtime.on(window, 'pageshow', resumeVisibleVideos);
  runtime.on(document, 'visibilitychange', function () {
    if (!document.hidden) resumeVisibleVideos();
  });
  ['touchstart', 'pointerdown'].forEach(function (type) {
    runtime.on(document, type, resumeVisibleVideos, { passive: true, once: true });
  });

  /* Desktop river scrubbers provide a visible mouse and keyboard route while
     leaving each river's approved native scroll behavior untouched. The
     control is generated only for bands with a description; its geometry is
     copied from that live description so track and text always share an edge
     at every expanded width. */
  function initRiverScrubbers() {
    var fineDesktop = window.matchMedia(
      '(min-width: 1024px) and (any-hover: hover) and (any-pointer: fine)'
    );
    var controllers = [];

    /* Cargo may hydrate showcase bands after startDeferredMedia() has taken
       its first DOM snapshot. Every scrubber retry therefore also prewarms
       every band that has arrived by then, before a direct jump is possible. */
    if (fineDesktop.matches) {
      document.querySelectorAll('.mms-band').forEach(prewarmRiverMedia);
    }

    function directChild(parent, className) {
      return Array.prototype.find.call(parent.children, function (child) {
        return child.classList && child.classList.contains(className);
      }) || null;
    }

    var eligibleBands = Array.prototype.filter.call(
      document.querySelectorAll('.mms-band'),
      function (band) {
        return directChild(band, 'mms-river') && directChild(band, 'mms-desc');
      }
    );
    var pendingBands = eligibleBands.filter(function (band) {
      return !directChild(band, 'mms-river-scrubber');
    });
    if (!pendingBands.length) return;

    pendingBands.forEach(function (band, index) {
      var river = directChild(band, 'mms-river');
      var description = directChild(band, 'mms-desc');
      if (!river || !description) return;

      var project = band.getAttribute('data-band') || String(index + 1);
      if (!river.id) river.id = 'mms-river-' + project;

      var control = document.createElement('div');
      control.className = 'mms-river-scrubber';
      control.hidden = true;
      control.tabIndex = 0;
      control.setAttribute('role', 'scrollbar');
      control.setAttribute('aria-orientation', 'horizontal');
      control.setAttribute('aria-controls', river.id);
      control.setAttribute('aria-valuemin', '0');
      control.setAttribute('aria-valuemax', '100');

      var titleGroup = description.querySelector('.title-group');
      var title = titleGroup && titleGroup.firstChild
        ? titleGroup.firstChild.textContent.trim()
        : project;
      control.setAttribute('aria-label', 'Scroll ' + title + ' gallery');

      var track = document.createElement('span');
      track.className = 'mms-river-scrubber__track';
      track.setAttribute('aria-hidden', 'true');
      var thumb = document.createElement('span');
      thumb.className = 'mms-river-scrubber__thumb';
      thumb.setAttribute('aria-hidden', 'true');
      var artwork = document.createElement('span');
      artwork.className = 'mms-river-scrubber__thumb-art';
      thumb.appendChild(artwork);
      control.appendChild(track);
      control.appendChild(thumb);
      band.insertBefore(control, description);

      var frame = 0;
      var drag = null;

      function sync() {
        frame = 0;
        if (!fineDesktop.matches) {
          control.hidden = true;
          return;
        }

        var descriptionRect = description.getBoundingClientRect();
        var bandRect = band.getBoundingClientRect();
        var trackWidth = descriptionRect.width;
        var scrollMax = Math.max(0, river.scrollWidth - river.clientWidth);
        if (!trackWidth || scrollMax <= 1) {
          control.hidden = true;
          control.setAttribute('aria-valuenow', '0');
          return;
        }

        control.style.width = trackWidth.toFixed(3) + 'px';
        control.style.setProperty(
          'margin-left',
          (descriptionRect.left - bandRect.left).toFixed(3) + 'px',
          'important'
        );
        control.hidden = false;

        var proportionalWidth = Math.min(
          trackWidth,
          trackWidth * river.clientWidth / Math.max(1, river.scrollWidth)
        );
        control.style.setProperty('--scrub-proportional-width', proportionalWidth.toFixed(3) + 'px');
        var thumbWidth = Math.min(trackWidth, thumb.getBoundingClientRect().width);
        var travel = Math.max(0, trackWidth - thumbWidth);
        var progress = Math.max(0, Math.min(1, river.scrollLeft / scrollMax));
        control.style.setProperty('--scrub-thumb-left', (travel * progress).toFixed(3) + 'px');
        var percent = Math.round(progress * 100);
        control.setAttribute('aria-valuenow', String(percent));
        control.setAttribute('aria-valuetext', percent + '% through ' + title + ' gallery');
      }

      function schedule() {
        if (!frame) frame = runtime.raf(sync);
      }

      function scrollFromTrack(clientX) {
        prewarmRiverMedia(river);
        var rect = control.getBoundingClientRect();
        var thumbWidth = Math.min(rect.width, thumb.getBoundingClientRect().width);
        var travel = Math.max(0, rect.width - thumbWidth);
        var scrollMax = Math.max(0, river.scrollWidth - river.clientWidth);
        if (!travel || !scrollMax) return;
        var thumbLeft = Math.max(0, Math.min(travel, clientX - rect.left - thumbWidth / 2));
        river.scrollLeft = thumbLeft / travel * scrollMax;
        schedule();
      }

      runtime.on(control, 'pointerdown', function (event) {
        if (event.button !== 0 || event.target === thumb || thumb.contains(event.target)) return;
        prewarmRiverMedia(river);
        event.preventDefault();
        /* Pointer use must not retain the keyboard-only :focus-visible thumb
           after the pointer leaves the scrubber. Keyboard users still reach
           the control normally through its tabindex. */
        control.blur();
        scrollFromTrack(event.clientX);
      });

      runtime.on(thumb, 'pointerdown', function (event) {
        if (event.button !== 0) return;
        prewarmRiverMedia(river);
        event.preventDefault();
        event.stopPropagation();
        var controlRect = control.getBoundingClientRect();
        var thumbWidth = Math.min(controlRect.width, thumb.getBoundingClientRect().width);
        var travel = Math.max(0, controlRect.width - thumbWidth);
        var scrollMax = Math.max(0, river.scrollWidth - river.clientWidth);
        if (!travel || !scrollMax) return;
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startScroll: river.scrollLeft,
          travel: travel,
          scrollMax: scrollMax
        };
        thumb.setPointerCapture(event.pointerId);
        control.classList.add('is-dragging');
        control.blur();
      });

      runtime.on(thumb, 'pointermove', function (event) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        river.scrollLeft = drag.startScroll +
          ((event.clientX - drag.startX) / drag.travel) * drag.scrollMax;
        schedule();
      });

      function endDrag(event) {
        if (!drag || (event && event.pointerId !== drag.pointerId)) return;
        if (thumb.hasPointerCapture(drag.pointerId)) thumb.releasePointerCapture(drag.pointerId);
        drag = null;
        control.classList.remove('is-dragging');
        schedule();
      }
      runtime.on(thumb, 'pointerup', endDrag);
      runtime.on(thumb, 'pointercancel', endDrag);
      runtime.on(thumb, 'lostpointercapture', endDrag);

      runtime.on(control, 'keydown', function (event) {
        var scrollMax = Math.max(0, river.scrollWidth - river.clientWidth);
        if (!scrollMax) return;
        var step = Math.max(40, river.clientWidth * 0.1);
        var page = river.clientWidth * 0.7;
        var next = river.scrollLeft;
        if (event.key === 'ArrowLeft') next -= step;
        else if (event.key === 'ArrowRight') next += step;
        else if (event.key === 'PageUp') next -= page;
        else if (event.key === 'PageDown') next += page;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = scrollMax;
        else return;
        prewarmRiverMedia(river);
        event.preventDefault();
        river.scrollLeft = Math.max(0, Math.min(scrollMax, next));
        schedule();
      });

      runtime.on(river, 'scroll', schedule, { passive: true });
      runtime.on(river, 'load', schedule, true);
      runtime.on(river, 'loadedmetadata', schedule, true);
      if ('ResizeObserver' in window) {
        var observer = runtime.observe(new ResizeObserver(runtime.guard(schedule)));
        observer.observe(river);
        observer.observe(description);
        Array.prototype.forEach.call(river.children, function (child) {
          observer.observe(child);
        });
      }
      controllers.push({ schedule: schedule });
      runtime.cleanup(function () {
        if (drag && thumb.hasPointerCapture && thumb.hasPointerCapture(drag.pointerId)) {
          try { thumb.releasePointerCapture(drag.pointerId); } catch (e) {}
        }
        drag = null;
        control.classList.remove('is-dragging');
        if (frame) runtime.cancelRaf(frame);
        frame = 0;
        control.remove();
      });
      runtime.on(control, 'pointerenter', function () { prewarmRiverMedia(river); }, { passive: true });
      runtime.on(control, 'focus', function () { prewarmRiverMedia(river); });
      [0, 100, 500, 1500].forEach(function (delay) {
        runtime.timeout(schedule, delay);
      });
    });

    function scheduleAll() {
      controllers.forEach(function (controller) { controller.schedule(); });
    }
    runtime.on(window, 'resize', scheduleAll);
    runtime.on(window, 'orientationchange', scheduleAll);
    runtime.on(window, 'load', scheduleAll);
    runtime.onMql(fineDesktop, scheduleAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(runtime.guard(scheduleAll));
  }
  currentMms.querySelectorAll('.mms-river-scrubber').forEach(function (control) {
    control.remove();
  });
  window.__mmsEnsureRiverScrubbers = initRiverScrubbers;
  runtime.cleanup(function () {
    if (window.__mmsEnsureRiverScrubbers === initRiverScrubbers) {
      delete window.__mmsEnsureRiverScrubbers;
    }
  });
  initRiverScrubbers();
  [0, 100, 500, 1500].forEach(function (delay) {
    runtime.timeout(function () {
      if (window.__mmsEnsureRiverScrubbers === initRiverScrubbers) {
        initRiverScrubbers();
      }
    }, delay);
  });

  // Montran's map tile has a fixed showcase-height budget. Keep the caption
  // fully visible with its intended 12-unit gap, and shrink only the map when
  // larger type settings need more room. The design ratio is 690:442.
  var mapFitTimer = 0;
  function fitMontranMap() {
    mapFitTimer = 0;
    var caption = document.querySelector('[data-slot="montran-map-caption"]');
    var tile = caption && caption.parentElement;
    var image = tile && tile.querySelector('img');
    if (!tile || !caption || !image) return;
    tile.classList.add('mms-map-tile');
    if (window.matchMedia('(max-width: 1023px)').matches) {
      tile.style.removeProperty('--map-tile-h');
      tile.style.removeProperty('--map-image-w');
      tile.style.removeProperty('--map-image-h');
      return;
    }
    var tileW = tile.clientWidth;
    if (!tileW) return;
    var gap = parseFloat(getComputedStyle(tile).rowGap) || 0;
    var desiredH = tileW * 442 / 690;
    var baseH = Math.ceil(tileW * 504 / 690);
    var emergencyImageH = Math.min(desiredH, Math.max(48, tileW * 0.18));
    var tileH = Math.max(baseH, Math.ceil(caption.offsetHeight + gap + emergencyImageH));
    tile.style.setProperty('--map-tile-h', tileH + 'px');
    var availableH = Math.max(0, tileH - caption.offsetHeight - gap);
    var imageH = Math.min(desiredH, availableH);
    var imageW = Math.min(tileW, imageH * 690 / 442);
    tile.style.setProperty('--map-image-w', imageW.toFixed(3) + 'px');
    tile.style.setProperty('--map-image-h', imageH.toFixed(3) + 'px');
  }
  function scheduleMontranMapFit() {
    runtime.clearTimeout(mapFitTimer);
    mapFitTimer = runtime.timeout(fitMontranMap, 0);
  }
  var mapCaption = document.querySelector('[data-slot="montran-map-caption"]');
  var mapTile = mapCaption && mapCaption.parentElement;
  var mapImage = mapTile && mapTile.querySelector('img');
  if (mapTile) {
    mapTile.classList.add('mms-map-tile');
    if (mapImage && !mapImage.complete) runtime.on(mapImage, 'load', scheduleMontranMapFit, { once: true });
    if ('ResizeObserver' in window) {
      var mapObserver = runtime.observe(new ResizeObserver(runtime.guard(scheduleMontranMapFit)));
      mapObserver.observe(mapTile);
      mapObserver.observe(mapCaption);
    }
    [0, 100, 500, 1500].forEach(function (delay) {
      runtime.timeout(scheduleMontranMapFit, delay);
    });
    runtime.on(window, 'resize', scheduleMontranMapFit);
    runtime.on(window, 'load', scheduleMontranMapFit);
  }

  // The compact navigation and introduction share the EVIIVE containing
  // block. Measure both sticky layers so the intro begins below the links and
  // the complete group releases only when EVIIVE has passed.
  function setBarH() {
    var row = document.querySelector('.mms-mbar .mbar-row');
    var links = document.querySelector('.mms-intro-wrap > .mms-mlinks');
    var rowH = row ? Math.round(row.getBoundingClientRect().height) : 0;
    var linksH = links ? Math.round(links.getBoundingClientRect().height) : 0;
    root.style.setProperty('--mbar-row-h', rowH + 'px');
    root.style.setProperty('--mlinks-h', linksH + 'px');
    root.style.setProperty('--bar-h', (rowH + linksH) + 'px');
    if (panel) syncPanelMode();
  }
  setBarH();
  runtime.timeout(syncPanelMode, 100);
  runtime.timeout(syncPanelMode, 500);
  runtime.timeout(syncPanelMode, 1500);
  runtime.on(window, 'resize', setBarH);
  runtime.on(window, 'load', setBarH);
  if ('ResizeObserver' in window) {
    var ro = runtime.observe(new ResizeObserver(runtime.guard(setBarH)));
    var row = document.querySelector('.mms-mbar .mbar-row');
    var links = document.querySelector('.mms-intro-wrap > .mms-mlinks');
    if (row) ro.observe(row);
    if (links) ro.observe(links);
  }
  runtime.cleanup(function () {
    if (root.getAttribute('data-panel') === 'open') root.removeAttribute('data-panel');
    setPanelButtons(false);
    if (panel) {
      panel.setAttribute('aria-modal', 'false');
      if (panel.open) panel.close();
      var replacementPanel = currentMms.isConnected &&
        currentMms.querySelector('dialog.mms-panel');
      if (replacementPanel && replacementPanel !== panel) {
        panel.remove();
      } else if (currentMms.isConnected && panelSlot && panelSlot.parentNode && currentMms.contains(panelSlot)) {
        panelSlot.parentNode.insertBefore(panel, panelSlot.nextSibling);
      } else if (!currentMms.contains(panel)) {
        panel.remove();
      }
    }
    if (panelSlot && panelSlot.parentNode) panelSlot.parentNode.removeChild(panelSlot);
    root.style.removeProperty('--mbar-row-h');
    root.style.removeProperty('--mlinks-h');
    root.style.removeProperty('--bar-h');
    currentMms.querySelectorAll('video[data-mms-loaded="1"]').forEach(function (video) {
      try { video.pause(); } catch (e) {}
    });
    currentMms.querySelectorAll('iframe[data-embed-kind][data-mms-loaded="1"]').forEach(function (frame) {
      try {
        frame.contentWindow.postMessage({ __mmsEmbedVisibility: 1, visible: false }, '*');
      } catch (e) {}
    });
    if (window.__mmsPanelRoot === currentMms) {
      window.__mmsPanelRoot = null;
      window.__mmsPanelVersion = null;
    }
  });
  runtime.domSignature = capturePanelDomSignature(currentMms);
  }
  init();
})();
