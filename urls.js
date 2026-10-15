// Addresses of movie, series and people pages: /movie/218-the-terminator, /tv/1399-game-of-thrones,
// /person/6384-keanu-reeves.
// They are rendered on the server (api/page.js) with a real title and description for search
// engines; the server also redirects any other spelling of the address to this one.
(function () {
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
    return `/${kind}/${item.id}${slug ? `-${slug}` : ''}`;
  };

  // Names in Cyrillic and other scripts give no slug: the server adds the Latin one with a redirect
  window.mmPersonUrl = person => {
    const slug = slugify(person.name);
    return `/person/${person.id}${slug ? `-${slug}` : ''}`;
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
