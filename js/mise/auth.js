/*
 * Mise — sign-in gate.
 * Loaded first in <head> on every dashboard page. Without a session on this device, it sends you to the
 * sign-in page (and back here afterwards). "Keep me signed in" stores the session in localStorage;
 * otherwise it lasts until the browser is closed (sessionStorage).
 *
 * This only keeps casual visitors out. Everything is client-side, so it is not real security.
 */
(function (window, document) {
  'use strict';

  var KEY = 'mise.session';
  var src = document.currentScript && document.currentScript.src;
  var root = src ? src.replace(/js\/mise\/auth\.js(\?.*)?$/, '') : '';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY)); } catch (e) { return null; }
  }

  window.MiseAuth = {
    KEY: KEY,
    root: root,
    session: read,
    signIn: function (username, remember) {
      var value = JSON.stringify({ user: username, at: new Date().toISOString() });
      try {
        (remember ? localStorage : sessionStorage).setItem(KEY, value);
        (remember ? sessionStorage : localStorage).removeItem(KEY);
      } catch (e) {}
    },
    signOut: function () {
      try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
    }
  };

  var onLoginPage = /\/pages\/samples\/login\.html$/.test(location.pathname);
  if (!onLoginPage && !read()) {
    // Hide the page while redirecting so nothing flashes.
    document.documentElement.style.visibility = 'hidden';
    var here = location.href.indexOf(root) === 0 ? location.href.slice(root.length) : '';
    location.replace(root + 'pages/samples/login.html' + (here && here !== 'index.html' ? '?next=' + encodeURIComponent(here) : ''));
  }
})(window, document);
