const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
// "More like this" cards: w342 is sharp at card size, half the weight of w500
const TMDB_CARD_URL = 'https://image.tmdb.org/t/p/w342';
// The backdrop never shows larger than the screen: "original" files weigh several megabytes
const TMDB_BACKDROP_URL = `https://image.tmdb.org/t/p/${window.matchMedia('(max-width: 600px)').matches ? 'w780' : 'w1280'}`;

const params = new URLSearchParams(window.location.search);
// Pretty URLs (/movie/603-the-matrix) are rendered by api/page.js, which passes the id here
const serverPage = window.__MM_PAGE || null;
const movieId = serverPage?.id || params.get('id');
const mediaType = serverPage?.type || params.get('type') || 'movie';
// The streaming region: from the address, then the visitor's choice or a previous visit; otherwise
// the country Vercel sees. Visitors from Google often land here first, without passing the home page
// that used to be the only place where the country was detected.
const knownRegion = params.get('region') || mmRegion.get();
const regionReady = knownRegion
  ? Promise.resolve(knownRegion)
  : fetch('/api/page?kind=geo')
    .then(res => res.json())
    .then(({ country }) => {
      if (!/^[A-Z]{2}$/.test(country || '')) return 'US';
      mmRegion.set(country);
      return country;
    })
    .catch(() => 'US');

// Old links (movie.html?id=...) move to the page's own address, which search engines can read.
// ssr=0 marks the server's fallback to this plain page: no redirect back then.
if (!serverPage && movieId && params.get('ssr') !== '0') {
  window.location.replace(mmLangPath(`/${mediaType === 'tv' ? 'tv' : 'movie'}/${parseInt(movieId, 10)}`));
}

// Trailers on YouTube, best first. Some owners forbid playback on other sites:
// the player then reports an error and the next video is tried.
let trailerCandidates = [];
let trailerIndex = 0;
let trailerKey = null;
let heroTrailerFailed = false;
let isMuted = true;

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function isFavoriteItem(id, type) {
  const media = normalizeMediaType(type);
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.some(f => f.id === id && normalizeMediaType(f.media_type) === media);
}

function toggleFavoriteItem(item) {
  const media = normalizeMediaType(item.media_type);
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const exists = favorites.some(f => f.id === item.id && normalizeMediaType(f.media_type) === media);

  if (exists) {
    favorites = favorites.filter(f => !(f.id === item.id && normalizeMediaType(f.media_type) === media));
  } else {
    favorites.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: media
    });
  }

  localStorage.setItem('favorites', JSON.stringify(favorites));
  return !exists;
}

