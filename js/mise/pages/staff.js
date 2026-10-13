(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var ROLES = ['Manager', 'Head chef', 'Sous chef', 'Line cook', 'Server', 'Bartender', 'Host', 'Dishwasher'];
  var q = '';

  function hours(s) {
    var a = s.start.split(':'), b = s.end.split(':');
    var start = +a[0] + a[1] / 60, end = +b[0] + b[1] / 60;
    if (end <= start) end += 24; // past midnight
    return end - start;
  }

  function weekLabor() {
    return M.data.shifts.reduce(function (sum, sh) {
      var p = M.staffMember(sh.staffId);
      return sum + (p ? hours(sh) * p.hourlyRate : 0);
    }, 0);
  }

  function render() {
    var d = M.data;
    var on = d.staff.filter(function (s) { return s.status === 'on-shift'; });
    var brk = d.staff.filter(function (s) { return s.status === 'break'; });
    var labor = weekLabor();
    var weekSales = M.sumRows(M.salesWindow(7, 0)).revenue;
    var totalHours = d.shifts.reduce(function (s, sh) { return s + hours(sh); }, 0);
    var stats = [
      ['Team', d.staff.length],
      ['On shift now', on.length],
      ['On break', brk.length],
      ['Scheduled hours', M.num(totalHours, 0) + 'h'],
      ['Labor this week', M.money(labor, 0)],
      ['Labor vs sales', weekSales ? M.pct(labor / weekSales * 100) : '—']
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    // Who's here
    var present = d.staff.filter(function (s) { return s.status !== 'off'; });
    $('#present').html(present.length ? present.map(function (s) {
      return '<div class="wrapper d-flex align-items-center justify-content-between py-2 border-bottom gap-2">' +
        '<div class="d-flex align-items-center" style="min-width:0">' + M.avatar(s, 'img-sm rounded-10') + '<div class="wrapper ms-3" style="min-width:0"><p class="mb-1 fw-bold text-truncate">' + esc(s.name) + '</p>' +
        '<small class="text-muted d-block text-truncate">' + esc(s.role) + ' · ' + (s.status === 'break' ? 'on break' : 'in since ' + esc(M.timeOf(s.clockedInAt))) + '</small></div></div>' +
        '<div class="d-flex gap-1 flex-shrink-0">' + (s.status === 'break'
          ? '<button class="mise-icon-btn" data-clock="' + s.id + '" data-to="on-shift" title="End break" aria-label="End break"><i class="mdi mdi-play"></i></button>'
          : '<button class="mise-icon-btn" data-clock="' + s.id + '" data-to="break" title="Start break" aria-label="Start break"><i class="mdi mdi-coffee-outline"></i></button>') +
        '<button class="mise-icon-btn danger" data-clock="' + s.id + '" data-to="off" title="Clock out" aria-label="Clock out"><i class="mdi mdi-logout"></i></button></div></div>';
    }).join('') : M.empty('Nobody is clocked in', 'mdi-account-clock-outline'));

    // Team table
    var ql = q.toLowerCase();
    var team = d.staff.filter(function (s) { return !ql || (s.name + ' ' + s.role).toLowerCase().indexOf(ql) > -1; });
    $('#team').html(team.map(function (s) {
      var shiftHours = d.shifts.filter(function (sh) { return sh.staffId === s.id; }).reduce(function (t, sh) { return t + hours(sh); }, 0);
      var badge = s.status === 'on-shift' ? M.badge('On shift', 'success') : s.status === 'break' ? M.badge('On break', 'warning') : '<span class="text-muted">Off</span>';
      return '<tr><td><div class="d-flex align-items-center">' + M.avatar(s) + '<div><h6>' + esc(s.name) + '</h6><p>' + esc(s.email || '') + '</p></div></div></td>' +
        '<td>' + esc(s.role) + '</td><td>' + esc(s.phone || '') + '</td><td>' + M.money(s.hourlyRate) + '/h</td><td>' + M.num(shiftHours, 1) + 'h</td><td>' + badge + '</td>' +
        '<td class="text-end text-nowrap">' + (s.status === 'off' ? '<button class="btn btn-sm btn-outline-secondary me-1" data-clock="' + s.id + '" data-to="on-shift">Clock in</button>' : '') +
        '<button class="mise-icon-btn" data-edit="' + s.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-del="' + s.id + '" aria-label="Remove"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join(''));

    renderSchedule();
  }

  function renderSchedule() {
    var d = M.data;
    var todayIdx = (new Date().getDay() + 6) % 7;
    var html = '<thead><tr><th>Team member</th>' + DAYS.map(function (dd, i) { return '<th class="' + (i === todayIdx ? 'text-primary' : '') + '">' + dd + '</th>'; }).join('') + '<th>Hours</th></tr></thead><tbody>';
    d.staff.forEach(function (s) {
      var total = 0;
      html += '<tr><td class="who"><strong>' + esc(s.name) + '</strong><span class="role">' + esc(s.role) + '</span></td>';
      for (var i = 0; i < 7; i++) {
        var sh = d.shifts.filter(function (x) { return x.staffId === s.id && x.day === i; })[0];
        if (sh) total += hours(sh);
        html += '<td class="' + (i === todayIdx ? 'today-col' : '') + '">' + (sh
          ? '<button type="button" class="mise-shift" data-shift="' + sh.id + '">' + esc(sh.start) + '–' + esc(sh.end) + '</button>'
          : '<button type="button" class="mise-shift off" data-new-shift="' + s.id + '" data-day="' + i + '" aria-label="Add shift">+</button>') + '</td>';
      }
      html += '<td><strong>' + M.num(total, 1) + 'h</strong></td></tr>';
    });
    var perDay = DAYS.map(function (dd, i) {
      return d.shifts.filter(function (x) { return x.day === i; }).reduce(function (t, x) { var p = M.staffMember(x.staffId); return t + (p ? hours(x) * p.hourlyRate : 0); }, 0);
    });
    html += '<tr><td class="who"><strong>Labor cost</strong></td>' + perDay.map(function (v) { return '<td class="text-muted">' + M.money(v, 0) + '</td>'; }).join('') + '<td><strong>' + M.money(weekLabor(), 0) + '</strong></td></tr>';
    $('#schedule').html(html + '</tbody>');
  }

  function editShift(sh, staffId, day) {
    var person = M.staffMember(sh ? sh.staffId : staffId);
    var fields = [
      { key: 'day', label: 'Day', type: 'select', col: 4, options: DAYS.map(function (dd, i) { return [i, dd]; }) },
      { key: 'start', label: 'Start', type: 'time', col: 4, required: true },
      { key: 'end', label: 'End', type: 'time', col: 4, required: true }
    ];
    M.modal({
      title: (sh ? 'Edit shift · ' : 'New shift · ') + person.name,
      body: M.form(fields, sh || { day: day, start: '17:00', end: '23:00' }),
      size: 'sm',
      extra: sh ? '<button type="button" class="btn btn-link text-danger p-0" data-rm-shift>Remove</button>' : '',
      onOpen: function ($b, $m) {
        $m.find('[data-rm-shift]').on('click', function () {
          M.update(function (d) { d.shifts = d.shifts.filter(function (x) { return x.id !== sh.id; }); });
          M.closeModal();
        });
      },
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        v.day = +v.day;
        M.update(function (d) {
          if (sh) $.extend(M.find(d.shifts, sh.id), v);
          else d.shifts.push($.extend({ id: M.uid('sh'), staffId: staffId }, v));
        });
      }
    });
  }

  function editPerson(s) {
    var fields = [
      { key: 'name', label: 'Full name', required: true, col: 8 },
      { key: 'role', label: 'Role', type: 'select', col: 4, options: ROLES },
      { key: 'email', label: 'Email', type: 'email', col: 6 },
      { key: 'phone', label: 'Phone', col: 6 },
      { key: 'hourlyRate', label: 'Hourly rate', type: 'number', step: '0.01', min: 0, col: 6, required: true }
    ];
    M.modal({
      title: s ? 'Edit ' + s.name : 'Add team member', body: M.form(fields, s || { role: 'Server', hourlyRate: 15 }),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          if (s) $.extend(M.find(d.staff, s.id), v);
          else d.staff.push($.extend({ id: M.uid('s'), status: 'off', clockedInAt: null, salesToday: 0 }, v));
        });
        M.toast(s ? 'Saved' : 'Team member added');
      }
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    M.onSearch(function (v) { q = v; render(); });
    $('#add-person').on('click', function () { editPerson(null); });
    $(document).on('click', '[data-edit]', function () { editPerson(M.staffMember($(this).data('edit'))); });
    $(document).on('click', '[data-del]', function () {
      var s = M.staffMember($(this).data('del'));
      M.confirm('Remove ' + s.name + ' and their shifts?', function () {
        M.update(function (d) {
          d.staff = d.staff.filter(function (x) { return x.id !== s.id; });
          d.shifts = d.shifts.filter(function (x) { return x.staffId !== s.id; });
        });
      }, 'Remove');
    });
    $(document).on('click', '[data-clock]', function () {
      var id = $(this).data('clock'), to = $(this).data('to');
      M.update(function (d) {
        var s = M.find(d.staff, id);
        if (to === 'on-shift' && s.status === 'off') s.clockedInAt = M.nowStamp();
        if (to === 'off') s.clockedInAt = null;
        s.status = to;
      });
      M.toast(to === 'off' ? 'Clocked out' : to === 'break' ? 'On break' : 'Clocked in');
    });
    $(document).on('click', '[data-shift]', function () { editShift(M.find(M.data.shifts, $(this).data('shift'))); });
    $(document).on('click', '[data-new-shift]', function () { editShift(null, $(this).data('new-shift'), +$(this).data('day')); });
  });
})(jQuery);
