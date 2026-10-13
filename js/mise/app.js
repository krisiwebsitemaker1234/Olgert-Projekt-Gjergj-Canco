/*
 * Mise — core: data store + shared helpers.
 *
 * Data flow (no database):
 *   data/data.json  --first load-->  browser localStorage ("mise.data")  <--edits from every page
 *   Settings > Data lets you export the current state back to a data.json file, import one, or reset.
 * If data.json changes on disk and you haven't edited anything in the browser, the new file is picked up automatically.
 */
(function (window, document, $) {
  'use strict';

  var LS_DATA = 'mise.data';
  var LS_SOURCE = 'mise.sourceHash';
  var LS_DIRTY = 'mise.dirty';

  var scriptSrc = document.currentScript && document.currentScript.src;
  var root = scriptSrc ? scriptSrc.replace(/js\/mise\/app\.js(\?.*)?$/, '') : '';

  var Mise = window.Mise = {
    root: root,
    data: null,
    state: { needsImport: false, sourceChanged: null },
    _ready: [],
    _charts: {},
    _search: null
  };

  /* ---------- storage ---------- */

  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function hash(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) { h = ((h << 5) - h + text.charCodeAt(i)) | 0; }
    return String(h) + ':' + text.length;
  }

  // Sample data ships with fixed dates; shift them so "today" in the data is always the real today.
  var DATE_RE = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}(:\d{2})?)?$/;
  function shiftDates(obj, days) {
    if (!days) return obj;
    (function walk(node) {
      if (Array.isArray(node)) {
        node.forEach(function (v, i) { if (typeof v === 'string') node[i] = shiftOne(v); else walk(v); });
      } else if (node && typeof node === 'object') {
        Object.keys(node).forEach(function (k) {
          var v = node[k];
          if (typeof v === 'string') node[k] = shiftOne(v); else walk(v);
        });
      }
    })(obj);
    function shiftOne(s) {
      var m = DATE_RE.exec(s);
      if (!m) return s;
      return Mise.addDays(m[1], days) + (m[2] || '');
    }
    return obj;
  }

  function adoptSource(text, h) {
    var data = JSON.parse(text);
    if (data.meta && data.meta.keepDatesCurrent && data.meta.anchorDate) {
      shiftDates(data, Mise.daysBetween(data.meta.anchorDate, Mise.today()));
      data.meta.anchorDate = Mise.today();
    }
    Mise.data = data;
    lsSet(LS_DATA, JSON.stringify(data));
    lsSet(LS_SOURCE, h);
    lsDel(LS_DIRTY);
  }

  function load() {
    var local = null;
    try { local = JSON.parse(lsGet(LS_DATA)); } catch (e) {}

    return fetch(root + 'data/data.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var h = hash(text);
        if (!local) return adoptSource(text, h);
        Mise.data = local;
        if (lsGet(LS_SOURCE) !== h) {
          if (lsGet(LS_DIRTY)) Mise.state.sourceChanged = { text: text, hash: h };
          else adoptSource(text, h);
        }
      })
      .catch(function () {
        // Usually means the page was opened straight from disk (file://), where browsers block fetch.
        if (local) Mise.data = local;
        else Mise.state.needsImport = true;
      });
  }

  Mise.save = function (opts) {
    if (!Mise.data) return;
    if (!lsSet(LS_DATA, JSON.stringify(Mise.data))) {
      Mise.toast('Could not save — browser storage is full or blocked.', 'danger');
      return;
    }
    lsSet(LS_DIRTY, '1');
    if (!(opts && opts.silent)) $(document).trigger('mise:data');
  };

  // Mutate + persist in one step: Mise.update(function (d) { d.tasks.push(...) })
  Mise.update = function (fn, opts) {
    fn(Mise.data);
    Mise.save(opts);
  };

  Mise.useSourceFile = function () {
    var s = Mise.state.sourceChanged;
    if (s) adoptSource(s.text, s.hash);
    location.reload();
  };

  Mise.keepLocal = function () {
    var s = Mise.state.sourceChanged;
    if (s) lsSet(LS_SOURCE, s.hash);
    Mise.state.sourceChanged = null;
    $('#mise-source-banner').remove();
  };

  Mise.exportJSON = function () {
    var copy = JSON.parse(JSON.stringify(Mise.data));
    copy.meta = copy.meta || {};
    copy.meta.anchorDate = Mise.today();
    copy.meta.exportedAt = new Date().toISOString();
    var blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  Mise.importJSON = function (file) {
    return file.text().then(function (text) {
      var parsed = JSON.parse(text); // throws on invalid JSON
      if (!parsed.restaurant || !parsed.menu) throw new Error('This file does not look like Mise data.');
      adoptSource(text, lsGet(LS_SOURCE) || hash(text));
      lsSet(LS_DIRTY, '1');
    });
  };

  Mise.resetToSource = function () {
    lsDel(LS_DATA); lsDel(LS_SOURCE); lsDel(LS_DIRTY);
    location.reload();
  };

  Mise.ready = function (fn) {
    if (Mise._isReady) fn(Mise.data); else Mise._ready.push(fn);
  };

  /* ---------- formatting ---------- */

  Mise.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  Mise.money = function (n, decimals) {
    var r = (Mise.data && Mise.data.restaurant) || {};
    var d = decimals == null ? 2 : decimals;
    var s = Number(n || 0).toLocaleString(r.locale || 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (r.currency || '$') + s;
  };

  Mise.num = function (n, decimals) {
    var r = (Mise.data && Mise.data.restaurant) || {};
    return Number(n || 0).toLocaleString(r.locale || 'en-US', { maximumFractionDigits: decimals == null ? 0 : decimals });
  };

  Mise.pct = function (n, decimals) { return Mise.num(n, decimals == null ? 1 : decimals) + '%'; };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  Mise.today = function () { return isoOf(new Date()); };
  Mise.parseDate = function (iso) { var p = iso.slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  Mise.addDays = function (iso, days) { var d = Mise.parseDate(iso); d.setDate(d.getDate() + days); return isoOf(d); };
  Mise.daysBetween = function (a, b) { return Math.round((Mise.parseDate(b) - Mise.parseDate(a)) / 864e5); };
  Mise.nowTime = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  Mise.nowStamp = function () { return Mise.today() + 'T' + Mise.nowTime(); };

  Mise.fmtDate = function (iso, opts) {
    if (!iso) return '';
    var r = (Mise.data && Mise.data.restaurant) || {};
    return Mise.parseDate(iso).toLocaleDateString(r.locale || 'en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
  };
  Mise.fmtDay = function (iso) {
    if (!iso) return '';
    var diff = Mise.daysBetween(Mise.today(), iso.slice(0, 10));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return Mise.fmtDate(iso, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  Mise.timeOf = function (stamp) { return stamp ? stamp.slice(11, 16) : ''; };
  Mise.minutesSince = function (stamp) {
    if (!stamp) return 0;
    var t = new Date(stamp.slice(0, 16));
    return Math.max(0, Math.round((Date.now() - t.getTime()) / 6e4));
  };
  Mise.ago = function (stamp) {
    var m = Mise.minutesSince(stamp);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    if (m < 60 * 24) return Math.floor(m / 60) + 'h ago';
    return Mise.fmtDay(stamp);
  };

  Mise.uid = function (prefix) { return (prefix || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };

  Mise.initials = function (name) {
    return String(name || '?').split(/\s+/).map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
  };

  Mise.asset = function (path) {
    if (!path) return '';
    return /^(https?:|data:|blob:|\/)/.test(path) ? path : root + path;
  };

  Mise.avatar = function (person, cls) {
    cls = cls || 'img-sm';
    if (person && person.avatar) return '<img class="' + cls + ' rounded-circle mise-avatar" src="' + Mise.esc(Mise.asset(person.avatar)) + '" alt="">';
    return '<span class="' + cls + ' rounded-circle mise-avatar mise-avatar-initials">' + Mise.esc(Mise.initials(person && person.name)) + '</span>';
  };

  /* ---------- personal preferences (stored in data.user.prefs, edited on the Profile page) ---------- */

  Mise.PREF_DEFAULTS = {
    startPage: 'index.html',
    overviewPeriod: 'today',
    revenueRange: 14,
    lateMinutes: 25,
    alerts: { stock: true, menu: true, waitlist: true, website: true },
    toasts: true
  };

  Mise.prefs = function () {
    var p = (Mise.data && Mise.data.user && Mise.data.user.prefs) || {};
    var out = $.extend(true, {}, Mise.PREF_DEFAULTS, p);
    out.revenueRange = +out.revenueRange; out.lateMinutes = +out.lateMinutes;
    return out;
  };

  /* ---------- account ---------- */

  // SHA-256 hex digest. Uses Web Crypto where available, with a small fallback for pages opened from disk.
  Mise.sha256 = function (text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    return Promise.resolve(sha256Fallback(text));
  };

  function sha256Fallback(ascii) {
    function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
    var K = [], H = [], i, j, isPrime = {};
    for (var c = 2, n = 0; n < 64; c++) {
      if (!isPrime[c]) {
        for (i = 0; i < 313; i += c) isPrime[i] = c;
        if (n < 8) H[n] = (Math.pow(c, 0.5) * 4294967296) | 0;
        K[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
      }
    }
    ascii = unescape(encodeURIComponent(ascii));
    var len = ascii.length * 8, words = [];
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = (len / 4294967296) | 0;
    words[words.length] = len;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = H.slice(0);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = H[0], e = H[4];
        var t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + K[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H);
        H[4] = (H[4] + t1) | 0;
        H.length = 8;
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    var out = '';
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (H[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }

  // The signed-in account has no photo: it is shown with an admin badge.
  Mise.userAvatar = function (cls) {
    return '<span class="' + (cls || 'img-xs') + ' rounded-circle mise-avatar mise-avatar-initials mise-admin-avatar"><i class="mdi mdi-shield-account"></i></span>';
  };

  /* ---------- lookups ---------- */

  Mise.find = function (list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  Mise.menuItem = function (id) { return Mise.find(Mise.data.menu.items, id); };
  Mise.staffMember = function (id) { return Mise.find(Mise.data.staff, id); };
  Mise.supplier = function (id) { return Mise.find(Mise.data.suppliers, id); };

  Mise.orderTotal = function (order) {
    return order.items.reduce(function (sum, line) {
      var item = Mise.menuItem(line.itemId);
      return sum + (item ? item.price * line.qty : 0);
    }, 0);
  };
  Mise.orderCount = function (order) {
    return order.items.reduce(function (s, l) { return s + l.qty; }, 0);
  };

  Mise.todaySales = function () {
    var daily = Mise.data.sales.daily, t = Mise.today();
    var row = null;
    for (var i = daily.length - 1; i >= 0; i--) if (daily[i].date === t) { row = daily[i]; break; }
    if (!row) {
      row = { date: t, revenue: 0, covers: 0, orders: 0, foodCost: 0, laborCost: 0, categories: {} };
      daily.push(row);
    }
    return row;
  };

  // Daily sales rows for `days` days ending `endOffset` days before today (0 = up to and including today).
  Mise.salesWindow = function (days, endOffset) {
    var end = Mise.addDays(Mise.today(), -(endOffset || 0));
    var start = Mise.addDays(end, -(days - 1));
    return Mise.data.sales.daily.filter(function (r) { return r.date >= start && r.date <= end; });
  };

  Mise.sumRows = function (rows) {
    var out = { revenue: 0, covers: 0, orders: 0, foodCost: 0, laborCost: 0, categories: {}, days: rows.length };
    rows.forEach(function (r) {
      out.revenue += r.revenue; out.covers += r.covers; out.orders += r.orders;
      out.foodCost += r.foodCost; out.laborCost += r.laborCost;
      Object.keys(r.categories || {}).forEach(function (c) { out.categories[c] = (out.categories[c] || 0) + r.categories[c]; });
    });
    out.avgCheck = out.covers ? out.revenue / out.covers : 0;
    out.foodPct = out.revenue ? out.foodCost / out.revenue * 100 : 0;
    out.laborPct = out.revenue ? out.laborCost / out.revenue * 100 : 0;
    return out;
  };

  Mise.change = function (now, before, invert) {
    if (!before) return '';
    var diff = (now - before) / before * 100;
    if (Math.abs(diff) < 0.05) return '<p class="text-muted d-flex"><span>no change</span></p>';
    var good = invert ? diff <= 0 : diff >= 0;
    return '<p class="' + (good ? 'text-success' : 'text-danger') + ' d-flex"><i class="mdi ' + (diff >= 0 ? 'mdi-menu-up' : 'mdi-menu-down') + '"></i><span>' +
      (diff >= 0 ? '+' : '') + Mise.num(diff, 1) + '%</span></p>';
  };

  // Recording a payment feeds the sales figures used by the overview and reports.
  Mise.recordPayment = function (order) {
    var total = Mise.orderTotal(order);
    var row = Mise.todaySales();
    row.revenue = Math.round((row.revenue + total) * 100) / 100;
    row.orders += 1;
    row.foodCost = Math.round((row.foodCost + order.items.reduce(function (s, l) {
      var it = Mise.menuItem(l.itemId); return s + (it ? it.cost * l.qty : 0);
    }, 0)) * 100) / 100;
    row.categories = row.categories || {};
    order.items.forEach(function (l) {
      var it = Mise.menuItem(l.itemId);
      if (!it) return;
      row.categories[it.category] = Math.round(((row.categories[it.category] || 0) + it.price * l.qty) * 100) / 100;
      it.soldLast30 = (it.soldLast30 || 0) + l.qty;
    });
    var hour = new Date().getHours();
    Mise.data.sales.hourlyToday.forEach(function (slot) {
      if (slot.hour === hour) slot.revenue = Math.round((slot.revenue + total) * 100) / 100;
    });
    if (order.server) {
      var s = Mise.staffMember(order.server);
      if (s) s.salesToday = Math.round(((s.salesToday || 0) + total) * 100) / 100;
    }
    if (order.table) {
      var t = Mise.find(Mise.data.tables, order.table);
      if (t) row.covers += t.guests || 1;
    } else {
      row.covers += 1;
    }
  };

  /* ---------- small UI kit ---------- */

  Mise.badge = function (text, tone) {
    return '<span class="badge badge-opacity-' + (tone || 'primary') + '">' + Mise.esc(text) + '</span>';
  };

  Mise.toast = function (message, tone) {
    // Errors always show; confirmations can be switched off on the Profile page.
    if (tone !== 'danger' && Mise.data && Mise.prefs().toasts === false) return;
    var $wrap = $('#mise-toasts');
    if (!$wrap.length) $wrap = $('<div id="mise-toasts" class="mise-toasts" aria-live="polite"></div>').appendTo('body');
    var $t = $('<div class="mise-toast mise-toast-' + (tone || 'success') + '"></div>').text(message).appendTo($wrap);
    setTimeout(function () { $t.addClass('show'); }, 10);
    setTimeout(function () { $t.removeClass('show'); setTimeout(function () { $t.remove(); }, 300); }, 2600);
  };

  var modalEl, modalInstance;
  function ensureModal() {
    if (modalEl) return;
    modalEl = $(
      '<div class="modal fade mise-modal" id="mise-modal" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"></div>' +
      '<div class="modal-footer"><span class="me-auto mise-modal-extra"></span>' +
      '<button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="button" class="btn btn-primary text-white mise-modal-save">Save</button></div>' +
      '</div></div></div>').appendTo('body')[0];
    modalInstance = new bootstrap.Modal(modalEl);
  }

  /*
   * Mise.modal({ title, body (html), saveLabel, size: 'lg', onSave(body$) -> false to keep open, extra (html), onOpen(body$) })
   */
  Mise.modal = function (opts) {
    ensureModal();
    var $m = $(modalEl);
    $m.find('.modal-dialog').removeClass('modal-lg modal-sm').addClass(opts.size ? 'modal-' + opts.size : '');
    $m.find('.modal-title').text(opts.title || '');
    $m.find('.modal-body').html(opts.body || '');
    $m.find('.mise-modal-extra').html(opts.extra || '');
    var $save = $m.find('.mise-modal-save');
    $save.text(opts.saveLabel || 'Save').toggle(opts.onSave !== null && opts.saveLabel !== false);
    $save.toggleClass('btn-danger', !!opts.danger).toggleClass('btn-primary', !opts.danger);
    $save.off('click').on('click', function () {
      if (opts.onSave && opts.onSave($m.find('.modal-body')) === false) return;
      modalInstance.hide();
    });
    $m.find('.modal-body').off('submit').on('submit', 'form', function (e) { e.preventDefault(); $save.trigger('click'); });
    if (opts.onOpen) opts.onOpen($m.find('.modal-body'), $m);
    modalInstance.show();
    return $m;
  };
  Mise.closeModal = function () { if (modalInstance) modalInstance.hide(); };

  Mise.confirm = function (message, onYes, label) {
    Mise.modal({ title: 'Are you sure?', body: '<p class="mb-0">' + Mise.esc(message) + '</p>', saveLabel: label || 'Delete', danger: true, onSave: onYes });
  };

  /*
   * Form builder. fields: [{ key, label, type: text|number|email|date|time|textarea|select|checkbox|color|url, options: [[value,label]], col: 6, help, required, step, placeholder }]
   */
  Mise.form = function (fields, values) {
    values = values || {};
    var html = '<form class="mise-form" novalidate><div class="row">';
    fields.forEach(function (f) {
      var v = values[f.key];
      if (v == null) v = f.default != null ? f.default : '';
      var id = 'f_' + f.key.replace(/\W/g, '_');
      var req = f.required ? ' required' : '';
      var input;
      if (f.type === 'textarea') {
        input = '<textarea class="form-control" id="' + id + '" name="' + f.key + '" rows="' + (f.rows || 3) + '"' + req + ' placeholder="' + Mise.esc(f.placeholder || '') + '">' + Mise.esc(v) + '</textarea>';
      } else if (f.type === 'select') {
        input = '<select class="form-select" id="' + id + '" name="' + f.key + '"' + req + '>' + (f.options || []).map(function (o) {
          var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
          return '<option value="' + Mise.esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + Mise.esc(lab) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'checkbox') {
        html += '<div class="col-' + (f.col ? 'md-' + f.col : '12') + ' mb-3"><div class="form-check form-switch mise-switch">' +
          '<input class="form-check-input" type="checkbox" id="' + id + '" name="' + f.key + '"' + (v ? ' checked' : '') + '>' +
          '<label class="form-check-label" for="' + id + '">' + Mise.esc(f.label) + '</label></div>' +
          (f.help ? '<small class="text-muted d-block">' + Mise.esc(f.help) + '</small>' : '') + '</div>';
        return;
      } else {
        input = '<input class="form-control" type="' + (f.type || 'text') + '" id="' + id + '" name="' + f.key + '" value="' + Mise.esc(v) + '"' + req +
          (f.step ? ' step="' + f.step + '"' : '') + (f.min != null ? ' min="' + f.min + '"' : '') +
          ' placeholder="' + Mise.esc(f.placeholder || '') + '">';
      }
      html += '<div class="col-' + (f.col ? 'md-' + f.col : '12') + ' mb-3">' +
        '<label class="form-label" for="' + id + '">' + Mise.esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
        input + (f.help ? '<small class="text-muted d-block mt-1">' + Mise.esc(f.help) + '</small>' : '') + '</div>';
    });
    return html + '</div></form>';
  };

  Mise.readForm = function ($scope, fields) {
    var out = {}, ok = true;
    fields.forEach(function (f) {
      var $el = $scope.find('[name="' + f.key + '"]');
      var v;
      if (f.type === 'checkbox') v = $el.is(':checked');
      else if (f.type === 'number') v = $el.val() === '' ? null : Number($el.val());
      else if (f.type === 'password') v = $el.val();
      else v = $.trim($el.val());
      if (f.required && (v === '' || v == null)) { $el.addClass('is-invalid'); ok = false; } else { $el.removeClass('is-invalid'); }
      out[f.key] = v;
    });
    return ok ? out : null;
  };

  Mise.empty = function (text, icon) {
    return '<div class="mise-empty"><i class="mdi ' + (icon || 'mdi-inbox') + '"></i><p>' + Mise.esc(text) + '</p></div>';
  };

  // Tiny dot-path accessors used by the website editor's two-way bindings.
  Mise.getPath = function (obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  };
  Mise.setPath = function (obj, path, value) {
    var keys = path.split('.'), last = keys.pop();
    var target = keys.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, obj);
    target[last] = value;
  };

  /* ---------- charts (Chart.js 2.9) ---------- */

  Mise.css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };

  Mise.palette = function () {
    var dark = document.documentElement.getAttribute('data-mode') === 'dark';
    return {
      dark: dark,
      primary: Mise.css('--mise-primary') || '#1F3BB3',
      accent: Mise.css('--mise-accent') || '#52CDFF',
      primaryRgb: Mise.css('--mise-primary-rgb') || '31, 59, 179',
      success: '#34B1AA', warning: '#FFAF00', danger: '#F95F53', info: '#52CDFF',
      grid: dark ? 'rgba(255,255,255,0.06)' : '#F0F0F0',
      text: dark ? '#9AA3B5' : '#6B778C',
      surface: dark ? '#1C2030' : '#FFFFFF',
      series: [Mise.css('--mise-primary') || '#1F3BB3', Mise.css('--mise-accent') || '#52CDFF', '#34B1AA', '#FFAF00', '#F95F53', '#A78BFA', '#94A3B8']
    };
  };

  Mise.chart = function (canvasId, config) {
    if (Mise._charts[canvasId]) { Mise._charts[canvasId].destroy(); delete Mise._charts[canvasId]; }
    var el = document.getElementById(canvasId);
    if (!el || !window.Chart) return null;
    var p = Mise.palette();
    Chart.defaults.global.defaultFontColor = p.text;
    Chart.defaults.global.defaultFontFamily = '"Manrope", sans-serif';
    Chart.defaults.global.tooltips.backgroundColor = p.dark ? '#0F1220' : 'rgba(' + p.primaryRgb + ', 1)';
    // Chart.js 2.9 wants barPercentage on the dataset, not the axis.
    var x = config.options && config.options.scales && config.options.scales.xAxes && config.options.scales.xAxes[0];
    if (x && x.barPercentage != null) {
      if (config.type === 'bar') config.data.datasets.forEach(function (ds) { if (ds.barPercentage == null) ds.barPercentage = x.barPercentage; });
      delete x.barPercentage;
    }
    var chart = new Chart(el.getContext('2d'), config);
    Mise._charts[canvasId] = chart;
    return chart;
  };

  // Common axis setup that mirrors the template's chart styling.
  Mise.axes = function (opts) {
    opts = opts || {};
    var p = Mise.palette();
    return {
      yAxes: [{
        stacked: !!opts.stacked,
        gridLines: { display: true, drawBorder: false, color: p.grid, zeroLineColor: p.grid },
        ticks: { beginAtZero: true, autoSkip: true, maxTicksLimit: 5, fontSize: 10, fontColor: p.text, callback: opts.yFormat || function (v) { return Mise.num(v); } }
      }],
      xAxes: [{
        stacked: !!opts.stacked,
        barPercentage: opts.barPercentage || 0.5,
        gridLines: { display: false, drawBorder: false },
        ticks: { autoSkip: true, maxTicksLimit: opts.maxX || 12, fontSize: 10, fontColor: p.text }
      }]
    };
  };

  Mise.legend = function (items) {
    return '<div class="chartjs-legend"><ul>' + items.map(function (i) {
      return '<li class="text-muted text-small"><span style="background-color:' + i.color + '"></span>' + Mise.esc(i.label) + '</li>';
    }).join('') + '</ul></div>';
  };

  Mise.onSearch = function (fn) { Mise._search = fn; };

  /* ---------- boot ---------- */

  Mise.loaded = load().then(function () {
    $(function () {
      Mise._isReady = !!Mise.data;
      $(document).trigger('mise:loaded');
      if (!Mise.data) return;
      Mise._ready.forEach(function (fn) {
        try { fn(Mise.data); } catch (e) { console.error(e); }
      });
    });
  });

  // Re-render charts when the theme or mode changes.
  document.addEventListener('mise:theme', function () { $(document).trigger('mise:data'); });
})(window, document, jQuery);
