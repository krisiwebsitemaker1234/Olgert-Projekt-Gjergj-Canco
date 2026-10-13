(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var tab = 'stock';
  var filter = { q: '', cat: 'all', low: false };
  var PO_STATUS = { draft: ['Draft', 'secondary'], sent: ['Sent', 'info'], received: ['Received', 'success'], cancelled: ['Cancelled', 'danger'] };

  function level(i) { return i.par ? i.stock / i.par : 1; }
  function tone(i) { var l = level(i); return l === 0 ? 'danger' : l < 0.5 ? 'warning' : 'success'; }

  function render() {
    var d = M.data;
    var low = d.inventory.filter(function (i) { return level(i) < 0.5; });
    var value = d.inventory.reduce(function (s, i) { return s + i.stock * i.costPerUnit; }, 0);
    var stats = [
      ['Stock items', d.inventory.length],
      ['Below half par', low.length],
      ['Out of stock', d.inventory.filter(function (i) { return i.stock === 0; }).length],
      ['Stock value', M.money(value, 0)],
      ['Open orders', d.purchaseOrders.filter(function (p) { return p.status === 'sent' || p.status === 'draft'; }).length],
      ['Suppliers', d.suppliers.length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    $('[data-tab]').removeClass('active').filter('[data-tab="' + tab + '"]').addClass('active');
    $('.mise-pane').addClass('d-none').filter('#pane-' + tab).removeClass('d-none');

    var cats = [];
    d.inventory.forEach(function (i) { if (cats.indexOf(i.category) === -1) cats.push(i.category); });
    $('#cat-filter').html('<option value="all">All categories</option>' + cats.map(function (c) { return '<option' + (filter.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join(''));

    renderStock(); renderOrders(); renderSuppliers();
  }

  function renderStock() {
    var q = filter.q.toLowerCase();
    var rows = M.data.inventory.filter(function (i) {
      return (filter.cat === 'all' || i.category === filter.cat) && (!filter.low || level(i) < 0.5) && (!q || (i.name + ' ' + i.category).toLowerCase().indexOf(q) > -1);
    }).sort(function (a, b) { return level(a) - level(b); });
    $('#stock').html(rows.length ? rows.map(function (i) {
      var sup = M.supplier(i.supplierId), t = tone(i);
      var pct = Math.min(100, Math.round(level(i) * 100));
      return '<tr><td><h6>' + esc(i.name) + '</h6><p>' + esc(i.category) + '</p></td>' +
        '<td style="min-width:170px"><div class="d-flex justify-content-between mb-1"><strong class="text-' + (t === 'success' ? 'body' : t) + '">' + M.num(i.stock, 1) + ' ' + esc(i.unit) + '</strong><span class="mise-progress-label">par ' + M.num(i.par, 1) + '</span></div>' +
        '<div class="mise-stockbar"><div class="bg-' + t + '" style="width:' + pct + '%"></div></div></td>' +
        '<td>' + M.money(i.costPerUnit) + '<p>per ' + esc(i.unit) + '</p></td>' +
        '<td>' + M.money(i.stock * i.costPerUnit) + '</td>' +
        '<td>' + esc(sup ? sup.name : '—') + '</td>' +
        '<td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-secondary me-1" data-count="' + esc(i.id) + '">Count</button>' +
        '<button class="mise-icon-btn" data-edit-item="' + esc(i.id) + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-del-item="' + esc(i.id) + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="6">' + M.empty('No stock items match') + '</td></tr>');
  }

  function poTotal(po) {
    return po.items.reduce(function (s, l) { var i = M.find(M.data.inventory, l.inventoryId); return s + (i ? i.costPerUnit * l.qty : 0); }, 0);
  }

  function renderOrders() {
    var list = M.data.purchaseOrders.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $('#orders').html(list.length ? list.map(function (po) {
      var sup = M.supplier(po.supplierId), st = PO_STATUS[po.status];
      var lines = po.items.map(function (l) { var i = M.find(M.data.inventory, l.inventoryId); return i ? M.num(l.qty, 1) + ' ' + i.unit + ' ' + i.name : ''; }).join(', ');
      var actions = po.status === 'draft' ? '<button class="btn btn-sm btn-primary text-white" data-po-send="' + po.id + '">Send</button>'
        : po.status === 'sent' ? '<button class="btn btn-sm btn-primary text-white" data-po-receive="' + po.id + '">Receive</button>' : '';
      return '<tr><td><h6>' + esc(po.id.toUpperCase()) + '</h6><p>' + esc(M.fmtDate(po.date)) + '</p></td>' +
        '<td>' + esc(sup ? sup.name : '—') + '</td><td class="text-wrap" style="max-width:340px">' + esc(lines) + '</td>' +
        '<td>' + M.money(poTotal(po)) + '</td><td>' + (po.expected ? esc(M.fmtDay(po.expected)) : '—') + '</td>' +
        '<td>' + M.badge(st[0], st[1]) + '</td>' +
        '<td class="text-end text-nowrap">' + actions + (po.status !== 'received' ? '<button class="mise-icon-btn danger ms-1" data-po-del="' + po.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="7">' + M.empty('No purchase orders yet') + '</td></tr>');
  }

  function renderSuppliers() {
    $('#suppliers').html(M.data.suppliers.map(function (s) {
      var items = M.data.inventory.filter(function (i) { return i.supplierId === s.id; }).length;
      return '<tr><td><h6>' + esc(s.name) + '</h6><p>' + esc(s.category) + ' · ' + items + ' items</p></td>' +
        '<td>' + esc(s.contact) + '<p>' + esc(s.email) + '</p></td><td>' + esc(s.phone) + '</td><td>' + esc(s.deliveryDays) + '</td>' +
        '<td class="text-end text-nowrap"><button class="mise-icon-btn" data-edit-sup="' + s.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-del-sup="' + s.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join('') || '<tr><td colspan="5">' + M.empty('No suppliers yet') + '</td></tr>');
  }

  function editItem(item) {
    var fields = [
      { key: 'name', label: 'Name', required: true, col: 8 },
      { key: 'category', label: 'Category', col: 4, required: true },
      { key: 'stock', label: 'In stock', type: 'number', step: 'any', min: 0, col: 4, required: true },
      { key: 'par', label: 'Par level', type: 'number', step: 'any', min: 0, col: 4, required: true, help: 'What you want on hand' },
      { key: 'unit', label: 'Unit', col: 4, required: true, placeholder: 'kg, L, pc…' },
      { key: 'costPerUnit', label: 'Cost per unit', type: 'number', step: '0.01', min: 0, col: 6 },
      { key: 'supplierId', label: 'Supplier', type: 'select', col: 6, options: [['', '—']].concat(M.data.suppliers.map(function (s) { return [s.id, s.name]; })) }
    ];
    M.modal({
      title: item ? 'Edit ' + item.name : 'Add stock item', body: M.form(fields, item || { stock: 0, unit: 'kg', category: filter.cat !== 'all' ? filter.cat : '' }),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        v.costPerUnit = v.costPerUnit || 0;
        M.update(function (d) { if (item) $.extend(M.find(d.inventory, item.id), v); else d.inventory.push($.extend({ id: M.uid('i') }, v)); });
        M.toast(item ? 'Item updated' : 'Item added');
      }
    });
  }

  function count(item) {
    var fields = [{ key: 'stock', label: 'Counted quantity (' + item.unit + ')', type: 'number', step: 'any', min: 0, required: true, help: 'Currently recorded: ' + M.num(item.stock, 1) + ' ' + item.unit }];
    M.modal({
      title: 'Count ' + item.name, body: M.form(fields, { stock: item.stock }), saveLabel: 'Update stock', size: 'sm',
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) { M.find(d.inventory, item.id).stock = v.stock; });
        M.toast('Stock updated');
      }
    });
  }

  function reorderLow() {
    var d = M.data;
    var low = d.inventory.filter(function (i) { return level(i) < 0.5 && i.supplierId; });
    var already = {};
    d.purchaseOrders.filter(function (p) { return p.status === 'draft' || p.status === 'sent'; })
      .forEach(function (p) { p.items.forEach(function (l) { already[l.inventoryId] = true; }); });
    low = low.filter(function (i) { return !already[i.id]; });
    if (!low.length) { M.toast('Everything low is already on order', 'info'); return; }
    var bySup = {};
    low.forEach(function (i) { (bySup[i.supplierId] = bySup[i.supplierId] || []).push({ inventoryId: i.id, qty: Math.ceil(i.par - i.stock) }); });
    M.update(function (data) {
      var n = data.purchaseOrders.reduce(function (m, p) { var x = parseInt(p.id.replace(/\D/g, ''), 10); return x > m ? x : m; }, 100);
      Object.keys(bySup).forEach(function (sid) {
        n += 1;
        data.purchaseOrders.push({ id: 'po' + n, supplierId: sid, date: M.today(), status: 'draft', items: bySup[sid], expected: M.addDays(M.today(), 2) });
      });
    });
    tab = 'orders'; render();
    M.toast(Object.keys(bySup).length + ' draft purchase order' + (Object.keys(bySup).length > 1 ? 's' : '') + ' created');
  }

  function editSupplier(s) {
    var fields = [
      { key: 'name', label: 'Company', required: true, col: 8 }, { key: 'category', label: 'Supplies', col: 4 },
      { key: 'contact', label: 'Contact person', col: 6 }, { key: 'phone', label: 'Phone', col: 6 },
      { key: 'email', label: 'Email', type: 'email', col: 6 }, { key: 'deliveryDays', label: 'Delivery days', col: 6, placeholder: 'Mon, Thu' }
    ];
    M.modal({
      title: s ? 'Edit ' + s.name : 'Add supplier', body: M.form(fields, s),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) { if (s) $.extend(M.find(d.suppliers, s.id), v); else d.suppliers.push($.extend({ id: M.uid('sp') }, v)); });
        M.toast(s ? 'Supplier updated' : 'Supplier added');
      }
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    M.onSearch(function (q) { filter.q = q; tab = 'stock'; $('#stock-search').val(q); render(); });
    $(document).on('click', '[data-tab]', function (e) { e.preventDefault(); tab = $(this).data('tab'); render(); });
    $('#stock-search').on('input', function () { filter.q = $.trim($(this).val()); renderStock(); });
    $(document).on('change', '#cat-filter', function () { filter.cat = $(this).val(); renderStock(); });
    $('#low-only').on('change', function () { filter.low = this.checked; renderStock(); });
    $('#add-item').on('click', function () { editItem(null); });
    $('#reorder').on('click', reorderLow);
    $('#add-supplier').on('click', function () { editSupplier(null); });
    $(document).on('click', '[data-count]', function () { count(M.find(M.data.inventory, $(this).data('count'))); });
    $(document).on('click', '[data-edit-item]', function () { editItem(M.find(M.data.inventory, $(this).data('edit-item'))); });
    $(document).on('click', '[data-del-item]', function () {
      var it = M.find(M.data.inventory, $(this).data('del-item'));
      M.confirm('Delete ' + it.name + ' from inventory?', function () { M.update(function (d) { d.inventory = d.inventory.filter(function (x) { return x.id !== it.id; }); }); });
    });
    $(document).on('click', '[data-po-send]', function () {
      var id = $(this).data('po-send');
      M.update(function (d) { M.find(d.purchaseOrders, id).status = 'sent'; });
      M.toast('Marked as sent to supplier');
    });
    $(document).on('click', '[data-po-receive]', function () {
      var id = $(this).data('po-receive');
      M.update(function (d) {
        var po = M.find(d.purchaseOrders, id);
        po.status = 'received';
        po.items.forEach(function (l) { var i = M.find(d.inventory, l.inventoryId); if (i) i.stock = Math.round((i.stock + l.qty) * 100) / 100; });
      });
      M.toast('Delivery received — stock updated');
    });
    $(document).on('click', '[data-po-del]', function () {
      var id = $(this).data('po-del');
      M.confirm('Delete purchase order ' + id.toUpperCase() + '?', function () { M.update(function (d) { d.purchaseOrders = d.purchaseOrders.filter(function (p) { return p.id !== id; }); }); });
    });
    $(document).on('click', '[data-edit-sup]', function () { editSupplier(M.find(M.data.suppliers, $(this).data('edit-sup'))); });
    $(document).on('click', '[data-del-sup]', function () {
      var s = M.find(M.data.suppliers, $(this).data('del-sup'));
      M.confirm('Delete supplier ' + s.name + '?', function () {
        M.update(function (d) {
          d.suppliers = d.suppliers.filter(function (x) { return x.id !== s.id; });
          d.inventory.forEach(function (i) { if (i.supplierId === s.id) i.supplierId = ''; });
        });
      });
    });
  });
})(jQuery);