async function loadMovie() {
  if (!movieId) return;

  const endpoint = normalizeMediaType(mediaType);
  const tmdb = path => fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}${path}`).then(r => r.json()).catch(() => ({}));
  const [details, credits, videos, providers, recommendations, similar, keywords] = await Promise.all([
    tmdb(`?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`),
    tmdb(`/credits?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`),
    tmdb(`/videos?api_key=${TMDB_API_KEY}&language=en-US`),
    tmdb(`/watch/providers?api_key=${TMDB_API_KEY}`),
    tmdb(`/recommendations?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`),
    tmdb(`/similar?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`),
    tmdb(`/keywords?api_key=${TMDB_API_KEY}`),
  ]);
  // series keep their IMDb id among the external ids
  const imdbId = details.imdb_id || (endpoint === 'tv' ? (await tmdb(`/external_ids?api_key=${TMDB_API_KEY}`)).imdb_id : '');

  // Many titles have no description in Ukrainian, Russian etc. — fall back to the English one
  let englishOverview = '';
  if (!details.overview && TMDB_LANG !== 'en-US') {
    englishOverview = await fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`)
      .then(r => r.json())
      .then(data => data.overview || '')
      .catch(() => '');
  }

  const title = details.title || details.name;
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);
  const runtime = details.runtime ? t('movie.minutes', { n: details.runtime }) : details.episode_run_time?.[0] ? t('movie.minutes_episode', { n: details.episode_run_time[0] }) : '';
  const rating = details.vote_average?.toFixed(1);

  if (!serverPage) document.title = `${title} - MovieMood`;

  if (details.backdrop_path) {
    document.getElementById('heroBackdrop').style.backgroundImage = `url(${mmImg(`${TMDB_BACKDROP_URL}${details.backdrop_path}`)})`;
  }

  document.getElementById('movieTitle').textContent = title;
  document.getElementById('movieOverview').textContent = details.overview || englishOverview;
  renderMoodTags(keywords.keywords || keywords.results || []);
  document.getElementById('tmdbRating').textContent = rating;

  const metaParts = [year, runtime, rating ? `${t('movie.rating')} ${rating}` : ''].filter(Boolean);
  document.getElementById('heroMeta').innerHTML = metaParts.map(p => `<span>${p}</span>`).join(' · ');

  const badges = details.genres?.slice(0, 3).map(g => `<span class="badge">${mmEsc(g.name)}</span>`).join('') || '';
  document.getElementById('heroBadges').innerHTML = badges;

  document.getElementById('movieGenres').innerHTML = details.genres?.map(g => `<span class="genre-tag">${mmEsc(g.name)}</span>`).join('') || '';

  if (details.poster_path) {
    document.getElementById('moviePoster').src = `${TMDB_IMAGE_BASE_URL}${details.poster_path}`;
  }

  if (imdbId) showImdb(imdbId);

  trailerCandidates = orderTrailers(videos.results || []);
  if (trailerCandidates.length) {
    trailerKey = trailerCandidates[0];
    // The YouTube player weighs about a megabyte: it starts when the visitor first scrolls, taps or
    // moves the mouse, or 6 seconds after the page has loaded, so the picture and the text arrive
    // first (on a phone it used to take the line away from the picture; page speed counts for search)
    const startTrailer = () => {
      if (!document.getElementById('heroIframe') && !heroTrailerFailed) startHeroVideo(trailerKey);
    };
    const wakeEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'mousemove'];
    const wake = () => {
      wakeEvents.forEach(type => window.removeEventListener(type, wake));
      startTrailer();
    };
    wakeEvents.forEach(type => window.addEventListener(type, wake, { passive: true }));
    const later = () => setTimeout(wake, 6000);
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
  }

  document.getElementById('btnPlayTrailer').addEventListener('click', () => {
    if (!trailerKey) return;
    // no video may be played here: YouTube itself can still show it
    if (heroTrailerFailed) window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank', 'noopener');
    else openTrailerModal(trailerKey);
  });

  document.getElementById('muteBtn').addEventListener('click', toggleMute);

  setupFavoriteBtn(details);
  setupWatchedBtn(details);

  const director = credits.crew?.find(p => p.job === 'Director') || credits.crew?.find(p => p.department === 'Directing');
  if (director) {
    document.getElementById('movieDirector').innerHTML =
      `<a class="person-chip" href="${mmPersonUrl(director)}">
        <img src="${director.profile_path ? 'https://image.tmdb.org/t/p/w185' + director.profile_path : 'https://via.placeholder.com/32x32?text=?'}" alt="${mmEsc(director.name)}">
        ${mmEsc(director.name)}
      </a>`;
  }

  // Real links, so search engines find the people pages too
  const castHTML = credits.cast?.slice(0, 8).map(a =>
    `<a class="actor-card" href="${mmPersonUrl(a)}">
      <img src="${a.profile_path ? 'https://image.tmdb.org/t/p/w185' + a.profile_path : 'https://via.placeholder.com/70x100?text=?'}" alt="${mmEsc(a.name)}">
      <span class="actor-name">${mmEsc(a.name)}</span>
      <span class="actor-char">${mmEsc(a.character)}</span>
    </a>`
  ).join('') || '';
  document.getElementById('movieCast').innerHTML = castHTML;

  const region = await regionReady;
  const providerRegion = providers.results?.[region] ? region : 'US';
  const regionData = providers.results?.[providerRegion];
  if (regionData) {
    // Single place to swap in affiliate links later (per provider_id)
    const providerLink = () => regionData.link || '#';

    const types = [
      { key: 'flatrate', label: t('movie.stream') },
      { key: 'rent', label: t('movie.rent') },
      { key: 'buy', label: t('movie.buy') },
    ];

    let html = '';
    types.forEach(({ key, label }) => {
      if (regionData[key]?.length) {
        html += `<div class="provider-group"><span class="provider-label">${label}</span><div class="provider-logos">`;
        // logo and name: not everyone recognises a service by its icon
        html += regionData[key].map(p => `<a href="${providerLink(p)}" target="_blank" rel="noopener sponsored" class="provider-link" title="${mmEsc(t('movie.provider_hint', { type: label, name: p.provider_name }))}"><img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="" class="provider-logo-img"><span class="provider-name">${mmEsc(p.provider_name)}</span></a>`).join('');
        html += `</div></div>`;
      }
    });

    if (html) {
      document.getElementById('watchProviders').innerHTML = `<div class="providers-wrapper"><span class="providers-title">${t('movie.where_to_watch', { region: providerRegion })}</span>${html}<span class="providers-credit">${t('movie.justwatch')}</span></div>`;
    }
  }

  const similarItems = pickSimilar(recommendations.results, similar.results);
  if (similarItems.length) {
    const similarSection = document.getElementById('similarSection');
    const similarGrid = document.getElementById('similarGrid');
    similarSection.style.display = 'block';

    similarGrid.innerHTML = similarItems.map(m => {
      const simRating = m.vote_average ? m.vote_average.toFixed(1) : '';
      const fav = isFavoriteItem(m.id, mediaType) ? '\u2764\uFE0F' : '\uD83E\uDD0D';
      return `
        <a class="similar-card" href="${mmTitleUrl(m, mediaType)}" data-id="${m.id}" data-type="${normalizeMediaType(mediaType)}" data-title="${mmEsc(m.title || m.name || '')}" data-poster="${m.poster_path || ''}">
          <div class="similar-poster-wrap">
            <img src="${m.poster_path ? TMDB_CARD_URL + m.poster_path : ''}" loading="lazy" alt="${mmEsc(m.title || m.name)}">
            ${simRating ? `<span class="tmdb-mini-score card-score">${simRating}</span>` : ''}
            <button class="similar-fav-btn" type="button">${fav}</button>
          </div>
          <span>${mmEsc(m.title || m.name)}</span>
        </a>
      `;
    }).join('');

    similarGrid.querySelectorAll('.similar-fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        // the button sits inside the card's link
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.similar-card');
        const id = Number(card.dataset.id);
        const type = card.dataset.type;
        const title = card.dataset.title;
        const poster_path = card.dataset.poster || null;

        const nowFavorite = toggleFavoriteItem({ id, title, poster_path, media_type: type });
        btn.textContent = nowFavorite ? '\u2764\uFE0F' : '\uD83E\uDD0D';
      });
    });
  }

  document.getElementById('modalClose').addEventListener('click', closeTrailerModal);
  document.getElementById('trailerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('trailerModal')) closeTrailerModal();
  });
}

