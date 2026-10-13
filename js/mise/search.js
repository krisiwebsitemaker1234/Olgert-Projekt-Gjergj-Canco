/*
 * Mise — global search.
 * Opens from the magnifier in the top bar, Ctrl/⌘+K or "/". Searches pages, quick actions and everything in the
 * data (dishes, orders, guests, bookings, tables, staff, stock, suppliers, website content) and takes you to the result.
 */
(function (window, document, $) {
  'use strict';

  var M = window.Mise, esc = M.esc, R = M.root;
  var MAX_PER_GROUP = 5;
  var index = [];
  var results = [];
  var active = 0;

  var PAGES = [
    ['Overview', 'index.html', 'mdi-view-dashboard-outline', 'home dashboard sales today'],
    ['Orders', 'pages/orders/orders.html', 'mdi-receipt', 'tickets kitchen board history'],
    ['Tables', 'pages/tables/tables.html', 'mdi-table-large', 'floor plan seats'],
    ['Reservations', 'pages/reservations/reservations.html', 'mdi-calendar-clock', 'bookings waitlist walk-in'],
    ['Menu', 'pages/menu/menu.html', 'mdi-silverware-fork-knife', 'dishes food cost 86'],
    ['Inventory', 'pages/inventory/inventory.html', 'mdi-package-variant-closed', 'stock suppliers purchase orders'],
    ['Staff', 'pages/staff/staff.html', 'mdi-account-group-outline', 'team rota shifts labor clock'],
    ['Customers', 'pages/customers/customers.html', 'mdi-account-heart-outline', 'guests reviews ratings'],
    ['Reports', 'pages/reports/reports.html', 'mdi-chart-line', 'sales costs analytics'],
    ['Website', 'pages/website/website.html', 'mdi-web', 'cms content publish seo'],
    ['Settings', 'pages/settings/settings.html', 'mdi-settings-outline', 'restaurant export import data tax'],
    ['Profile', 'pages/profile/profile.html', 'mdi-account-circle-outline', 'appearance dark mode theme password preferences'],
    ['Feature list (PDF)', 'files/Mise-Lista-e-funksioneve.pdf', 'mdi-file-pdf', 'funksionet albanian documentation']
  ];
  var ACTIONS = [
    ['New order', 'pages/orders/orders.html#new', 'mdi-plus'],
    ['New reservation', 'pages/reservations/reservations.html#new', 'mdi-calendar-plus'],
    ['Add a dish', 'pages/menu/menu.html#new', 'mdi-plus'],
    ['Change appearance', 'pages/profile/profile.html#appearance', 'mdi-palette'],
    ['Export data.json', 'pages/settings/settings.html', 'mdi-download'],
    ['Sign out', 'pages/samples/login.html?signout=1', 'mdi-logout']
  ];

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function enc(s) { return encodeURIComponent(s); }

  function add(group, title, sub, icon, href, extra) {
    index.push({ group: group, title: title, sub: sub || '', icon: icon, href: href, hay: norm([title, sub, extra].join(' ')), t: norm(title) });
  }

  function build() {
    var d = M.data;
    index = [];
    PAGES.forEach(function (p) { add('Pages', p[0], '', p[2], p[1], p[3]); });
    ACTIONS.forEach(function (a) { add('Actions', a[0], '', a[2], a[1], 'create add'); });
    if (!d) return;

    d.menu.items.forEach(function (it) {
      add('Dishes', it.name, it.category + ' · ' + M.money(it.price) + (it.available ? '' : ' · 86\'d'), 'mdi-silverware-fork-knife',
        'pages/menu/menu.html?q=' + enc(it.name), it.description + ' ' + (it.tags || []).join(' '));
    });
    d.orders.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).forEach(function (o) {
      var num = o.id.replace(/^o/, '');
      var server = M.staffMember(o.server);
      var items = o.items.map(function (l) { var it = M.menuItem(l.itemId); return it ? it.name : ''; }).join(', ');
      add('Orders', 'Order #' + num, (o.table ? 'Table ' + o.table : o.type) + ' · ' + o.status + ' · ' + M.money(M.orderTotal(o)), 'mdi-receipt',
        'pages/orders/orders.html?q=' + enc(num), [num, o.table, o.customer, server && server.name, o.type, items].join(' '));
    });
    d.customers.forEach(function (c) {
      add('Guests', c.name, [c.phone, c.email].filter(Boolean).join(' · '), 'mdi-account-heart-outline',
        'pages/customers/customers.html?q=' + enc(c.name), (c.tags || []).join(' ') + ' ' + (c.notes || ''));
    });
    d.reservations.slice().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }).forEach(function (r) {
      add('Reservations', r.name, M.fmtDay(r.date) + ' ' + r.time + ' · ' + r.partySize + ' guests · ' + r.status, 'mdi-calendar-clock',
        'pages/reservations/reservations.html?date=' + r.date + '&q=' + enc(r.name), [r.phone, r.notes, r.table].join(' '));
    });
    d.tables.forEach(function (t) {
      add('Tables', 'Table ' + t.name, t.area + ' · ' + t.seats + ' seats · ' + t.status, 'mdi-table-large',
        'pages/tables/tables.html?focus=' + enc(t.id), t.id);
    });
    d.staff.forEach(function (s) {
      add('Staff', s.name, s.role + (s.status !== 'off' ? ' · ' + s.status : ''), 'mdi-account-outline',
        'pages/staff/staff.html?q=' + enc(s.name), [s.email, s.phone].join(' '));
    });
    d.inventory.forEach(function (i) {
      add('Stock', i.name, i.category + ' · ' + M.num(i.stock, 1) + ' ' + i.unit + ' (par ' + i.par + ')', 'mdi-package-variant-closed',
        'pages/inventory/inventory.html?q=' + enc(i.name));
    });
    d.suppliers.forEach(function (s) {
      add('Suppliers', s.name, s.category + ' · ' + s.contact, 'mdi-truck-delivery',
        'pages/inventory/inventory.html?tab=suppliers&q=' + enc(s.name), [s.email, s.phone].join(' '));
    });
    d.website.posts.forEach(function (p) {
      add('Website', p.title, (p.type === 'event' ? 'Event' : 'News') + ' · ' + p.status, 'mdi-newspaper', 'pages/website/website.html#posts', p.excerpt + ' ' + p.body);
    });
    d.website.faqs.forEach(function (f) { add('Website', f.q, 'FAQ', 'mdi-help-circle-outline', 'pages/website/website.html#faqs', f.a); });
    d.website.pages.forEach(function (p) { add('Website', p.title + ' page', p.path + (p.visible ? '' : ' · hidden'), 'mdi-sitemap', 'pages/website/website.html#pages'); });
  }

  function search(q) {
    var tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      // Nothing typed yet: offer pages and actions.
      return index.filter(function (e) { return e.group === 'Pages' || e.group === 'Actions'; });
    }
    var hits = index.filter(function (e) { return tokens.every(function (t) { return e.hay.indexOf(t) > -1; }); });
    hits.forEach(function (e) {
      var first = tokens[0];
      e.score = e.t === norm(q) ? 0 : e.t.indexOf(first) === 0 ? 1 : (' ' + e.t).indexOf(' ' + first) > -1 ? 2 : e.t.indexOf(first) > -1 ? 3 : 4;
    });
    var groups = {}, order = [];
    hits.sort(function (a, b) { return a.score - b.score; }).forEach(function (e) {
      if (!groups[e.group]) { groups[e.group] = []; order.push(e.group); }
      if (groups[e.group].length < MAX_PER_GROUP) groups[e.group].push(e);
    });
    // Groups with the best match come first.
    order.sort(function (a, b) { return groups[a][0].score - groups[b][0].score; });
    return order.reduce(function (all, g) { return all.concat(groups[g]); }, []);
  }

  function mark(text, q) {
    var safe = esc(text);
    norm(q).split(/\s+/).filter(Boolean).forEach(function (t) {
      var plain = norm(text), i = plain.indexOf(t);
      if (i > -1 && plain.length === text.length) {
        safe = safe.replace(new RegExp('(' + esc(text.substr(i, t.length)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>');
      }
    });
    return safe;
  }

  function render(q) {
    results = search(q);
    active = 0;
    var $list = $('#mise-palette-results');
    if (!results.length) {
      $list.html('<div class="mise-palette-empty"><i class="mdi mdi-magnify"></i><p>No results for "' + esc(q) + '"</p><small>Try a dish, guest, order number, table or staff name.</small></div>');
      return;
    }
    var html = '', group = null;
    results.forEach(function (r, i) {
      if (r.group !== group) { group = r.group; html += '<div class="mise-palette-group">' + esc(group) + '</div>'; }
      html += '<a class="mise-palette-item' + (i === 0 ? ' active' : '') + '" href="' + R + r.href + '" data-i="' + i + '"' + (/\.pdf$/.test(r.href) ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<i class="mdi ' + r.icon + '"></i><span class="txt"><strong>' + mark(r.title, q) + '</strong>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span>' +
        '<i class="mdi mdi-arrow-right go"></i></a>';
    });
    $list.html(html);
  }

  function setActive(i) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    var $items = $('#mise-palette-results .mise-palette-item').removeClass('active');
    var el = $items.eq(active).addClass('active')[0];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function open(prefill) {
    build();
    $('#mise-palette').removeClass('d-none').attr('aria-hidden', 'false');
    document.body.classList.add('mise-palette-open');
    var $in = $('#mise-palette-input').val(prefill || '');
    render($in.val());
    setTimeout(function () { $in.trigger('focus'); }, 10);
  }

  function close() {
    $('#mise-palette').addClass('d-none').attr('aria-hidden', 'true');
    document.body.classList.remove('mise-palette-open');
  }

  function go(r) {
    if (!r) return;
    if (/\.pdf$/.test(r.href)) { window.open(R + r.href, '_blank', 'noopener'); close(); return; }
    var target = R + r.href;
    close();
    // Same page with only a hash change (e.g. a website section): reload so the page picks it up.
    var here = location.href.split('#')[0], there = target.split('#')[0];
    location.href = target;
    if (here === there) location.reload();
  }

  $(function () {
    $('body').append(
      '<div class="mise-palette d-none" id="mise-palette" role="dialog" aria-modal="true" aria-label="Search" aria-hidden="true">' +
      '<div class="mise-palette-box">' +
      '<div class="mise-palette-head"><i class="mdi mdi-magnify"></i><input id="mise-palette-input" type="search" placeholder="Search dishes, orders, guests, tables, staff…" autocomplete="off" spellcheck="false" aria-label="Search">' +
      '<button type="button" class="mise-palette-close" aria-label="Close search">Esc</button></div>' +
      '<div class="mise-palette-results" id="mise-palette-results"></div>' +
      '<div class="mise-palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span class="ms-auto d-none d-sm-inline"><kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere</span></div>' +
      '</div></div>');

    $(document).on('click', '#mise-search-open', function (e) { e.preventDefault(); open(); });
    $(document).on('click', '#mise-palette', function (e) { if (e.target === this) close(); });
    $(document).on('click', '.mise-palette-close', close);
    $(document).on('input', '#mise-palette-input', function () { render($(this).val()); });
    $(document).on('mousemove', '.mise-palette-item', function () {
      var i = +$(this).data('i');
      if (i !== active) setActive(i);
    });
    $(document).on('click', '.mise-palette-item', function (e) { e.preventDefault(); go(results[+$(this).data('i')]); });
    $(document).on('keydown', '#mise-palette-input', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    $(document).on('keydown', function (e) {
      var typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
      else if (e.key === '/' && !typing && !$('.modal.show').length) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && !$('#mise-palette').hasClass('d-none')) close();
    });
  });

  M.openSearch = open;
})(window, document, jQuery);
