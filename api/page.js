// Server-rendered pages for search engines (see vercel.json for the URLs):
//   /moods              → list of mood collections
//   /moods/:slug        → one collection ("Movies for a Rainy Day")
//   /movie/:id, /tv/:id → movie.html with real <title>, description and content filled in
//   /sitemap.xml, /robots.txt

const TMDB_API_KEY = process.env.TMDB_API_KEY || '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ASSET_VERSION = '20261015g';
const DAY = 86400;

// Shared quality bar: known, well-rated titles only
const DEFAULT_DISCOVER = 'sort_by=popularity.desc&vote_count.gte=1500&vote_average.gte=6.5&include_adult=false';

// ══════════════════════════════════════════════
// MOOD COLLECTIONS
// discover — TMDB /discover/movie parameters; query — what the "search" link sends to the home page
// ══════════════════════════════════════════════
const MOODS = [
  {
    slug: 'rainy-day-movies', emoji: '🌧️', title: 'Movies for a Rainy Day', query: 'rainy day',
    discover: 'with_genres=35|18|10749&with_keywords=325784|164246|319319|278730|225219|288816&without_genres=28,27,53,80,10752,878,12&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Grey sky, a blanket and nowhere to be. These are warm, funny, slightly bittersweet films that suit the sound of rain on the window — easy to sink into and hard to turn off.'
  },
  {
    slug: 'feel-good-movies', emoji: '😊', title: 'Feel-Good Movies', query: 'feel good',
    discover: 'with_keywords=325824|325782|325832|281585|288816&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Hopeful, warm-hearted films that leave you lighter than they found you. No heavy twists, no bleak endings — just good company for a couple of hours.'
  },
  {
    slug: 'movies-to-cry-to', emoji: '😢', title: 'Movies to Cry To', query: 'want to cry',
    discover: 'with_genres=18&with_keywords=319319|4232|156924|9872|278730&without_genres=27,28,53,9648,878&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Sometimes you need a proper cry. These love stories and dramas earn their tears honestly — keep the tissues within reach.'
  },
  {
    slug: 'date-night-movies', emoji: '💕', title: 'Date Night Movies', query: 'date night',
    discover: 'with_genres=10749&with_keywords=324429|9673|288816&without_genres=27,53&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Love stories both of you can agree on: real chemistry, a few laughs and a few sighs. Well-loved picks, not random new releases.'
  },
  {
    slug: 'cozy-movies', emoji: '🕯️', title: 'Cozy Movies', query: 'cozy',
    discover: 'with_genres=35|10749|10751&with_keywords=325784|288816|324713|325832&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Gentle, funny and familiar films that feel like a warm room in winter. No violence, no jump scares — perfect with tea and something sweet.'
  },
  {
    slug: 'mind-bending-movies', emoji: '🌀', title: 'Mind-Bending Movies', query: 'mind bending',
    discover: 'with_genres=878|9648&with_keywords=212737|197582|325775&without_genres=16,10751,28,12&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Puzzles that play with time, memory and reality. You will want to talk about the ending — or watch it again straight away.'
  },
  {
    slug: 'plot-twist-movies', emoji: '🎭', title: 'Movies with a Plot Twist', query: 'thriller with crazy ending',
    discover: 'with_genres=53,9648&vote_average.gte=7.3',
    intro: 'Thrillers where nothing is quite what it seems. Go in knowing as little as possible and do not let anyone spoil the last act.'
  },
  {
    slug: 'halloween-movies', emoji: '🎃', title: 'Halloween Movies', query: 'halloween',
    discover: 'with_genres=27&with_keywords=3335|3358&vote_average.gte=6&vote_count.gte=800',
    intro: 'Haunted houses, masked strangers and the one night of the year when it all makes sense. Horror picks for a dark October evening.'
  },
  {
    slug: 'family-movie-night', emoji: '👨‍👩‍👧', title: 'Family Movie Night', query: 'family',
    discover: 'with_genres=10751,16',
    intro: 'Animated films that work for every age on the sofa — bright enough for kids, smart enough that adults stay awake.'
  },
  {
    slug: 'motivational-movies', emoji: '💪', title: 'Motivational Movies', query: 'inspiring',
    discover: 'with_genres=18&with_keywords=281585|325824|240&without_genres=53,80,27,9648&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Underdogs, comebacks and people who refused to quit. Put one on when you need a push to start something hard.'
  },
  {
    slug: 'christmas-movies', emoji: '🎄', title: 'Christmas Movies', query: 'christmas',
    discover: 'with_keywords=207317&with_genres=10751|35&vote_average.gte=6&vote_count.gte=800',
    intro: 'Snow, lights and second chances. Holiday favourites old and new for the weeks when the tree is up.'
  },
  {
    slug: 'movies-to-watch-with-friends', emoji: '🍕', title: 'Movies to Watch with Friends', query: 'with friends',
    discover: 'with_genres=35,28',
    intro: 'Loud, fast and funny action comedies that survive people talking over them. Made for pizza and a full sofa.'
  },
  {
    slug: 'late-night-thrillers', emoji: '🌙', title: 'Late-Night Thrillers', query: 'crime thriller',
    discover: 'with_genres=53,80',
    intro: 'Crime thrillers for when the house is quiet and you are not ready to sleep. Tense, dark and best watched with the lights off.'
  },
  {
    slug: 'true-story-movies', emoji: '📰', title: 'Movies Based on a True Story', query: 'based on true story',
    discover: 'with_keywords=9672&with_genres=18&vote_average.gte=7',
    intro: 'Real people, real events, and the strange feeling of looking it all up afterwards. Dramas drawn from life.'
  },
  {
    slug: 'heist-movies', emoji: '💰', title: 'Heist Movies', query: 'heist',
    discover: 'with_keywords=10051&vote_count.gte=1000',
    intro: 'A crew, a plan and the moment it goes wrong. Clever capers and bank jobs where half the fun is watching the pieces click.'
  },
  {
    slug: 'time-travel-movies', emoji: '⏳', title: 'Time Travel Movies', query: 'time travel',
    discover: 'with_keywords=4379',
    intro: 'Loops, paradoxes and second attempts at the past. From light adventures to stories that tie your brain in a knot.'
  },
  {
    slug: 'coming-of-age-movies', emoji: '🎒', title: 'Coming-of-Age Movies', query: 'coming of age',
    discover: 'with_keywords=10683&with_genres=18&without_genres=16,14,28,878&vote_average.gte=7',
    intro: 'First loves, last summers and the year everything changed. Films about growing up that still hit when you already have.'
  },
  {
    slug: 'road-trip-movies', emoji: '🚗', title: 'Road Trip Movies', query: 'road trip',
    discover: 'with_keywords=7312&with_genres=35|18&without_genres=14,878,16,28&vote_count.gte=800',
    intro: 'Open roads, bad motels and travel companions who slowly become friends. For when you want to get away without leaving the sofa.'
  },
  {
    slug: 'space-movies', emoji: '🚀', title: 'Space Movies', query: 'space',
    discover: 'with_keywords=9882|3801&with_genres=878&without_genres=16',
    intro: 'Silence, distance and very small humans. Science fiction set among the stars, from tense survival stories to big-screen spectacle.'
  },
  {
    slug: 'dystopian-movies', emoji: '🏙️', title: 'Dystopian Movies', query: 'dystopia',
    discover: 'with_keywords=4565',
    intro: 'Futures that went wrong, and the people pushing back. Dark, stylish worlds that say more about today than tomorrow.'
  },
  {
    slug: 'high-school-movies', emoji: '🏫', title: 'High School Movies', query: 'high school comedy',
    discover: 'with_keywords=6270&with_genres=35&vote_count.gte=800',
    intro: 'Lockers, cliques and prom-night disasters. Teen comedies that are easy to quote and easier to rewatch.'
  },
  {
    slug: 'serial-killer-thrillers', emoji: '🔪', title: 'Serial Killer Thrillers', query: 'serial killer',
    discover: 'with_keywords=10714&with_genres=53&vote_average.gte=6.8',
    intro: 'Detectives, obsession and the slow tightening of a case. Dark psychological thrillers for viewers with strong nerves.'
  },
  {
    slug: 'best-90s-movies', emoji: '📼', title: 'Best Movies of the 90s', query: '90s',
    discover: 'primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=4000',
    intro: 'The decade of video stores and sold-out Friday nights. The highest-rated films of the 1990s, all of which still hold up.'
  },
  {
    slug: 'best-80s-movies', emoji: '🕹️', title: 'Best Movies of the 80s', query: '80s',
    discover: 'primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&sort_by=vote_average.desc&vote_count.gte=3000',
    intro: 'Synths, practical effects and heroes with one-liners. The best-loved films of the 1980s for a properly nostalgic evening.'
  }
];

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON-LD sits inside <script>, so "<" must not be able to close the tag
const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const slugify = text => String(text || '')
  .toLowerCase()
  .normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

