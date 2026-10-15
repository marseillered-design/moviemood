const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

const params = new URLSearchParams(window.location.search);
// Pretty URLs (/movie/603-the-matrix) are rendered by api/page.js, which passes the id here
const serverPage = window.__MM_PAGE || null;
const movieId = serverPage?.id || params.get('id');
const mediaType = serverPage?.type || params.get('type') || 'movie';
const region = params.get('region') || mmRegion.get() || 'US';

// Old links (movie.html?id=...) move to the page's own address, which search engines can read.
// ssr=0 marks the server's fallback to this plain page: no redirect back then.
if (!serverPage && movieId && params.get('ssr') !== '0') {
  window.location.replace(`/${mediaType === 'tv' ? 'tv' : 'movie'}/${parseInt(movieId, 10)}`);
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
    document.getElementById('heroBackdrop').style.backgroundImage = `url(${TMDB_BACKDROP_URL}${details.backdrop_path})`;
  }

  document.getElementById('movieTitle').textContent = title;
  document.getElementById('movieOverview').textContent = details.overview || englishOverview;
  renderMoodTags(keywords.keywords || keywords.results || []);
  document.getElementById('tmdbRating').textContent = rating;

  const metaParts = [year, runtime, rating ? `${t('movie.rating')} ${rating}` : ''].filter(Boolean);
  document.getElementById('heroMeta').innerHTML = metaParts.map(p => `<span>${p}</span>`).join(' · ');

  const badges = details.genres?.slice(0, 3).map(g => `<span class="badge">${g.name}</span>`).join('') || '';
  document.getElementById('heroBadges').innerHTML = badges;

  document.getElementById('movieGenres').innerHTML = details.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || '';

  if (details.poster_path) {
    document.getElementById('moviePoster').src = `${TMDB_IMAGE_BASE_URL}${details.poster_path}`;
  }

  if (details.imdb_id) {
    const imdbLink = document.getElementById('imdbLink');
    imdbLink.href = `https://www.imdb.com/title/${details.imdb_id}`;
    imdbLink.style.display = 'inline-flex';
  }

  trailerCandidates = orderTrailers(videos.results || []);
  if (trailerCandidates.length) {
    trailerKey = trailerCandidates[0];
    startHeroVideo(trailerKey);
    setTimeout(() => {
      const heroIframe = document.getElementById('heroIframe');
      if (!heroIframe && trailerKey && !heroTrailerFailed) startHeroVideo(trailerKey);
    }, 600);
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
      `<span class="person-chip" onclick="window.location.href='person.html?id=${director.id}'">
        <img src="${director.profile_path ? 'https://image.tmdb.org/t/p/w185' + director.profile_path : 'https://via.placeholder.com/32x32?text=?'}" alt="${director.name}">
        ${director.name}
      </span>`;
  }

  const castHTML = credits.cast?.slice(0, 8).map(a =>
    `<div class="actor-card" onclick="window.location.href='person.html?id=${a.id}'">
      <img src="${a.profile_path ? 'https://image.tmdb.org/t/p/w185' + a.profile_path : 'https://via.placeholder.com/70x100?text=?'}" alt="${a.name}">
      <span class="actor-name">${a.name}</span>
      <span class="actor-char">${a.character}</span>
    </div>`
  ).join('') || '';
  document.getElementById('movieCast').innerHTML = castHTML;

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
        html += regionData[key].map(p => `<a href="${providerLink(p)}" target="_blank" rel="noopener sponsored" class="provider-link" title="${t('movie.provider_hint', { type: label, name: p.provider_name })}"><img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="" class="provider-logo-img"><span class="provider-name">${p.provider_name}</span></a>`).join('');
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
        <a class="similar-card" href="${mmTitleUrl(m, mediaType)}" data-id="${m.id}" data-type="${normalizeMediaType(mediaType)}" data-title="${(m.title || m.name || '').replace(/"/g, '&quot;')}" data-poster="${m.poster_path || ''}">
          <div class="similar-poster-wrap">
            <img src="${m.poster_path ? TMDB_IMAGE_BASE_URL + m.poster_path : ''}" alt="${m.title || m.name}">
            ${simRating ? `<span class="tmdb-mini-score card-score">${simRating}</span>` : ''}
            <button class="similar-fav-btn" type="button">${fav}</button>
          </div>
          <span>${m.title || m.name}</span>
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
function pickSimilar(recommended = [], similar = []) {
  const seen = new Set([String(movieId)]);
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
    btn.textContent = isWatched() ? `✅ ${t('card.watched')}` : `👁️ ${t('card.mark_watched')}`;
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

// Official trailers first, then teasers, then the rest (clips, featurettes)
function orderTrailers(videos) {
  const typeRank = { Trailer: 0, Teaser: 1 };
  const rank = v => (typeRank[v.type] ?? 2) * 2 + (v.official ? 0 : 1);
  return videos
    .filter(v => v.site === 'YouTube')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 6)
    .map(v => v.key);
}

const heroEmbedUrl = (key, mute) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&mute=${mute ? 1 : 0}&controls=0&loop=1&playlist=${key}&rel=0&modestbranding=1&enablejsapi=1&playsinline=1`;

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
  muteBtn.style.display = 'flex';
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
  document.getElementById('trailerContainer').innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  modal.classList.remove('active');
  document.getElementById('trailerContainer').innerHTML = '';
  document.body.style.overflow = '';
}

function setupFavoriteBtn(details) {
  const btn = document.getElementById('btnFavorite');
  const id = parseInt(movieId, 10);
  const normalizedType = normalizeMediaType(mediaType);

  const isFav = () => isFavoriteItem(id, normalizedType);

  const update = () => {
    btn.textContent = isFav() ? `❤️ ${t('movie.in_favorites')}` : `🤍 ${t('movie.add_favorite')}`;
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
