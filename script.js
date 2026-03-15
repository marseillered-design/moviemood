// TMDB
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
let currentRegion = 'US';
let currentType = 'movie';
let includeAnime = false;
let currentPage = 1;
let currentQuery = '';
let lastAiData = null;
let isLoading = false;

const moodInput = document.getElementById('moodInput');
const searchBtn = document.getElementById('searchBtn');
const countrySelect = document.getElementById('countrySelect');
const moviesGrid = document.getElementById('moviesGrid');
const SUPPORTED_REGIONS = ['US','CA','GB','DE','FR','IT','ES','NL','BE','AT','CH','SE','NO','DK','FI','PL','PT','IE','CZ','GR','UA'];
const PERSONALIZATION_PROFILE_TTL_MS = 30 * 60 * 1000;
const PROVIDER_AVAILABILITY_TTL_MS = 6 * 60 * 60 * 1000;
let personalizationProfileCache = { signature: '', expiresAt: 0, profile: null };
const providerAvailabilityCache = new Map();

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function detectRegion() {
  const providers = [
    async () => {
      const data = await fetchJsonWithTimeout('https://ipapi.co/json/');
      return data?.country_code;
    },
    async () => {
      const data = await fetchJsonWithTimeout('https://ipwho.is/');
      return data?.country_code;
    },
    async () => {
      const data = await fetchJsonWithTimeout('https://ipinfo.io/json');
      return data?.country;
    }
  ];

  for (const getCountry of providers) {
    const country = String(await getCountry() || '').toUpperCase();
    if (country && SUPPORTED_REGIONS.includes(country)) {
      currentRegion = country;
      if (countrySelect) countrySelect.value = country;
      const detected = document.getElementById('regionDetected');
      if (detected) {
        detected.textContent = 'Auto-detected';
        detected.style.opacity = '1';
        setTimeout(() => { detected.style.opacity = '0'; }, 3000);
      }
      return;
    }
  }
}


function initSearchPromptCarousel(inputEl) {
  if (!inputEl) return;

  const prompts = [
    "horrors of 90s",
    "dark sci-fi like Interstellar",
    "feel-good movies for tonight",
    "mind-bending thriller",
    "best comfort anime"
  ];

  let promptIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timer = null;
  let running = false;

  const stop = () => {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const tick = () => {
    if (!running) return;

    const currentPrompt = prompts[promptIndex];

    if (!deleting) {
      charIndex += 1;
      inputEl.placeholder = currentPrompt.slice(0, charIndex);

      if (charIndex >= currentPrompt.length) {
        timer = setTimeout(() => {
          deleting = true;
          tick();
        }, 900);
        return;
      }

      timer = setTimeout(tick, 48);
      return;
    }

    charIndex -= 1;
    inputEl.placeholder = currentPrompt.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      deleting = false;
      promptIndex = (promptIndex + 1) % prompts.length;
      timer = setTimeout(tick, 260);
      return;
    }

    timer = setTimeout(tick, 28);
  };

  const start = () => {
    if (running || inputEl.value.trim()) return;
    running = true;
    tick();
  };

  inputEl.addEventListener('focus', () => {
    stop();
    inputEl.placeholder = 'Type your mood...';
  });

  inputEl.addEventListener('input', () => {
    if (inputEl.value.trim()) stop();
  });

  inputEl.addEventListener('blur', () => {
    if (!inputEl.value.trim()) {
      inputEl.placeholder = '';
      charIndex = 0;
      deleting = false;
      start();
    }
  });

  inputEl.placeholder = '';
  start();
}
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch (e) {}
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    root.setAttribute('data-theme', 'dark');
  }

  themeToggle?.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    try { localStorage.setItem('theme', newTheme); } catch (e) {}
  });
  detectRegion();
  initSearchPromptCarousel(moodInput);
  loadTrendingUnderSearch();
  
  searchBtn.addEventListener('click', handleSearch);
  moodInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSearch();
  });
  
  countrySelect.addEventListener('change', e => {
    currentRegion = e.target.value;
  });
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      currentPage = 1;
      lastAiData = null;
      removeLoadMoreBtn();
      if (currentType === 'trending') {
        currentQuery = '';
        moodInput.value = '';
        loadTrendingMixed();
      }
    });
  });
  
  document.getElementById('animeToggle').addEventListener('change', e => {
    includeAnime = e.target.checked;
  });
  
  document.getElementById('surpriseBtn').addEventListener('click', handleSurprise);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MOOD PICKER POPUP
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const moodPickerBtn = document.getElementById('moodPickerBtn');
  const moodPickerPopup = document.getElementById('moodPickerPopup');
  
  moodPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moodPickerPopup.classList.toggle('open');
    moodPickerBtn.classList.toggle('active');
  });
  
  document.querySelectorAll('.mood-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      moodInput.value = btn.dataset.mood;
      moodPickerPopup.classList.remove('open');
      moodPickerBtn.classList.remove('active');
      
      // ðŸŽ² RANDOM PAGE FOR VARIETY (1-10) - don't reset in handleSearch
      currentPage = Math.floor(Math.random() * 10) + 1;
      
      handleSearch(false); // false = don't reset page
    });
  });
  
  // FILTERS PANEL
  const filtersBtn = document.getElementById('filtersBtn');
  const filtersPanel = document.getElementById('filtersPanel');
  filtersBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filtersPanel.classList.toggle('open');
    filtersBtn.classList.toggle('active');
  });
  
  // Close popup on outside click
  document.addEventListener('click', (e) => {
    if (!moodPickerPopup.contains(e.target) && e.target !== moodPickerBtn) {
      moodPickerPopup.classList.remove('open');
      moodPickerBtn.classList.remove('active');
    }
  });
});


