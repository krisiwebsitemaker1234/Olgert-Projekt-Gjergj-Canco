(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var day = M.today();

  var STATUS = { confirmed: ['Confirmed', 'primary'], seated: ['Seated', 'success'], completed: ['Completed', 'secondary'], cancelled: ['Cancelled', 'danger'], 'no-show': ['No-show', 'danger'], waitlist: ['Waitlist', 'warning'] };

  function forDay(d) { return M.data.reservations.filter(function (r) { return r.date === d; }); }

  function render() {
    $('#day').val(day);
    $('#day-label').text(M.fmtDay(day) + (M.fmtDay(day).indexOf(',') === -1 && day !== M.today() ? '' : ''));
    var list = forDay(day);
    var booked = list.filter(function (r) { return r.status !== 'waitlist' && r.status !== 'cancelled'; });
    var stats = [
      ['Bookings', booked.length],
      ['Covers', booked.reduce(function (s, r) { return s + r.partySize; }, 0)],
      ['Seated', list.filter(function (r) { return r.status === 'seated'; }).length],
      ['Still to arrive', list.filter(function (r) { return r.status === 'confirmed'; }).length],
      ['No-shows', list.filter(function (r) { return r.status === 'no-show'; }).length],
      ['Waitlist', list.filter(function (r) { return r.status === 'waitlist'; }).length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    var timeline = list.filter(function (r) { return r.status !== 'waitlist'; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
    var hours = {};
    timeline.forEach(function (r) { var h = r.time.slice(0, 2) + ':00'; (hours[h] = hours[h] || []).push(r); });
    var keys = Object.keys(hours).sort();
    $('#timeline-title').text(M.fmtDay(day) === 'Today' ? 'Today\'s bookings' : 'Bookings · ' + M.fmtDate(day, { weekday: 'long', month: 'short', day: 'numeric' }));
    $('#timeline').html(keys.length ? keys.map(function (h) {
      return '<div class="mise-slot"><div class="hour">' + h + '</div><div class="bookings">' + hours[h].map(function (r) {
        return '<button type="button" class="mise-booking" data-status="' + r.status + '" data-res="' + esc(r.id) + '">' +
          '<div class="who">' + esc(r.name) + '</div><div class="meta">' + esc(r.time) + ' · ' + r.partySize + ' guests' + (r.table ? ' · ' + esc(r.table) : ' · no table') + '</div>' +
          (r.notes ? '<div class="meta text-truncate" style="max-width:220px"><i class="mdi mdi-note-text"></i> ' + esc(r.notes) + '</div>' : '') +
          '<div class="mt-1">' + M.badge(STATUS[r.status][0], STATUS[r.status][1]) + '</div></button>';
      }).join('') + '</div></div>';
    }).join('') : M.empty('No bookings for this day yet', 'mdi-calendar-clock'));

    var wait = list.filter(function (r) { return r.status === 'waitlist'; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
    $('#waitlist').html(wait.length ? wait.map(function (r) {
      return '<div class="mise-list-row"><div class="grow"><h6>' + esc(r.name) + ' · ' + r.partySize + '</h6><p>Added ' + esc(r.time) + (r.phone ? ' · ' + esc(r.phone) : '') + '</p></div>' +
        '<button class="btn btn-sm btn-primary text-white" data-seat="' + esc(r.id) + '">Seat</button>' +
        '<button class="mise-icon-btn danger" data-remove="' + esc(r.id) + '" aria-label="Remove"><i class="mdi mdi-close"></i></button></div>';
    }).join('') : M.empty('Nobody waiting', 'mdi-account-clock-outline'));

    // Next 7 days at a glance
    var cap = M.data.restaurant.capacity || 1;
    var html = '';
    for (var i = 0; i < 7; i++) {
      var dd = M.addDays(M.today(), i);
      var covers = forDay(dd).filter(function (r) { return r.status === 'confirmed' || r.status === 'seated'; }).reduce(function (s, r) { return s + r.partySize; }, 0);
      var pct = Math.min(100, Math.round(covers / cap * 100));
      html += '<div class="mise-list-row align-items-center" role="button" data-goto="' + dd + '"><div class="grow"><h6>' + esc(M.fmtDay(dd)) + '</h6>' +
        '<div class="progress progress-md mt-1"><div class="progress-bar bg-primary" style="width:' + pct + '%"></div></div></div>' +
        '<div class="text-end" style="min-width:70px"><strong>' + covers + '</strong><p>covers</p></div></div>';
    }
    $('#week').html(html);
  }

  function fieldsFor(isWaitlist) {
    var d = M.data;
    var tables = [['', '— assign later —']].concat(d.tables.map(function (t) { return [t.id, t.id + ' · ' + t.area + ' (' + t.seats + ')']; }));
    var f = [
      { key: 'name', label: 'Guest name', col: 8, required: true, placeholder: 'Start typing to find a regular' },
      { key: 'partySize', label: 'Guests', type: 'number', col: 4, min: 1, required: true },
      { key: 'phone', label: 'Phone', col: 6 },
      { key: 'time', label: isWaitlist ? 'Added at' : 'Time', type: 'time', col: 6, required: true }
    ];
    if (!isWaitlist) {
      f.push({ key: 'date', label: 'Date', type: 'date', col: 6, required: true });
      f.push({ key: 'table', label: 'Table', type: 'select', col: 6, options: tables });
      f.push({ key: 'status', label: 'Status', type: 'select', col: 6, options: Object.keys(STATUS).map(function (k) { return [k, STATUS[k][0]]; }) });
    }
    f.push({ key: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Allergies, occasions, seating requests…' });
    return f;
  }

  function attachCustomerLookup($b) {
    var opts = M.data.customers.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('');
    $b.find('[name=name]').attr('list', 'mise-customers').after('<datalist id="mise-customers">' + opts + '</datalist>');
    $b.find('[name=name]').on('change', function () {
      var c = M.data.customers.filter(function (x) { return x.name === $(this).val(); }, this)[0];
      if (c) {
        if (!$b.find('[name=phone]').val()) $b.find('[name=phone]').val(c.phone);
        if (c.notes && !$b.find('[name=notes]').val()) $b.find('[name=notes]').val(c.notes);
      }
    });
  }

  function edit(r, isWaitlist) {
    var isNew = !r;
    var fields = fieldsFor(isWaitlist || (r && r.status === 'waitlist'));
    var values = r || { partySize: 2, date: day, time: isWaitlist ? M.nowTime() : '19:00', status: isWaitlist ? 'waitlist' : 'confirmed' };
    var quick = !isNew && r.status !== 'waitlist' ? '<div class="d-flex flex-wrap gap-2 mb-3">' +
      (r.status === 'confirmed' ? '<button type="button" class="btn btn-sm btn-primary text-white" data-quick="seated">Guests arrived</button><button type="button" class="btn btn-sm btn-outline-secondary" data-quick="no-show">No-show</button>' : '') +
      (r.status === 'seated' ? '<button type="button" class="btn btn-sm btn-primary text-white" data-quick="completed">Mark completed</button>' : '') +
      (r.status !== 'cancelled' && r.status !== 'completed' ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-quick="cancelled">Cancel booking</button>' : '') + '</div>' : '';
    M.modal({
      title: isNew ? (isWaitlist ? 'Add to waitlist' : 'New reservation') : r.name,
      body: quick + M.form(fields, values),
      saveLabel: isNew ? (isWaitlist ? 'Add' : 'Book') : 'Save',
      extra: isNew ? '' : '<button type="button" class="btn btn-link text-danger p-0" data-del>Delete</button>',
      onOpen: function ($b, $m) {
        attachCustomerLookup($b);
        $b.find('[data-quick]').on('click', function () { setStatus(r.id, $(this).data('quick')); M.closeModal(); });
        $m.find('[data-del]').on('click', function () {
          M.update(function (d) { d.reservations = d.reservations.filter(function (x) { return x.id !== r.id; }); });
          M.closeModal(); M.toast('Reservation deleted');
        });
      },
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          var c = d.customers.filter(function (x) { return x.name.toLowerCase() === v.name.toLowerCase(); })[0];
          if (isNew) {
            d.reservations.push($.extend({ id: M.uid('r'), date: day, table: null, status: isWaitlist ? 'waitlist' : 'confirmed', customerId: c ? c.id : null }, v, { table: v.table || null }));
          } else {
            $.extend(M.find(d.reservations, r.id), v, { table: v.table === undefined ? r.table : (v.table || null), customerId: c ? c.id : r.customerId });
          }
        });
        M.toast(isNew ? (isWaitlist ? 'Added to waitlist' : 'Reservation booked') : 'Reservation updated');
      }
    });
  }

  function setStatus(id, status, tableId) {
    M.update(function (d) {
      var r = M.find(d.reservations, id);
      r.status = status;
      if (tableId) r.table = tableId;
      if (status === 'seated' && r.table) {
        var t = M.find(d.tables, r.table);
        if (t) { t.status = 'seated'; t.guests = r.partySize; t.seatedAt = M.nowStamp(); }
      }
      if (status === 'seated' && r.customerId) {
        var c = M.find(d.customers, r.customerId);
        if (c) { c.visits += 1; c.lastVisit = M.today(); }
      }
    });
    M.toast('Marked as ' + STATUS[status][0].toLowerCase());
  }

  function seatFromWaitlist(id) {
    var r = M.find(M.data.reservations, id);
    var free = M.data.tables.filter(function (t) { return t.status === 'free' && t.seats >= r.partySize; });
    if (!free.length) { M.toast('No free table big enough right now', 'danger'); return; }
    var fields = [{ key: 'table', label: 'Free tables that fit ' + r.partySize, type: 'select', options: free.map(function (t) { return [t.id, t.id + ' · ' + t.area + ' (' + t.seats + ')']; }) }];
    M.modal({
      title: 'Seat ' + r.name, body: M.form(fields), saveLabel: 'Seat now',
      onSave: function ($b) { setStatus(id, 'seated', M.readForm($b, fields).table); }
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    if (/^\d{4}-\d{2}-\d{2}$/.test(M.param('date'))) { day = M.param('date'); render(); }
    if (M.param('q')) {
      var needle = M.param('q').toLowerCase();
      var hit = $('.mise-booking, #waitlist .mise-list-row').filter(function () { return $(this).text().toLowerCase().indexOf(needle) > -1; })[0];
      M.flash(hit);
    }
    $('#day').on('change', function () { if (this.value) { day = this.value; render(); } });
    $('#prev-day').on('click', function () { day = M.addDays(day, -1); render(); });
    $('#next-day').on('click', function () { day = M.addDays(day, 1); render(); });
    $('#today').on('click', function () { day = M.today(); render(); });
    $('#new-res').on('click', function () { edit(null, false); });
    $('#new-wait').on('click', function () { edit(null, true); });
    $(document).on('click', '[data-res]', function () { edit(M.find(M.data.reservations, $(this).data('res'))); });
    $(document).on('click', '[data-seat]', function () { seatFromWaitlist($(this).data('seat')); });
    $(document).on('click', '[data-remove]', function () {
      var id = $(this).data('remove');
      M.update(function (d) { d.reservations = d.reservations.filter(function (x) { return x.id !== id; }); });
    });
    $(document).on('click', '[data-goto]', function () { day = $(this).data('goto'); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    if (location.hash === '#new') { history.replaceState(null, '', location.pathname); edit(null, false); }
  });
})(jQuery);