const titlePath = (item, type = 'movie') => {
  const slug = slugify(item.title || item.name);
  return `/${type}/${item.id}${slug ? `-${slug}` : ''}`;
};

const truncate = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

function buildDiscoverUrl(mood) {
  const params = new URLSearchParams(DEFAULT_DISCOVER);
  // The mood's own parameters override the defaults
  for (const [key, value] of new URLSearchParams(mood.discover)) params.set(key, value);
  params.set('api_key', TMDB_API_KEY);
  params.set('language', 'en-US');
  return `${TMDB_BASE_URL}/discover/movie?${params}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function fetchMoodMovies(mood) {
  const data = await fetchJson(buildDiscoverUrl(mood));
  return (data.results || []).filter(m => m.poster_path);
}

function getOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${String(proto).split(',')[0]}://${host}`;
}

function send(res, status, body, { type = 'text/html; charset=utf-8', maxAge = DAY } = {}) {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', status === 200
    ? `public, s-maxage=${maxAge}, stale-while-revalidate=${7 * DAY}`
    : 'public, s-maxage=60');
  return res.status(status).send(body);
}

// ══════════════════════════════════════════════
// PAGE TEMPLATES
// ══════════════════════════════════════════════
function layout({ title, description, canonical, image, head = '', hero, main }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MovieMood">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">\n  <meta name="twitter:card" content="summary_large_image">` : ''}
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  ${head}
  <script>
    try {
      const saved = localStorage.getItem('theme');
      const light = saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    } catch (e) {}
  </script>
</head>
<body class="home-body" data-page="moods">
  <div class="bg-orbs">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <div class="noise-overlay"></div>

  <!-- Same nav as the rest of the site: nav.js turns this into links, favorites and a menu -->
  <nav class="home-nav">
    <a href="/" class="nav-logo">MOVIEMOOD</a>
    <div>
      <a href="/moods" class="nav-text-link">Moods</a>
      <a href="/feed.html" class="nav-text-link">Trailers</a>
      <a href="/favorites.html" class="nav-text-link">Favorites</a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle theme">
        <span class="icon-sun">&#x2600;&#xFE0F;</span>
        <span class="icon-moon">&#x1F319;</span>
      </button>
    </div>
  </nav>

  <header class="home-hero mood-hero">
    ${hero}
  </header>

  <main class="home-main">
    ${main}
  </main>

  <footer class="home-footer">
    <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </footer>

  <script>
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  </script>
  <script src="/i18n.js?v=${ASSET_VERSION}"></script>
  <script src="/nav.js?v=${ASSET_VERSION}"></script>
</body>
</html>`;
}

