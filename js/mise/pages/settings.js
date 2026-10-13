(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;

  var RESTAURANT_FIELDS = [
    { key: 'name', label: 'Restaurant name', required: true, col: 6 },
    { key: 'tagline', label: 'Tagline', col: 6 },
    { key: 'address', label: 'Address', col: 12 },
    { key: 'phone', label: 'Phone', col: 6 },
    { key: 'email', label: 'Email', type: 'email', col: 6 },
    { key: 'currency', label: 'Currency', col: 2, required: true },
    { key: 'locale', label: 'Number format', type: 'select', col: 4, options: [['en-US', '1,234.50 (US)'], ['en-GB', '1,234.50 (UK)'], ['de-DE', '1.234,50 (DE)'], ['fr-FR', '1 234,50 (FR)'], ['it-IT', '1.234,50 (IT)'], ['sq-AL', '1 234,50 (AL)']] },
    { key: 'taxRate', label: 'Tax %', type: 'number', step: '0.1', min: 0, col: 3 },
    { key: 'serviceCharge', label: 'Service charge %', type: 'number', step: '0.1', min: 0, col: 3 },
    { key: 'serviceChargeMinParty', label: 'Service charge from party of', type: 'number', min: 1, col: 4 },
    { key: 'targetFoodCostPct', label: 'Target food cost %', type: 'number', min: 0, col: 4 },
    { key: 'targetLaborCostPct', label: 'Target labor cost %', type: 'number', min: 0, col: 4 },
    { key: 'avgDiningMinutes', label: 'Average table time (minutes)', type: 'number', min: 15, col: 6 }
  ];

  function renderForms() {
    var d = M.data;
    $('#restaurant-form').html(M.form(RESTAURANT_FIELDS, d.restaurant));
    $('#capacity').text(d.restaurant.capacity + ' seats across ' + d.tables.length + ' tables');
  }

  function renderData() {
    var d = M.data;
    var size = 0;
    try { size = (localStorage.getItem('mise.data') || '').length; } catch (e) {}
    var counts = [
      ['Menu items', d.menu.items.length], ['Orders', d.orders.length], ['Reservations', d.reservations.length],
      ['Guests', d.customers.length], ['Stock items', d.inventory.length], ['Team', d.staff.length], ['Days of sales', d.sales.daily.length]
    ];
    $('#data-counts').html(counts.map(function (c) { return '<span class="mise-chip me-1 mb-1">' + c[0] + ': ' + c[1] + '</span>'; }).join(''));
    $('#storage-size').text(M.num(size / 1024, 0) + ' KB in this browser' + (d.meta && d.meta.exportedAt ? ' · last exported ' + M.fmtDate(d.meta.exportedAt.slice(0, 10)) : ''));
    $('#keep-current').prop('checked', !!(d.meta && d.meta.keepDatesCurrent));
  }

  function render() { renderForms(); renderData(); }

  M.ready(function () {
    render();
    $(document).on('mise:data', function () { renderData(); $('#capacity').text(M.data.restaurant.capacity + ' seats across ' + M.data.tables.length + ' tables'); });

    $('#save-restaurant').on('click', function () {
      var v = M.readForm($('#restaurant-form'), RESTAURANT_FIELDS);
      if (!v) return M.toast('Please fill in the required fields', 'danger');
      M.update(function (d) {
        $.extend(d.restaurant, v);
        // keep the website's contact block in step with the restaurant details
        d.website.contact.address = v.address; d.website.contact.phone = v.phone; d.website.contact.email = v.email;
      });
      M.toast('Restaurant details saved');
    });


    $('#export-data').on('click', function () { M.exportJSON(); M.update(function (d) { d.meta.exportedAt = new Date().toISOString(); }, { silent: true }); renderData(); });
    $('#import-data').on('change', function () {
      var file = this.files[0];
      if (!file) return;
      M.importJSON(file).then(function () { M.toast('Data imported'); setTimeout(function () { location.reload(); }, 600); },
        function (err) { M.toast(err.message || 'That file could not be read', 'danger'); });
      this.value = '';
    });
    $('#reset-data').on('click', function () {
      M.confirm('Throw away every change made in this browser and reload data/data.json? Export first if you want to keep anything.', M.resetToSource, 'Reset data');
    });
    $('#keep-current').on('change', function () {
      var on = this.checked;
      M.update(function (d) { d.meta.keepDatesCurrent = on; }, { silent: true });
      M.toast(on ? 'Sample dates will move to today whenever data.json is loaded' : 'Dates will be used exactly as written', 'info');
    });
  });
})(jQuery);