async function loadTrendingUnderSearch() {
  if (!moodInput || moodInput.value.trim()) return;

  showSkeleton();
  const results = await fetchTrendingMixed(1, currentType);
  hideSkeleton();

  if (results.length > 0) {
    displayMovies(results.slice(0, 12), false);
  } else {
    renderEmptyState('Trending is unavailable right now.');
  }

  removeLoadMoreBtn();
}
async function handleSearch(resetPage = true) {
  const query = moodInput.value.trim();

  if (currentType === 'trending' && !query) {
    await loadTrendingMixed(resetPage);
    return;
  }

  if (!query) return;

  if (resetPage) {
    currentPage = 1;
    currentQuery = query;
    lastAiData = null;
    removeLoadMoreBtn();
  }

  showSkeleton();

  if (currentType === 'trending') {
    const results = await searchTMDB(query, currentPage);
    hideSkeleton();
    if (results.length > 0) {
      displayMovies(results, false);
      addLoadMoreBtn();
      return;
    }
    renderEmptyState('No titles found. Try another search.');
    return;
  }

  const { results: aiResults, aiData } = await searchWithAI(query, currentPage);
  lastAiData = aiData;

  if (aiResults.length > 0) {
    hideSkeleton();
    displayMovies(aiResults, false);
    addLoadMoreBtn();
    return;
  }

  const isTitleLikeQuery = !aiData || Boolean(aiData.search_query);
  if (isTitleLikeQuery) {
    const results = await searchTMDB(query, currentPage);
    if (results.length > 0) {
      hideSkeleton();
      displayMovies(results, false);
      addLoadMoreBtn();
      return;
    }
  }

  hideSkeleton();
  renderEmptyState('No movies found. Try a different mood!');
}
async function handleSurprise() {
  const genres = [28, 12, 16, 35, 80, 18, 14, 27, 9648, 10749, 878, 53, 37];
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  const randomPage = Math.floor(Math.random() * 5) + 1;
  currentPage = randomPage;
  lastAiData = { genres: [randomGenre] };
  removeLoadMoreBtn();
  showSkeleton();
  
  const endpoint = currentType === 'tv' ? 'tv' : 'movie';
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${randomGenre}&sort_by=popularity.desc&vote_count.gte=100&page=${randomPage}`
    );
    const data = await res.json();
    hideSkeleton();
    if (data.results?.length) {
      displayMovies(data.results, false);
      addLoadMoreBtn();
    }
  } catch (e) {
    hideSkeleton();
    console.error(e);
  }
}
function safeGetFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem('favorites') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildFavoritesSignature(favorites) {
  return favorites
    .map(f => `${normalizeMediaType(f.media_type)}:${f.id}`)
    .sort()
    .join('|');
}

function addGenreWeights(target, genreIds, weight = 1) {
  genreIds.forEach(id => {
    const key = String(id);
    target[key] = (target[key] || 0) + weight;
  });
}

function sumGenreBoost(genreIds, weights) {
  if (!genreIds?.length || !weights) return 0;
  return genreIds.reduce((sum, id) => sum + (weights[String(id)] || 0), 0);
}

function detectDominantType(movieWeights, tvWeights) {
  const movieScore = Object.values(movieWeights).reduce((a, b) => a + b, 0);
  const tvScore = Object.values(tvWeights).reduce((a, b) => a + b, 0);
  if (movieScore === 0 && tvScore === 0) return null;
  return tvScore > movieScore ? 'tv' : 'movie';
}

async function buildFavoritesGenreProfile(preferredType = 'trending') {
  const favorites = safeGetFavorites().filter(f => Number.isFinite(Number(f.id))).slice(0, 20);
  const signature = `${buildFavoritesSignature(favorites)}|${preferredType}`;
  const now = Date.now();

  if (
    personalizationProfileCache.profile &&
    personalizationProfileCache.signature === signature &&
    personalizationProfileCache.expiresAt > now
  ) {
    return personalizationProfileCache.profile;
  }

  const movieWeights = {};
  const tvWeights = {};

  await Promise.all(
    favorites.map(async fav => {
      const type = normalizeMediaType(fav.media_type || 'movie');
      try {
        const res = await fetch(`${TMDB_BASE_URL}/${type}/${fav.id}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return;
        const data = await res.json();
        const genreIds = (data.genres || []).map(g => g.id).filter(Boolean);
        if (!genreIds.length) return;
        if (type === 'tv') addGenreWeights(tvWeights, genreIds);
        else addGenreWeights(movieWeights, genreIds);
      } catch {
        // ignore broken favorite detail fetch
      }
    })
  );

  const combinedWeights = { ...movieWeights };
  Object.entries(tvWeights).forEach(([id, value]) => {
    combinedWeights[id] = (combinedWeights[id] || 0) + value;
  });

  const profile = {
    movieWeights,
    tvWeights,
    combinedWeights,
    dominantType: detectDominantType(movieWeights, tvWeights)
  };

  personalizationProfileCache = {
    signature,
    expiresAt: now + PERSONALIZATION_PROFILE_TTL_MS,
    profile
  };

  return profile;
}