const moodChips = (exceptSlug = '') => `<div class="mood-chips">
      ${MOODS.filter(m => m.slug !== exceptSlug).map(m => `<a class="mood-chip" href="/moods/${m.slug}">${m.emoji} ${escapeHtml(m.title)}</a>`).join('\n      ')}
    </div>`;

function movieCard(movie) {
  const title = movie.title || movie.name;
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  return `<a class="movie-card" href="${titlePath(movie)}">
        <div class="card-poster-wrapper">
          <img src="${TMDB_IMAGE_BASE_URL}${movie.poster_path}" class="movie-poster" loading="lazy" alt="${escapeHtml(title)}${year ? ` (${year})` : ''} poster">
          ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(title)}</h3>
          <span class="card-year">${year}</span>
        </div>
      </a>`;
}

function renderMoodPage(mood, movies, origin) {
  const canonical = `${origin}/moods/${mood.slug}`;
  const title = `${mood.title}: ${movies.length} Picks to Watch Tonight | MovieMood`;
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: mood.title,
    description: mood.intro,
    itemListElement: movies.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.title,
      url: `${origin}${titlePath(m)}`
    }))
  };

  return layout({
    title,
    description: truncate(mood.intro, 155),
    canonical,
    image: movies[0]?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movies[0].backdrop_path}` : '',
    head: jsonLd(itemList),
    hero: `<h1 class="home-title mood-title">${escapeHtml(mood.title)}</h1>
    <p class="home-subtitle mood-intro">${escapeHtml(mood.intro)}</p>`,
    main: `<section class="results-section">
      <div class="movies-grid">
      ${movies.map(movieCard).join('\n      ')}
      </div>
    </section>

    <section class="mood-cta">
      <p>Not quite your mood?</p>
      <a class="search-btn mood-cta-btn" href="/index.html?q=${encodeURIComponent(mood.query)}">Find more like this</a>
      <a class="mood-chip" href="/">Describe your own mood</a>
    </section>

    <section class="mood-more">
      <h2 class="mood-section-title">More moods</h2>
      ${moodChips(mood.slug)}
    </section>`
  });
}

function renderMoodIndex(origin) {
  return layout({
    title: 'Movies by Mood: Find What to Watch Tonight | MovieMood',
    description: 'Pick a mood — cozy, sad, mind-bending, date night — and get a hand-tuned list of films that fit it.',
    canonical: `${origin}/moods`,
    hero: `<h1 class="home-title mood-title">Movies by <span class="title-accent">Mood</span></h1>
    <p class="home-subtitle mood-intro">Pick how you feel and get a list of films that fit. Or describe your own mood on the <a href="/">home page</a>.</p>`,
    main: `<section class="mood-list">
      ${MOODS.map(m => `<a class="mood-tile" href="/moods/${m.slug}">
        <span class="mood-tile-emoji">${m.emoji}</span>
        <h2 class="mood-tile-title">${escapeHtml(m.title)}</h2>
        <p class="mood-tile-text">${escapeHtml(truncate(m.intro, 110))}</p>
      </a>`).join('\n      ')}
    </section>`
  });
}

function renderNotFound(origin) {
  return layout({
    title: 'Page not found | MovieMood',
    description: 'This page does not exist. Browse movies by mood instead.',
    canonical: `${origin}/moods`,
    head: '<meta name="robots" content="noindex">',
    hero: `<h1 class="home-title mood-title">Nothing <span class="title-accent">here</span></h1>
    <p class="home-subtitle mood-intro">That page does not exist. Try one of these moods instead.</p>`,
    main: `<section class="mood-more">${moodChips()}</section>`
  });
}

// movie.html stays the single source of the movie page markup: it is fetched as a static
// file and the parts search engines need are filled in before movie.js takes over.
async function renderTitlePage(type, id, origin) {
  const [templateRes, details] = await Promise.all([
    fetch(`${origin}/movie.html`),
    fetchJson(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
  ]);
  if (!templateRes.ok) throw new Error(`template ${templateRes.status}`);
  const template = await templateRes.text();

  const name = details.title || details.name;
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);
  const canonical = `${origin}${titlePath(details, type)}`;
  const pageTitle = `${name}${year ? ` (${year})` : ''}: Where to Watch, Trailer & Similar ${type === 'tv' ? 'Shows' : 'Movies'} | MovieMood`;
  const description = truncate(details.overview || `Where to watch ${name}, trailer, cast and similar titles.`, 155);
  const poster = details.poster_path ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}` : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': type === 'tv' ? 'TVSeries' : 'Movie',
    name,
    url: canonical,
    description: details.overview || undefined,
    image: poster || undefined,
    datePublished: details.release_date || details.first_air_date || undefined,
    genre: (details.genres || []).map(g => g.name),
    aggregateRating: details.vote_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: Number(details.vote_average.toFixed(1)),
      bestRating: 10,
      ratingCount: details.vote_count
    } : undefined
  };

  const head = `<title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${type === 'tv' ? 'video.tv_show' : 'video.movie'}">
  <meta property="og:site_name" content="MovieMood">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${details.backdrop_path ? `<meta property="og:image" content="https://image.tmdb.org/t/p/w1280${details.backdrop_path}">\n  <meta name="twitter:card" content="summary_large_image">` : ''}
  ${jsonLd(schema)}`;

  const moodsSection = `<section class="mood-more movie-moods">
    <h2 class="mood-section-title">Browse by mood</h2>
    ${moodChips()}
  </section>

  `;

  // Function replacements: titles and overviews may contain "$", which String.replace would interpret
  return template
    .replace('<head>', () => '<head>\n  <base href="/">')
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('id="movieTitle"></h1>', () => `id="movieTitle">${escapeHtml(name)}</h1>`)
    .replace('id="movieOverview"></p>', () => `id="movieOverview">${escapeHtml(details.overview)}</p>`)
    .replace('id="moviePoster" src="" alt="Movie Poster"', () => `id="moviePoster" src="${escapeHtml(poster)}" alt="${escapeHtml(name)} poster"`)
    .replace('<div class="trailer-modal"', () => `${moodsSection}<div class="trailer-modal"`)
    .replace('<script src="movie.js', () => `<script>window.__MM_PAGE = ${JSON.stringify({ id: String(id), type }).replace(/</g, '\\u003c')};</script>\n  <script src="movie.js`);
}

