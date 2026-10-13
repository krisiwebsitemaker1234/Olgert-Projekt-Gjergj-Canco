(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;

  var STATES = {
    free: { label: 'Free', color: 'var(--mise-success)' },
    reserved: { label: 'Reserved', color: 'var(--mise-primary)' },
    seated: { label: 'Seated', color: 'var(--mise-primary)' },
    ordered: { label: 'Ordered', color: 'var(--mise-primary)' },
    eating: { label: 'Eating', color: 'var(--mise-primary)' },
    bill: { label: 'Wants the bill', color: 'var(--mise-warning)' },
    cleaning: { label: 'Needs clearing', color: 'var(--mise-muted)' }
  };
  var BUSY = ['seated', 'ordered', 'eating', 'bill'];

  function nextBooking(tableId) {
    var today = M.today(), now = M.nowTime();
    return M.data.reservations.filter(function (r) { return r.table === tableId && r.date === today && r.status === 'confirmed' && r.time >= now.slice(0, 2) + ':00'; })
      .sort(function (a, b) { return a.time < b.time ? -1 : 1; })[0];
  }

  function tile(t) {
    var st = STATES[t.status] || STATES.free;
    var server = M.staffMember(t.server);
    var meta = '';
    if (BUSY.indexOf(t.status) > -1) meta = t.guests + ' guest' + (t.guests === 1 ? '' : 's') + ' · ' + M.minutesSince(t.seatedAt) + ' min' + (server ? ' · ' + server.name.split(' ')[0] : '');
    var nb = nextBooking(t.id);
    if (!meta && nb) meta = 'Next: ' + nb.time + ' · ' + nb.name.split(' ')[0] + ' (' + nb.partySize + ')';
    return '<button type="button" class="mise-table-tile" data-status="' + esc(t.status) + '" data-table="' + esc(t.id) + '">' +
      '<div class="d-flex justify-content-between align-items-start"><span class="name">' + esc(t.name) + '</span><span class="seats"><i class="mdi mdi-seat"></i> ' + t.seats + '</span></div>' +
      '<div class="state">' + esc(st.label) + '</div><div class="meta">' + esc(meta) + '</div></button>';
  }

  function render() {
    var d = M.data;
    var busy = d.tables.filter(function (t) { return BUSY.indexOf(t.status) > -1; });
    var guests = busy.reduce(function (s, t) { return s + (t.guests || 0); }, 0);
    var stats = [
      ['Tables in use', busy.length + ' / ' + d.tables.length],
      ['Guests seated', guests],
      ['Seats filled', Math.round(d.restaurant.capacity ? guests / d.restaurant.capacity * 100 : 0) + '%'],
      ['Free now', d.tables.filter(function (t) { return t.status === 'free'; }).length],
      ['Waiting for bill', d.tables.filter(function (t) { return t.status === 'bill'; }).length],
      ['To clear', d.tables.filter(function (t) { return t.status === 'cleaning'; }).length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    var areas = [];
    d.tables.forEach(function (t) { if (areas.indexOf(t.area) === -1) areas.push(t.area); });
    $('#floor').html(areas.map(function (a) {
      var list = d.tables.filter(function (t) { return t.area === a; });
      var seats = list.reduce(function (s, t) { return s + t.seats; }, 0);
      return '<div class="col-12 grid-margin stretch-card"><div class="card card-rounded"><div class="card-body">' +
        '<div class="d-flex justify-content-between align-items-center mb-3"><div><h4 class="card-title card-title-dash">' + esc(a) + '</h4>' +
        '<p class="card-subtitle card-subtitle-dash">' + list.length + ' tables · ' + seats + ' seats</p></div></div>' +
        '<div class="mise-floor">' + list.map(tile).join('') + '</div></div></div></div>';
    }).join(''));

    $('#legend').html(Object.keys(STATES).map(function (k) { return '<span style="--c:' + STATES[k].color + '">' + STATES[k].label + '</span>'; }).join(''));
  }

  function setStatus(id, status, extra) {
    M.update(function (d) {
      var t = M.find(d.tables, id);
      t.status = status;
      if (status === 'free' || status === 'cleaning' || status === 'reserved') { t.guests = 0; t.server = null; t.seatedAt = null; }
      if (extra) $.extend(t, extra);
    });
  }

  function openTable(id) {
    var t = M.find(M.data.tables, id);
    var server = M.staffMember(t.server);
    var orders = M.data.orders.filter(function (o) { return o.table === id && ['new', 'preparing', 'ready', 'served'].indexOf(o.status) > -1; });
    var total = orders.reduce(function (s, o) { return s + M.orderTotal(o); }, 0);
    var nb = nextBooking(id);

    var info = '<div class="d-flex flex-wrap gap-2 mb-3">' + M.badge(STATES[t.status].label, t.status === 'free' ? 'success' : t.status === 'bill' ? 'warning' : 'primary') +
      '<span class="mise-chip">' + esc(t.area) + '</span><span class="mise-chip">' + t.seats + ' seats</span>' +
      (server ? '<span class="mise-chip">' + esc(server.name) + '</span>' : '') + '</div>';
    if (orders.length) {
      info += '<p class="mb-1"><strong>' + orders.length + ' open order' + (orders.length > 1 ? 's' : '') + '</strong> · ' + M.money(total) + '</p><ul class="small text-muted ps-3">' +
        orders.map(function (o) { return '<li>#' + esc(o.id.replace(/^o/, '')) + ' — ' + esc(o.status) + ', ' + M.orderCount(o) + ' items</li>'; }).join('') + '</ul>';
    }
    if (nb) info += '<p class="small text-muted mb-3"><i class="mdi mdi-calendar-clock"></i> Next booking ' + esc(nb.time) + ' — ' + esc(nb.name) + ', ' + nb.partySize + ' guests</p>';

    var actions = [];
    if (t.status === 'free' || t.status === 'reserved' || t.status === 'cleaning') actions.push(['seat', 'Seat guests', 'btn-primary text-white']);
    if (BUSY.indexOf(t.status) > -1) actions.push(['order', 'Add order', 'btn-primary text-white']);
    if (t.status === 'ordered' || t.status === 'seated') actions.push(['eating', 'Food served', 'btn-outline-secondary']);
    if (t.status === 'eating' || t.status === 'ordered') actions.push(['bill', 'Bill requested', 'btn-outline-secondary']);
    if (BUSY.indexOf(t.status) > -1) actions.push(['clear', 'Guests left', 'btn-outline-secondary']);
    if (t.status === 'cleaning') actions.push(['free', 'Table is clean', 'btn-outline-secondary']);
    if (t.status === 'free') actions.push(['reserve', 'Hold for booking', 'btn-outline-secondary']);
    if (t.status === 'reserved') actions.push(['free', 'Release hold', 'btn-outline-secondary']);

    var body = info + '<div class="d-flex flex-wrap gap-2">' + actions.map(function (a) {
      return '<button type="button" class="btn ' + a[2] + '" data-action="' + a[0] + '">' + a[1] + '</button>';
    }).join('') + '</div>';

    M.modal({
      title: 'Table ' + t.name,
      body: body,
      saveLabel: false,
      extra: '<button type="button" class="btn btn-link p-0" data-action="edit">Edit table</button>',
      onOpen: function ($b, $m) {
        $m.off('click.tbl').on('click.tbl', '[data-action]', function () {
          var a = $(this).data('action');
          $m.off('click.tbl');
          if (a === 'seat') return seat(t);
          if (a === 'edit') return editTable(t);
          M.closeModal();
          if (a === 'order') location.href = M.root + 'pages/orders/orders.html#new';
          else if (a === 'eating') setStatus(id, 'eating');
          else if (a === 'bill') setStatus(id, 'bill');
          else if (a === 'clear') {
            if (orders.some(function (o) { return o.status !== 'served'; })) M.toast('Heads up: this table still has orders in the kitchen', 'info');
            setStatus(id, 'cleaning');
          }
          else if (a === 'free') setStatus(id, 'free');
          else if (a === 'reserve') setStatus(id, 'reserved');
        });
      }
    });
  }

  function seat(t) {
    var servers = M.data.staff.filter(function (s) { return (s.role === 'Server' || s.role === 'Bartender') && s.status !== 'off'; });
    var fields = [
      { key: 'guests', label: 'Guests', type: 'number', col: 6, min: 1, default: Math.min(2, t.seats), required: true },
      { key: 'server', label: 'Server', type: 'select', col: 6, options: servers.map(function (s) { return [s.id, s.name]; }) }
    ];
    setTimeout(function () {
      M.modal({
        title: 'Seat guests at ' + t.name, body: M.form(fields), saveLabel: 'Seat',
        onSave: function ($b) {
          var v = M.readForm($b, fields);
          if (!v) return false;
          if (v.guests > t.seats) M.toast('That is more guests than seats — pull up a chair!', 'info');
          setStatus(t.id, 'seated', { guests: v.guests, server: v.server || null, seatedAt: M.nowStamp() });
          M.toast('Seated ' + v.guests + ' at ' + t.name);
        }
      });
    }, 350);
  }

  var TABLE_FIELDS = function () {
    var areas = [];
    M.data.tables.forEach(function (t) { if (areas.indexOf(t.area) === -1) areas.push(t.area); });
    return [
      { key: 'name', label: 'Name', col: 4, required: true },
      { key: 'seats', label: 'Seats', type: 'number', col: 4, min: 1, required: true },
      { key: 'area', label: 'Area', col: 4, required: true, help: 'Existing: ' + areas.join(', ') }
    ];
  };

  function editTable(t) {
    var fields = TABLE_FIELDS();
    setTimeout(function () {
      M.modal({
        title: t ? 'Edit table ' + t.name : 'Add a table',
        body: M.form(fields, t || { seats: 2, area: M.data.tables[0] ? M.data.tables[0].area : 'Main room' }),
        extra: t ? '<button type="button" class="btn btn-link text-danger p-0" data-remove>Remove table</button>' : '',
        onOpen: function ($b, $m) {
          $m.find('[data-remove]').on('click', function () {
            M.closeModal();
            setTimeout(function () {
              M.confirm('Remove table ' + t.name + ' from the floor plan?', function () {
                M.update(function (d) { d.tables = d.tables.filter(function (x) { return x.id !== t.id; }); d.restaurant.capacity = d.tables.reduce(function (s, x) { return s + x.seats; }, 0); });
              }, 'Remove');
            }, 350);
          });
        },
        onSave: function ($b) {
          var v = M.readForm($b, fields);
          if (!v) return false;
          M.update(function (d) {
            if (t) $.extend(M.find(d.tables, t.id), v);
            else d.tables.push({ id: v.name.replace(/\s+/g, ''), name: v.name, seats: v.seats, area: v.area, status: 'free', guests: 0, server: null, seatedAt: null });
            d.restaurant.capacity = d.tables.reduce(function (s, x) { return s + x.seats; }, 0);
          });
          M.toast(t ? 'Table updated' : 'Table added');
        }
      });
    }, t ? 350 : 0);
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    $(document).on('click', '[data-table]', function () { openTable($(this).data('table')); });
    $('#add-table').on('click', function () { editTable(null); });
    if (M.param('focus') && M.find(M.data.tables, M.param('focus'))) {
      M.flash($('[data-table="' + M.param('focus') + '"]')[0]);
      openTable(M.param('focus'));
    }
    $('#reset-floor').on('click', function () {
      M.confirm('Mark every table as free? Use this at the end of service.', function () {
        M.update(function (d) { d.tables.forEach(function (t) { t.status = 'free'; t.guests = 0; t.server = null; t.seatedAt = null; }); });
        M.toast('Floor reset');
      }, 'Reset floor');
    });
    setInterval(render, 60000);
  });
})(jQuery);
