// Addresses of movie, series and people pages: /movie/218-the-terminator, /tv/1399-game-of-thrones,
// /person/6384-keanu-reeves.
// They are rendered on the server (api/page.js) with a real title and description for search
// engines; the server also redirects any other spelling of the address to this one.
// In another language the same pages sit under a prefix: /uk/movie/218-the-terminator (i18n.js).
(function () {
  // ══ When TMDB is out of reach ══
  // Some providers, antiviruses and blockers cut api.themoviedb.org or image.tmdb.org. Then the
  // same requests go through our own address (vercel.json: /tmdb/... and /tmdb-img/...).
  // Everyone else talks to TMDB directly: the detour costs our hosting traffic.
  const TMDB_API = 'https://api.themoviedb.org/3';
  const TMDB_IMG = 'https://image.tmdb.org/t/p';
  const PROXY_KEY = 'tmdb_proxy';
  // remembered for a day, so that a blocked visitor does not wait for TMDB on every page
  const DAY_MS = 24 * 3600 * 1000;
  let useProxy = false;
  try { useProxy = Date.now() - Number(localStorage.getItem(PROXY_KEY) || 0) < DAY_MS; } catch (e) {}
  const rememberProxy = () => {
    useProxy = true;
    try { localStorage.setItem(PROXY_KEY, String(Date.now())); } catch (e) {}
  };
  const viaProxy = url => url.replace(TMDB_API, '/tmdb').replace(TMDB_IMG, '/tmdb-img');

  // The page scripts call fetch() with TMDB addresses: they are rerouted here, without touching
  // each script. A direct call that fails or hangs is repeated through the proxy.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const url = typeof input === 'string' ? input : '';
    if (!url.startsWith(TMDB_API)) return nativeFetch(input, options);
    if (useProxy) return nativeFetch(viaProxy(url), options);
    try {
      const response = await Promise.race([
        nativeFetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
      ]);
      // a blocked address sometimes answers with the provider's own page instead of JSON
      const isJson = (response.headers.get('content-type') || '').includes('json');
      if (response.ok || (isJson && response.status === 404)) return response;
      throw new Error(`status ${response.status}`);
    } catch (error) {
      rememberProxy();
      return nativeFetch(viaProxy(url), options);
    }
  };

  // Posters: a picture that does not load is asked again through the proxy
  const retryImage = img => {
    if (!img.src.startsWith(TMDB_IMG) || img.dataset.proxied) return;
    rememberProxy();
    img.dataset.proxied = '1';
    img.src = viaProxy(img.src);
  };
  document.addEventListener('error', e => {
    if (e.target instanceof HTMLImageElement) retryImage(e.target);
  }, true);
  // pictures of the server-rendered pages may have failed before this script ran
  document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth === 0) retryImage(img);
  });
  // backgrounds (style.backgroundImage) report no errors: scripts pass their address through this
  window.mmImg = url => (useProxy ? viaProxy(url) : url);

  // Text from TMDB (titles, names, biographies) is edited by anyone there: it goes into the page
  // as text, never as HTML
  window.mmEsc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const inLanguage = path => (window.mmLangPath ? window.mmLangPath(path) : path);

  // Same rules as slugify() in api/page.js
  const slugify = text => String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  window.mmTitleUrl = (item, type) => {
    const kind = type === 'tv' ? 'tv' : 'movie';
    // The server names pages after the English title. Lists in other languages only know the
    // translated one, so the slug is left out there and the server adds it with a redirect.
    const english = item.original_language === 'en' ? (item.original_title || item.original_name) : '';
    const slug = slugify(english);
    return inLanguage(`/${kind}/${item.id}${slug ? `-${slug}` : ''}`);
  };

  // Names in Cyrillic and other scripts give no slug: the server adds the Latin one with a redirect
  window.mmPersonUrl = person => {
    const slug = slugify(person.name);
    return inLanguage(`/person/${person.id}${slug ? `-${slug}` : ''}`);
  };

  // The streaming region travels between pages through the browser, not through the address
  window.mmRegion = {
    get() {
      try { return localStorage.getItem('region') || ''; } catch (e) { return ''; }
    },
    set(code) {
      try { localStorage.setItem('region', code); } catch (e) {}
    }
  };
})();
