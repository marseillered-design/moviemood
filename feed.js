// Trailer feed in the style of reels: one full-screen trailer per swipe.
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_POSTER_URL = 'https://image.tmdb.org/t/p/w780';

const feedState = {
  items: [],
  activeIndex: -1,
  muted: true,
  playerState: -1,
  // "fill" crops the wide trailer to the tall screen, "fit" shows the whole frame
  fit: safeGet('reelsFit') === 'fit',
  moviePage: 1,
  tvPage: 1,
  loadingMore: false,
};

const elFeed = document.getElementById('reelsFeed');
const elStatus = document.getElementById('reelsStatus');
const elToast = document.getElementById('reelsToast');

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function itemKey(item) {
  return `${normalizeMediaType(item.media_type)}:${item.id}`;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch (e) { return []; }
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
  localStorage.setItem('favorites', JSON.stringify(favs));
  return !exists;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function fetchTrending(mediaType, page = 1) {
  const data = await fetchJson(`${TMDB_BASE_URL}/trending/${mediaType}/week?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&page=${page}`);
  return (data.results || []).map(item => ({ ...item, media_type: mediaType }));
}

// A trailer in the visitor's language when there is one, otherwise the English one
async function fetchTrailerKey(mediaType, id) {
  try {
    const data = await fetchJson(`${TMDB_BASE_URL}/${mediaType}/${id}/videos?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&include_video_language=${MM_LANG},en`);
    const videos = (data.results || []).filter(v => v.site === 'YouTube');
    const pick = list => list.find(v => v.type === 'Trailer') || list.find(v => v.type === 'Teaser') || list[0];
    const trailer = pick(videos.filter(v => v.iso_639_1 === MM_LANG)) || pick(videos);
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

async function collectTrailerItems(pool) {
  const existing = new Set(feedState.items.map(itemKey));
  const fresh = shuffle(pool).filter(item => {
    if (existing.has(itemKey(item))) return false;
    existing.add(itemKey(item));
    return true;
  });

  const withTrailers = await Promise.all(fresh.map(async item => {
    const mediaType = normalizeMediaType(item.media_type);
    const trailerKey = await fetchTrailerKey(mediaType, item.id);
    return trailerKey ? { ...item, media_type: mediaType, trailerKey } : null;
  }));

  return withTrailers.filter(Boolean);
}

async function loadMoreTrailers() {
  if (feedState.loadingMore) return 0;
  feedState.loadingMore = true;

  let added = 0;
  try {
    for (let attempt = 0; attempt < 3 && added === 0; attempt++) {
      const [movies, tv] = await Promise.all([
        fetchTrending('movie', feedState.moviePage),
        fetchTrending('tv', feedState.tvPage),
      ]);
      feedState.moviePage += 1;
      feedState.tvPage += 1;

      const newItems = await collectTrailerItems([...movies, ...tv]);
      newItems.forEach(item => {
        feedState.items.push(item);
        elFeed.appendChild(createReel(item, feedState.items.length - 1));
      });
      added += newItems.length;
    }
  } finally {
    feedState.loadingMore = false;
  }
  return added;
}

function actionButton(className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `reel-action ${className}`;
  button.innerHTML = '<span class="reel-action-icon"></span><span class="reel-action-label"></span>';
  button.addEventListener('click', onClick);
  return button;
}

function setAction(button, icon, label) {
  button.querySelector('.reel-action-icon').textContent = icon;
  button.querySelector('.reel-action-label').textContent = label;
  button.setAttribute('aria-label', label);
}

function createReel(item, index) {
  const reel = document.createElement('section');
  reel.className = 'reel';
  reel.dataset.index = index;

  const title = item.title || item.name || '';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const score = item.vote_average ? item.vote_average.toFixed(1) : '';
  const typeLabel = item.media_type === 'tv' ? t('type.one_series') : t('type.movie');
  const image = item.poster_path || item.backdrop_path;

  reel.innerHTML = `
    <div class="reel-backdrop"></div>
    <div class="reel-stage">
      <img class="reel-poster" alt="" loading="lazy">
      <div class="reel-player"></div>
      <div class="reel-shade"></div>
      <button class="reel-tap" type="button"></button>
      <div class="reel-paused">&#x25B6;</div>
      <div class="reel-info">
        <h2 class="reel-title"></h2>
        <p class="reel-sub"></p>
        <p class="reel-overview"></p>
      </div>
      <div class="reel-actions"></div>
    </div>
  `;

  if (image) {
    reel.querySelector('.reel-backdrop').style.backgroundImage = `url(${TMDB_POSTER_URL}${image})`;
    reel.querySelector('.reel-poster').src = `${TMDB_POSTER_URL}${image}`;
  }
  reel.querySelector('.reel-title').textContent = title;
  reel.querySelector('.reel-sub').textContent = [year, score ? `⭐ ${score}` : '', typeLabel].filter(Boolean).join(' · ');
  reel.querySelector('.reel-overview').textContent = item.overview || '';

  // Long descriptions open on tap
  reel.querySelector('.reel-overview').addEventListener('click', e => e.currentTarget.classList.toggle('expanded'));
  reel.querySelector('.reel-tap').addEventListener('click', togglePause);

  const likeBtn = actionButton('reel-like', () => {
    toggleFavorite(item);
    updateLike(likeBtn, item);
  });
  const soundBtn = actionButton('reel-sound', toggleMute);
  const fitBtn = actionButton('reel-fit', toggleFit);
  const shareBtn = actionButton('reel-share', () => shareItem(item));
  const detailsBtn = actionButton('reel-details', () => {
    // a new tab keeps the place in the feed
    window.open(detailsUrl(item), '_blank');
  });

  updateLike(likeBtn, item);
  // plain symbols, not emoji: they look the same on every phone
  setAction(shareBtn, '↗', t('feed.share'));
  setAction(detailsBtn, 'ⓘ', t('feed.details'));
  reel.querySelector('.reel-actions').append(likeBtn, soundBtn, fitBtn, shareBtn, detailsBtn);

  return reel;
}

function detailsUrl(item) {
  return `movie.html?id=${item.id}&type=${normalizeMediaType(item.media_type)}`;
}

function updateLike(button, item) {
  const liked = isFavorite(item);
  setAction(button, liked ? '❤️' : '🤍', liked ? t('feed.liked') : t('feed.like'));
  button.classList.toggle('active', liked);
}

// Sound and frame mode are shared by every reel
function updateSharedButtons() {
  document.querySelectorAll('.reel-sound').forEach(button => {
    setAction(button, feedState.muted ? '🔇' : '🔊', feedState.muted ? t('feed.sound_off') : t('feed.sound_on'));
  });
  document.querySelectorAll('.reel-fit').forEach(button => {
    setAction(button, feedState.fit ? '⤢' : '⤡', feedState.fit ? t('feed.fill') : t('feed.fit'));
  });
  document.body.classList.toggle('reels-fit', feedState.fit);
}

function activeReel() {
  return elFeed.querySelector(`.reel[data-index="${feedState.activeIndex}"]`);
}

// YouTube's embedded player accepts commands as messages
function playerCommand(func) {
  const iframe = activeReel()?.querySelector('iframe');
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

function mountPlayer(reel, item) {
  const mute = feedState.muted ? 1 : 0;
  const iframe = document.createElement('iframe');
  iframe.className = 'reel-video';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.src = `https://www.youtube.com/embed/${item.trailerKey}?autoplay=1&mute=${mute}&controls=0&loop=1&playlist=${item.trailerKey}` +
    '&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1';
  // ask the player to report its state (see the "message" listener below)
  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
  });
  reel.querySelector('.reel-player').replaceChildren(iframe);

  // Some browsers refuse to autoplay: show the play icon so one tap starts the trailer
  feedState.playerState = YT_UNSTARTED;
  clearTimeout(autoplayTimer);
  autoplayTimer = setTimeout(() => {
    if (!isPlaying()) reel.classList.add('paused');
  }, 3000);
}

// YouTube player states
const YT_UNSTARTED = -1;
const YT_PLAYING = 1;
const YT_BUFFERING = 3;
let autoplayTimer = null;

const isPlaying = () => feedState.playerState === YT_PLAYING || feedState.playerState === YT_BUFFERING;

window.addEventListener('message', event => {
  if (event.origin !== 'https://www.youtube.com') return;
  let data;
  try { data = JSON.parse(event.data); } catch (e) { return; }

  // The owner forbids playback on other sites (101 / 150) or the video is gone (100): skip it
  const activeIframe = activeReel()?.querySelector('iframe');
  if (data?.event === 'onError' && activeIframe && event.source === activeIframe.contentWindow) {
    activeReel().classList.add('unavailable');
    scrollToReel(feedState.activeIndex + 1);
    return;
  }

  const state = data?.info?.playerState;
  if (typeof state !== 'number') return;

  feedState.playerState = state;
  if (state !== YT_UNSTARTED) activeReel()?.classList.toggle('paused', !isPlaying());
});

// Only the reel on screen has a player; the rest show a poster
function activate(index) {
  if (index === feedState.activeIndex || !feedState.items[index]) return;

  const previous = activeReel();
  if (previous) {
    previous.querySelector('.reel-player').replaceChildren();
    previous.classList.remove('active', 'paused');
  }

  feedState.activeIndex = index;
  const reel = activeReel();
  reel.classList.add('active');
  mountPlayer(reel, feedState.items[index]);

  if (index >= feedState.items.length - 4) loadMoreTrailers();
}

function togglePause() {
  const pause = isPlaying();
  playerCommand(pause ? 'pauseVideo' : 'playVideo');
  activeReel()?.classList.toggle('paused', pause);
}

function toggleMute() {
  feedState.muted = !feedState.muted;
  playerCommand(feedState.muted ? 'mute' : 'unMute');
  updateSharedButtons();
}

function toggleFit() {
  feedState.fit = !feedState.fit;
  try { localStorage.setItem('reelsFit', feedState.fit ? 'fit' : 'fill'); } catch (e) {}
  updateSharedButtons();
}

let toastTimer = null;
function showToast(message) {
  elToast.textContent = message;
  elToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { elToast.hidden = true; }, 2200);
}

async function shareItem(item) {
  const url = new URL(detailsUrl(item), window.location.href).href;
  const title = item.title || item.name;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast(t('feed.copied'));
    }
  } catch (e) {
    // the visitor closed the share sheet - nothing to do
  }
}

