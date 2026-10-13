(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var days = 30;

  function render() {
    var d = M.data, p = M.palette();
    var rows = M.salesWindow(days, 0), prev = M.salesWindow(days, days);
    var n = M.sumRows(rows), b = M.sumRows(prev);
    var target = { food: d.restaurant.targetFoodCostPct || 30, labor: d.restaurant.targetLaborCostPct || 30 };

    $('[data-days]').removeClass('active').attr('aria-selected', 'false').filter('[data-days="' + days + '"]').addClass('active').attr('aria-selected', 'true');
    var kpis = [
      ['Revenue', M.money(n.revenue, 0), M.change(n.revenue, b.revenue)],
      ['Covers', M.num(n.covers), M.change(n.covers, b.covers)],
      ['Avg. check', M.money(n.avgCheck), M.change(n.avgCheck, b.avgCheck)],
      ['Food cost', M.pct(n.foodPct), M.change(n.foodPct, b.foodPct, true)],
      ['Labor cost', M.pct(n.laborPct), M.change(n.laborPct, b.laborPct, true)],
      ['Prime cost', M.pct(n.foodPct + n.laborPct), M.change(n.foodPct + n.laborPct, b.foodPct + b.laborPct, true)]
    ];
    $('#stats').html(kpis.map(function (k, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + k[0] + '</p><h3 class="rate-percentage">' + k[1] + '</h3>' + k[2] + '</div>';
    }).join(''));
    $('#compare-note').text('Compared with the previous ' + days + ' days');

    var open = rows.filter(function (r) { return r.revenue > 0; });
    var labels = rows.map(function (r) { return M.fmtDate(r.date, { month: 'short', day: 'numeric' }); });

    M.chart('salesChart', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { type: 'line', label: 'Covers', yAxisID: 'covers', data: rows.map(function (r) { return r.covers; }), borderColor: p.accent, backgroundColor: 'rgba(0,0,0,0)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, fill: false, cubicInterpolationMode: 'monotone' },
          { label: 'Revenue', yAxisID: 'rev', data: rows.map(function (r) { return r.revenue; }), backgroundColor: p.primary, borderWidth: 0, barPercentage: 0.6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, legend: false,
        scales: {
          yAxes: [
            { id: 'rev', position: 'left', gridLines: { color: p.grid, zeroLineColor: p.grid, drawBorder: false }, ticks: { beginAtZero: true, maxTicksLimit: 5, fontSize: 10, callback: function (v) { return M.money(v, 0); } } },
            { id: 'covers', position: 'right', gridLines: { display: false, drawBorder: false }, ticks: { beginAtZero: true, maxTicksLimit: 5, fontSize: 10 } }
          ],
          xAxes: [{ gridLines: { display: false, drawBorder: false }, ticks: { maxTicksLimit: 10, fontSize: 10 } }]
        },
        tooltips: { mode: 'index', intersect: false, callbacks: { label: function (t, data) { var ds = data.datasets[t.datasetIndex]; return ds.label + ': ' + (ds.yAxisID === 'rev' ? M.money(t.yLabel, 0) : t.yLabel); } } }
      }
    });
    $('#sales-legend').html(M.legend([{ color: p.primary, label: 'Revenue' }, { color: p.accent, label: 'Covers' }]));

    M.chart('costChart', {
      type: 'line',
      data: {
        labels: open.map(function (r) { return M.fmtDate(r.date, { month: 'short', day: 'numeric' }); }),
        datasets: [
          { label: 'Food cost %', data: open.map(function (r) { return +(r.foodCost / r.revenue * 100).toFixed(1); }), borderColor: p.primary, backgroundColor: 'rgba(0,0,0,0)', borderWidth: 2, pointRadius: 0, fill: false },
          { label: 'Labor cost %', data: open.map(function (r) { return +(r.laborCost / r.revenue * 100).toFixed(1); }), borderColor: p.warning, backgroundColor: 'rgba(0,0,0,0)', borderWidth: 2, pointRadius: 0, fill: false },
          { label: 'Food target', data: open.map(function () { return target.food; }), borderColor: p.success, borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, legend: false, elements: { line: { tension: 0.3 } },
        scales: M.axes({ yFormat: function (v) { return v + '%'; }, maxX: 8 }),
        tooltips: { mode: 'index', intersect: false, callbacks: { label: function (t, data) { return data.datasets[t.datasetIndex].label + ': ' + t.yLabel + '%'; } } }
      }
    });
    $('#cost-legend').html(M.legend([{ color: p.primary, label: 'Food' }, { color: p.warning, label: 'Labor' }, { color: p.success, label: 'Food target ' + target.food + '%' }]));

    var cats = d.menu.categories.filter(function (c) { return n.categories[c]; });
    var colors = p.series.slice(0, cats.length);
    M.chart('categoryChart', {
      type: 'doughnut',
      data: { labels: cats, datasets: [{ data: cats.map(function (c) { return Math.round(n.categories[c]); }), backgroundColor: colors, borderColor: p.surface, borderWidth: 2 }] },
      options: { cutoutPercentage: 60, legend: false, responsive: true, maintainAspectRatio: true, tooltips: { callbacks: { label: function (t, data) { return data.labels[t.index] + ': ' + M.money(data.datasets[0].data[t.index], 0); } } } }
    });
    var catTotal = cats.reduce(function (s, c) { return s + n.categories[c]; }, 0) || 1;
    $('#category-table').html(cats.map(function (c, i) {
      return '<tr><td><span class="d-inline-block rounded-circle me-2" style="width:10px;height:10px;background:' + colors[i] + '"></span>' + esc(c) + '</td><td class="text-end">' + M.money(n.categories[c], 0) + '</td><td class="text-end text-muted">' + M.pct(n.categories[c] / catTotal * 100) + '</td></tr>';
    }).join(''));

    var top = d.menu.items.slice().sort(function (a, b2) { return b2.soldLast30 * b2.price - a.soldLast30 * a.price; }).slice(0, 8);
    $('#top-dishes').html(top.map(function (it, i) {
      return '<tr><td>' + (i + 1) + '</td><td><h6>' + esc(it.name) + '</h6><p>' + esc(it.category) + '</p></td><td>' + M.num(it.soldLast30) + '</td><td>' + M.money(it.soldLast30 * it.price, 0) + '</td><td>' + M.money(it.soldLast30 * (it.price - it.cost), 0) + '</td></tr>';
    }).join(''));

    var names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var agg = names.map(function () { return { rev: 0, cov: 0, n: 0 }; });
    rows.forEach(function (r) { if (!r.revenue) return; var wd = (M.parseDate(r.date).getDay() + 6) % 7; agg[wd].rev += r.revenue; agg[wd].cov += r.covers; agg[wd].n += 1; });
    var best = Math.max.apply(null, agg.map(function (a) { return a.n ? a.rev / a.n : 0; }));
    $('#weekday').html(names.map(function (nm, i) {
      var a = agg[i];
      if (!a.n) return '<tr><td>' + nm + '</td><td colspan="3" class="text-muted">Closed</td></tr>';
      var avg = a.rev / a.n;
      return '<tr><td>' + nm + (avg === best ? ' <span class="badge badge-opacity-success ms-1">Best</span>' : '') + '</td><td>' + M.money(avg, 0) + '</td><td>' + M.num(a.cov / a.n) + '</td><td>' + M.money(a.cov ? a.rev / a.cov : 0) + '</td></tr>';
    }).join(''));
  }

  function exportCsv() {
    var rows = M.salesWindow(days, 0);
    var cats = M.data.menu.categories;
    var lines = [['date', 'revenue', 'covers', 'orders', 'food_cost', 'labor_cost'].concat(cats.map(function (c) { return 'cat_' + c.toLowerCase().replace(/\W+/g, '_'); })).join(',')];
    rows.forEach(function (r) {
      lines.push([r.date, r.revenue, r.covers, r.orders, r.foodCost, r.laborCost].concat(cats.map(function (c) { return (r.categories || {})[c] || 0; })).join(','));
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'report-' + days + 'd-' + M.today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);
    $(document).on('click', '[data-days]', function (e) { e.preventDefault(); days = +$(this).data('days'); render(); });
    $('#export').on('click', function (e) { e.preventDefault(); exportCsv(); });
    $('#print').on('click', function (e) { e.preventDefault(); window.print(); });
  });
})(jQuery);
