/*
 * Profile — everything personal in one place: your details, sign-in, appearance and how the dashboard behaves for you.
 * Details, sign-in and preferences are saved in data.user (so they export with data.json); appearance is per browser.
 * The password is stored as a SHA-256 hash, which keeps it out of plain sight but is not real security.
 */
(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;

  var DETAIL_FIELDS = [
    { key: 'name', label: 'Full name', required: true, col: 6 },
    { key: 'role', label: 'Role', col: 6 },
    { key: 'email', label: 'Email', type: 'email', col: 6 },
    { key: 'phone', label: 'Phone', col: 6 }
  ];

  var LOGIN_FIELDS = [
    { key: 'username', label: 'Username', required: true, col: 12 },
    { key: 'currentPassword', label: 'Current password', type: 'password', required: true, col: 12 },
    { key: 'newPassword', label: 'New password', type: 'password', col: 6, help: 'Leave empty to keep it' },
    { key: 'confirmPassword', label: 'Repeat new password', type: 'password', col: 6 }
  ];

  var START_PAGES = [
    ['index.html', 'Overview'], ['pages/orders/orders.html', 'Orders'], ['pages/tables/tables.html', 'Tables'],
    ['pages/reservations/reservations.html', 'Reservations'], ['pages/menu/menu.html', 'Menu'], ['pages/inventory/inventory.html', 'Inventory'],
    ['pages/staff/staff.html', 'Staff'], ['pages/reports/reports.html', 'Reports'], ['pages/website/website.html', 'Website']
  ];
  var PREF_FIELDS = [
    { key: 'startPage', label: 'Open after signing in', type: 'select', col: 6, options: START_PAGES },
    { key: 'overviewPeriod', label: 'Overview shows by default', type: 'select', col: 6, options: [['today', 'Today'], ['week', 'Last 7 days'], ['month', 'Last 30 days']] },
    { key: 'revenueRange', label: 'Revenue chart range', type: 'select', col: 6, options: [[14, 'Last 14 days'], [30, 'Last 30 days'], [84, 'Last 12 weeks']] },
    { key: 'lateMinutes', label: 'Flag orders as late after (minutes)', type: 'number', min: 5, col: 6, required: true },
    { key: 'toasts', label: 'Show confirmation pop-ups after saving', type: 'checkbox', col: 12, help: 'Error messages always show.' }
  ];
  var ALERTS = [
    ['stock', 'Low or out-of-stock ingredients'],
    ['menu', 'Dishes marked as 86\'d'],
    ['waitlist', 'Guests on the waitlist'],
    ['website', 'Unpublished website changes']
  ];

  function renderHeader() {
    var u = M.data.user;
    $('#profile-head').html(
      '<div class="d-flex align-items-center flex-wrap gap-4">' + M.userAvatar('img-md') +
      '<div class="flex-grow-1"><h3 class="mb-1 fw-bold">' + esc(u.name) + '</h3><p class="text-muted mb-2">' + esc(u.role || '') + ' · ' + esc(M.data.restaurant.name) + '</p>' +
      '<div class="d-flex flex-wrap gap-2"><span class="mise-chip"><i class="mdi mdi-account-key"></i>' + esc(u.username || 'admin') + '</span>' +
      (u.email ? '<span class="mise-chip"><i class="mdi mdi-email-outline"></i>' + esc(u.email) + '</span>' : '') +
      (u.phone ? '<span class="mise-chip"><i class="mdi mdi-phone-outline"></i>' + esc(u.phone) + '</span>' : '') + '</div></div></div>');
  }

  function renderForms() {
    var u = M.data.user;
    $('#details-form').html(M.form(DETAIL_FIELDS, u));
    $('#login-form-fields').html(M.form(LOGIN_FIELDS, { username: u.username || 'admin' }));
    $('#prefs-form').html(M.form(PREF_FIELDS, M.prefs()));
    var alerts = M.prefs().alerts;
    $('#alerts-form').html(ALERTS.map(function (a) {
      return '<div class="form-check form-switch mise-switch mb-3"><input class="form-check-input" type="checkbox" id="alert-' + a[0] + '" data-alert="' + a[0] + '"' + (alerts[a[0]] ? ' checked' : '') + '>' +
        '<label class="form-check-label" for="alert-' + a[0] + '">' + esc(a[1]) + '</label></div>';
    }).join(''));
  }

  function renderAppearance() {
    var prefs = window.MiseTheme.get(), T = window.MiseTheme.THEMES;
    $('#mode-buttons [data-set-mode]').each(function () {
      var on = $(this).data('set-mode') === prefs.mode;
      $(this).toggleClass('btn-primary text-white', on).toggleClass('btn-outline-secondary', !on).attr('aria-pressed', on);
    });
    $('#theme-cards').html(Object.keys(T).map(function (k) {
      var t = T[k].light;
      return '<button type="button" class="mise-theme-card' + (k === prefs.theme ? ' selected' : '') + '" data-set-theme="' + k + '" aria-pressed="' + (k === prefs.theme) + '">' +
        '<div class="bar" style="background:' + t.primary + '"></div><div class="bar short" style="background:' + t.accent + '"></div><strong>' + esc(T[k].name) + '</strong></button>';
    }).join(''));
    $('#sidebar-buttons [data-set-sidebar]').each(function () {
      var on = $(this).data('set-sidebar') === prefs.sidebar;
      $(this).toggleClass('btn-primary text-white', on).toggleClass('btn-outline-secondary', !on).attr('aria-pressed', on);
    });
    $('#header-tiles').html(['default', 'success', 'warning', 'danger', 'info', 'dark'].map(function (c) {
      return '<button type="button" class="mise-header-tile' + (prefs.navbar === c ? ' selected' : '') + '" data-set-navbar="' + c + '" title="' + c + '" aria-label="Header: ' + c + '" aria-pressed="' + (prefs.navbar === c) + '"><span class="tiles ' + c + '"></span></button>';
    }).join(''));
  }

  function saveUser(changes, message) {
    M.update(function (d) { $.extend(d.user, changes); });
    if (message) M.toast(message);
  }

  function render() { renderHeader(); renderForms(); renderAppearance(); }

  M.ready(function () {
    render();
    $(document).on('mise:data', function () { renderHeader(); });
    document.addEventListener('mise:theme', renderAppearance);
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth' }); }, 200); }

    $('#save-details').on('click', function () {
      var v = M.readForm($('#details-form'), DETAIL_FIELDS);
      if (!v) return M.toast('Please fill in the required fields', 'danger');
      saveUser(v, 'Profile saved');
    });

    $('#save-login').on('click', function () {
      var v = M.readForm($('#login-form-fields'), LOGIN_FIELDS);
      if (!v) return M.toast('Fill in your username and current password', 'danger');
      var username = v.username.toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) return M.toast('Username: 3–32 letters, numbers, dots, dashes or underscores', 'danger');
      if (v.newPassword || v.confirmPassword) {
        if (v.newPassword.length < 6) return M.toast('New password must be at least 6 characters', 'danger');
        if (v.newPassword !== v.confirmPassword) return M.toast('The new passwords don\'t match', 'danger');
      }
      var current = M.data.user.passwordHash || '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
      M.sha256(v.currentPassword).then(function (hash) {
        if (hash !== current) return M.toast('Your current password is wrong', 'danger');
        return (v.newPassword ? M.sha256(v.newPassword) : Promise.resolve(current)).then(function (newHash) {
          saveUser({ username: username, passwordHash: newHash }, v.newPassword ? 'Sign-in details updated' : 'Username updated');
          window.MiseAuth.signIn(username, !!localStorage.getItem(window.MiseAuth.KEY));
          renderForms();
        });
      });
    });
    $('#signout-everywhere').on('click', function () {
      window.MiseAuth.signOut();
      location.href = M.root + 'pages/samples/login.html';
    });

    $('#save-prefs').on('click', function () {
      var v = M.readForm($('#prefs-form'), PREF_FIELDS);
      if (!v) return M.toast('Please fill in the required fields', 'danger');
      v.revenueRange = +v.revenueRange;
      v.lateMinutes = Math.max(5, Math.round(v.lateMinutes));
      M.update(function (d) { d.user.prefs = $.extend(true, {}, M.prefs(), v); });
      M.toast('Preferences saved');
    });
    $(document).on('change', '[data-alert]', function () {
      var key = $(this).data('alert'), on = this.checked;
      M.update(function (d) { var p = M.prefs(); p.alerts[key] = on; d.user.prefs = p; });
      M.toast(on ? 'Alert turned on' : 'Alert turned off', 'info');
    });

    $(document).on('click', '[data-set-mode]', function () { window.MiseTheme.set({ mode: $(this).data('set-mode') }); });
    $(document).on('click', '[data-set-theme]', function () { window.MiseTheme.set({ theme: $(this).data('set-theme') }); });
    $(document).on('click', '[data-set-sidebar]', function () { window.MiseTheme.set({ sidebar: $(this).data('set-sidebar') }); });
    $(document).on('click', '[data-set-navbar]', function () { window.MiseTheme.set({ navbar: $(this).data('set-navbar') }); });
    $('#reset-appearance').on('click', function () { window.MiseTheme.set({ mode: 'light', theme: 'default', sidebar: 'light', navbar: 'default' }); M.toast('Appearance reset'); });
    $('#reset-prefs').on('click', function () {
      M.update(function (d) { d.user.prefs = $.extend(true, {}, M.PREF_DEFAULTS); });
      renderForms();
      M.toast('Preferences reset');
    });
  });
})(jQuery);
