(function () {
  'use strict';

  var ELY_REGISTER = 'https://account.ely.by/register';
  var NAV = [
    { href: 'index.html', label: 'Главная', page: 'home' },
    { href: 'packs.html', label: 'Сборки', page: 'packs' },
    { href: 'news.html', label: 'Новости', page: 'news' },
    { href: 'start.html', label: 'Как начать', page: 'start' }
  ];
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  var page = document.body.dataset.page;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, one, few, many) {
    var d = n % 10;
    var h = n % 100;
    if (d === 1 && h !== 11) return one;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  }

  // Новости хранят дату как ДД.ММ.ГГГГ
  function parseDate(text) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text || '');
    return m ? { d: +m[1], m: +m[2], y: +m[3] } : null;
  }

  function dateKey(text) {
    var p = parseDate(text);
    return p ? p.y * 10000 + p.m * 100 + p.d : 0;
  }

  function dateIso(text) {
    var p = parseDate(text);
    return p ? text.split('.').reverse().join('-') : '';
  }

  function dateHuman(text) {
    var p = parseDate(text);
    return p && MONTHS[p.m - 1] ? p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y : String(text || '');
  }

  function sizeHuman(mb) {
    return (mb / 1000).toFixed(1).replace('.', ',') + ' ГБ';
  }

  function hasNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function packUrl(pack) {
    return 'pack.html?slug=' + encodeURIComponent(pack.slug);
  }

  function modsText(n) {
    return n + ' ' + plural(n, 'мод', 'мода', 'модов');
  }

  function dateBadge(text) {
    var iso = dateIso(text);
    return '<time class="badge"' + (iso ? ' datetime="' + iso + '"' : '') + '>' + esc(dateHuman(text)) + '</time>';
  }

  // Все новости всех сборок, новые сверху
  function allNews(packs) {
    var list = [];
    packs.forEach(function (pack) {
      (pack.news || []).forEach(function (item) {
        list.push({ pack: pack, item: item });
      });
    });
    return list.sort(function (a, b) {
      return dateKey(b.item.date) - dateKey(a.item.date) || (b.item.version || 0) - (a.item.version || 0);
    });
  }

  function stateHtml(text) {
    return '<p class="state">' + esc(text) + '</p>';
  }

  function renderShell() {
    var header = document.getElementById('site-header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML =
        '<a class="logo" href="index.html">KKworld</a>' +
        '<button class="burger" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Открыть меню"><span></span></button>' +
        '<div class="capsule" id="site-menu">' +
        '<nav class="site-nav" aria-label="Основное меню">' +
        NAV.map(function (n) {
          return '<a href="' + n.href + '"' + (n.page === page ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
        }).join('') +
        '</nav>' +
        '<a class="btn-gold" href="' + ELY_REGISTER + '" target="_blank" rel="noopener noreferrer">Создать аккаунт</a>' +
        '</div>';
      setupMenu(header);
    }

    var footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML =
        '<div class="footer-inner">' +
        '<span class="footer-logo">KKworld</span>' +
        '<nav class="footer-nav" aria-label="Меню в подвале">' +
        NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join('') +
        '</nav>' +
        '<span id="footer-updated"></span>' +
        '</div>';
    }
  }

  function setupMenu(header) {
    var burger = header.querySelector('.burger');

    function setOpen(open) {
      header.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }

    burger.addEventListener('click', function () {
      setOpen(!header.classList.contains('open'));
    });
    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('open')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  // При просьбе меньше движения ролик не загружается, остаётся постер
  function setupHeroVideo() {
    var video = document.getElementById('hero-video');
    if (!video) return;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function apply() {
      if (motion.matches) {
        video.pause();
        return;
      }
      if (!video.getAttribute('src')) video.setAttribute('src', video.dataset.src);
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    }

    apply();
    if (motion.addEventListener) motion.addEventListener('change', apply);
  }

  function renderHome(data) {
    var count = data.packs.length;
    var countEl = document.getElementById('pack-count');
    if (countEl) {
      countEl.textContent = count + ' ' + plural(count, 'сборка', 'сборки', 'сборок');
      countEl.hidden = false;
    }

    var box = document.getElementById('latest');
    if (!box) return;
    var latest = allNews(data.packs)[0];
    if (!latest) {
      box.innerHTML = '<p class="latest-label">Последнее обновление</p><p class="clamp">Пока нет новостей</p>';
      return;
    }
    box.innerHTML =
      '<p class="latest-label">Последнее обновление</p>' +
      '<h2>' + esc(latest.pack.title) + '</h2>' +
      '<div class="meta">' + dateBadge(latest.item.date) +
      (hasNumber(latest.item.version) ? '<span class="badge">Версия ' + latest.item.version + '</span>' : '') +
      '</div>' +
      '<p class="clamp">' + esc(latest.item.text) + '</p>' +
      '<a class="btn-ghost" href="news.html">Все новости</a>';
  }

  function renderPacks(data) {
    var box = document.getElementById('pack-grid');
    if (!data.packs.length) {
      box.outerHTML = stateHtml('Пока нет сборок');
      return;
    }
    box.innerHTML = data.packs.map(function (pack) {
      var pills = [];
      if (hasNumber(pack.mods)) pills.push(modsText(pack.mods));
      if (hasNumber(pack.sizeMb)) pills.push(sizeHuman(pack.sizeMb));
      if (hasNumber(pack.version)) pills.push('Версия ' + pack.version);
      return '<a class="pack-card" href="' + packUrl(pack) + '">' +
        '<img src="' + esc(pack.cover) + '" alt="" loading="lazy" width="1024" height="637">' +
        (pack.tag ? '<span class="badge">' + esc(pack.tag) + '</span>' : '') +
        '<h2>' + esc(pack.title) + '</h2>' +
        '<div class="pills">' + pills.map(function (p) { return '<span class="pill pill-plain">' + esc(p) + '</span>'; }).join('') + '</div>' +
        '</a>';
    }).join('');
  }

  function stat(label, value) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  function renderPack(data) {
    var box = document.getElementById('pack');
    var slug = new URLSearchParams(window.location.search).get('slug');
    var pack = data.packs.filter(function (p) { return p.slug === slug; })[0];

    if (!pack) {
      box.innerHTML = '<div class="page-head"><h1>Сборка не найдена</h1></div>' +
        '<p class="state"><a class="btn-ghost" href="packs.html">Все сборки</a></p>';
      return;
    }

    document.title = pack.title + ' — KKworld';

    var stats = '';
    if (pack.tag) stats += stat('Платформа', pack.tag);
    if (hasNumber(pack.version)) stats += stat('Версия сборки', pack.version);
    if (hasNumber(pack.mods)) stats += stat('Моды', pack.mods);
    if (hasNumber(pack.sizeMb)) stats += stat('Размер', sizeHuman(pack.sizeMb));

    var news = (pack.news || []).slice().sort(function (a, b) {
      return dateKey(b.date) - dateKey(a.date) || (b.version || 0) - (a.version || 0);
    });
    var history = news.length
      ? '<ol class="history">' + news.map(function (item) {
          return '<li><div class="meta">' + dateBadge(item.date) +
            (hasNumber(item.version) ? '<span class="badge">Версия ' + item.version + '</span>' : '') +
            '</div><p>' + esc(item.text) + '</p></li>';
        }).join('') + '</ol>'
      : stateHtml('Пока нет новостей');

    box.innerHTML =
      '<a class="back" href="packs.html">← Все сборки</a>' +
      '<div class="pack-top">' +
      '<img class="pack-cover" src="' + esc(pack.cover) + '" alt="Обложка сборки ' + esc(pack.title) + '" width="1024" height="637">' +
      '<div class="pack-info">' +
      '<h1>' + esc(pack.title) + '</h1>' +
      '<dl class="stats">' + stats + '</dl>' +
      '<a class="btn-gold" href="start.html">Как начать</a>' +
      '</div></div>' +
      '<h2 class="section-title">История обновлений</h2>' +
      history;
  }

  function renderNews(data) {
    var box = document.getElementById('news-list');
    var list = allNews(data.packs);
    if (!list.length) {
      box.outerHTML = stateHtml('Пока нет новостей');
      return;
    }
    box.innerHTML = list.map(function (entry) {
      var url = packUrl(entry.pack);
      return '<article class="news-item">' +
        '<a class="news-cover" href="' + url + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + esc(entry.pack.cover) + '" alt="" loading="lazy" width="1024" height="637"></a>' +
        '<div><div class="meta">' + dateBadge(entry.item.date) +
        (hasNumber(entry.item.version) ? '<span class="badge">Версия ' + entry.item.version + '</span>' : '') +
        '</div>' +
        '<h2><a href="' + url + '">' + esc(entry.pack.title) + '</a></h2>' +
        '<p>' + esc(entry.item.text) + '</p></div>' +
        '</article>';
    }).join('');
  }

  function renderFailure() {
    var message = stateHtml('Не удалось загрузить данные. Обнови страницу.');
    if (page === 'home') {
      var latest = document.getElementById('latest');
      if (latest) latest.hidden = true;
      return;
    }
    var box = document.getElementById({ packs: 'pack-grid', pack: 'pack', news: 'news-list' }[page]);
    if (box) box.outerHTML = message;
  }

  var RENDER = { home: renderHome, packs: renderPacks, pack: renderPack, news: renderNews };

  renderShell();
  setupHeroVideo();

  fetch('data/packs.json', { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function (data) {
      data.packs = Array.isArray(data.packs) ? data.packs : [];
      var updated = document.getElementById('footer-updated');
      if (updated && /^\d{4}-\d{2}-\d{2}$/.test(data.updated || '')) {
        updated.textContent = 'Обновлено ' + dateHuman(data.updated.split('-').reverse().join('.'));
      }
      if (RENDER[page]) RENDER[page](data);
    })
    .catch(function (error) {
      console.error(error);
      renderFailure();
    });
})();