// "Recommendations" are based on what people who liked this title also liked;
// TMDB's "similar" only matches genres and keywords and is often random. Use it to fill gaps.
// Titles already marked as watched are left out.
function pickSimilar(recommended = [], similar = []) {
  const type = normalizeMediaType(mediaType);
  const seen = new Set([String(movieId), ...getWatched().filter(w => normalizeMediaType(w.media_type) === type).map(w => String(w.id))]);
  const usable = item => {
    const key = String(item.id);
    if (!item.poster_path || item.vote_count < 50 || seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const picked = recommended.filter(usable);
  if (picked.length < 8) picked.push(...similar.filter(usable));
  return picked.slice(0, 12);
}

// TMDB mood tags → [label key, query for the search page]
const MOOD_TAGS = {
  325784: ['tag.comforting', 'cozy'],
  288816: ['tag.lighthearted', 'lighthearted'],
  324713: ['tag.whimsical', 'magical'],
  325832: ['tag.joyful', 'feel good'],
  325782: ['tag.cheerful', 'feel good'],
  325824: ['tag.hopeful', 'uplifting'],
  164246: ['tag.nostalgic', 'nostalgic'],
  319319: ['tag.sentimental', 'touching'],
  4232: ['tag.melancholy', 'sad'],
  278730: ['tag.bittersweet', 'sad'],
  324429: ['tag.romantic', 'romantic'],
  320420: ['tag.hilarious', 'funny'],
  319397: ['tag.witty', 'funny'],
  309974: ['tag.absurd', 'funny'],
  321464: ['tag.intense', 'intense'],
  314730: ['tag.suspenseful', 'suspense'],
  316832: ['tag.tense', 'tense'],
  212737: ['tag.philosophical', 'mind bending'],
  197582: ['tag.mysterious', 'mystery'],
  325775: ['tag.awestruck', 'epic'],
  281585: ['tag.inspirational', 'inspiring'],
};

// "Cozy · Nostalgic · Romantic": each chip searches for more films with that mood
function renderMoodTags(keywords) {
  const row = document.getElementById('heroMoods');
  if (!row) return;
  const tags = keywords.map(k => MOOD_TAGS[k.id]).filter(Boolean).slice(0, 4);
  row.replaceChildren(...tags.map(([labelKey, query]) => {
    const chip = document.createElement('a');
    chip.className = 'mood-tag';
    chip.href = `index.html?q=${encodeURIComponent(query)}`;
    chip.textContent = t(labelKey);
    return chip;
  }));
  row.hidden = tags.length === 0;
}

function getWatched() {
  try {
    const list = JSON.parse(localStorage.getItem('watched') || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// Same list as the eye / check button on the search cards and the "Watched" page
function setupWatchedBtn(details) {
  const btn = document.getElementById('btnWatched');
  if (!btn) return;
  const id = parseInt(movieId, 10);
  const type = normalizeMediaType(mediaType);
  const isWatched = () => getWatched().some(w => w.id === id && normalizeMediaType(w.media_type) === type);

  const update = () => {
    // the same eye as on the cards, lit up once watched
    setIconLabel(btn, '👁️', t(isWatched() ? 'card.watched' : 'card.mark_watched'));
    btn.classList.toggle('watched-on', isWatched());
  };

  update();
  btn.addEventListener('click', () => {
    let list = getWatched();
    if (isWatched()) {
      list = list.filter(w => !(w.id === id && normalizeMediaType(w.media_type) === type));
    } else {
      list.push({ id, title: details.title || details.name, poster_path: details.poster_path, media_type: type, watched_at: Date.now() });
    }
    localStorage.setItem('watched', JSON.stringify(list));
    update();
  });
}

// The yellow IMDb button, and the IMDb rating next to TMDB's once it arrives (api/page.js).
// Both lead to the title's page on IMDb.
function showImdb(imdbId) {
  const url = `https://www.imdb.com/title/${imdbId}/`;
  const button = document.getElementById('imdbLink');
  button.href = url;
  button.style.display = 'inline-flex';

  fetch(`/api/page?kind=imdb&id=${imdbId}`)
    .then(res => (res.ok ? res.json() : {}))
    .then(({ rating, votes }) => {
      if (!rating) return;
      setIconLabel(button, `⭐ ${rating}`, 'IMDb');
      if (votes) button.title = t('movie.imdb_votes', { votes });

      const badge = document.createElement('a');
      badge.className = 'rating-badge imdb-badge';
      badge.href = url;
      badge.target = '_blank';
      badge.rel = 'noopener';
      badge.textContent = `⭐ ${rating} IMDb`;
      if (votes) badge.title = button.title;
      document.querySelector('.ratings-row')?.appendChild(badge);
    })
    .catch(() => {});
}

// "Official Trailer" first, then other trailers, then teasers. Recaps of the earlier films
// ("Final Trailer (Peter's Journey)", "Look Back") go last: they are mostly old footage.
const RECAP_VIDEO = /journey|recap|look ?back|retrospective|story so far|tribute|anniversary|reaction|tv spot|\bspot\b|review/i;
function trailerRank(video) {
  const name = video.name || '';
  let rank = ({ Trailer: 0, Teaser: 4 })[video.type] ?? 8;
  if (!video.official) rank += 1;
  if (/official trailer|main trailer/i.test(name)) rank -= 1;
  if (RECAP_VIDEO.test(name)) rank += 3;
  return rank;
}

function orderTrailers(videos) {
  return videos
    .filter(v => v.site === 'YouTube')
    .sort((a, b) => trailerRank(a) - trailerRank(b))
    .slice(0, 6)
    .map(v => v.key);
}

// Phones show the trailer as its own 16:9 picture (style.css): there it is a normal YouTube player
// with its own buttons. Phones only allow sound after a tap on the player itself, so our mute
// button, which restarts the video, cannot switch the sound on there.
const isPhoneLayout = () => window.matchMedia('(max-width: 600px)').matches;

const heroEmbedUrl = (key, mute) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&mute=${mute ? 1 : 0}&controls=${isPhoneLayout() ? 1 : 0}&loop=1&playlist=${key}&rel=0&modestbranding=1&enablejsapi=1&playsinline=1`;

function startHeroVideo(key) {
  const iframe = document.createElement('iframe');
  iframe.id = 'heroIframe';
  iframe.src = heroEmbedUrl(key, isMuted);
  iframe.setAttribute('frameborder', '0');
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  // ask the player to report its events, errors included (see the "message" listener)
  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
  });
  document.getElementById('heroVideoWrapper').replaceChildren(iframe);

  const muteBtn = document.getElementById('muteBtn');
  muteBtn.style.display = isPhoneLayout() ? 'none' : 'flex';
  muteBtn.textContent = isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
}

function tryNextTrailer() {
  trailerIndex += 1;
  if (trailerIndex < trailerCandidates.length) {
    trailerKey = trailerCandidates[trailerIndex];
    startHeroVideo(trailerKey);
    return;
  }
  // Nothing may be played here: keep the backdrop image instead of YouTube's error screen
  heroTrailerFailed = true;
  trailerKey = trailerCandidates[0];
  document.getElementById('heroVideoWrapper').replaceChildren();
  document.getElementById('muteBtn').style.display = 'none';
}

window.addEventListener('message', event => {
  if (event.origin !== 'https://www.youtube.com') return;
  const heroIframe = document.getElementById('heroIframe');
  if (!heroIframe || event.source !== heroIframe.contentWindow) return;
  let data;
  try { data = JSON.parse(event.data); } catch (e) { return; }
  // 101 / 150: the owner does not allow playback on other sites; 100: the video was removed
  if (data?.event === 'onError') tryNextTrailer();
});

function toggleMute() {
  isMuted = !isMuted;
  const iframe = document.getElementById('heroIframe');
  if (iframe) iframe.src = heroEmbedUrl(trailerKey, isMuted);
  document.getElementById('muteBtn').textContent = isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
}

function openTrailerModal(key) {
  const modal = document.getElementById('trailerModal');
  document.getElementById('trailerContainer').innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1&controls=1&playsinline=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  modal.classList.remove('active');
  document.getElementById('trailerContainer').innerHTML = '';
  document.body.style.overflow = '';
}

// "❤️ In favorites": icon and words apart, so that phones can show the icon alone
function setIconLabel(button, icon, label) {
  const text = document.createElement('span');
  text.className = 'btn-text';
  text.textContent = ` ${label}`;
  button.replaceChildren(icon, text);
  button.title = label;
  button.setAttribute('aria-label', label);
}

function setupFavoriteBtn(details) {
  const btn = document.getElementById('btnFavorite');
  const id = parseInt(movieId, 10);
  const normalizedType = normalizeMediaType(mediaType);

  const isFav = () => isFavoriteItem(id, normalizedType);

  const update = () => {
    if (isFav()) setIconLabel(btn, '❤️', t('movie.in_favorites'));
    else setIconLabel(btn, '🤍', t('movie.add_favorite'));
  };

  update();
  btn.addEventListener('click', () => {
    toggleFavoriteItem({
      id,
      title: details.title || details.name,
      poster_path: details.poster_path,
      media_type: normalizedType
    });
    update();
  });
}

loadMovie();
