// MovieMood on Cloudflare Workers.
// The site's files (index.html, movie.js, style.css...) are served as static assets (wrangler.jsonc).
// Everything vercel.json used to rewrite comes here and goes to the same two functions as on
// Vercel, unchanged: api/page.js (server-rendered pages) and api/mood.js (the mood search).
import pageHandler from './api/page.js';
import moodHandler from './api/mood.js';

const LANG = '(?:/(uk|ru|fr|es|de))?';
// [address, query for api/page.js]: the "rewrites" of vercel.json
const PAGE_ROUTES = [
  [new RegExp(`^${LANG}/moods$`), m => ({ kind: 'moods', lang: m[1] })],
  [new RegExp(`^${LANG}/moods/([^/]+)$`), m => ({ kind: 'mood', lang: m[1], slug: m[2] })],
  [new RegExp(`^${LANG}/(movie|tv)/([^/]+)$`), m => ({ kind: 'title', lang: m[1], type: m[2], id: m[3] })],
  [new RegExp(`^${LANG}/person/([^/]+)$`), m => ({ kind: 'person', lang: m[1], id: m[2] })],
  [new RegExp(`^${LANG}/(movies|shows)-like/([^/]+)$`), m => ({ kind: 'like', lang: m[1], type: m[2] === 'shows' ? 'tv' : 'movie', id: m[3] })],
  [/^\/(uk|ru|fr|es|de)$/, m => ({ kind: 'home', lang: m[1] })],
  [/^\/sitemap\.xml$/, () => ({ kind: 'sitemap' })],
  [/^\/robots\.txt$/, () => ({ kind: 'robots' })]
];

// "Some providers block TMDB" detour of urls.js: /tmdb/... and /tmdb-img/... go to TMDB from here
const PROXIES = [
  ['/tmdb/', 'https://api.themoviedb.org/3/', 3600],
  ['/tmdb-img/', 'https://image.tmdb.org/t/p/', 7 * 86400]
];

// api/page.js builds its pages from movie.html, person.html and index.html, which it fetches from
// the site's own address: those requests are answered from the assets, without a trip outside
const TEMPLATES = new Set(['/index.html', '/movie.html', '/person.html']);
let assets = null;
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (assets && url) {
    const { pathname } = new URL(url);
    if (TEMPLATES.has(pathname)) return assets.fetch(new Request(new URL(pathname, 'https://assets.local')));
  }
  return nativeFetch(input, init);
};

// The functions are written for Vercel's Node.js style (req, res); this gives them that and
// turns what they send into a Response
function runVercelHandler(handler, request, url, query, body) {
  return new Promise((resolve, reject) => {
    const headers = new Headers();
    let status = 200;
    const res = {
      setHeader(name, value) { headers.set(name, value); return res; },
      status(code) { status = code; return res; },
      send(content) { resolve(new Response(content, { status, headers })); return res; },
      json(data) {
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
        return res.send(JSON.stringify(data));
      },
      end() { resolve(new Response(null, { status, headers })); return res; }
    };
    const req = {
      method: request.method,
      url: url.pathname + url.search,
      query,
      body,
      headers: {
        host: url.host,
        'x-forwarded-proto': url.protocol.replace(':', ''),
        // the country the "where to watch" list starts from (api/page.js?kind=geo)
        'x-vercel-ip-country': request.cf?.country || request.headers.get('cf-ipcountry') || ''
      }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

// Pages are kept in Cloudflare's cache for as long as api/page.js allows (s-maxage), like on Vercel:
// most visits never run the function or call TMDB
async function cachedPage(request, url, query, ctx) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await runVercelHandler(pageHandler, request, url, query);
  const maxAge = /s-maxage=(\d+)/.exec(response.headers.get('Cache-Control') || '');
  if (maxAge && [200, 308].includes(response.status)) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set('Cache-Control', `public, max-age=${maxAge[1]}`);
    ctx.waitUntil(cache.put(request, stored));
  }
  return response;
}

async function proxy(request, target, ttl) {
  const upstream = await nativeFetch(target, { cf: { cacheTtl: ttl, cacheEverything: true } });
  const response = new Response(upstream.body, upstream);
  response.headers.set('Cache-Control', `public, max-age=${ttl}`);
  return response;
}

export default {
  async fetch(request, env, ctx) {
    assets = env.ASSETS;
    const url = new URL(request.url);
    const path = url.pathname;
    const params = Object.fromEntries(url.searchParams);

    // vercel.json: "trailingSlash": false
    if (path.length > 1 && path.endsWith('/')) {
      return Response.redirect(`${url.origin}${path.replace(/\/+$/, '')}${url.search}`, 308);
    }
    if (path === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));

    if (path === '/api/page') return runVercelHandler(pageHandler, request, url, params);
    if (path === '/api/mood') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      const body = await request.json().catch(() => ({}));
      return runVercelHandler(moodHandler, request, url, params, body);
    }

    for (const [prefix, origin, ttl] of PROXIES) {
      if (path.startsWith(prefix)) return proxy(request, origin + path.slice(prefix.length) + url.search, ttl);
    }

    // Vercel Web Analytics is not here: its script answers empty instead of a 404 on every page
    if (path.startsWith('/_vercel/insights/')) {
      return new Response('', { headers: { 'Content-Type': 'text/javascript', 'Cache-Control': 'public, max-age=86400' } });
    }

    for (const [pattern, toQuery] of PAGE_ROUTES) {
      const match = pattern.exec(path);
      if (!match) continue;
      const query = { ...params, ...toQuery(match) };
      if (!query.lang) delete query.lang;
      return cachedPage(request, url, query, ctx);
    }

    // anything else: the site's own "page not found"
    return cachedPage(request, url, { kind: '' }, ctx);
  }
};
