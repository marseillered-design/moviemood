// Shared top navigation, loaded after i18n.js on every page with a nav bar (links are absolute:
// it also runs on server-rendered pages like /moods/rainy-day-movies):
// two main links, favorites with a counter, and a menu for everything used less often
// (watched list, language, theme).
(function () {
  const container = document.querySelector('.home-nav > div, .movie-nav .nav-links');
  if (!container) return;

  // The page's own script already handles clicks on the theme button: keep that element
  const themeToggle = document.getElementById('theme-toggle');

  function readCount(key) {
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(list) ? list.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const here = window.location.pathname.split('/').pop() || 'index.html';

  function textLink(href, label) {
    const link = el('a', 'nav-text-link', label);
    link.href = href;
    if (href.endsWith(here) && here !== 'index.html') link.classList.add('active');
    return link;
  }

  function menuLink(href, icon, label, count) {
    const link = el('a', 'nav-menu-item');
    link.href = href;
    link.append(el('span', '', `${icon} ${label}`));
    if (count) link.append(el('span', 'nav-menu-count', String(count)));
    return link;
  }

  const favoritesCount = readCount('favorites');
  const watchedCount = readCount('watched');

  // Favorites: always visible, like a shopping cart
  const favorites = el('a', 'nav-icon-btn nav-favorites-btn', '♥');
  favorites.href = '/favorites.html';
  favorites.title = t('nav.favorites');
  favorites.setAttribute('aria-label', t('nav.favorites'));
  if (favoritesCount) favorites.append(el('span', 'nav-badge', favoritesCount > 99 ? '99+' : String(favoritesCount)));

  // Menu
  const menu = el('div', 'nav-menu');
  const menuButton = el('button', 'nav-icon-btn', '☰');
  menuButton.type = 'button';
  menuButton.title = t('nav.menu');
  menuButton.setAttribute('aria-label', t('nav.menu'));
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-haspopup', 'true');

  const panel = el('div', 'nav-menu-panel');
  panel.hidden = true;
  // On phones the trailers link does not fit next to the logo: it moves into the menu
  const mobileLinks = el('div', 'nav-menu-mobile');
  mobileLinks.append(menuLink('/feed.html', '▶️', t('nav.feed')));

  panel.append(
    mobileLinks,
    // mood collections also open from the 😊 button next to the search on the home page
    menuLink('/moods', '🎭', t('nav.moods')),
    el('div', 'nav-menu-sep'),
    menuLink('/favorites.html', '❤️', t('nav.favorites'), favoritesCount),
    menuLink('/seen.html', '✅', t('nav.seen'), watchedCount),
    el('div', 'nav-menu-sep')
  );

  const languageRow = el('label', 'nav-menu-row');
  languageRow.append(el('span', '', `🌐 ${t('nav.language')}`));
  const languageSelect = el('select', 'lang-select');
  for (const [code, name] of Object.entries(window.MM_LANGUAGES || {})) {
    const option = el('option', '', name);
    option.value = code;
    option.selected = code === window.MM_LANG;
    languageSelect.append(option);
  }
  languageSelect.addEventListener('change', () => {
    try { localStorage.setItem('lang', languageSelect.value); } catch (e) {}
    window.location.reload();
  });
  languageRow.append(languageSelect);
  panel.append(languageRow);

  if (themeToggle) {
    themeToggle.classList.add('nav-menu-item');
    themeToggle.title = t('nav.theme');
    themeToggle.setAttribute('aria-label', t('nav.theme'));
    themeToggle.append(el('span', 'nav-theme-label', t('nav.theme_short')));
    panel.append(themeToggle);
  }

  menu.append(menuButton, panel);

  function setOpen(open) {
    panel.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.classList.toggle('active', open);
  }

  menuButton.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(panel.hidden);
  });
  panel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      menuButton.focus();
    }
  });

  container.classList.add('nav-main');
  container.replaceChildren(
    textLink('/feed.html', t('nav.feed')),
    favorites,
    menu
  );
})();
