const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const feedState = {
  items: [],
  index: 0,
  muted: true,
  moviePage: 1,
  tvPage: 1,
  loadingMore: false,
};

const elStatus = document.getElementById('feedStatus');
const elCounter = document.getElementById('feedCounter');
const elPlayerWrap = document.getElementById('feedPlayerWrap');
const elTitle = document.getElementById('feedItemTitle');
const elSub = document.getElementById('feedItemSub');
const btnLike = document.getElementById('btnLike');
const btnWatchlist = document.getElementById('btnWatchlist');
const btnOpenDetails = document.getElementById('btnOpenDetails');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnLoadMore = document.getElementById('btnLoadMore');

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function itemKey(item) {
  return `${normalizeMediaType(item.media_type)}:${item.id}`;
}

function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function setFavorites(next) {
  localStorage.setItem('favorites', JSON.stringify(next));
}

function isFavorite(item) {
  const mediaType = normalizeMediaType(item.media_type);
  return getFavorites().some(f => f.id === item.id && normalizeMediaType(f.media_type) === mediaType);
}

function toggleFavorite(item) {
  const mediaType = normalizeMediaType(item.media_type);
  let favs = getFavorites();
  const exists = favs.some(f => f.id === item.id && normalizeMediaType(f.media_type) === mediaType);
  if (exists) {
    favs = favs.filter(f => !(f.id === item.id && normalizeMediaType(f.media_type) === mediaType));
  } else {
    favs.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: mediaType,
    });
  }
  setFavorites(favs);
  return !exists;
}

function getWatchlist() {
  return JSON.parse(localStorage.getItem('watchlist') || '[]');
}

function setWatchlist(next) {
  localStorage.setItem('watchlist', JSON.stringify(next));
}

function isInWatchlist(item) {
  const mediaType = normalizeMediaType(item.media_type);
  return getWatchlist().some(w => w.id === item.id && normalizeMediaType(w.media_type) === mediaType);
}

function toggleWatchlist(item) {
  const mediaType = normalizeMediaType(item.media_type);
  let list = getWatchlist();
  const exists = list.some(w => w.id === item.id && normalizeMediaType(w.media_type) === mediaType);
  if (exists) {
    list = list.filter(w => !(w.id === item.id && normalizeMediaType(w.media_type) === mediaType));
  } else {
    list.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: mediaType,
    });
  }
  setWatchlist(list);
  return !exists;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function fetchTrending(mediaType, page = 1) {
  const data = await fetchJson(`${TMDB_BASE_URL}/trending/${mediaType}/week?api_key=${TMDB_API_KEY}&page=${page}`);
  return (data.results || []).map(item => ({ ...item, media_type: mediaType }));
}

