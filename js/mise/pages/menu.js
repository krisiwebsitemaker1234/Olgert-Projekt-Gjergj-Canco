(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var filter = { cat: 'all', q: '' };
  var TAGS = { v: 'Vegetarian', vg: 'Vegan', gf: 'Gluten-free', df: 'Dairy-free', spicy: 'Spicy', new: 'New' };

  function costPct(it) { return it.price ? it.cost / it.price * 100 : 0; }
  function costClass(pct) {
    var target = M.data.restaurant.targetFoodCostPct || 30;
    return pct <= target ? 'mise-margin-good' : pct <= target + 5 ? 'mise-margin-warn' : 'mise-margin-bad';
  }

  function render() {
    var d = M.data, items = d.menu.items;
    var avail = items.filter(function (i) { return i.available; });
    var avgCost = items.length ? items.reduce(function (s, i) { return s + costPct(i); }, 0) / items.length : 0;
    var stats = [
      ['Dishes', items.length],
      ['Available', avail.length],
      ['86\'d', items.length - avail.length],
      ['Avg. food cost', M.pct(avgCost)],
      ['Avg. price', M.money(items.length ? items.reduce(function (s, i) { return s + i.price; }, 0) / items.length : 0)],
      ['On website', items.filter(function (i) { return i.onWebsite; }).length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    $('#cat-tabs').html(['all'].concat(d.menu.categories).map(function (c, i, arr) {
      var n = c === 'all' ? items.length : items.filter(function (it) { return it.category === c; }).length;
      return '<li class="nav-item"><a class="nav-link' + (filter.cat === c ? ' active' : '') + (i === 0 ? ' ps-0' : '') + (i === arr.length - 1 ? ' border-0' : '') + '" href="#" data-cat="' + esc(c) + '">' + esc(c === 'all' ? 'All' : c) + ' <span class="text-muted">' + n + '</span></a></li>';
    }).join(''));

    var q = filter.q.toLowerCase();
    var rows = items.filter(function (it) {
      return (filter.cat === 'all' || it.category === filter.cat) && (!q || (it.name + ' ' + it.description + ' ' + it.category).toLowerCase().indexOf(q) > -1);
    });
    $('#dishes').html(rows.length ? rows.map(function (it) {
      var pct = costPct(it);
      return '<tr' + (it.available ? '' : ' class="opacity-75"') + '><td style="min-width:240px"><h6>' + esc(it.name) + (it.available ? '' : ' <span class="badge badge-opacity-danger ms-1">86\'d</span>') + '</h6>' +
        '<p class="text-wrap">' + esc(it.description || '') + '</p>' +
        ((it.tags || []).length ? '<div class="mise-dish-tags mt-1">' + it.tags.map(function (t) { return '<span class="mise-chip">' + esc(TAGS[t] || t) + '</span>'; }).join('') + '</div>' : '') + '</td>' +
        '<td>' + esc(it.category) + '</td>' +
        '<td><strong>' + M.money(it.price) + '</strong><p>cost ' + M.money(it.cost) + '</p></td>' +
        '<td><strong class="' + costClass(pct) + '">' + M.pct(pct) + '</strong><p>margin ' + M.money(it.price - it.cost) + '</p></td>' +
        '<td>' + M.num(it.soldLast30 || 0) + '</td>' +
        '<td><div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" data-toggle-avail="' + esc(it.id) + '"' + (it.available ? ' checked' : '') + ' aria-label="Available"></div></td>' +
        '<td><div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" data-toggle-web="' + esc(it.id) + '"' + (it.onWebsite ? ' checked' : '') + ' aria-label="Show on website"></div></td>' +
        '<td class="text-end text-nowrap"><button class="mise-icon-btn" data-edit="' + esc(it.id) + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-delete="' + esc(it.id) + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="8">' + M.empty('No dishes match') + '</td></tr>');

    var best = items.slice().sort(function (a, b) { return (b.soldLast30 || 0) - (a.soldLast30 || 0); }).slice(0, 6);
    var maxSold = best.length ? best[0].soldLast30 : 1;
    $('#best').html(best.map(function (it) {
      return '<div class="mb-3"><div class="d-flex justify-content-between mb-1"><span class="fw-bold" style="font-size:.8125rem">' + esc(it.name) + '</span><span class="mise-progress-label">' + M.num(it.soldLast30) + ' sold</span></div>' +
        '<div class="progress progress-md"><div class="progress-bar bg-primary" style="width:' + Math.round(it.soldLast30 / maxSold * 100) + '%"></div></div></div>';
    }).join(''));

    var target = d.restaurant.targetFoodCostPct || 30;
    var heavy = items.filter(function (it) { return costPct(it) > target; }).sort(function (a, b) { return costPct(b) - costPct(a); });
    $('#attention-sub').text('Food cost above your ' + target + '% target');
    $('#attention').html(heavy.length ? heavy.map(function (it) {
      var suggested = Math.ceil(it.cost / (target / 100));
      return '<div class="mise-list-row"><div class="grow"><h6>' + esc(it.name) + '</h6><p>' + M.pct(costPct(it)) + ' food cost · price ' + M.money(it.price) + '</p></div>' +
        '<span class="mise-chip" title="Price that would hit your target">→ ' + M.money(suggested, 0) + '</span></div>';
    }).join('') : M.empty('Every dish is within target', 'mdi-check-circle-outline'));
  }

  function edit(it) {
    var d = M.data;
    var fields = [
      { key: 'name', label: 'Dish name', required: true, col: 8 },
      { key: 'category', label: 'Category', type: 'select', col: 4, options: d.menu.categories },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2, help: 'Shown on the menu and the website' },
      { key: 'price', label: 'Price', type: 'number', step: '0.01', min: 0, col: 4, required: true },
      { key: 'cost', label: 'Plate cost', type: 'number', step: '0.01', min: 0, col: 4, help: 'Ingredients per portion' },
      { key: 'soldLast30', label: 'Sold (30 days)', type: 'number', min: 0, col: 4 },
      { key: 'tags', label: 'Dietary tags (comma separated)', col: 12, help: 'Use: v, vg, gf, df, spicy, new' },
      { key: 'available', label: 'Available today', type: 'checkbox', col: 6 },
      { key: 'onWebsite', label: 'Show on website', type: 'checkbox', col: 6 }
    ];
    var values = it ? $.extend({}, it, { tags: (it.tags || []).join(', ') }) : { category: filter.cat !== 'all' ? filter.cat : d.menu.categories[0], available: true, onWebsite: true, cost: 0, soldLast30: 0 };
    M.modal({
      title: it ? 'Edit ' + it.name : 'Add a dish',
      body: M.form(fields, values) + '<p class="small text-muted mb-0" data-costline></p>',
      onOpen: function ($b) {
        function line() {
          var p = +$b.find('[name=price]').val(), c = +$b.find('[name=cost]').val();
          $b.find('[data-costline]').html(p ? 'Food cost <strong class="' + costClass(c / p * 100) + '">' + M.pct(c / p * 100) + '</strong> · margin ' + M.money(p - c) : '');
        }
        $b.on('input', '[name=price],[name=cost]', line); line();
      },
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        v.tags = v.tags ? v.tags.split(',').map(function (t) { return $.trim(t).toLowerCase(); }).filter(Boolean) : [];
        v.cost = v.cost || 0; v.soldLast30 = v.soldLast30 || 0;
        M.update(function (data) {
          if (it) $.extend(M.find(data.menu.items, it.id), v);
          else data.menu.items.push($.extend({ id: M.uid('m') }, v));
        });
        M.toast(it ? 'Dish updated' : 'Dish added');
      }
    });
  }

  function manageCategories() {
    var cats = M.data.menu.categories.slice();
    function body() {
      return '<p class="text-muted small">Rename, reorder or add categories. Dishes move with a renamed category.</p>' + cats.map(function (c, i) {
        return '<div class="d-flex gap-2 mb-2"><input class="form-control" data-cat-idx="' + i + '" value="' + esc(c) + '">' +
          '<button type="button" class="mise-icon-btn" data-up="' + i + '" aria-label="Move up"><i class="mdi mdi-arrow-up"></i></button>' +
          '<button type="button" class="mise-icon-btn danger" data-rm="' + i + '" aria-label="Remove"><i class="mdi mdi-delete-outline"></i></button></div>';
      }).join('') + '<button type="button" class="btn btn-sm btn-outline-secondary mt-2" data-add-cat><i class="mdi mdi-plus"></i> Add category</button>';
    }
    var original = cats.slice();
    M.modal({
      title: 'Menu categories', body: body(),
      onOpen: function ($b) {
        function sync() { $b.find('[data-cat-idx]').each(function () { cats[+$(this).data('cat-idx')] = $.trim($(this).val()); }); }
        $b.on('click', '[data-add-cat]', function () { sync(); cats.push('New category'); original.push(null); $b.html(body()); });
        $b.on('click', '[data-up]', function () {
          sync(); var i = +$(this).data('up'); if (!i) return;
          cats.splice(i - 1, 0, cats.splice(i, 1)[0]); original.splice(i - 1, 0, original.splice(i, 1)[0]); $b.html(body());
        });
        $b.on('click', '[data-rm]', function () {
          sync(); var i = +$(this).data('rm');
          var used = M.data.menu.items.some(function (it) { return it.category === original[i]; });
          if (used) { M.toast('Move the dishes out of "' + original[i] + '" first', 'danger'); return; }
          cats.splice(i, 1); original.splice(i, 1); $b.html(body());
        });
      },
      onSave: function ($b) {
        $b.find('[data-cat-idx]').each(function () { cats[+$(this).data('cat-idx')] = $.trim($(this).val()); });
        if (cats.some(function (c) { return !c; })) { M.toast('Category names cannot be empty', 'danger'); return false; }
        M.update(function (d) {
          original.forEach(function (old, i) {
            if (old && old !== cats[i]) d.menu.items.forEach(function (it) { if (it.category === old) it.category = cats[i]; });
          });
          d.menu.categories = cats;
        });
        if (filter.cat !== 'all' && cats.indexOf(filter.cat) === -1) filter.cat = 'all';
        M.toast('Categories saved');
      }
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    if (M.param('q')) {
      filter.q = M.param('q'); $('#dish-search').val(filter.q); render();
      M.flash($('#dishes tr').first()[0]);
    }
    $('#dish-search').on('input', function () { filter.q = $.trim($(this).val()); render(); });
    $(document).on('click', '[data-cat]', function (e) { e.preventDefault(); filter.cat = $(this).data('cat'); render(); });
    $('#add-dish').on('click', function () { edit(null); });
    $('#manage-cats').on('click', manageCategories);
    $(document).on('click', '[data-edit]', function () { edit(M.find(M.data.menu.items, $(this).data('edit'))); });
    $(document).on('change', '[data-toggle-avail]', function () {
      var id = $(this).data('toggle-avail'), on = this.checked;
      M.update(function (d) { M.find(d.menu.items, id).available = on; });
      M.toast(on ? 'Back on the menu' : 'Marked as 86\'d', on ? 'success' : 'info');
    });
    $(document).on('change', '[data-toggle-web]', function () {
      var id = $(this).data('toggle-web'), on = this.checked;
      M.update(function (d) { M.find(d.menu.items, id).onWebsite = on; d.website.status.updatedAt = M.nowStamp(); });
    });
    $(document).on('click', '[data-delete]', function () {
      var it = M.find(M.data.menu.items, $(this).data('delete'));
      M.confirm('Delete "' + it.name + '" from the menu?', function () {
        M.update(function (d) { d.menu.items = d.menu.items.filter(function (x) { return x.id !== it.id; }); });
        M.toast('Dish deleted');
      });
    });
    if (location.hash === '#new') { history.replaceState(null, '', location.pathname); edit(null); }
  });
})(jQuery);
