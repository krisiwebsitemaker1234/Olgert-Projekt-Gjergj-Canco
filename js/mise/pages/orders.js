(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;

  var FLOW = ['new', 'preparing', 'ready', 'served'];
  var LABEL = { new: 'New', preparing: 'Preparing', ready: 'Ready', served: 'Served', paid: 'Paid', cancelled: 'Cancelled' };
  var TONE = { new: 'info', preparing: 'warning', ready: 'success', served: 'primary', paid: 'secondary', cancelled: 'danger' };
  var NEXT_LABEL = { new: 'Start', preparing: 'Ready', ready: 'Served', served: 'Take payment' };
  var filter = { q: '', status: 'all', type: 'all' };

  function lineHtml(l) {
    var it = M.menuItem(l.itemId);
    return '<li><span class="qty">' + l.qty + '×</span><span>' + esc(it ? it.name : 'Removed item') + (l.note ? '<em>' + esc(l.note) + '</em>' : '') + '</span></li>';
  }

  function ticket(o) {
    var mins = M.minutesSince(o.createdAt);
    var server = M.staffMember(o.server);
    var where = o.table ? 'Table ' + o.table : (o.type === 'delivery' ? 'Delivery' : 'Takeaway');
    return '<div class="mise-ticket" data-id="' + esc(o.id) + '">' +
      '<div class="mise-ticket-head"><strong>' + esc(where) + '</strong><span class="time' + (mins > M.prefs().lateMinutes && o.status !== 'served' ? ' late' : '') + '">' + M.timeOf(o.createdAt) + ' · ' + mins + 'm</span></div>' +
      '<div class="mb-2"><span class="mise-chip">#' + esc(o.id.replace(/^o/, '')) + '</span> ' +
      (server ? '<span class="mise-chip">' + esc(server.name.split(' ')[0]) + '</span> ' : '') +
      (o.customer ? '<span class="mise-chip">' + esc(o.customer) + '</span>' : '') + '</div>' +
      '<ul>' + o.items.map(lineHtml).join('') + '</ul>' +
      '<div class="mise-ticket-foot"><strong>' + M.money(M.orderTotal(o)) + '</strong><div class="d-flex gap-1">' +
      '<button class="mise-icon-btn" data-edit="' + esc(o.id) + '" title="Edit order" aria-label="Edit order"><i class="mdi mdi-pencil-outline"></i></button>' +
      '<button class="btn btn-primary text-white" data-advance="' + esc(o.id) + '">' + NEXT_LABEL[o.status] + '</button></div></div></div>';
  }

  function renderBoard() {
    var open = M.data.orders.filter(function (o) { return FLOW.indexOf(o.status) > -1; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    $('#board').html(FLOW.map(function (st) {
      var list = open.filter(function (o) { return o.status === st; });
      return '<div class="mise-col" data-status="' + st + '"><div class="mise-col-head"><h4>' + LABEL[st] + '</h4><span class="count">' + list.length + '</span></div>' +
        (list.length ? list.map(ticket).join('') : M.empty(st === 'new' ? 'No new tickets' : 'Empty', 'mdi-receipt')) + '</div>';
    }).join(''));
  }

  function renderStats() {
    var orders = M.data.orders.filter(function (o) { return o.createdAt.slice(0, 10) === M.today(); });
    var open = orders.filter(function (o) { return FLOW.indexOf(o.status) > -1 && o.status !== 'served'; });
    var paid = orders.filter(function (o) { return o.status === 'paid'; });
    var waits = open.map(function (o) { return M.minutesSince(o.createdAt); });
    var avgWait = waits.length ? waits.reduce(function (a, b) { return a + b; }, 0) / waits.length : 0;
    var stats = [
      ['Open tickets', open.length],
      ['Paid today', paid.length],
      ['Takings (orders)', M.money(paid.reduce(function (s, o) { return s + M.orderTotal(o); }, 0), 0)],
      ['Avg. ticket', M.money(paid.length ? paid.reduce(function (s, o) { return s + M.orderTotal(o); }, 0) / paid.length : 0)],
      ['Avg. wait (open)', Math.round(avgWait) + ' min'],
      ['Takeaway / delivery', orders.filter(function (o) { return o.type !== 'dine-in'; }).length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));
  }

  function renderHistory() {
    var q = filter.q.toLowerCase();
    var rows = M.data.orders.filter(function (o) {
      if (filter.status !== 'all' && o.status !== filter.status) return false;
      if (filter.type !== 'all' && o.type !== filter.type) return false;
      if (!q) return true;
      var server = M.staffMember(o.server);
      var hay = [o.id, o.table, o.customer, server && server.name].concat(o.items.map(function (l) { var it = M.menuItem(l.itemId); return it && it.name; })).join(' ').toLowerCase();
      return hay.indexOf(q) > -1;
    }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    $('#history-count').text(rows.length + ' order' + (rows.length === 1 ? '' : 's'));
    $('#history').html(rows.length ? rows.map(function (o) {
      var server = M.staffMember(o.server);
      return '<tr><td><h6>#' + esc(o.id.replace(/^o/, '')) + '</h6><p>' + esc(M.fmtDay(o.createdAt)) + ', ' + M.timeOf(o.createdAt) + '</p></td>' +
        '<td><h6>' + esc(o.table || '—') + '</h6><p>' + esc(o.type) + '</p></td>' +
        '<td>' + esc(server ? server.name : (o.customer || '—')) + '</td>' +
        '<td class="text-wrap" style="max-width:320px">' + esc(o.items.map(function (l) { var it = M.menuItem(l.itemId); return l.qty + '× ' + (it ? it.name : '?'); }).join(', ')) + '</td>' +
        '<td><strong>' + M.money(M.orderTotal(o)) + '</strong></td>' +
        '<td>' + M.badge(LABEL[o.status], TONE[o.status]) + '</td>' +
        '<td class="text-end text-nowrap"><button class="mise-icon-btn" data-edit="' + esc(o.id) + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-delete="' + esc(o.id) + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="7">' + M.empty('No orders match your filters') + '</td></tr>');
  }

  function render() { renderStats(); renderBoard(); renderHistory(); }

  /* ----- order editor ----- */

  function openEditor(order) {
    var d = M.data;
    var isNew = !order;
    var draft = order ? JSON.parse(JSON.stringify(order)) : { id: null, table: '', type: 'dine-in', status: 'new', server: '', customer: '', items: [] };
    var tables = [['', '— none —']].concat(d.tables.map(function (t) { return [t.id, t.id + ' · ' + t.area + ' (' + t.seats + ')']; }));
    var servers = [['', '— none —']].concat(d.staff.filter(function (s) { return s.role === 'Server' || s.role === 'Bartender' || s.role === 'Manager'; }).map(function (s) { return [s.id, s.name]; }));
    var fields = [
      { key: 'type', label: 'Type', type: 'select', col: 4, options: [['dine-in', 'Dine-in'], ['takeaway', 'Takeaway'], ['delivery', 'Delivery']] },
      { key: 'table', label: 'Table', type: 'select', col: 4, options: tables },
      { key: 'server', label: 'Server', type: 'select', col: 4, options: servers },
      { key: 'customer', label: 'Customer name (takeaway / delivery)', col: 8 },
      { key: 'status', label: 'Status', type: 'select', col: 4, options: Object.keys(LABEL).map(function (k) { return [k, LABEL[k]]; }) }
    ];

    function picker() {
      var html = '';
      d.menu.categories.forEach(function (cat) {
        var items = d.menu.items.filter(function (i) { return i.category === cat; });
        if (!items.length) return;
        html += '<div class="cat">' + esc(cat) + '</div>';
        items.forEach(function (it) {
          var line = draft.items.filter(function (l) { return l.itemId === it.id; })[0];
          var qty = line ? line.qty : 0;
          html += '<div class="item' + (it.available ? '' : ' unavailable') + '"><div><div>' + esc(it.name) + (it.available ? '' : ' <span class="text-danger">(86\'d)</span>') + '</div>' +
            '<small class="text-muted">' + M.money(it.price) + '</small>' +
            (qty ? '<input class="form-control form-control-sm mt-1" data-note="' + it.id + '" placeholder="Note (e.g. no onions)" value="' + esc(line.note || '') + '">' : '') + '</div>' +
            '<div class="mise-qty"><button type="button" data-dec="' + it.id + '" aria-label="Remove one">−</button><span>' + qty + '</span><button type="button" data-inc="' + it.id + '" aria-label="Add one"' + (it.available ? '' : ' disabled') + '>+</button></div></div>';
        });
      });
      return html;
    }
    function summary() {
      var total = M.orderTotal(draft), count = M.orderCount(draft);
      return count ? count + ' item' + (count > 1 ? 's' : '') + ' · <strong>' + M.money(total) + '</strong>' : '<span class="text-muted">No items yet</span>';
    }

    M.modal({
      title: isNew ? 'New order' : 'Edit order #' + order.id.replace(/^o/, ''),
      size: 'lg',
      body: M.form(fields, draft) + '<label class="form-label">Items</label><input class="form-control mb-2" placeholder="Filter dishes…" data-filter><div class="mise-line-picker" data-picker>' + picker() + '</div>',
      extra: '<span data-summary>' + summary() + '</span>',
      saveLabel: isNew ? 'Send to kitchen' : 'Save changes',
      onOpen: function ($b, $m) {
        function refresh() {
          var scroll = $b.find('[data-picker]').scrollTop();
          $b.find('[data-picker]').html(picker()).scrollTop(scroll);
          $b.find('[data-filter]').trigger('input');
          $m.find('[data-summary]').html(summary());
        }
        $b.on('click', '[data-inc]', function () {
          var id = $(this).data('inc'), line = draft.items.filter(function (l) { return l.itemId === id; })[0];
          if (line) line.qty += 1; else draft.items.push({ itemId: id, qty: 1, note: '' });
          refresh();
        });
        $b.on('click', '[data-dec]', function () {
          var id = $(this).data('dec'), line = draft.items.filter(function (l) { return l.itemId === id; })[0];
          if (!line) return;
          line.qty -= 1;
          if (line.qty <= 0) draft.items = draft.items.filter(function (l) { return l !== line; });
          refresh();
        });
        $b.on('input', '[data-note]', function () {
          var id = $(this).data('note');
          draft.items.forEach(function (l) { if (l.itemId === id) l.note = $.trim($(this).val()); }, this);
        });
        $b.on('input', '[data-filter]', function () {
          var q = $(this).val().toLowerCase();
          $b.find('[data-picker] .item').each(function () { $(this).toggle(!q || $(this).text().toLowerCase().indexOf(q) > -1); });
          $b.find('[data-picker] .cat').toggle(!q);
        });
      },
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        if (!draft.items.length) { M.toast('Add at least one item', 'danger'); return false; }
        if (v.type === 'dine-in' && !v.table) { $b.find('[name=table]').addClass('is-invalid'); M.toast('Pick a table for dine-in orders', 'danger'); return false; }
        M.update(function (data) {
          var target = isNew ? { id: nextId(data), createdAt: M.nowStamp() } : M.find(data.orders, order.id);
          var wasPaid = target.status === 'paid';
          target.type = v.type; target.table = v.table || null; target.server = v.server || null;
          target.customer = v.customer || null; target.status = v.status; target.items = draft.items;
          if (isNew) data.orders.push(target);
          if (!wasPaid && target.status === 'paid') M.recordPayment(target);
          if (target.table && target.status !== 'paid' && target.status !== 'cancelled') {
            var t = M.find(data.tables, target.table);
            if (t && (t.status === 'free' || t.status === 'seated' || t.status === 'reserved')) { t.status = 'ordered'; t.server = target.server; if (!t.seatedAt) t.seatedAt = M.nowStamp(); if (!t.guests) t.guests = 2; }
          }
        });
        M.toast(isNew ? 'Order sent to the kitchen' : 'Order updated');
      }
    });
  }

  function nextId(data) {
    var max = data.orders.reduce(function (m, o) { var n = parseInt(o.id.replace(/\D/g, ''), 10); return n > m ? n : m; }, 0);
    return 'o' + (max + 1);
  }

  function advance(id) {
    M.update(function (d) {
      var o = M.find(d.orders, id);
      var i = FLOW.indexOf(o.status);
      if (o.status === 'served') {
        o.status = 'paid';
        o.paidAt = M.nowStamp();
        M.recordPayment(o);
        if (o.table) {
          var stillOpen = d.orders.some(function (x) { return x.table === o.table && x.id !== o.id && FLOW.indexOf(x.status) > -1; });
          var t = M.find(d.tables, o.table);
          if (t && !stillOpen) { t.status = 'cleaning'; t.guests = 0; t.server = null; t.seatedAt = null; }
        }
        M.toast('Payment recorded — ' + M.money(M.orderTotal(o)));
      } else {
        o.status = FLOW[i + 1];
        if (o.table) {
          var tb = M.find(d.tables, o.table);
          if (tb && o.status === 'served') tb.status = 'eating';
        }
      }
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    M.onSearch(function (q) { filter.q = q; $('#order-search').val(q); renderHistory(); });

    $('#new-order').on('click', function () { openEditor(null); });
    $(document).on('click', '[data-advance]', function () { advance($(this).data('advance')); });
    $(document).on('click', '[data-edit]', function () { openEditor(M.find(M.data.orders, $(this).data('edit'))); });
    $(document).on('click', '[data-delete]', function () {
      var id = $(this).data('delete');
      M.confirm('Delete order #' + id.replace(/^o/, '') + '? This cannot be undone.', function () {
        M.update(function (d) { d.orders = d.orders.filter(function (o) { return o.id !== id; }); });
        M.toast('Order deleted');
      });
    });
    $('#order-search').on('input', function () { filter.q = $.trim($(this).val()); renderHistory(); });
    $('#status-filter').on('change', function () { filter.status = $(this).val(); renderHistory(); });
    $('#type-filter').on('change', function () { filter.type = $(this).val(); renderHistory(); });

    // Refresh the "minutes waiting" counters once a minute.
    setInterval(function () { renderBoard(); renderStats(); }, 60000);
    if (location.hash === '#new') { history.replaceState(null, '', location.pathname); openEditor(null); }
  });
})(jQuery);
