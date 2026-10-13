/*
 * Mise — shared page chrome.
 * Fills the placeholders <div data-mise-slot="navbar|sidebar|footer"></div> with the template's
 * navbar / sidebar / settings panel / footer markup, so every page shares one copy.
 * Runs synchronously (before the template's own scripts bind their handlers on DOM ready).
 */
(function (window, document, $) {
  'use strict';

  var M = window.Mise;
  var R = M.root;
  var esc = M.esc;

  var NAV = [
    { cat: 'Service' },
    { href: 'index.html', icon: 'mdi-view-dashboard-outline', title: 'Overview' },
    { href: 'pages/orders/orders.html', icon: 'mdi-receipt', title: 'Orders', badge: 'orders' },
    { href: 'pages/tables/tables.html', icon: 'mdi-table-large', title: 'Tables' },
    { href: 'pages/reservations/reservations.html', icon: 'mdi-calendar-clock', title: 'Reservations' },
    { cat: 'Kitchen' },
    { href: 'pages/menu/menu.html', icon: 'mdi-silverware-fork-knife', title: 'Menu' },
    { href: 'pages/inventory/inventory.html', icon: 'mdi-package-variant-closed', title: 'Inventory', badge: 'stock' },
    { cat: 'People' },
    { href: 'pages/staff/staff.html', icon: 'mdi-account-group-outline', title: 'Staff' },
    { href: 'pages/customers/customers.html', icon: 'mdi-account-heart-outline', title: 'Customers' },
    { cat: 'Business' },
    { href: 'pages/reports/reports.html', icon: 'mdi-chart-line', title: 'Reports' },
    { href: 'pages/website/website.html', icon: 'mdi-web', title: 'Website', badge: 'website' },
    { href: 'pages/settings/settings.html', icon: 'mdi-settings-outline', title: 'Settings' },
    { cat: 'You' },
    { href: 'pages/profile/profile.html', icon: 'mdi-account-circle-outline', title: 'Profile' }
  ];

  var REPO_URL = 'https://github.com/krisiwebsitemaker1234/Olgert-Projekt-Gjergj-Canco';

  var body = document.body;
  var pageTitle = body.getAttribute('data-page-title');
  var pageSub = body.getAttribute('data-page-sub') || '';

  function navbarHtml() {
    var heading = pageTitle
      ? '<h1 class="welcome-text">' + esc(pageTitle) + '</h1><h3 class="welcome-sub-text" data-mise-sub>' + esc(pageSub) + '</h3>'
      : '<h1 class="welcome-text"><span data-mise-greeting>Hello</span>, <span class="text-black fw-bold" data-mise-username></span></h1>' +
        '<h3 class="welcome-sub-text" data-mise-sub>Here\'s how service is going today</h3>';
    return '' +
      '<nav class="navbar default-layout col-lg-12 col-12 p-0 fixed-top d-flex align-items-top flex-row">' +
      '  <div class="text-center navbar-brand-wrapper d-flex align-items-center justify-content-start">' +
      '    <div class="me-3"><button class="navbar-toggler navbar-toggler align-self-center" type="button" data-bs-toggle="minimize" aria-label="Collapse sidebar"><span class="icon-menu"></span></button></div>' +
      '    <div>' +
      '      <a class="navbar-brand brand-logo mise-brand" href="' + R + 'index.html">mise<span>.</span></a>' +
      '      <a class="navbar-brand brand-logo-mini mise-brand" href="' + R + 'index.html">m<span>.</span></a>' +
      '    </div>' +
      '  </div>' +
      '  <div class="navbar-menu-wrapper d-flex align-items-top">' +
      '    <ul class="navbar-nav"><li class="nav-item font-weight-semibold d-none d-lg-block ms-0">' + heading + '</li></ul>' +
      '    <ul class="navbar-nav ms-auto">' +
      '      <li class="nav-item dropdown d-none d-lg-block">' +
      '        <a class="nav-link dropdown-bordered dropdown-toggle dropdown-toggle-split" id="quickActions" href="#" data-bs-toggle="dropdown" aria-expanded="false"> Quick actions </a>' +
      '        <div class="dropdown-menu dropdown-menu-right navbar-dropdown preview-list pb-0" aria-labelledby="quickActions">' +
      quick('pages/orders/orders.html#new', 'New order', 'Open a ticket for a table or takeaway') +
      quick('pages/reservations/reservations.html#new', 'New reservation', 'Book a table for a guest') +
      quick('pages/menu/menu.html#new', 'Add a dish', 'Put something new on the menu') +
      quick('pages/website/website.html', 'Edit website', 'Update what guests see online') +
      '        </div>' +
      '      </li>' +
      '      <li class="nav-item d-none d-lg-block"><div class="input-group date navbar-date-picker mise-today"><span class="input-group-addon input-group-prepend border-right"><span class="icon-calendar input-group-text calendar-icon"></span></span><span class="form-control" data-mise-today></span></div></li>' +
      '      <li class="nav-item"><a class="nav-link count-indicator mise-search-btn" href="#" id="mise-search-open" title="Search (Ctrl+K)" aria-label="Search"><i class="icon-search"></i><span class="mise-search-hint d-none d-xl-inline">Search<kbd>Ctrl K</kbd></span></a></li>' +
      '      <li class="nav-item d-none d-sm-block"><a class="nav-link count-indicator mise-github" href="' + R + 'files/Mise-Lista-e-funksioneve.pdf" target="_blank" rel="noopener" title="Lista e funksioneve (PDF)" aria-label="Lista e funksioneve (PDF)"><i class="mdi mdi-file-pdf"></i></a></li>' +
      '      <li class="nav-item d-none d-sm-block"><a class="nav-link count-indicator mise-github" href="' + REPO_URL + '" target="_blank" rel="noopener" title="Source code on GitHub" aria-label="Source code on GitHub"><i class="mdi mdi-github-circle"></i></a></li>' +
      '      <li class="nav-item dropdown">' +
      '        <a class="nav-link count-indicator" id="messagesDropdown" href="#" data-bs-toggle="dropdown" aria-label="Messages"><i class="icon-mail icon-lg"></i><span class="count d-none" data-mise-msg-dot></span></a>' +
      '        <div class="dropdown-menu dropdown-menu-right navbar-dropdown preview-list pb-0" aria-labelledby="messagesDropdown" data-mise-messages></div>' +
      '      </li>' +
      '      <li class="nav-item dropdown">' +
      '        <a class="nav-link count-indicator" id="alertsDropdown" href="#" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Alerts"><i class="icon-bell"></i><span class="count d-none" data-mise-alert-dot></span></a>' +
      '        <div class="dropdown-menu dropdown-menu-right navbar-dropdown preview-list pb-0" aria-labelledby="alertsDropdown" data-mise-alerts></div>' +
      '      </li>' +
      '      <li class="nav-item dropdown d-none d-lg-block user-dropdown">' +
      '        <a class="nav-link" id="UserDropdown" href="#" data-bs-toggle="dropdown" aria-expanded="false" data-mise-useravatar></a>' +
      '        <div class="dropdown-menu dropdown-menu-right navbar-dropdown" aria-labelledby="UserDropdown">' +
      '          <div class="dropdown-header text-center"><span data-mise-useravatar-lg></span><p class="mb-1 mt-3 font-weight-semibold" data-mise-username-full></p><p class="fw-light text-muted mb-0" data-mise-useremail></p></div>' +
      '          <a class="dropdown-item" href="' + R + 'pages/settings/settings.html"><i class="dropdown-item-icon mdi mdi-store text-primary me-2"></i> Restaurant settings</a>' +
      '          <a class="dropdown-item" href="' + R + 'pages/staff/staff.html"><i class="dropdown-item-icon mdi mdi-account-group-outline text-primary me-2"></i> Team</a>' +
      '          <a class="dropdown-item" href="' + R + 'pages/website/website.html"><i class="dropdown-item-icon mdi mdi-web text-primary me-2"></i> Website</a>' +
      '          <a class="dropdown-item" href="' + R + 'pages/samples/login.html?signout=1"><i class="dropdown-item-icon mdi mdi-power text-primary me-2"></i> Sign out</a>' +
      '        </div>' +
      '      </li>' +
      '    </ul>' +
      '    <button class="navbar-toggler navbar-toggler-right d-lg-none align-self-center" type="button" data-bs-toggle="offcanvas" aria-label="Open menu"><span class="mdi mdi-menu"></span></button>' +
      '  </div>' +
      '</nav>';
  }

  function quick(href, title, sub) {
    return '<a class="dropdown-item preview-item" href="' + R + href + '"><div class="preview-item-content flex-grow py-2">' +
      '<p class="preview-subject ellipsis font-weight-medium text-dark">' + esc(title) + '</p>' +
      '<p class="fw-light small-text mb-0">' + esc(sub) + '</p></div></a>';
  }

  function sidebarHtml() {
    var html = '<nav class="sidebar sidebar-offcanvas" id="sidebar"><ul class="nav">';
    NAV.forEach(function (n) {
      if (n.cat) { html += '<li class="nav-item nav-category">' + esc(n.cat) + '</li>'; return; }
      html += '<li class="nav-item"><a class="nav-link" href="' + R + n.href + '">' +
        '<i class="mdi ' + n.icon + ' menu-icon"></i><span class="menu-title">' + esc(n.title) + '</span>' +
        (n.badge ? '<span class="mise-nav-badge d-none" data-mise-badge="' + n.badge + '"></span>' : '') +
        '</a></li>';
    });
    // On phones the top bar has no room for these, so they live at the bottom of the menu.
    html += '<li class="nav-item nav-category d-sm-none">More</li>' +
      '<li class="nav-item d-sm-none"><a class="nav-link" href="' + R + 'files/Mise-Lista-e-funksioneve.pdf" target="_blank" rel="noopener"><i class="mdi mdi-file-pdf menu-icon"></i><span class="menu-title">Feature list (PDF)</span></a></li>' +
      '<li class="nav-item d-sm-none"><a class="nav-link" href="' + REPO_URL + '" target="_blank" rel="noopener"><i class="mdi mdi-github-circle menu-icon"></i><span class="menu-title">GitHub</span></a></li>' +
      '<li class="nav-item d-sm-none"><a class="nav-link" href="' + R + 'pages/samples/login.html?signout=1"><i class="mdi mdi-logout menu-icon"></i><span class="menu-title">Sign out</span></a></li>';
    return html + '</ul></nav>';
  }

  function footerHtml() {
    return '<footer class="footer"><div class="d-sm-flex justify-content-center justify-content-sm-between">' +
      '<span class="text-muted text-center text-sm-left d-block d-sm-inline-block"><strong class="mise-footer-brand">mise.</strong> restaurant dashboard &middot; <span data-mise-restaurant></span></span>' +
      '<span class="float-none float-sm-right d-block mt-1 mt-sm-0 text-center text-muted">&copy; ' + new Date().getFullYear() + ' <span data-mise-restaurant></span>. All rights reserved.</span>' +
      '</div></footer>';
  }

  function fill(slot, html) {
    var el = document.querySelector('[data-mise-slot="' + slot + '"]');
    if (el) el.outerHTML = html;
  }

  fill('navbar', navbarHtml());
  fill('sidebar', sidebarHtml());
  fill('footer', footerHtml());
  window.MiseTheme.apply();

  // The navbar heading is hidden below 992px, so phones and tablets get the title at the top of the page instead.
  (function () {
    var content = document.querySelector('.content-wrapper');
    if (!content) return;
    var el = document.createElement('div');
    el.className = 'mise-mobile-title d-lg-none';
    el.innerHTML = pageTitle
      ? '<h2>' + esc(pageTitle) + '</h2>' + (pageSub ? '<p>' + esc(pageSub) + '</p>' : '')
      : '<h2><span data-mise-greeting>Hello</span>, <span data-mise-username></span></h2><p data-mise-sub-mobile></p>';
    content.insertBefore(el, content.firstChild);
  })();

  /* ---------- data-driven bits (names, alerts, badges) ---------- */

  function alertsFor(d) {
    var list = [], on = M.prefs().alerts;
    if (on.stock) d.inventory.filter(function (i) { return i.stock < i.par * 0.5; }).forEach(function (i) {
      list.push({ icon: 'mdi-package-variant', tone: i.stock === 0 ? 'danger' : 'warning', title: i.name + (i.stock === 0 ? ' is out of stock' : ' is running low'), sub: M.num(i.stock, 1) + ' ' + i.unit + ' left (par ' + i.par + ')', href: 'pages/inventory/inventory.html' });
    });
    if (on.menu) d.menu.items.filter(function (i) { return !i.available; }).forEach(function (i) {
      list.push({ icon: 'mdi-silverware-fork-knife', tone: 'danger', title: i.name + ' is 86\'d', sub: 'Marked unavailable on the menu', href: 'pages/menu/menu.html' });
    });
    var waiting = d.reservations.filter(function (r) { return r.status === 'waitlist' && r.date === M.today(); }).length;
    if (on.waitlist && waiting) list.push({ icon: 'mdi-account-clock-outline', tone: 'info', title: waiting + ' on the waitlist', sub: 'Seat them when a table frees up', href: 'pages/reservations/reservations.html' });
    var ws = d.website && d.website.status;
    if (on.website && ws && ws.updatedAt > ws.publishedAt) list.push({ icon: 'mdi-web', tone: 'primary', title: 'Website has unpublished changes', sub: 'Publish when you are ready', href: 'pages/website/website.html' });
    return list;
  }

  function renderChrome() {
    var d = M.data;
    if (!d) return;
    var hr = new Date().getHours();
    var first = (d.user.name || '').split(' ')[0];
    $('[data-mise-greeting]').text(hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening');
    $('[data-mise-username]').text(first);
    $('[data-mise-username-full]').text(d.user.name);
    $('[data-mise-useremail]').text(d.user.email);
    $('[data-mise-useravatar]').html(M.userAvatar('img-xs'));
    $('[data-mise-useravatar-lg]').html(M.userAvatar('img-md'));
    $('[data-mise-restaurant]').text(d.restaurant.name);
    $('[data-mise-today]').text(M.fmtDate(M.today(), { weekday: 'short', month: 'short', day: 'numeric' }));
    if (!pageTitle) $('[data-mise-sub], [data-mise-sub-mobile]').text('Here\'s how ' + d.restaurant.name + ' is doing today');
    document.title = (pageTitle ? pageTitle + ' · ' : '') + 'Mise — ' + d.restaurant.name;

    var msgs = d.messages || [];
    var unread = msgs.filter(function (m) { return !m.read; }).length;
    $('[data-mise-msg-dot]').toggleClass('d-none', !unread);
    $('[data-mise-messages]').html(
      '<a class="dropdown-item py-3 border-bottom"><p class="mb-0 font-weight-medium float-left">' + (unread ? unread + ' unread message' + (unread > 1 ? 's' : '') : 'No new messages') + '</p>' +
      (unread ? '<span class="badge badge-pill badge-primary float-right" data-mise-mark-read role="button">Mark read</span>' : '') + '</a>' +
      (msgs.length ? msgs.map(function (m) {
        var who = M.staffMember(m.from) || { name: 'Team' };
        return '<a class="dropdown-item preview-item"><div class="preview-thumbnail">' + M.avatar(who, 'img-sm profile-pic') + '</div>' +
          '<div class="preview-item-content flex-grow py-2"><p class="preview-subject ellipsis font-weight-medium text-dark">' + esc(who.name) + (m.read ? '' : ' <span class="mise-dot"></span>') + '</p>' +
          '<p class="fw-light small-text mb-0 mise-wrap">' + esc(m.text) + '</p><p class="small-text text-muted mb-0">' + esc(M.ago(m.time)) + '</p></div></a>';
      }).join('') : '<div class="px-3 py-3 text-muted small-text">Messages from your team show up here.</div>')
    );

    var alerts = alertsFor(d);
    $('[data-mise-alert-dot]').toggleClass('d-none', !alerts.length);
    $('[data-mise-alerts]').html(
      '<a class="dropdown-item py-3"><p class="mb-0 font-weight-medium float-left">' + (alerts.length ? alerts.length + ' thing' + (alerts.length > 1 ? 's' : '') + ' need attention' : 'All good — nothing needs attention') + '</p></a><div class="dropdown-divider"></div>' +
      alerts.slice(0, 7).map(function (a) {
        return '<a class="dropdown-item preview-item py-3" href="' + R + a.href + '"><div class="preview-thumbnail"><i class="mdi ' + a.icon + ' m-auto text-' + a.tone + '"></i></div>' +
          '<div class="preview-item-content"><h6 class="preview-subject fw-normal text-dark mb-1">' + esc(a.title) + '</h6><p class="fw-light small-text mb-0">' + esc(a.sub) + '</p></div></a>';
      }).join('')
    );

    var openOrders = d.orders.filter(function (o) { return o.status === 'new' || o.status === 'preparing' || o.status === 'ready'; }).length;
    var lowStock = d.inventory.filter(function (i) { return i.stock < i.par * 0.5; }).length;
    var ws = d.website.status;
    setBadge('orders', openOrders);
    setBadge('stock', lowStock, 'warning');
    setBadge('website', ws.updatedAt > ws.publishedAt ? '•' : 0, 'info');
  }

  function setBadge(key, value, tone) {
    $('[data-mise-badge="' + key + '"]').text(value).toggleClass('d-none', !value).attr('data-tone', tone || 'primary');
  }

  $(document).on('click', '[data-mise-mark-read]', function (e) {
    e.preventDefault(); e.stopPropagation();
    M.update(function (d) { d.messages.forEach(function (m) { m.read = true; }); });
  });

  /* ---------- banners for data loading states ---------- */

  function renderLoadState() {
    var $content = $('.content-wrapper').first();
    if (M.state.needsImport) {
      $content.html(
        '<div class="row"><div class="col-lg-8 mx-auto grid-margin"><div class="card card-rounded"><div class="card-body p-4 p-md-5">' +
        '<h3 class="mise-brand mb-3">mise<span>.</span></h3>' +
        '<h4 class="card-title card-title-dash mb-2">Load your restaurant data</h4>' +
        '<p class="text-muted">Mise keeps everything in <code>data/data.json</code>. Your browser blocks reading that file when a page is opened straight from disk, so pick one of these:</p>' +
        '<ol class="mise-steps"><li><strong>Run a tiny local server</strong> (recommended). In a terminal, from the <code>template</code> folder:<pre class="mise-code mt-2">python3 -m http.server 8000</pre>then open <a href="http://localhost:8000">http://localhost:8000</a>.</li>' +
        '<li><strong>Or load the file here.</strong> It will be kept in this browser.<div class="mt-2"><label class="btn btn-primary text-white mb-0"><i class="mdi mdi-upload"></i> Choose data.json<input type="file" accept="application/json,.json" class="d-none" id="mise-first-import"></label></div></li></ol>' +
        '</div></div></div></div>');
      $('#mise-first-import').on('change', function () {
        if (!this.files[0]) return;
        M.importJSON(this.files[0]).then(function () { location.reload(); }, function (err) { M.toast(err.message || 'Could not read that file', 'danger'); });
      });
    } else if (M.state.sourceChanged) {
      $content.prepend(
        '<div class="alert mise-alert d-flex flex-wrap align-items-center gap-2" id="mise-source-banner" role="alert">' +
        '<i class="mdi mdi-file-document-outline me-1"></i><span class="me-auto"><strong>data.json changed on disk.</strong> You also have edits saved in this browser.</span>' +
        '<button class="btn btn-sm btn-primary text-white" onclick="Mise.useSourceFile()">Load the file</button>' +
        '<button class="btn btn-sm btn-outline-secondary" onclick="Mise.keepLocal()">Keep my edits</button></div>');
    }
  }

  /* ---------- tables become cards on phones ---------- */

  // Each cell gets its column name, so CSS can show "Price: $14" when the table is stacked on small screens.
  function labelTables(root) {
    var sel = 'table.mise-table, table.select-table';
    $(root).find(sel).addBack(sel).not('.mise-no-stack').each(function () {
      var heads = $(this).find('thead th').map(function () { return $.trim($(this).text()); }).get();
      if (!heads.length) return;
      $(this).addClass('mise-stackable').find('tbody tr').each(function () {
        $(this).children('td').each(function (i) { if (heads[i]) this.setAttribute('data-label', heads[i]); });
      });
    });
  }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      records.forEach(function (r) { if (r.target.tagName === 'TBODY' || $(r.target).find('tbody').length) labelTables(r.target.closest ? (r.target.closest('table') || r.target) : r.target); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  $(document).on('mise:loaded', function () { renderLoadState(); renderChrome(); labelTables(document); });
  $(document).on('mise:data mise:chrome', renderChrome);
})(window, document, jQuery);