async function renderSitemap(origin) {
  const moodMovies = await Promise.all(MOODS.map(mood => fetchMoodMovies(mood).catch(() => [])));
  const moviePaths = [...new Set(moodMovies.flat().map(m => titlePath(m)))];
  const paths = ['/', '/moods', ...MOODS.map(m => `/moods/${m.slug}`), ...moviePaths];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(path => `  <url><loc>${escapeHtml(origin + path)}</loc></url>`).join('\n')}
</urlset>`;
}

// ══════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════
export default async function handler(req, res) {
  const origin = getOrigin(req);
  const query = req.query || Object.fromEntries(new URL(req.url, origin).searchParams);
  const kind = String(query.kind || '');

  try {
    if (kind === 'robots') {
      return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, { type: 'text/plain; charset=utf-8' });
    }

    if (kind === 'sitemap') {
      return send(res, 200, await renderSitemap(origin), { type: 'application/xml; charset=utf-8' });
    }

    if (kind === 'moods') {
      return send(res, 200, renderMoodIndex(origin));
    }

    if (kind === 'mood') {
      const mood = MOODS.find(m => m.slug === String(query.slug || '').toLowerCase());
      if (!mood) return send(res, 404, renderNotFound(origin));
      const movies = await fetchMoodMovies(mood);
      return send(res, 200, renderMoodPage(mood, movies, origin));
    }

    if (kind === 'title') {
      const type = query.type === 'tv' ? 'tv' : 'movie';
      const id = parseInt(query.id, 10);
      if (!id) return send(res, 404, renderNotFound(origin));
      try {
        return send(res, 200, await renderTitlePage(type, id, origin));
      } catch (error) {
        if (error.message === 'TMDB 404') return send(res, 404, renderNotFound(origin));
        // The plain client-side page still works without the server-rendered extras
        console.error('Title page error:', error);
        res.setHeader('Location', `/movie.html?id=${id}&type=${type}`);
        return res.status(302).end();
      }
    }

    return send(res, 404, renderNotFound(origin));
  } catch (error) {
    console.error('Page handler error:', error);
    return send(res, 500, renderNotFound(origin));
  }
}