async function fetchTrailerKey(mediaType, id) {
  try {
    const data = await fetchJson(`${TMDB_BASE_URL}/${mediaType}/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
    const results = data.results || [];
    const trailer = results.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      || results.find(v => v.site === 'YouTube');
    return trailer?.key || null;
  } catch {
    return null;
  }
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function collectTrailerItems(pool, targetCount = 12) {
  const existing = new Set(feedState.items.map(itemKey));
  const selected = [];

  for (const item of shuffle(pool)) {
    if (selected.length >= targetCount) break;
    if (existing.has(itemKey(item))) continue;

    const mediaType = normalizeMediaType(item.media_type);
    const trailerKey = await fetchTrailerKey(mediaType, item.id);
    if (!trailerKey) continue;

    selected.push({ ...item, media_type: mediaType, trailerKey });
    existing.add(itemKey(item));
  }

  return selected;
}

async function loadMoreTrailers(targetCount = 12) {
  if (feedState.loadingMore) return 0;
  feedState.loadingMore = true;
  if (btnLoadMore) {
    btnLoadMore.disabled = true;
    btnLoadMore.textContent = 'Loading...';
  }

  let added = 0;
  let attempts = 0;

  while (added < targetCount && attempts < 4) {
    attempts += 1;

    const [movies, tv] = await Promise.all([
      fetchTrending('movie', feedState.moviePage),
      fetchTrending('tv', feedState.tvPage),
    ]);

    feedState.moviePage += 1;
    feedState.tvPage += 1;

    const pool = [...movies, ...tv].slice(0, 24);
    const newItems = await collectTrailerItems(pool, targetCount - added);

    if (!newItems.length) continue;

    feedState.items.push(...newItems);
    added += newItems.length;
  }

  feedState.loadingMore = false;
  if (btnLoadMore) {
    btnLoadMore.disabled = false;
    btnLoadMore.textContent = 'Load more';
  }

  return added;
}

async function buildFeed() {
  elStatus.textContent = 'Loading trailers...';
  feedState.items = [];
  feedState.index = 0;
  feedState.moviePage = 1;
  feedState.tvPage = 1;

  const added = await loadMoreTrailers(14);

  if (!feedState.items.length) {
    elStatus.textContent = 'No trailers found right now. Try again in a minute.';
    elCounter.textContent = '0 / 0';
    elPlayerWrap.innerHTML = '';
    elTitle.textContent = 'No trailers available';
    elSub.textContent = '';
    return;
  }

  elStatus.textContent = added >= 14
    ? 'Use Next / Prev or keyboard arrows.'
    : 'Loaded limited trailers, click Load more for more.';

  renderCurrent();
}

function renderCurrent() {
  const total = feedState.items.length;
  const item = feedState.items[feedState.index];
  if (!item) return;

  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const score = item.vote_average ? item.vote_average.toFixed(1) : '--';
  const title = item.title || item.name;

  elCounter.textContent = `${feedState.index + 1} / ${total}`;
  elTitle.textContent = title;
  elSub.textContent = `${year || 'N/A'} · TMDB ${score} · ${item.media_type.toUpperCase()}`;

  const mute = feedState.muted ? 1 : 0;
  elPlayerWrap.innerHTML = `
    <iframe
      class="feed-iframe"
      src="https://www.youtube.com/embed/${item.trailerKey}?autoplay=1&mute=${mute}&controls=1&rel=0&modestbranding=1&playsinline=1"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
      loading="eager"
    ></iframe>
  `;

  btnLike.textContent = isFavorite(item) ? '\u2764\uFE0F Liked' : '\uD83E\uDD0D Like';
  btnWatchlist.textContent = isInWatchlist(item) ? '\u2705 In Watchlist' : '\u2795 Watchlist';
}

function nextItem() {
  if (!feedState.items.length) return;
  feedState.index = (feedState.index + 1) % feedState.items.length;
  renderCurrent();
}

function prevItem() {
  if (!feedState.items.length) return;
  feedState.index = (feedState.index - 1 + feedState.items.length) % feedState.items.length;
  renderCurrent();
}

btnNext.addEventListener('click', nextItem);
btnPrev.addEventListener('click', prevItem);

btnLoadMore?.addEventListener('click', async () => {
  const added = await loadMoreTrailers(10);
  if (added > 0) {
    elStatus.textContent = `Added ${added} more trailers.`;
    renderCurrent();
  } else {
    elStatus.textContent = 'No new trailers found on next pages yet.';
  }
});

btnLike.addEventListener('click', () => {
  const item = feedState.items[feedState.index];
  if (!item) return;
  toggleFavorite(item);
  renderCurrent();
});

btnWatchlist.addEventListener('click', () => {
  const item = feedState.items[feedState.index];
  if (!item) return;
  toggleWatchlist(item);
  renderCurrent();
});

btnOpenDetails.addEventListener('click', () => {
  const item = feedState.items[feedState.index];
  if (!item) return;
  const region = 'US';
  window.open(`movie.html?id=${item.id}&type=${normalizeMediaType(item.media_type)}&region=${region}`, '_blank');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextItem();
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') prevItem();
  if (e.key.toLowerCase() === 'm') {
    feedState.muted = !feedState.muted;
    renderCurrent();
  }
});

buildFeed().catch(err => {
  console.error(err);
  elStatus.textContent = 'Failed to load feed. Try refresh.';
});
