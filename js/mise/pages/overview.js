(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var period = 'today';
  var range = 14;
  var circles = {};

  var STATUS_TONE = { new: 'info', preparing: 'warning', ready: 'success', served: 'primary' };
  var STATUS_PROGRESS = { new: 15, preparing: 50, ready: 85, served: 100 };

  function periodStats() {
    var d = M.data;
    if (period === 'today') {
      var today = M.sumRows(M.salesWindow(1, 0));
      var lastWeek = M.sumRows(M.salesWindow(1, 7));
      // Compare against last week *up to the same hour*, so a half-finished day isn't measured against a full one.
      var lastHour = 0;
      d.sales.hourlyToday.forEach(function (h) { if (h.revenue > 0) lastHour = h.hour; });
      var lwTotal = 0, lwSoFar = 0;
      d.sales.hourlyLastWeek.forEach(function (h) { lwTotal += h.revenue; if (h.hour <= lastHour) lwSoFar += h.revenue; });
      var share = lwTotal ? lwSoFar / lwTotal : 1;
      ['revenue', 'covers', 'orders', 'foodCost', 'laborCost'].forEach(function (k) { lastWeek[k] *= share; });
      lastWeek.avgCheck = lastWeek.covers ? lastWeek.revenue / lastWeek.covers : 0;
      return { now: today, before: lastWeek, label: 'vs last week' };
    }
    var days = period === 'week' ? 7 : 30;
    return { now: M.sumRows(M.salesWindow(days, 0)), before: M.sumRows(M.salesWindow(days, days)), label: 'vs previous ' + days + ' days' };
  }

  function renderKpis() {
    var s = periodStats(), n = s.now, b = s.before, d = M.data;
    var turnover = d.restaurant.capacity ? n.covers / d.restaurant.capacity / Math.max(1, n.days) : 0;
    var kpis = [
      ['Revenue', M.money(n.revenue, 0), M.change(n.revenue, b.revenue)],
      ['Covers', M.num(n.covers), M.change(n.covers, b.covers)],
      ['Avg. check', M.money(n.avgCheck), M.change(n.avgCheck, b.avgCheck)],
      ['Orders', M.num(n.orders), M.change(n.orders, b.orders)],
      ['Food cost', M.pct(n.foodPct), M.change(n.foodPct, b.foodPct, true)],
      ['Seat turns', M.num(turnover, 2) + '×', '<p class="text-muted d-flex"><span>per seat / day</span></p>']
    ];
    $('#kpis').html(kpis.map(function (k, i) {
      return '<div class="' + (i > 2 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + k[0] + '</p><h3 class="rate-percentage">' + k[1] + '</h3>' + k[2] + '</div>';
    }).join(''));
  }

  function renderTrend() {
    var p = M.palette(), d = M.data;
    var ctx = document.getElementById('performaneLine').getContext('2d');
    var g1 = ctx.createLinearGradient(5, 0, 5, 100);
    g1.addColorStop(0, 'rgba(' + p.primaryRgb + ', 0.18)');
    g1.addColorStop(1, 'rgba(' + p.primaryRgb + ', 0.02)');
    var labels, now, before, nowLabel, beforeLabel;
    if (period === 'today') {
      labels = d.sales.hourlyToday.map(function (h) { return h.hour + ':00'; });
      var currentHour = new Date().getHours();
      now = d.sales.hourlyToday.map(function (h) { return h.hour <= currentHour || h.revenue ? h.revenue : null; });
      before = d.sales.hourlyLastWeek.map(function (h) { return h.revenue; });
      nowLabel = 'Today'; beforeLabel = 'Same day last week';
      $('#trend-title').text('Sales by hour');
      $('#trend-sub').text('Today compared with the same day last week');
    } else {
      var days = period === 'week' ? 7 : 30;
      var cur = M.salesWindow(days, 0), prev = M.salesWindow(days, days);
      labels = cur.map(function (r) { return M.fmtDate(r.date, days === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }); });
      now = cur.map(function (r) { return r.revenue; });
      before = prev.map(function (r) { return r.revenue; });
      nowLabel = days === 7 ? 'This week' : 'Last 30 days';
      beforeLabel = days === 7 ? 'Week before' : 'Previous 30 days';
      $('#trend-title').text('Sales by day');
      $('#trend-sub').text('Revenue each day compared with the period before');
    }
    var chart = M.chart('performaneLine', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: nowLabel, data: now, backgroundColor: g1, borderColor: p.primary, borderWidth: 1.5, fill: true, pointBorderWidth: 1, pointRadius: 4, pointHoverRadius: 5, pointBackgroundColor: p.primary, pointBorderColor: p.surface, spanGaps: false, cubicInterpolationMode: 'monotone' },
          { label: beforeLabel, data: before, backgroundColor: 'rgba(0,0,0,0)', borderColor: p.accent, borderWidth: 1.5, borderDash: [4, 4], fill: false, pointRadius: 0, pointHoverRadius: 3, cubicInterpolationMode: 'monotone' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, legend: false,
        scales: M.axes({ yFormat: function (v) { return M.money(v, 0); }, maxX: 12 }),
        elements: { line: { tension: 0.4 } },
        tooltips: { mode: 'index', intersect: false, callbacks: { label: function (t, data) { return data.datasets[t.datasetIndex].label + ': ' + M.money(t.yLabel, 0); } } }
      }
    });
    if (chart) $('#performance-line-legend').html(M.legend([{ color: p.primary, label: nowLabel }, { color: p.accent, label: beforeLabel }]));
  }

  function renderFloor() {
    var d = M.data, p = M.palette();
    var busy = d.tables.filter(function (t) { return ['seated', 'ordered', 'eating', 'bill'].indexOf(t.status) > -1; });
    $('#tables-in-use').text(busy.length + '/' + d.tables.length);
    var guests = busy.reduce(function (s, t) { return s + (t.guests || 0); }, 0);
    var occ = d.restaurant.capacity ? guests / d.restaurant.capacity : 0;
    $('#occupancy').text(Math.round(occ * 100) + '%');

    var today = M.today();
    var tonight = d.reservations.filter(function (r) { return r.date === today && (r.status === 'confirmed' || r.status === 'seated'); });
    var bookedCovers = tonight.reduce(function (s, r) { return s + r.partySize; }, 0);
    $('#booked').text(bookedCovers + ' covers');

    M.chart('status-summary', {
      type: 'line',
      data: { labels: d.sales.hourlyToday.map(function (h) { return h.hour; }), datasets: [{ data: d.sales.hourlyToday.map(function (h) { return h.revenue; }), borderColor: '#ffffff', borderWidth: 2, fill: false, pointRadius: 0, pointHoverRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, legend: false, tooltips: { enabled: false }, scales: { yAxes: [{ display: false }], xAxes: [{ display: false }] }, elements: { line: { tension: 0.4 } } }
    });

    circle('totalVisitors', occ, p.accent, p.primary);
    circle('visitperday', d.restaurant.capacity ? Math.min(1, bookedCovers / d.restaurant.capacity) : 0, p.success, p.primary);
  }

  function circle(id, value, from, to) {
    if (!window.ProgressBar) return;
    if (circles[id]) circles[id].destroy();
    var el = document.getElementById(id);
    el.innerHTML = '';
    circles[id] = new ProgressBar.Circle(el, {
      color: from, strokeWidth: 15, trailWidth: 15, trailColor: M.palette().dark ? '#2F3546' : '#eee',
      easing: 'easeInOut', duration: 1200, from: { color: from, width: 15 }, to: { color: to, width: 15 },
      step: function (state, c) { c.path.setAttribute('stroke', state.color); c.path.setAttribute('stroke-width', state.width); }
    });
    circles[id].animate(Math.max(0.01, value));
  }

  function renderRevenue() {
    var p = M.palette();
    var rows = M.salesWindow(range, 0), prev = M.salesWindow(range, range);
    var weekly = range > 31;
    var labels = [], values = [];
    if (weekly) {
      for (var i = 0; i < rows.length; i += 7) {
        var chunk = rows.slice(i, i + 7);
        labels.push(M.fmtDate(chunk[0].date, { month: 'short', day: 'numeric' }));
        values.push(chunk.reduce(function (s, r) { return s + r.revenue; }, 0));
      }
    } else {
      rows.forEach(function (r) { labels.push(M.fmtDate(r.date, { month: 'short', day: 'numeric' })); values.push(r.revenue); });
    }
    var food = weekly ? null : rows.map(function (r) { return r.foodCost; });
    var total = M.sumRows(rows).revenue, before = M.sumRows(prev).revenue;
    $('#revenue-total').text(M.money(total, 0));
    $('#revenue-label').text(range === 84 ? '12 weeks' : range + ' days');
    var diff = before ? (total - before) / before * 100 : 0;
    $('#revenue-change').attr('class', diff >= 0 ? 'text-success' : 'text-danger').text(before ? '(' + (diff >= 0 ? '+' : '') + M.num(diff, 1) + '%)' : '');
    $('#revenue-sub').text(weekly ? 'Weekly takings' : 'Daily takings and food cost');
    $('#revenueRange').text(range === 84 ? 'Last 12 weeks' : 'Last ' + range + ' days');

    var datasets = [{ label: 'Revenue', data: values, backgroundColor: p.primary, borderWidth: 0 }];
    if (food) datasets.unshift({ label: 'Food cost', data: food, backgroundColor: p.accent, borderWidth: 0 });
    M.chart('marketingOverview', {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false, legend: false,
        scales: M.axes({ barPercentage: food ? 0.6 : 0.4, yFormat: function (v) { return M.money(v, 0); } }),
        tooltips: { mode: 'index', intersect: false, callbacks: { label: function (t, data) { return data.datasets[t.datasetIndex].label + ': ' + M.money(t.yLabel, 0); } } }
      }
    });
    $('#marketing-overview-legend').html(M.legend(datasets.map(function (ds) { return { color: ds.backgroundColor, label: ds.label }; })));
  }

  function renderWebsitePromo() {
    var ws = M.data.website, pending = ws.status.updatedAt > ws.status.publishedAt;
    var drafts = ws.posts.filter(function (p) { return p.status === 'draft'; }).length;
    var html = pending
      ? '<h3 class="text-white upgrade-info mb-0">Your website has <span class="fw-bold">unpublished changes</span></h3>'
      : '<h3 class="text-white upgrade-info mb-0">Keep guests in the loop — post <span class="fw-bold">tonight\'s specials</span></h3>';
    html += '<p class="text-white mt-2 mb-0" style="opacity:.75">Last published ' + esc(M.ago(ws.status.publishedAt)) + (drafts ? ' · ' + drafts + ' draft post' + (drafts > 1 ? 's' : '') : '') + '</p>';
    html += '<a href="pages/website/website.html" class="btn btn-info upgrade-btn">Open website editor</a>';
    $('#website-promo').html(html);
  }

  function renderLiveOrders() {
    var open = M.data.orders.filter(function (o) { return STATUS_PROGRESS[o.status] != null && o.status !== 'served'; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    $('#orders-sub').text(open.length ? open.length + ' open ticket' + (open.length > 1 ? 's' : '') : 'No open tickets');
    if (!open.length) { $('#live-orders').html('<tr><td colspan="4">' + M.empty('Nothing on the pass. Enjoy the quiet.', 'mdi-receipt') + '</td></tr>'); return; }
    $('#live-orders').html(open.slice(0, 6).map(function (o) {
      var server = M.staffMember(o.server);
      var pct = STATUS_PROGRESS[o.status], mins = M.minutesSince(o.createdAt);
      var tone = o.status === 'ready' ? 'success' : mins > M.prefs().lateMinutes ? 'danger' : 'warning';
      var first = o.items.slice(0, 2).map(function (l) { var it = M.menuItem(l.itemId); return it ? l.qty + '× ' + it.name : ''; }).join(', ');
      return '<tr>' +
        '<td><div class="d-flex">' + (server ? M.avatar(server) : '<span class="img-sm rounded-circle mise-avatar mise-avatar-initials"><i class="mdi ' + (o.type === 'delivery' ? 'mdi-truck-delivery' : 'mdi-shopping') + '"></i></span>') +
        '<div><h6>#' + esc(o.id.replace(/^o/, '')) + ' · ' + esc(M.money(M.orderTotal(o))) + '</h6><p>' + esc(first) + (o.items.length > 2 ? '…' : '') + '</p></div></div></td>' +
        '<td><h6>' + esc(o.table || (o.type === 'delivery' ? 'Delivery' : 'Takeaway')) + '</h6><p>' + esc(server ? server.name.split(' ')[0] : (o.customer || '')) + '</p></td>' +
        '<td><div><div class="d-flex justify-content-between align-items-center mb-1 max-width-progress-wrap"><p class="text-' + tone + '">' + M.timeOf(o.createdAt) + '</p><p>' + mins + ' min</p></div>' +
        '<div class="progress progress-md"><div class="progress-bar bg-' + tone + '" role="progressbar" style="width:' + pct + '%" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"></div></div></div></td>' +
        '<td>' + M.badge(o.status.charAt(0).toUpperCase() + o.status.slice(1), STATUS_TONE[o.status]) + '</td></tr>';
    }).join(''));
  }

  function renderUpcoming() {
    var now = M.nowTime(), today = M.today();
    var list = M.data.reservations.filter(function (r) {
      return r.status === 'confirmed' && (r.date > today || (r.date === today && r.time >= now.slice(0, 2) + ':00'));
    }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }).slice(0, 5);
    if (!list.length) list = M.data.reservations.filter(function (r) { return r.status === 'confirmed' && r.date >= today; }).slice(0, 5);
    $('#upcoming').html(list.length ? list.map(function (r) {
      return '<div class="list align-items-center border-bottom py-2"><div class="wrapper w-100">' +
        '<p class="mb-2 font-weight-medium">' + esc(r.name) + ' <span class="text-muted">· ' + r.partySize + ' guests' + (r.table ? ' · ' + esc(r.table) : '') + '</span></p>' +
        '<div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><i class="mdi mdi-calendar text-muted me-1"></i>' +
        '<p class="mb-0 text-small text-muted">' + esc(M.fmtDay(r.date)) + ', ' + esc(r.time) + (r.notes ? ' — ' + esc(r.notes) : '') + '</p></div></div></div></div>';
    }).join('') : M.empty('No upcoming bookings', 'mdi-calendar-clock'));
  }

  function renderAlerts() {
    var d = M.data, items = [];
    d.menu.items.filter(function (i) { return !i.available; }).forEach(function (i) { items.push(['86\'d', i.name, 'Menu']); });
    d.inventory.filter(function (i) { return i.stock < i.par * 0.5; }).sort(function (a, b) { return a.stock / a.par - b.stock / b.par; })
      .forEach(function (i) { items.push([i.stock === 0 ? 'Out' : 'Low', i.name, M.num(i.stock, 1) + ' ' + i.unit]); });
    d.purchaseOrders.filter(function (p) { return p.status === 'sent'; }).forEach(function (p) {
      var s = M.supplier(p.supplierId);
      items.push(['Delivery', (s ? s.name : 'Supplier') + ' (PO ' + p.id.replace('po', '#') + ')', M.fmtDay(p.expected)]);
    });
    $('#alerts-count').text(items.length ? items.length + ' item' + (items.length > 1 ? 's' : '') : 'All clear');
    $('#alerts').html(items.length ? items.slice(0, 7).map(function (a) {
      return '<li><div class="d-flex justify-content-between"><div><span class="text-light-green">' + esc(a[0]) + '</span> ' + esc(a[1]) + '</div><p>' + esc(a[2]) + '</p></div></li>';
    }).join('') : '<li><div>Nothing needs attention.</div></li>');
  }

  function renderTasks() {
    var tasks = M.data.tasks.slice().sort(function (a, b) { return (a.done - b.done) || (a.due < b.due ? -1 : 1); });
    $('#tasks').html(tasks.length ? tasks.map(function (t, i) {
      var overdue = !t.done && t.due < M.today();
      var badge = t.done ? M.badge('Done', 'success') : overdue ? M.badge('Overdue', 'danger') : t.due === M.today() ? M.badge('Due today', 'warning') : M.badge(M.fmtDay(t.due), 'info');
      return '<li class="d-block' + (i === tasks.length - 1 ? ' border-bottom-0' : '') + (t.done ? ' completed' : '') + '"><div class="form-check w-100">' +
        '<label class="form-check-label"><input class="checkbox" type="checkbox" data-task="' + esc(t.id) + '"' + (t.done ? ' checked' : '') + '> ' + esc(t.text) + ' <i class="input-helper rounded"></i></label>' +
        '<div class="d-flex mt-2 align-items-center"><div class="ps-4 text-small me-3">' + esc(M.fmtDate(t.due)) + '</div><div class="me-3">' + badge + '</div>' +
        (t.priority === 'high' ? '<i class="mdi mdi-flag ms-2 flag-color"></i>' : '') +
        '<button class="mise-icon-btn danger ms-auto" data-del-task="' + esc(t.id) + '" aria-label="Delete task"><i class="mdi mdi-delete-outline"></i></button></div></div></li>';
    }).join('') : '<li class="border-bottom-0">' + M.empty('No tasks. Add one with +', 'mdi-check-circle-outline') + '</li>');
  }

  function renderCategories() {
    var p = M.palette();
    var s = periodStats().now;
    var cats = M.data.menu.categories.filter(function (c) { return s.categories[c]; });
    var values = cats.map(function (c) { return Math.round(s.categories[c]); });
    var colors = p.series.slice(0, cats.length);
    M.chart('doughnutChart', {
      type: 'doughnut',
      data: { labels: cats, datasets: [{ data: values, backgroundColor: colors, borderColor: p.surface, borderWidth: 2 }] },
      options: {
        cutoutPercentage: 55, responsive: true, maintainAspectRatio: true, legend: false,
        tooltips: { callbacks: { label: function (t, data) { return data.labels[t.index] + ': ' + M.money(data.datasets[0].data[t.index], 0); } } }
      }
    });
    $('#doughnut-chart-legend').html('<div class="chartjs-legend"><ul class="justify-content-center">' + cats.map(function (c, i) {
      return '<li><span style="background-color:' + colors[i] + '"></span>' + esc(c) + '</li>';
    }).join('') + '</ul></div>');
  }

  function renderBusiest() {
    var p = M.palette();
    var names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var sum = [0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0, 0, 0];
    M.salesWindow(56, 1).forEach(function (r) {
      var wd = (M.parseDate(r.date).getDay() + 6) % 7;
      sum[wd] += r.covers; cnt[wd] += 1;
    });
    var avg = sum.map(function (s, i) { return cnt[i] ? Math.round(s / cnt[i]) : 0; });
    var max = Math.max.apply(null, avg);
    M.chart('leaveReport', {
      type: 'bar',
      data: { labels: names, datasets: [{ label: 'Avg covers', data: avg, backgroundColor: avg.map(function (v) { return v === max ? p.primary : p.accent; }), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, legend: false, scales: M.axes({ barPercentage: 0.5 }) }
    });
  }

  function renderPerformers() {
    var staff = M.data.staff.filter(function (s) { return s.role === 'Server' || s.role === 'Bartender'; })
      .sort(function (a, b) { return (b.salesToday || 0) - (a.salesToday || 0); });
    $('#performers').html(staff.map(function (s, i) {
      var status = s.status === 'on-shift' ? M.badge('On shift', 'success') : s.status === 'break' ? M.badge('On break', 'warning') : '<span class="text-muted">Off</span>';
      return '<div class="wrapper d-flex align-items-center justify-content-between py-2' + (i < staff.length - 1 ? ' border-bottom' : ' pt-2') + '">' +
        '<div class="d-flex">' + M.avatar(s, 'img-sm rounded-10') + '<div class="wrapper ms-3"><p class="ms-1 mb-1 fw-bold">' + esc(s.name) + '</p>' +
        '<small class="text-muted mb-0 ms-1">' + esc(s.role) + ' · ' + esc(M.money(s.salesToday || 0, 0)) + '</small></div></div>' +
        '<div class="text-muted text-small">' + status + '</div></div>';
    }).join(''));
  }

  function render() {
    renderKpis();
    renderTrend();
    renderFloor();
    renderRevenue();
    renderWebsitePromo();
    renderLiveOrders();
    renderUpcoming();
    renderAlerts();
    renderTasks();
    renderCategories();
    renderBusiest();
    renderPerformers();
  }

  function exportCsv() {
    var rows = [['date', 'revenue', 'covers', 'orders', 'food_cost', 'labor_cost']];
    M.data.sales.daily.forEach(function (r) { rows.push([r.date, r.revenue, r.covers, r.orders, r.foodCost, r.laborCost]); });
    var blob = new Blob([rows.map(function (r) { return r.join(','); }).join('\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sales-' + M.today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  M.ready(function () {
    var prefs = M.prefs();
    period = prefs.overviewPeriod;
    range = prefs.revenueRange;
    $('#period-tabs .nav-link').removeClass('active').attr('aria-selected', 'false')
      .filter('[data-period="' + period + '"]').addClass('active').attr('aria-selected', 'true');
    render();
    $(document).on('mise:data', render);

    $('#period-tabs').on('click', '[data-period]', function (e) {
      e.preventDefault();
      period = $(this).data('period');
      $('#period-tabs .nav-link').removeClass('active').attr('aria-selected', 'false');
      $(this).addClass('active').attr('aria-selected', 'true');
      renderKpis(); renderTrend(); renderCategories();
    });
    $(document).on('click', '[data-range]', function (e) { e.preventDefault(); range = +$(this).data('range'); renderRevenue(); });
    $('#print-btn').on('click', function (e) { e.preventDefault(); window.print(); });
    $('#export-btn').on('click', function (e) { e.preventDefault(); exportCsv(); });

    $('#tasks').on('change', '[data-task]', function () {
      var id = $(this).data('task'), done = this.checked;
      M.update(function (d) { M.find(d.tasks, id).done = done; });
    });
    $('#tasks').on('click', '[data-del-task]', function () {
      var id = $(this).data('del-task');
      M.update(function (d) { d.tasks = d.tasks.filter(function (t) { return t.id !== id; }); });
    });
    $('#add-task').on('click', function () {
      var fields = [
        { key: 'text', label: 'Task', required: true, placeholder: 'e.g. Check the walk-in temperature log' },
        { key: 'due', label: 'Due', type: 'date', col: 6, default: M.today() },
        { key: 'priority', label: 'Priority', type: 'select', col: 6, options: [['normal', 'Normal'], ['high', 'High']] }
      ];
      M.modal({
        title: 'New task', body: M.form(fields), saveLabel: 'Add task',
        onSave: function ($b) {
          var v = M.readForm($b, fields);
          if (!v) return false;
          M.update(function (d) { d.tasks.push({ id: M.uid('k'), text: v.text, due: v.due || M.today(), priority: v.priority, done: false }); });
          M.toast('Task added');
        }
      });
    });
  });
})(jQuery);
