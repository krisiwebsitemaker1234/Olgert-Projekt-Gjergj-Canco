/*
 * Website editor — a headless CMS for the restaurant's public site.
 * Simple fields are two-way bound with data-bind="path.in.data"; list sections (posts, gallery, FAQs, pages) use modals.
 */
(function ($) {
  'use strict';
  var M = window.Mise, esc = M.esc;
  var section = (location.hash || '#general').slice(1);

  var SECTIONS = [
    { id: 'general', icon: 'mdi-web', label: 'Site details' },
    { id: 'announcement', icon: 'mdi-bullhorn-outline', label: 'Announcement bar' },
    { id: 'hero', icon: 'mdi-image-outline', label: 'Home hero' },
    { id: 'about', icon: 'mdi-file-document-outline', label: 'About' },
    { id: 'menu', icon: 'mdi-silverware-fork-knife', label: 'Menu page' },
    { id: 'posts', icon: 'mdi-newspaper', label: 'Events & news' },
    { id: 'gallery', icon: 'mdi-image-multiple', label: 'Gallery' },
    { id: 'reviews', icon: 'mdi-star-outline', label: 'Testimonials' },
    { id: 'faqs', icon: 'mdi-help-circle-outline', label: 'FAQs' },
    { id: 'hours', icon: 'mdi-clock-outline', label: 'Opening hours' },
    { id: 'contact', icon: 'mdi-map-marker-outline', label: 'Contact & social' },
    { id: 'pages', icon: 'mdi-sitemap', label: 'Pages & navigation' },
    { id: 'seo', icon: 'mdi-magnify', label: 'Search & sharing' }
  ];

  /* ---------- field helpers ---------- */

  function val(path) { var v = M.getPath(M.data, path); return v == null ? '' : v; }

  function field(path, label, opts) {
    opts = opts || {};
    var id = 'b_' + path.replace(/\W/g, '_');
    var col = opts.col || 12;
    var help = opts.help ? '<small class="text-muted d-block mt-1">' + esc(opts.help) + '</small>' : '';
    var counter = opts.max ? '<span class="mise-char-count" data-count-for="' + id + '"></span>' : '';
    var control;
    if (opts.type === 'checkbox') {
      return '<div class="col-md-' + col + ' mb-3"><div class="form-check form-switch mise-switch"><input class="form-check-input" type="checkbox" id="' + id + '" data-bind="' + path + '"' + (val(path) ? ' checked' : '') + '>' +
        '<label class="form-check-label" for="' + id + '">' + esc(label) + '</label></div>' + help + '</div>';
    }
    if (opts.type === 'textarea') {
      control = '<textarea class="form-control" id="' + id + '" rows="' + (opts.rows || 4) + '" data-bind="' + path + '"' + (opts.max ? ' data-max="' + opts.max + '"' : '') + ' placeholder="' + esc(opts.placeholder || '') + '">' + esc(val(path)) + '</textarea>';
    } else if (opts.type === 'select') {
      control = '<select class="form-select" id="' + id + '" data-bind="' + path + '">' + opts.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val(path)) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else {
      control = '<input class="form-control" id="' + id + '" type="' + (opts.type || 'text') + '" data-bind="' + path + '" value="' + esc(val(path)) + '"' + (opts.max ? ' data-max="' + opts.max + '"' : '') + ' placeholder="' + esc(opts.placeholder || '') + '">';
    }
    return '<div class="col-md-' + col + ' mb-3"><label class="form-label" for="' + id + '">' + esc(label) + '</label>' + counter + control + help + '</div>';
  }

  function imageField(path, label) {
    var v = val(path);
    return '<div class="col-md-12 mb-3"><label class="form-label">' + esc(label) + '</label><div class="row g-3 align-items-center">' +
      '<div class="col-sm-4"><div class="mise-thumb' + (v ? ' has-img' : '') + '" data-thumb-for="' + path + '" style="' + (v ? 'background-image:url(\'' + esc(M.asset(v)) + '\')' : '') + '"><i class="mdi mdi-image-outline mdi-24px"></i></div></div>' +
      '<div class="col-sm-8"><input class="form-control mb-2" data-bind="' + path + '" value="' + esc(String(v).indexOf('data:') === 0 ? '(uploaded image)' : v) + '" placeholder="images/… or https://…">' +
      '<label class="btn btn-sm btn-outline-secondary mb-0"><i class="mdi mdi-upload"></i> Upload<input type="file" accept="image/*" class="d-none" data-upload="' + path + '"></label>' +
      '<small class="text-muted ms-2">Uploads are stored inside your data (keep them small).</small></div></div></div>';
  }

  function section_(title, sub, body) {
    return '<div class="mise-form-section"><h5>' + esc(title) + '</h5>' + (sub ? '<p class="text-muted">' + esc(sub) + '</p>' : '') + '<div class="row">' + body + '</div></div>';
  }

  /* ---------- sections ---------- */

  var RENDER = {
    general: function () {
      return section_('Site details', 'The basics guests and search engines see.',
        field('website.general.siteTitle', 'Site title', { col: 8 }) + field('website.general.logoText', 'Logo text', { col: 4 }) +
        field('website.general.tagline', 'Tagline', { col: 8 }) + field('website.general.language', 'Language', { col: 4, type: 'select', options: [['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['sq', 'Albanian']] }) +
        field('website.general.domain', 'Domain', { col: 8, help: 'Where the site lives, e.g. myrestaurant.com' })) +
        section_('Visibility', '',
          field('website.general.maintenanceMode', 'Maintenance mode — show a "back soon" page instead of the site', { type: 'checkbox' }));
    },
    announcement: function () {
      return section_('Announcement bar', 'A thin strip across the top of every page. Good for events, holiday hours or closures.',
        field('website.announcement.enabled', 'Show the announcement bar', { type: 'checkbox' }) +
        field('website.announcement.text', 'Message', { max: 120 }) +
        field('website.announcement.linkLabel', 'Button label', { col: 6 }) + field('website.announcement.link', 'Button link', { col: 6 }));
    },
    hero: function () {
      return section_('Home hero', 'The first thing people see on the home page.',
        field('website.hero.heading', 'Heading', { max: 70 }) +
        field('website.hero.subheading', 'Subheading', { type: 'textarea', rows: 2, max: 200 }) +
        field('website.hero.primaryCtaLabel', 'Main button', { col: 6 }) + field('website.hero.primaryCtaLink', 'Main button link', { col: 6 }) +
        field('website.hero.secondaryCtaLabel', 'Second button', { col: 6 }) + field('website.hero.secondaryCtaLink', 'Second button link', { col: 6 }) +
        imageField('website.hero.image', 'Background image'));
    },
    about: function () {
      return section_('About', 'Your story. Blank lines start a new paragraph.',
        field('website.about.heading', 'Heading') +
        field('website.about.body', 'Text', { type: 'textarea', rows: 8 }) +
        imageField('website.about.image', 'Image'));
    },
    menu: function () {
      var d = M.data, ws = d.website.menuDisplay;
      var onSite = d.menu.items.filter(function (i) { return i.onWebsite; });
      var picks = d.menu.items.map(function (it) {
        var on = ws.featuredItemIds.indexOf(it.id) > -1;
        return '<div class="col-md-6"><div class="form-check mise-switch form-switch mb-2"><input class="form-check-input" type="checkbox" id="feat_' + it.id + '" data-featured="' + it.id + '"' + (on ? ' checked' : '') + '>' +
          '<label class="form-check-label" for="feat_' + it.id + '">' + esc(it.name) + ' <span class="text-muted">· ' + esc(it.category) + '</span></label></div></div>';
      }).join('');
      return section_('Menu page', onSite.length + ' of ' + d.menu.items.length + ' dishes are shown online. Choose which in Menu → "Website" column.',
        field('website.menuDisplay.showPrices', 'Show prices', { type: 'checkbox', col: 6 }) +
        field('website.menuDisplay.showDietaryTags', 'Show dietary tags (V, VG, GF…)', { type: 'checkbox', col: 6 }) +
        field('website.menuDisplay.note', 'Note under the menu', { type: 'textarea', rows: 2 }) +
        '<div class="col-12"><a class="btn btn-sm btn-outline-secondary" href="../menu/menu.html"><i class="mdi mdi-silverware-fork-knife"></i> Manage dishes</a></div>') +
        section_('Featured dishes', 'Highlighted on the home page (' + ws.featuredItemIds.length + ' selected, 3–6 works best).', picks);
    },
    posts: function () {
      var posts = M.data.website.posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      return '<div class="mise-form-section"><div class="d-flex justify-content-between align-items-start mb-2"><div><h5>Events &amp; news</h5><p class="text-muted mb-0">Posts appear on the "Events & news" page; upcoming events also show on the home page.</p></div>' +
        '<button class="btn btn-primary text-white btn-sm" data-add-post><i class="mdi mdi-plus"></i> New post</button></div>' +
        (posts.length ? posts.map(function (p) {
          return '<div class="mise-list-row"><div class="grow"><h6>' + esc(p.title) + '</h6><p>' + esc(p.excerpt || '') + '</p>' +
            '<div class="mt-1 d-flex gap-1 flex-wrap">' + M.badge(p.status === 'published' ? 'Published' : 'Draft', p.status === 'published' ? 'success' : 'warning') +
            '<span class="mise-chip">' + (p.type === 'event' ? 'Event' : 'News') + '</span><span class="mise-chip">' + esc(M.fmtDate(p.date)) + '</span></div></div>' +
            '<button class="mise-icon-btn" data-edit-post="' + p.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
            '<button class="mise-icon-btn danger" data-del-post="' + p.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></div>';
        }).join('') : M.empty('No posts yet', 'mdi-newspaper')) + '</div>';
    },
    gallery: function () {
      var g = M.data.website.gallery;
      return '<div class="mise-form-section"><div class="d-flex justify-content-between align-items-start mb-3"><div><h5>Gallery</h5><p class="text-muted mb-0">Photos for the gallery page. Use the arrows to reorder.</p></div>' +
        '<button class="btn btn-primary text-white btn-sm" data-add-photo><i class="mdi mdi-plus"></i> Add photo</button></div>' +
        (g.length ? '<div class="mise-gallery">' + g.map(function (ph, i) {
          return '<div class="tile"><div class="mise-thumb has-img" style="background-image:url(\'' + esc(M.asset(ph.url)) + '\')"><i class="mdi mdi-image-outline"></i></div>' +
            '<div class="cap"><span class="text-truncate">' + esc(ph.caption || 'No caption') + '</span><span class="text-nowrap">' +
            (i ? '<button class="mise-icon-btn" data-photo-left="' + i + '" aria-label="Move left"><i class="mdi mdi-arrow-left"></i></button>' : '') +
            '<button class="mise-icon-btn" data-edit-photo="' + ph.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
            '<button class="mise-icon-btn danger" data-del-photo="' + ph.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></span></div></div>';
        }).join('') + '</div>' : M.empty('No photos yet', 'mdi-image-outline')) + '</div>';
    },
    reviews: function () {
      var r = M.data.reviews;
      return section_('Testimonials', 'Pick the reviews quoted on the home page. Add or remove reviews on the Customers page.',
        '<div class="col-12">' + (r.length ? r.map(function (rv) {
          return '<div class="mise-list-row"><div class="grow"><h6>' + esc(rv.name) + ' <span class="mise-stars ms-1">' + new Array(rv.rating + 1).join('★') + '</span></h6><p>"' + esc(rv.text) + '"</p></div>' +
            '<div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" data-feature-review="' + rv.id + '"' + (rv.featured ? ' checked' : '') + ' aria-label="Feature on website"></div></div>';
        }).join('') : M.empty('No reviews yet', 'mdi-star-outline')) + '</div>');
    },
    faqs: function () {
      var f = M.data.website.faqs;
      return '<div class="mise-form-section"><div class="d-flex justify-content-between align-items-start mb-2"><div><h5>FAQs</h5><p class="text-muted mb-0">Common questions, shown on the contact page.</p></div>' +
        '<button class="btn btn-primary text-white btn-sm" data-add-faq><i class="mdi mdi-plus"></i> Add question</button></div>' +
        (f.length ? f.map(function (x, i) {
          return '<div class="mise-list-row"><div class="grow"><h6>' + esc(x.q) + '</h6><p>' + esc(x.a) + '</p></div>' +
            (i ? '<button class="mise-icon-btn" data-faq-up="' + i + '" aria-label="Move up"><i class="mdi mdi-arrow-up"></i></button>' : '') +
            '<button class="mise-icon-btn" data-edit-faq="' + x.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
            '<button class="mise-icon-btn danger" data-del-faq="' + x.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button></div>';
        }).join('') : M.empty('No questions yet', 'mdi-help-circle-outline')) + '</div>';
    },
    hours: function () {
      var rows = M.data.restaurant.hours.map(function (h, i) {
        var base = 'restaurant.hours.' + i + '.';
        return '<div class="row align-items-center mb-2"><div class="col-4 col-md-3 fw-bold" style="font-size:.875rem">' + esc(h.day) + '</div>' +
          '<div class="col-8 col-md-3"><div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" id="closed' + i + '" data-bind="' + base + 'closed"' + (h.closed ? ' checked' : '') + '><label class="form-check-label" for="closed' + i + '">Closed</label></div></div>' +
          '<div class="col-6 col-md-3"><input class="form-control" type="time" data-bind="' + base + 'open" value="' + esc(h.open) + '"' + (h.closed ? ' disabled' : '') + ' aria-label="' + esc(h.day) + ' opens"></div>' +
          '<div class="col-6 col-md-3"><input class="form-control" type="time" data-bind="' + base + 'close" value="' + esc(h.close) + '"' + (h.closed ? ' disabled' : '') + ' aria-label="' + esc(h.day) + ' closes"></div></div>';
      }).join('');
      return section_('Opening hours', 'Shown on the website footer and contact page. The same hours are used across the dashboard.', '<div class="col-12 mise-hours-grid">' + rows + '</div>');
    },
    contact: function () {
      return section_('Contact', '',
        field('website.contact.address', 'Address') + field('website.contact.phone', 'Phone', { col: 6 }) + field('website.contact.email', 'Email', { col: 6, type: 'email' }) +
        field('website.contact.bookingUrl', 'Online booking link', { col: 6 }) + field('website.contact.mapUrl', 'Map link', { col: 6 })) +
        section_('Social', 'Leave blank to hide an icon.',
          field('website.social.instagram', 'Instagram', { col: 6, placeholder: '@yourrestaurant' }) + field('website.social.facebook', 'Facebook', { col: 6 }) +
          field('website.social.tiktok', 'TikTok', { col: 6 }) + field('website.social.tripadvisor', 'TripAdvisor', { col: 6 }));
    },
    pages: function () {
      var pages = M.data.website.pages;
      return '<div class="mise-form-section"><div class="d-flex justify-content-between align-items-start mb-2"><div><h5>Pages &amp; navigation</h5><p class="text-muted mb-0">Turn pages on or off and choose what appears in the top menu.</p></div>' +
        '<button class="btn btn-primary text-white btn-sm" data-add-page><i class="mdi mdi-plus"></i> Add page</button></div>' +
        '<div class="table-responsive"><table class="table mise-table"><thead><tr><th>Page</th><th>Address</th><th>Live</th><th>In menu</th><th></th></tr></thead><tbody>' +
        pages.map(function (p, i) {
          return '<tr><td><h6>' + esc(p.title) + '</h6></td><td><code>' + esc(p.path) + '</code></td>' +
            '<td><div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" data-bind="website.pages.' + i + '.visible"' + (p.visible ? ' checked' : '') + ' aria-label="Live"></div></td>' +
            '<td><div class="form-check form-switch mise-switch m-0"><input class="form-check-input" type="checkbox" data-bind="website.pages.' + i + '.inNav"' + (p.inNav ? ' checked' : '') + ' aria-label="In menu"></div></td>' +
            '<td class="text-end text-nowrap">' + (i ? '<button class="mise-icon-btn" data-page-up="' + i + '" aria-label="Move up"><i class="mdi mdi-arrow-up"></i></button>' : '') +
            '<button class="mise-icon-btn" data-edit-page="' + p.id + '" aria-label="Edit"><i class="mdi mdi-pencil-outline"></i></button>' +
            (p.path !== '/' ? '<button class="mise-icon-btn danger" data-del-page="' + p.id + '" aria-label="Delete"><i class="mdi mdi-delete-outline"></i></button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    },
    seo: function () {
      return section_('Search & sharing', 'How the site appears on Google and when shared on social media.',
        field('website.seo.title', 'Page title', { max: 60 }) +
        field('website.seo.description', 'Meta description', { type: 'textarea', rows: 3, max: 160 }) +
        field('website.seo.keywords', 'Keywords', { help: 'Comma separated' }) +
        imageField('website.seo.ogImage', 'Social share image'));
    }
  };

  /* ---------- page rendering ---------- */

  function renderNav() {
    $('#cms-nav').html(SECTIONS.map(function (s) {
      return '<a class="nav-link' + (s.id === section ? ' active' : '') + '" href="#' + s.id + '" data-section="' + s.id + '"><i class="mdi ' + s.icon + '"></i>' + esc(s.label) + '</a>';
    }).join(''));
  }

  function renderStatus() {
    var st = M.data.website.status, pending = st.updatedAt > st.publishedAt;
    $('#cms-status').toggleClass('pending', pending).text(pending ? 'Unpublished changes' : 'Everything is published');
    $('#cms-status-sub').text((pending ? 'Last edited ' + M.ago(st.updatedAt) + ' · ' : '') + 'Published ' + M.ago(st.publishedAt));
    $('#publish').prop('disabled', !pending);
    var g = M.data.website.general;
    $('#site-domain').text(g.domain || '');
    var ws = M.data.website;
    var stats = [
      ['Status', g.maintenanceMode ? 'Maintenance' : 'Live'],
      ['Pages live', ws.pages.filter(function (p) { return p.visible; }).length + ' / ' + ws.pages.length],
      ['Posts', ws.posts.filter(function (p) { return p.status === 'published'; }).length + ' live'],
      ['Drafts', ws.posts.filter(function (p) { return p.status === 'draft'; }).length],
      ['Dishes online', M.data.menu.items.filter(function (i) { return i.onWebsite; }).length],
      ['Photos', ws.gallery.length]
    ];
    $('#stats').html(stats.map(function (s, i) {
      return '<div class="' + (i > 3 ? 'd-none d-md-block' : '') + '"><p class="statistics-title">' + s[0] + '</p><h3 class="rate-percentage">' + s[1] + '</h3></div>';
    }).join(''));
  }

  function renderPanel() {
    if (!RENDER[section]) section = 'general';
    $('#cms-panel').html(RENDER[section]());
    $('#cms-panel [data-max]').each(updateCount);
  }

  function render() { renderNav(); renderStatus(); renderPanel(); }

  function updateCount() {
    var max = +$(this).data('max'), len = $(this).val().length;
    $('[data-count-for="' + this.id + '"]').text(len + ' / ' + max).toggleClass('over', len > max);
  }

  function touch() {
    M.data.website.status.updatedAt = M.nowStamp();
    M.save({ silent: true });
    renderStatus();
    clearTimeout(touch.t);
    touch.t = setTimeout(function () { $(document).trigger('mise:chrome'); }, 400);
  }

  /* ---------- list editors ---------- */

  function editPost(p) {
    var fields = [
      { key: 'title', label: 'Title', required: true, col: 8 },
      { key: 'type', label: 'Type', type: 'select', col: 4, options: [['news', 'News'], ['event', 'Event']] },
      { key: 'date', label: 'Date', type: 'date', col: 6, required: true, help: 'For events: the event date' },
      { key: 'status', label: 'Status', type: 'select', col: 6, options: [['draft', 'Draft'], ['published', 'Published']] },
      { key: 'excerpt', label: 'Summary', type: 'textarea', rows: 2, help: 'One or two sentences for listings' },
      { key: 'body', label: 'Full text', type: 'textarea', rows: 7 }
    ];
    M.modal({
      title: p ? 'Edit post' : 'New post', size: 'lg', body: M.form(fields, p || { type: 'news', status: 'draft', date: M.today() }),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          if (p) $.extend(M.find(d.website.posts, p.id), v); else d.website.posts.push($.extend({ id: M.uid('p') }, v));
          d.website.status.updatedAt = M.nowStamp();
        });
        M.toast(p ? 'Post saved' : 'Post created');
      }
    });
  }

  function editPhoto(ph) {
    var fields = [{ key: 'url', label: 'Image path or URL', required: true }, { key: 'caption', label: 'Caption' }];
    M.modal({
      title: ph ? 'Edit photo' : 'Add photo',
      body: M.form(fields, ph) + '<label class="btn btn-sm btn-outline-secondary mb-0"><i class="mdi mdi-upload"></i> Upload instead<input type="file" accept="image/*" class="d-none" data-modal-upload></label><div class="mise-thumb mt-3" data-modal-thumb></div>',
      onOpen: function ($b) {
        function preview() { var u = $b.find('[name=url]').val(); $b.find('[data-modal-thumb]').toggleClass('has-img', !!u).css('background-image', u ? 'url("' + M.asset(u) + '")' : ''); }
        $b.on('input', '[name=url]', preview); preview();
        $b.find('[data-modal-upload]').on('change', function () { readImage(this.files[0], function (url) { $b.find('[name=url]').val(url); preview(); }); });
      },
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          if (ph) $.extend(M.find(d.website.gallery, ph.id), v); else d.website.gallery.push($.extend({ id: M.uid('g') }, v));
          d.website.status.updatedAt = M.nowStamp();
        });
      }
    });
  }

  function editFaq(f) {
    var fields = [{ key: 'q', label: 'Question', required: true }, { key: 'a', label: 'Answer', type: 'textarea', rows: 3, required: true }];
    M.modal({
      title: f ? 'Edit question' : 'Add question', body: M.form(fields, f),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        M.update(function (d) {
          if (f) $.extend(M.find(d.website.faqs, f.id), v); else d.website.faqs.push($.extend({ id: M.uid('f') }, v));
          d.website.status.updatedAt = M.nowStamp();
        });
      }
    });
  }

  function editPage(p) {
    var fields = [
      { key: 'title', label: 'Title', required: true, col: 6 },
      { key: 'path', label: 'Address', required: true, col: 6, placeholder: '/private-dining' },
      { key: 'visible', label: 'Live', type: 'checkbox', col: 6 }, { key: 'inNav', label: 'Show in top menu', type: 'checkbox', col: 6 }
    ];
    M.modal({
      title: p ? 'Edit page' : 'Add page', body: M.form(fields, p || { visible: false, inNav: false, path: '/' }),
      onSave: function ($b) {
        var v = M.readForm($b, fields);
        if (!v) return false;
        if (v.path.charAt(0) !== '/') v.path = '/' + v.path;
        v.path = v.path.toLowerCase().replace(/\s+/g, '-');
        M.update(function (d) {
          if (p) $.extend(M.find(d.website.pages, p.id), v); else d.website.pages.push($.extend({ id: M.uid('pg') }, v));
          d.website.status.updatedAt = M.nowStamp();
        });
      }
    });
  }

  function readImage(file, cb) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { M.toast('That image is over 1.5 MB — please use a smaller one or a link', 'danger'); return; }
    var r = new FileReader();
    r.onload = function () { cb(r.result); };
    r.readAsDataURL(file);
  }

  function move(list, i) { list.splice(i - 1, 0, list.splice(i, 1)[0]); }

  function removeFrom(listName, id, label) {
    M.confirm('Delete this ' + label + '?', function () {
      M.update(function (d) { d.website[listName] = d.website[listName].filter(function (x) { return x.id !== id; }); d.website.status.updatedAt = M.nowStamp(); });
    });
  }

  M.ready(function () {
    render();
    $(document).on('mise:data', render);

    $(document).on('click', '[data-section]', function (e) {
      e.preventDefault();
      section = $(this).data('section');
      history.replaceState(null, '', '#' + section);
      renderNav(); renderPanel();
      if (window.innerWidth < 992) document.getElementById('cms-panel').scrollIntoView({ behavior: 'smooth' });
    });

    // Two-way bindings
    $(document).on('input change', '#cms-panel [data-bind]', function (e) {
      var path = $(this).data('bind');
      var v = this.type === 'checkbox' ? this.checked : $(this).val();
      if (e.type === 'input' && this.type === 'checkbox') return;
      if (v === '(uploaded image)') return;
      M.setPath(M.data, path, v);
      if ($(this).data('max')) updateCount.call(this);
      var $thumb = $('[data-thumb-for="' + path + '"]');
      if ($thumb.length) $thumb.toggleClass('has-img', !!v).css('background-image', v ? 'url("' + M.asset(v) + '")' : '');
      if (/^restaurant\.hours\.\d+\.closed$/.test(path)) $(this).closest('.row').find('input[type=time]').prop('disabled', v);
      touch();
    });
    $(document).on('change', '#cms-panel [data-upload]', function () {
      var path = $(this).data('upload');
      readImage(this.files[0], function (url) { M.setPath(M.data, path, url); touch(); renderPanel(); });
    });
    $(document).on('change', '[data-featured]', function () {
      var id = $(this).data('featured'), on = this.checked;
      var list = M.data.website.menuDisplay.featuredItemIds;
      if (on && list.indexOf(id) === -1) list.push(id);
      if (!on) M.data.website.menuDisplay.featuredItemIds = list.filter(function (x) { return x !== id; });
      touch(); renderPanel();
    });
    $(document).on('change', '[data-feature-review]', function () {
      M.find(M.data.reviews, $(this).data('feature-review')).featured = this.checked;
      touch();
    });

    $(document).on('click', '[data-add-post]', function () { editPost(null); });
    $(document).on('click', '[data-edit-post]', function () { editPost(M.find(M.data.website.posts, $(this).data('edit-post'))); });
    $(document).on('click', '[data-del-post]', function () { removeFrom('posts', $(this).data('del-post'), 'post'); });
    $(document).on('click', '[data-add-photo]', function () { editPhoto(null); });
    $(document).on('click', '[data-edit-photo]', function () { editPhoto(M.find(M.data.website.gallery, $(this).data('edit-photo'))); });
    $(document).on('click', '[data-del-photo]', function () { removeFrom('gallery', $(this).data('del-photo'), 'photo'); });
    $(document).on('click', '[data-photo-left]', function () { var i = +$(this).data('photo-left'); M.update(function (d) { move(d.website.gallery, i); d.website.status.updatedAt = M.nowStamp(); }); });
    $(document).on('click', '[data-add-faq]', function () { editFaq(null); });
    $(document).on('click', '[data-edit-faq]', function () { editFaq(M.find(M.data.website.faqs, $(this).data('edit-faq'))); });
    $(document).on('click', '[data-del-faq]', function () { removeFrom('faqs', $(this).data('del-faq'), 'question'); });
    $(document).on('click', '[data-faq-up]', function () { var i = +$(this).data('faq-up'); M.update(function (d) { move(d.website.faqs, i); d.website.status.updatedAt = M.nowStamp(); }); });
    $(document).on('click', '[data-add-page]', function () { editPage(null); });
    $(document).on('click', '[data-edit-page]', function () { editPage(M.find(M.data.website.pages, $(this).data('edit-page'))); });
    $(document).on('click', '[data-del-page]', function () { removeFrom('pages', $(this).data('del-page'), 'page'); });
    $(document).on('click', '[data-page-up]', function () { var i = +$(this).data('page-up'); M.update(function (d) { move(d.website.pages, i); d.website.status.updatedAt = M.nowStamp(); }); });

    $('#publish').on('click', function () {
      M.update(function (d) { d.website.status.publishedAt = M.nowStamp(); d.website.status.updatedAt = d.website.status.publishedAt; });
      M.toast('Website published');
    });
    $('#export-site').on('click', function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ restaurant: { name: M.data.restaurant.name, hours: M.data.restaurant.hours }, website: M.data.website, menu: M.data.menu.items.filter(function (i) { return i.onWebsite; }), testimonials: M.data.reviews.filter(function (r) { return r.featured; }) }, null, 2)], { type: 'application/json' }));
      a.download = 'website-content.json';
      document.body.appendChild(a); a.click(); a.remove();
    });
  });
})(jQuery);