async function isRegionAvailable(item, region) {
  const mediaType = normalizeMediaType(item.media_type || 'movie');
  const key = `${mediaType}:${item.id}:${region}`;
  const cached = providerAvailabilityCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.available;
  }

  try {
    const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`);
    if (!res.ok) {
      providerAvailabilityCache.set(key, { available: null, expiresAt: now + 10 * 60 * 1000 });
      return null;
    }

    const data = await res.json();
    const regionData = data?.results?.[region];
    const available = !!(
      regionData &&
      ((regionData.flatrate && regionData.flatrate.length) ||
       (regionData.rent && regionData.rent.length) ||
       (regionData.buy && regionData.buy.length))
    );

    providerAvailabilityCache.set(key, { available, expiresAt: now + PROVIDER_AVAILABILITY_TTL_MS });
    return available;
  } catch {
    providerAvailabilityCache.set(key, { available: null, expiresAt: now + 10 * 60 * 1000 });
    return null;
  }
}

async function personalizeItems(items, { preferredType = currentType } = {}) {
  if (!Array.isArray(items) || !items.length) return [];

  const list = items.filter(item => item && (item.media_type === 'movie' || item.media_type === 'tv' || !item.media_type));
  if (!list.length) return [];

  const profile = await buildFavoritesGenreProfile(preferredType);
  const normalizedPreferred = preferredType === 'trending'
    ? profile.dominantType
    : normalizeMediaType(preferredType || 'movie');

  const checked = list.slice(0, Math.min(24, list.length));
  const availabilityMap = new Map();

  await Promise.all(
    checked.map(async item => {
      const mediaType = normalizeMediaType(item.media_type || 'movie');
      const available = await isRegionAvailable(item, currentRegion);
      availabilityMap.set(`${mediaType}:${item.id}`, available);
    })
  );

  return list
    .map((item, index) => {
      const mediaType = normalizeMediaType(item.media_type || 'movie');
      const itemGenres = item.genre_ids || [];
      const typeWeights = mediaType === 'tv' ? profile.tvWeights : profile.movieWeights;
      const genreBoost = sumGenreBoost(itemGenres, typeWeights) || sumGenreBoost(itemGenres, profile.combinedWeights);
      const typeBoost = normalizedPreferred ? (mediaType === normalizedPreferred ? 18 : -4) : 0;
      const availableInRegion = availabilityMap.get(`${mediaType}:${item.id}`);
      const regionBoost = availableInRegion === true ? 14 : (availableInRegion === false ? -2 : 0);
      const baseScore = (item.popularity || 0) * 0.06 + (item.vote_average || 0) * 1.2;
      const score = baseScore + genreBoost * 2.8 + typeBoost + regionBoost - index * 0.001;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}

async function fetchTrendingMixed(page = 1, preferredType = currentType) {
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`),
      fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&page=${page}`)
    ]);

    const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

    const merged = [
      ...(movieData.results || []).map(item => ({ ...item, media_type: 'movie' })),
      ...(tvData.results || []).map(item => ({ ...item, media_type: 'tv' }))
    ]
      .filter(item => item.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const seen = new Set();
    const deduped = merged.filter(item => {
      const key = `${item.media_type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return await personalizeItems(deduped, { preferredType });
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function loadTrendingMixed(resetPage = true) {
  if (resetPage) {
    currentPage = 1;
    currentQuery = '';
    lastAiData = { mode: 'trending_mixed' };
    removeLoadMoreBtn();
  }

  showSkeleton();
  const results = await fetchTrendingMixed(currentPage, 'trending');
  hideSkeleton();

  if (results.length > 0) {
    displayMovies(results, false);
    addLoadMoreBtn();
    return;
  }

  renderEmptyState('No trending titles right now.');
  removeLoadMoreBtn();
}

async function loadMore() {
  if (isLoading) return;
  isLoading = true;
  currentPage++;

  let results = [];
  if (lastAiData?.mode === 'trending_mixed') {
    results = await fetchTrendingMixed(currentPage, 'trending');
  } else if (lastAiData) {
    results = await fetchByAiData(lastAiData, currentPage);
  } else {
    results = await searchTMDB(currentQuery, currentPage);
  }

  if (results.length > 0) {
    displayMovies(results, true);
  } else {
    removeLoadMoreBtn();
  }

  isLoading = false;
}

async function searchTMDB(query, page = 1) {
  try {
    if (currentType === 'trending') {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
      );
      const data = await res.json();
      const filtered = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
      return await personalizeItems(filtered, { preferredType: 'trending' });
    }

    const endpoint = currentType === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}
async function fetchByAiData(aiData, page = 1) {
  try {
    const endpoint = currentType === 'tv' ? 'tv' : 'movie';
    
    // 1. Company-based discover (Pixar, Marvel, DC, Ghibli etc.)
    if (aiData.company_id) {
      let yearParam = '';
      if (aiData.year_from) yearParam += `&primary_release_date.gte=${aiData.year_from}-01-01`;
      if (aiData.year_to) yearParam += `&primary_release_date.lte=${aiData.year_to}-12-31`;
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_companies=${aiData.company_id}&sort_by=popularity.desc&vote_count.gte=20&page=${page}${yearParam}`
      );
      const data = await res.json();
      return data.results || [];
    }
    
    // 2. Specific search query (director, actor, franchise, language)
    if (aiData.search_query) {
      return await searchTMDB(aiData.search_query, page);
    }
    
    // 3. Genre-based discover
    if (aiData.genres?.length) {
      let genreParam = currentType === 'documentary' ? '99' : aiData.genres.join(',');
      let animeParam = includeAnime ? '&with_keywords=210024' : '';
      let yearParam = '';
      const hasYears = aiData.year_from || aiData.year_to;
      
      if (aiData.year_from) {
        yearParam += endpoint === 'movie'
          ? `&primary_release_date.gte=${aiData.year_from}-01-01`
          : `&first_air_date.gte=${aiData.year_from}-01-01`;
      }
      if (aiData.year_to) {
        yearParam += endpoint === 'movie'
          ? `&primary_release_date.lte=${aiData.year_to}-12-31`
          : `&first_air_date.lte=${aiData.year_to}-12-31`;
      }
      
      // When filtering by era: sort by rating â†’ best films of that period come first
      // Without years: sort by popularity â†’ well-known modern films first
      const sortBy = hasYears ? 'vote_average.desc' : 'popularity.desc';
      const minVotes = hasYears ? 200 : 50;
      
      const buildDiscoverUrl = (genreValue, minimumVotes = minVotes) =>
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${genreValue}&sort_by=${sortBy}&vote_count.gte=${minimumVotes}&page=${page}${animeParam}${yearParam}`;

      let data = await fetch(buildDiscoverUrl(genreParam)).then(res => res.json());

      if ((!data.results || data.results.length === 0) && aiData.genres.length > 1) {
        const relaxedGenreParam = currentType === 'documentary' ? '99' : aiData.genres.join('|');
        data = await fetch(buildDiscoverUrl(relaxedGenreParam, 20)).then(res => res.json());
      }

      return data.results || [];
    }
    
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function searchWithAI(query, page = 1) {
  try {
    const ai = await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!ai.ok) return { results: [], aiData: null };
    const aiData = await ai.json();
    const results = await fetchByAiData(aiData, page);
    return { results, aiData };
  } catch (e) {
    console.error(e);
    return { results: [], aiData: null };
  }
}

function showSkeleton() {
  moviesGrid.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'movie-card skeleton';
    skeleton.innerHTML = `<div class="skeleton-poster"></div><div class="skeleton-title"></div>`;
    moviesGrid.appendChild(skeleton);
  }
}

function hideSkeleton() {
  document.querySelectorAll('.skeleton').forEach(s => s.remove());
}

function renderEmptyState(message) {
  moviesGrid.innerHTML = `<p style="color:#ff6b6b; text-align:center; padding: 40px;">${message}</p>`;
}

function displayMovies(movies, append = false) {
  if (!append) moviesGrid.innerHTML = '';
  movies.forEach(movie => moviesGrid.appendChild(createCard(movie)));
}

function addLoadMoreBtn() {
  removeLoadMoreBtn();
  const btn = document.createElement('button');
  btn.id = 'loadMoreBtn';
  btn.className = 'load-more-btn';
  btn.textContent = 'Load More';
  btn.addEventListener('click', loadMore);
  moviesGrid.parentElement.appendChild(btn);
}

function removeLoadMoreBtn() {
  const btn = document.getElementById('loadMoreBtn');
  if (btn) btn.remove();
}

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function getWatchedList() {
  try {
    const parsed = JSON.parse(localStorage.getItem('watched') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toggleWatched(movie) {
  let watched = getWatchedList();
  const mediaType = normalizeMediaType(movie.media_type || currentType);
  const exists = watched.find(w => w.id === movie.id && normalizeMediaType(w.media_type) === mediaType);

  if (exists) {
    watched = watched.filter(w => !(w.id === movie.id && normalizeMediaType(w.media_type) === mediaType));
  } else {
    watched.push({
      id: movie.id,
      title: movie.title || movie.name,
      poster_path: movie.poster_path,
      media_type: mediaType,
      watched_at: Date.now()
    });
  }

  localStorage.setItem('watched', JSON.stringify(watched));
}

function isWatched(id, mediaType = 'movie') {
  const watched = getWatchedList();
  const normalizedType = normalizeMediaType(mediaType);
  return watched.some(w => w.id === id && normalizeMediaType(w.media_type) === normalizedType);
}

function toggleFavorite(movie) {
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const mediaType = normalizeMediaType(movie.media_type || currentType);
  const exists = favorites.find(f => f.id === movie.id && normalizeMediaType(f.media_type) === mediaType);
  if (exists) {
    favorites = favorites.filter(f => !(f.id === movie.id && normalizeMediaType(f.media_type) === mediaType));
  } else {
    favorites.push({
      id: movie.id,
      title: movie.title || movie.name,
      poster_path: movie.poster_path,
      media_type: mediaType
    });
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(id, mediaType = 'movie') {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const normalizedType = normalizeMediaType(mediaType);
  return favorites.some(f => f.id === id && normalizeMediaType(f.media_type) === normalizedType);
}

function createCard(movie) {
  const card = document.createElement('div');
  const poster = movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  const cardMediaType = normalizeMediaType(movie.media_type || currentType);
  const favoriteActive = isFavorite(movie.id, cardMediaType);
  const watchedActive = isWatched(movie.id, cardMediaType);
  const favIcon = favoriteActive ? '\u2764\uFE0F' : '\uD83E\uDD0D';
  const watchedIcon = watchedActive ? '\uD83C\uDFAC' : '\uD83C\uDF7F';

  card.className = `movie-card${watchedActive ? ' watched' : ''}`;

  card.innerHTML = `
    <div class="card-poster-wrapper">
      <img src="${poster}" class="movie-poster" loading="lazy">
      ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
      ${watchedActive ? '<span class="watched-badge">Watched</span>' : ''}
      <div class="card-overlay"></div>
    </div>
    <div class="card-info">
      <h3 class="card-title">${movie.title || movie.name}</h3>
      <span class="card-year">${(movie.release_date || movie.first_air_date || '').slice(0,4)}</span>
    </div>
    <button class="fav-btn">${favIcon}</button>
    <button class="watched-btn">${watchedIcon}</button>
  `;

  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(movie);
    e.currentTarget.textContent = isFavorite(movie.id, cardMediaType) ? '\u2764\uFE0F' : '\uD83E\uDD0D';
  });

  card.querySelector('.watched-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleWatched(movie);
    const active = isWatched(movie.id, cardMediaType);
    e.currentTarget.textContent = active ? '\uD83C\uDFAC' : '\uD83C\uDF7F';
    card.classList.toggle('watched', active);

    const posterWrap = card.querySelector('.card-poster-wrapper');
    let badge = card.querySelector('.watched-badge');
    if (active && !badge) {
      badge = document.createElement('span');
      badge.className = 'watched-badge';
      badge.textContent = 'Watched';
      posterWrap.appendChild(badge);
    }
    if (!active && badge) badge.remove();
  });

  card.addEventListener('click', () => {
    window.open(`movie.html?id=${movie.id}&type=${cardMediaType}&region=${currentRegion}`, '_blank');
  });

  return card;
}

























