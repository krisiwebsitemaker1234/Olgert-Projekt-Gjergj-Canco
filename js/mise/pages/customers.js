(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var q = new URLSearchParams(location.search).get('q') || '';
  var sort = 'spent';

  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += '<i class="mdi mdi-star' + (i <= n ? '' : ' off') + '"></i>';
    return '<span class="mise-stars">' + out + '</span>';
  }

  function render() {
    var d = M.data;
    var regulars = d.customers.filter(function (c) { return c.visits >= 5; });
    var avgRating = d.reviews.length ? d.reviews.reduce(function (s, r) { return s + r.rating; }, 0) / d.reviews.length : 0;
    var spend = d.customers.reduce(function (s, c) { return s + c.totalSpent; }, 0);
    var stats = [
      ['Guests', d.customers.length],
      ['Regulars (5+ visits)', regulars.length],
      ['Avg. spend / guest', M.money(d.customers.length ? spend / d.customers.length : 0, 0)],
      ['Avg. rating', M.num(avgRating, 1) + ' ★'],
      ['Reviews', d.reviews.length],
      ['Featured on website', d.reviews.filter(function (r) { return r.featured; }).length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));

    var ql = q.toLowerCase();
    var rows = d.customers.filter(function (c) {
      return !ql || [c.name, c.email, c.phone, (c.tags || []).join(' '), c.notes].join(' ').toLowerCase().indexOf(ql) > -1;
    }).sort(function (a, b) {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'recent') return a.lastVisit < b.lastVisit ? 1 : -1;
      if (sort === 'visits') return b.visits - a.visits;
      return b.totalSpent - a.totalSpent;
    });
    $('#count').text(rows.length + ' guest' + (rows.length === 1 ? '' : 's') + (q ? ' matching "' + q + '"' : ''));
    $('#customers').html(rows.length ? rows.map(function (c) {
      return '<tr><td><div class="d-flex align-items-center">' + M.avatar(c) + '<div><h6>' + esc(c.name) + '</h6><p>' + esc(c.email) + '</p></div></div></td>' +
        '<td>' + esc(c.phone) + '</td><td>' + c.visits + '</td><td>' + M.money(c.totalSpent, 0) + '</td><td>' + esc(M.fmtDay(c.lastVisit)) + '</td>' +
        '<td>' + (c.tags || []).map(function (t) { return '<span class="mise-chip me-1">' + esc(t) + '</span>'; }).join('') + '</td>' +
        '<td class="text-end text-nowrap"><button class="mise-icon-btn" data-edit="' + c.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
        '<button class="mise-icon-btn danger" data-del="' + c.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="7">' + M.empty('No guests match') + '</td></tr>');

    $('#reviews').html(d.reviews.length ? d.reviews.map(function (r) {
      return '<div class="mise-list-row"><div class="grow"><div class="d-flex justify-content-between flex-wrap gap-1"><h6>' + esc(r.name) + '</h6>' + stars(r.rating) + '</div>' +
        '<p class="mb-1">"' + esc(r.text) + '"</p><p class="small">' + esc(r.source) + ' · ' + esc(M.fmtDay(r.date)) + '</p>' +
        '<div class="form-check form-switch mise-switch mt-1"><input class="form-check-input" type="checkbox" id="feat-' + r.id + '" data-feature="' + r.id + '"' + (r.featured ? ' checked' : '') + '>' +
        '<label class="form-check-label small" for="feat-' + r.id + '">Show on website</label></div></div>' +
        '<button class="mise-icon-btn danger" data-del-review="' + r.id + '" aria-label="Delete review"><i class="mdi mdi-delete-outline"></i></button></div>';
    }).join('') : M.empty('No reviews yet', 'mdi-star-outline'));

    // rating distribution
    var dist = [5, 4, 3, 2, 1].map(function (n) { return d.reviews.filter(function (r) { return r.rating === n; }).length; });
    var max = Math.max.apply(null, dist.concat([1]));
    $('#rating-dist').html([5, 4, 3, 2, 1].map(function (n, i) {
      return '<div class="d-flex align-items-center gap-2 mb-1"><span style="width:28px" class="small">' + n + ' ★</span><div class="progress progress-md flex-grow-1"><div class="progress-bar bg-warning" style="width:' + Math.round(dist[i] / max * 100) + '%"></div></div><span class="small text-muted" style="width:20px">' + dist[i] + '</span></div>';
    }).join(''));
  }

  function edit(c) {
    var fields = [
      { key: 'name', label: 'Name', required: true, col: 6 }, { key: 'email', label: 'Email', type: 'email', col: 6 },
      { key: 'phone', label: 'Phone', col: 6 }, { key: 'tags', label: 'Tags (comma separated)', col: 6, placeholder: 'regular, vip, allergy: nuts' },
      { key: 'visits', label: 'Visits', type: 'number', min: 0, col: 6 }, { key: 'totalSpent', label: 'Total spent', type: 'number', step: '0.01', min: 0, col: 6 },
      { key: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Preferences, allergies, birthdays…' }
    ];
    var history = c ? M.data.reservations.filter(function (r) { return r.customerId === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5) : [];
    var hist = history.length ? '<label class="form-label">Recent bookings</label><ul class="small text-muted ps-3 mb-0">' + history.map(function (r) {
      return '<li>' + esc(M.fmtDay(r.date)) + ' ' + esc(r.time) + ' · ' + r.partySize + ' guests · ' + esc(r.status) + '</li>';
    }).join('') + '</ul>' : '';
    M.modal({
      title: c ? c.name : 'Add guest', body: M.form(fields, c ? $.extend({}, c, { tags: (c.tags || []).join(', ') }) : { visits: 0, totalSpent: 0 }) + hist,
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        v.tags = v.tags ? v.tags.split(',').map(function (t) { return $.trim(t); }).filter(Boolean) : [];
        v.visits = v.visits || 0; v.totalSpent = v.totalSpent || 0;
        M.update(function (d) {
          if (c) $.extend(M.find(d.customers, c.id), v);
          else d.customers.push($.extend({ id: M.uid('c'), lastVisit: M.today() }, v));
        });
        M.toast(c ? 'Guest updated' : 'Guest added');
      }
    });
  }

  function addReview() {
    var fields = [
      { key: 'name', label: 'Guest name', required: true, col: 8 },
      { key: 'rating', label: 'Rating', type: 'select', col: 4, options: [[5, '★★★★★'], [4, '★★★★'], [3, '★★★'], [2, '★★'], [1, '★']] },
      { key: 'text', label: 'Review', type: 'textarea', required: true },
      { key: 'source', label: 'Source', type: 'select', col: 6, options: ['Google', 'TripAdvisor', 'Website', 'Instagram', 'In person'] },
      { key: 'date', label: 'Date', type: 'date', col: 6, default: M.today() }
    ];
    M.modal({
      title: 'Add a review', body: M.form(fields),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          var c = d.customers.filter(function (x) { return x.name.toLowerCase() === v.name.toLowerCase(); })[0];
          d.reviews.unshift($.extend({ id: M.uid('rv'), customerId: c ? c.id : null, featured: false }, v, { rating: +v.rating }));
        });
      }
    });
  }

  M.ready(function () {
    $('#customer-search').val(q);
    render();
    $(document).on('mise:data', render);
    if (q) M.flash($('#customers tr').first()[0]);
    $('#customer-search').on('input', function () { q = $.trim($(this).val()); render(); });
    $('#sort').on('change', function () { sort = $(this).val(); render(); });
    $('#add-customer').on('click', function () { edit(null); });
    $('#add-review').on('click', addReview);
    $(document).on('click', '[data-edit]', function () { edit(M.find(M.data.customers, $(this).data('edit'))); });
    $(document).on('click', '[data-del]', function () {
      var c = M.find(M.data.customers, $(this).data('del'));
      M.confirm('Delete ' + c.name + '?', function () { M.update(function (d) { d.customers = d.customers.filter(function (x) { return x.id !== c.id; }); }); });
    });
    $(document).on('change', '[data-feature]', function () {
      var id = $(this).data('feature'), on = this.checked;
      M.update(function (d) { M.find(d.reviews, id).featured = on; d.website.status.updatedAt = M.nowStamp(); });
      M.toast(on ? 'Review will appear on the website' : 'Removed from the website', 'info');
    });
    $(document).on('click', '[data-del-review]', function () {
      var id = $(this).data('del-review');
      M.confirm('Delete this review?', function () { M.update(function (d) { d.reviews = d.reviews.filter(function (r) { return r.id !== id; }); }); });
    });
  });
})(jQuery);
