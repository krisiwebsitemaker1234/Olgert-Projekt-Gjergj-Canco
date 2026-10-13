/*
 * Mise — theme engine.
 * Loaded in <head> (not deferred) so the right colours are applied before first paint.
 * Preferences are per-browser (localStorage), separate from the restaurant data.
 */
(function (window, document) {
  'use strict';

  var PREFS_KEY = 'mise.prefs';

  // Each theme has a light and a dark variant. "default" is the original template palette.
  var THEMES = {
    default: { name: 'Star (default)', light: { primary: '#1F3BB3', dark: '#1a3298', accent: '#52CDFF' }, night: { primary: '#5774F0', dark: '#3F5BD6', accent: '#52CDFF' } },
    ember:   { name: 'Ember',          light: { primary: '#C2410C', dark: '#9A3412', accent: '#FDBA74' }, night: { primary: '#F97316', dark: '#EA580C', accent: '#FDBA74' } },
    olive:   { name: 'Olive',          light: { primary: '#4D7C0F', dark: '#3F6212', accent: '#A3D65C' }, night: { primary: '#84CC16', dark: '#65A30D', accent: '#BEF264' } },
    ocean:   { name: 'Ocean',          light: { primary: '#0F766E', dark: '#115E59', accent: '#5EEAD4' }, night: { primary: '#14B8A6', dark: '#0D9488', accent: '#5EEAD4' } },
    plum:    { name: 'Plum',           light: { primary: '#7E22CE', dark: '#6B21A8', accent: '#D8B4FE' }, night: { primary: '#A855F7', dark: '#9333EA', accent: '#D8B4FE' } },
    rose:    { name: 'Rosé',           light: { primary: '#BE123C', dark: '#9F1239', accent: '#FDA4AF' }, night: { primary: '#F43F5E', dark: '#E11D48', accent: '#FDA4AF' } }
  };

  var DEFAULT_PREFS = { mode: 'light', theme: 'default', sidebar: 'light', navbar: 'default' };

  function readPrefs() {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) {}
    var out = {};
    for (var k in DEFAULT_PREFS) out[k] = prefs[k] || DEFAULT_PREFS[k];
    if (!THEMES[out.theme]) out.theme = 'default';
    return out;
  }

  function writePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
  }

  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolvedMode(prefs) {
    if (prefs.mode === 'system') return media && media.matches ? 'dark' : 'light';
    return prefs.mode === 'dark' ? 'dark' : 'light';
  }

  function apply() {
    var prefs = readPrefs();
    var mode = resolvedMode(prefs);
    var palette = THEMES[prefs.theme][mode === 'dark' ? 'night' : 'light'];
    var root = document.documentElement;
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-theme', prefs.theme);
    root.style.setProperty('--mise-primary', palette.primary);
    root.style.setProperty('--mise-primary-dark', palette.dark);
    root.style.setProperty('--mise-primary-rgb', hexToRgb(palette.primary));
    root.style.setProperty('--mise-accent', palette.accent);

    // Body classes (sidebar / header skins) need <body>; layout.js calls apply() again once it exists.
    var body = document.body;
    if (body) {
      body.classList.remove('sidebar-light', 'sidebar-dark');
      body.classList.add(prefs.sidebar === 'dark' ? 'sidebar-dark' : 'sidebar-light');
      var navbar = document.querySelector('.navbar');
      if (navbar) {
        navbar.className = navbar.className.replace(/\bnavbar-(danger|success|warning|dark|light|primary|info|pink)\b/g, '').trim();
        if (prefs.navbar !== 'default') navbar.classList.add('navbar-' + prefs.navbar);
      }
    }
    return { prefs: prefs, mode: mode };
  }

  function set(changes) {
    var prefs = readPrefs();
    for (var k in changes) prefs[k] = changes[k];
    writePrefs(prefs);
    var state = apply();
    document.dispatchEvent(new CustomEvent('mise:theme', { detail: state }));
    return state;
  }

  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      if (readPrefs().mode === 'system') set({});
    });
  }

  window.MiseTheme = { THEMES: THEMES, get: readPrefs, set: set, apply: apply };
  apply();
})(window, document);