function scrollToReel(index) {
  elFeed.querySelector(`.reel[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth' });
}

// Every reel is exactly one screen tall, so the scroll position tells which one is showing
function syncActiveReel() {
  // a page opened in a background tab can report zero height: start with the first reel
  const height = elFeed.clientHeight;
  activate(height ? Math.round(elFeed.scrollTop / height) : 0);
}

// Rotating the phone or resizing the window changes the height of every reel
window.addEventListener('resize', syncActiveReel);

let scrollTimer = null;
elFeed.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(syncActiveReel, 120);
}, { passive: true });

document.getElementById('reelPrev').addEventListener('click', () => scrollToReel(feedState.activeIndex - 1));
document.getElementById('reelNext').addEventListener('click', () => scrollToReel(feedState.activeIndex + 1));
document.getElementById('reelsClose').setAttribute('aria-label', t('feed.close'));
document.getElementById('reelPrev').setAttribute('aria-label', t('feed.prev'));
document.getElementById('reelNext').setAttribute('aria-label', t('feed.next'));

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); scrollToReel(feedState.activeIndex + 1); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); scrollToReel(feedState.activeIndex - 1); }
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
  if (e.key.toLowerCase() === 'm') toggleMute();
});

async function buildFeed() {
  elStatus.textContent = t('feed.loading');
  await loadMoreTrailers();

  if (!feedState.items.length) {
    elStatus.textContent = t('feed.none');
    return;
  }

  elStatus.hidden = true;
  updateSharedButtons();
  syncActiveReel();
}

// New reels arrive while scrolling: keep their shared buttons in sync
new MutationObserver(updateSharedButtons).observe(elFeed, { childList: true });

buildFeed().catch(err => {
  console.error(err);
  elStatus.hidden = false;
  elStatus.textContent = t('feed.failed');
});
