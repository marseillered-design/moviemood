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
        detected.textContent = t('home.region_detected');
        detected.style.opacity = '1';
        setTimeout(() => { detected.style.opacity = '0'; }, 3000);
      }
      return;
    }
  }
}


function initSearchPromptCarousel(inputEl) {
  if (!inputEl) return;

  // Example queries in the visitor's language (English is the default)
  const promptsByLang = {
    en: { focus: 'Type your mood...', prompts: ["horrors of 90s", "dark sci-fi like Interstellar", "feel-good movies for tonight", "mind-bending thriller", "best comfort anime"] },
    uk: { focus: 'Опишіть свій настрій...', prompts: ["жахи 90-х", "затишний фільм на дощовий вечір", "щось смішне з друзями", "фантастика про космос", "фільм після важкого дня"] },
    ru: { focus: 'Опишите своё настроение...', prompts: ["ужасы 90-х", "уютный фильм на дождливый вечер", "что-то смешное с друзьями", "фантастика про космос", "фильм после тяжёлого дня"] },
    fr: { focus: 'Décrivez votre humeur...', prompts: ["film d'horreur des années 90", "film romantique pour ce soir", "comédie drôle entre amis", "science-fiction dans l'espace", "quelque chose de léger après le travail"] },
    es: { focus: 'Describe tu estado de ánimo...', prompts: ["películas de terror de los 90", "película romántica para esta noche", "comedia divertida con amigos", "ciencia ficción en el espacio", "algo ligero después del trabajo"] }
  };
  const browserLang = window.MM_LANG || 'en';
  const { focus: focusPlaceholder, prompts } = promptsByLang[browserLang] || promptsByLang.en;

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
    inputEl.placeholder = focusPlaceholder;
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

const CLIENT_MOOD_RULES = [
  { pattern: /^funny$/i, data: { genres: [35] } },
  { pattern: /^sad$/i, data: { genres: [18] } },
  { pattern: /^scary$/i, data: { genres: [27, 53] } },
  { pattern: /^action$/i, data: { genres: [28, 12] } },
  { pattern: /^romance$/i, data: { genres: [10749, 35] } },
  { pattern: /^mind$/i, data: { genres: [878, 9648, 53] } },
  { pattern: /^family$/i, data: { genres: [16, 10751] } },
  { pattern: /^mystery$/i, data: { genres: [9648, 53] } },
  { pattern: /^inspiring$/i, data: { genres: [18, 36] } },
  { pattern: /^animated$/i, data: { genres: [16, 10751] } },
  { pattern: /^historical$/i, data: { genres: [36, 18] } },
  { pattern: /^musical$/i, data: { genres: [10402, 35] } },
  { pattern: /female rage|revenge woman|angry woman/i, data: { genres: [18, 53] } },
  { pattern: /gothic romance|dark romance|victorian romance/i, data: { genres: [18, 10749, 9648] } },
  { pattern: /toxic romance|toxic relationship|obsessive love/i, data: { genres: [18, 10749] } },
  { pattern: /villain wins|bad guy wins|no happy ending/i, data: { genres: [53, 80] } },
  { pattern: /found footage|camcorder horror|mockumentary horror/i, data: { genres: [27, 53] } },
  { pattern: /grief movie|grief|loss|mourning/i, data: { genres: [18] } },
  { pattern: /unhinged woman|chaotic woman|unstable woman/i, data: { genres: [18, 53] } },
  { pattern: /coquette movie|soft girl aesthetic|feminine aesthetic/i, data: { genres: [18, 10749] } },
  { pattern: /messy relationships?|relationship drama|toxic couples?/i, data: { genres: [18, 10749] } },
  { pattern: /brain.?melting|mind.?bending|mindfuck/i, data: { genres: [878, 9648, 53] } },
  { pattern: /sad.*beautiful|beautiful.*sad/i, data: { genres: [18, 10749] } },
  { pattern: /easy watch|easy watching|easy to watch|not too heavy|light watch/i, data: { genres: [35, 10749] } },
  { pattern: /films? that ruin you|movie that ruins you|devastating|heartbreaking/i, data: { genres: [18, 10749] } },
  { pattern: /wtf ending|crazy ending|shocking ending|twisted ending/i, data: { genres: [9648, 53] } }
];

function normalizeClientMoodQuery(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferClientMoodData(query) {
  const normalizedQuery = normalizeClientMoodQuery(query);
  if (!normalizedQuery) return null;

  for (const rule of CLIENT_MOOD_RULES) {
    if (rule.pattern.test(normalizedQuery)) {
      return { ...rule.data, inferred_client_side: true };
    }
  }

  const genreMap = [
    { pattern: /horror|horrors|horor|scary|creepy/, genre: 27 },
    { pattern: /action|fight|adrenaline/, genre: 28 },
    { pattern: /animation|animated|cartoon/, genre: 16 },
    { pattern: /comedy|funny|laugh/, genre: 35 },
    { pattern: /crime|criminal|gangster/, genre: 80 },
    { pattern: /documentary|doc|docs/, genre: 99 },
    { pattern: /drama|dramatic/, genre: 18 },
    { pattern: /family|kids|children/, genre: 10751 },
    { pattern: /fantasy|magical/, genre: 14 },
    { pattern: /historical|history|period/, genre: 36 },
    { pattern: /music|musical/, genre: 10402 },
    { pattern: /mystery|mysterious/, genre: 9648 },
    { pattern: /romance|romantic|love/, genre: 10749 },
    { pattern: /sci[ -]?fi|space|future|cyberpunk/, genre: 878 },
    { pattern: /thriller|tense|suspense/, genre: 53 },
    { pattern: /war|military/, genre: 10752 },
    { pattern: /western/, genre: 37 }
  ];

  const uniqueGenres = [...new Set(
    genreMap
      .filter(entry => entry.pattern.test(normalizedQuery))
      .map(entry => entry.genre)
  )];

  const decadeMatch = normalizedQuery.match(/(?:19|20)?(\d{2})s/);
  let year_from;
  let year_to;
  if (decadeMatch) {
    let decade = Number(decadeMatch[1]);
    decade += decade < 30 ? 2000 : 1900;
    year_from = decade;
    year_to = decade + 9;
  }

  const hasMoodSignals = /dark|feel-good|feel good|mind-bending|easy watch|cozy|disturbing|inspiring|sad|funny|scary|romance|mystery|historical|musical|animated|family/.test(normalizedQuery);

  if (uniqueGenres.length || year_from || hasMoodSignals) {
    return {
      genres: uniqueGenres.length ? uniqueGenres : [18, 28],
      ...(year_from ? { year_from, year_to } : {}),
      inferred_client_side: true
    };
  }

  return null;
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

  // Mood pages link here as index.html?q=...
  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) {
    moodInput.value = initialQuery.slice(0, 120);
    handleSearch();
  } else {
    loadTrendingUnderSearch();
  }

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
  
  // FILTERS PANEL
  const filtersBtn = document.getElementById('filtersBtn');
  const filtersPanel = document.getElementById('filtersPanel');
  filtersBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filtersPanel.classList.toggle('open');
    filtersBtn.classList.toggle('active');
  });
});


async function loadTrendingUnderSearch() {
  if (!moodInput || moodInput.value.trim()) return;

  showSkeleton();
  const results = await fetchTrendingMixed(1, currentType);
  hideSkeleton();

  if (results.length > 0) {
    displayMovies(results, false);
    addLoadMoreBtn();
  } else {
    renderEmptyState(t('home.empty_trending'));
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

  currentQuery = query;

  // Keep the query in the address bar: "back" from a movie page returns to these results
  try { history.replaceState(null, '', `?q=${encodeURIComponent(query)}`); } catch (e) {}

  if (resetPage) {
    currentPage = 1;
    lastAiData = null;
    removeLoadMoreBtn();
  }

  renderUnderstood(null);
  showSkeleton();

  if (currentType === 'trending') {
    const results = await searchTMDB(query, currentPage);
    hideSkeleton();
    if (results.length > 0) {
      displayMovies(results, false);
      addLoadMoreBtn();
      return;
    }
    renderEmptyState(t('home.empty_title'));
    return;
  }

  const { results: aiResults, aiData } = await searchWithAI(query, currentPage);
  const resolvedAiData = aiData || inferClientMoodData(query);
  lastAiData = resolvedAiData;

  if (aiResults.length > 0) {
    hideSkeleton();
    renderUnderstood(aiData);
    displayMovies(aiResults, false);
    addLoadMoreBtn();
    return;
  }

  if (!aiData && resolvedAiData) {
    const clientMoodResults = await fetchByAiData(resolvedAiData, currentPage);
    if (clientMoodResults.length > 0) {
      hideSkeleton();
      renderUnderstood(resolvedAiData);
      displayMovies(clientMoodResults, false);
      addLoadMoreBtn();
      return;
    }
  }

  const isTitleLikeQuery = !resolvedAiData || Boolean(resolvedAiData.search_query);
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
  renderEmptyState(t('home.empty_search'));
}

async function handleSurprise() {
  renderUnderstood(null);
  const randomPage = Math.floor(Math.random() * 5) + 1;
  currentPage = randomPage;
  removeLoadMoreBtn();
  showSkeleton();

  let url;

  if (currentType === 'documentary') {
    // Documentary — always genre 99, movie endpoint
    lastAiData = { genres: [99] };
    url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&with_genres=99&sort_by=popularity.desc&vote_count.gte=100&page=${randomPage}`;
  } else {
    const genres = [28, 12, 16, 35, 80, 18, 14, 27, 9648, 10749, 878, 53, 37];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    lastAiData = { genres: [randomGenre] };
    const endpoint = currentType === 'tv' ? 'tv' : 'movie';
    url = `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&with_genres=${randomGenre}&sort_by=popularity.desc&vote_count.gte=100&page=${randomPage}`;
  }

  try {
    const res = await fetch(url);
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
        const res = await fetch(`${TMDB_BASE_URL}/${type}/${fav.id}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`);
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
      fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&page=${page}`),
      fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&page=${page}`)
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

  renderEmptyState(t('home.empty_trending'));
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
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(query)}&page=${page}`
      );
      const data = await res.json();
      const filtered = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
      return await personalizeItems(filtered, { preferredType: 'trending' });
    }

    const endpoint = currentType === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(query)}&page=${page}`
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
    const endpoint = (currentType === 'tv' || aiData.media_type === 'tv') ? 'tv' : 'movie';

    // 0. The server only half-understood the query: it may be a title in another language
    if (aiData.title_query) {
      const titleResults = await searchTMDB(aiData.title_query, page);
      // best-known titles first, not obscure spin-offs
      if (titleResults.length > 0) return [...titleResults].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }

    // 1. Company-based discover (Pixar, Marvel, DC, Ghibli etc.)
    if (aiData.company_id) {
      let yearParam = '';
      if (aiData.year_from) yearParam += `&primary_release_date.gte=${aiData.year_from}-01-01`;
      if (aiData.year_to) yearParam += `&primary_release_date.lte=${aiData.year_to}-12-31`;
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&with_companies=${aiData.company_id}&sort_by=popularity.desc&vote_count.gte=20&page=${page}${yearParam}`
      );
      const data = await res.json();
      return (data.results || []).map(item => ({ ...item, media_type: item.media_type || endpoint }));
    }
    
    // 2. Specific search query (director, actor, franchise, language)
    if (aiData.search_query) {
      return await searchTMDB(aiData.search_query, page);
    }
    
    // 3. Discover by genre / topic / country / years
    if (aiData.genres?.length || aiData.genres_any?.length || aiData.keywords?.length || aiData.language || aiData.year_from || aiData.year_to) {
      const isDocumentary = currentType === 'documentary';
      // A mood recipe asks for any of several genres ("cozy" = comedy, romance or family)
      const useAnyGenre = !isDocumentary && aiData.genres_any?.length > 0;
      let genreIds = isDocumentary ? [99] : (useAnyGenre ? aiData.genres_any : (aiData.genres || []));
      if (endpoint === 'tv') genreIds = mapGenresToTv(genreIds);
      const genreJoiner = useAnyGenre ? '|' : ',';

      const keywordIds = [...(aiData.keywords || [])];
      if (includeAnime && !keywordIds.includes(ANIME_KEYWORD_ID)) keywordIds.push(ANIME_KEYWORD_ID);
      // Mood tags: any of them is enough. A topic ("zombie") always wins over a mood.
      const moodKeywordIds = keywordIds.length ? [] : (aiData.keywords_any || []);
      const isMood = moodKeywordIds.length > 0;

      let yearParam = '';
      const hasYears = aiData.year_from || aiData.year_to;
      const dateField = endpoint === 'movie' ? 'primary_release_date' : 'first_air_date';
      if (aiData.year_from) yearParam += `&${dateField}.gte=${aiData.year_from}-01-01`;
      if (aiData.year_to) yearParam += `&${dateField}.lte=${aiData.year_to}-12-31`;

      // When filtering by era: sort by rating - best films of that period come first.
      // Moods: the most rated (best-loved) films first. Otherwise: well-known modern films first.
      const sortBy = hasYears ? 'vote_average.desc' : (aiData.sort === 'votes' ? 'vote_count.desc' : 'popularity.desc');
      // Popularity alone surfaces brand-new releases nobody has rated yet,
      // so require enough votes and a decent score. Topics, countries, TV and docs
      // are smaller pools and get a lower bar.
      const isNarrow = keywordIds.length > 0 || Boolean(aiData.language);
      const isMainstreamMovie = endpoint === 'movie' && !isDocumentary && !isNarrow && !isMood;
      const minVotes = hasYears ? 200 : (isMainstreamMovie ? 500 : (isMood ? 300 : 100));
      const ratingParam = hasYears ? '' : `&vote_average.gte=${isNarrow ? 6 : 6.5}`;
      const languageParam = aiData.language ? `&with_original_language=${aiData.language}` : '';

      // A bare "comedy" or "horror" means live-action films, not cartoons that share the genre
      const isPlainGenre = endpoint === 'movie' && genreIds.length === 1 && !keywordIds.length && !isMood && ![16, 10751, 99].includes(genreIds[0]);
      // series use their own genre ids; never exclude a genre that was asked for
      const moodExcluded = endpoint === 'tv' ? mapGenresToTv(aiData.exclude_genres || []) : (aiData.exclude_genres || []);
      const excludedGenres = [...moodExcluded.filter(g => !genreIds.includes(g)), ...(isPlainGenre ? [16] : [])];
      const excludeParam = excludedGenres.length ? `&without_genres=${[...new Set(excludedGenres)].join(',')}` : '';

      const buildDiscoverUrl = ({ genres = genreIds, joiner = genreJoiner, keywords = keywordIds, moodKeywords = moodKeywordIds, votes = minVotes }) =>
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&sort_by=${sortBy}&vote_count.gte=${votes}&page=${page}` +
        (genres.length ? `&with_genres=${genres.join(joiner)}` : '') +
        (keywords.length ? `&with_keywords=${keywords.join(',')}` : '') +
        (moodKeywords.length ? `&with_keywords=${moodKeywords.join('|')}` : '') +
        excludeParam +
        `${yearParam}${ratingParam}${languageParam}`;

      // From the exact request to looser ones; the first that gives a full row wins
      const attempts = [{}];
      if (isMood) attempts.push({ moodKeywords: [], votes: 200 });
      if (keywordIds.length && genreIds.length) attempts.push({ genres: [], votes: Math.min(minVotes, 100) });
      if (keywordIds.length > 1) attempts.push({ genres: [], keywords: [keywordIds[0]], votes: 50 });
      if (genreIds.length > 1 && !useAnyGenre) attempts.push({ joiner: '|', votes: 20 });
      if (isNarrow) attempts.push({ votes: 20 });

      // Later pages must continue the list that page 1 started
      const startAt = page > 1 && Number.isInteger(aiData._attempt) ? aiData._attempt : 0;
      const endAt = page > 1 ? startAt + 1 : attempts.length;
      let best = [];
      for (let i = startAt; i < endAt; i++) {
        const data = await fetch(buildDiscoverUrl(attempts[i])).then(res => res.json());
        const results = data.results || [];
        if (results.length > best.length) {
          best = results;
          if (page === 1) aiData._attempt = i;
        }
        if (results.length >= 6) break;
      }

      // "comedy" should show films that are comedies first of all, not action films with a few jokes
      if (isPlainGenre) {
        const primary = best.filter(item => (item.genre_ids || []).slice(0, 2).includes(genreIds[0]));
        if (primary.length >= 8) best = primary;
      }
      return best.map(item => ({ ...item, media_type: item.media_type || endpoint }));
    }
    
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

const ANIME_KEYWORD_ID = 210024;

// TMDB uses different genre ids for series; movie ids would return nothing
// (there is no horror genre for series: supernatural mystery is the closest)
const TV_GENRE_MAP = { 28: [10759], 12: [10759], 14: [10765], 878: [10765], 10752: [10768], 27: [9648, 10765], 53: [9648], 10749: [18], 36: [18], 10402: [] };

function mapGenresToTv(genreIds) {
  const mapped = genreIds
    .flatMap(id => (id in TV_GENRE_MAP ? TV_GENRE_MAP[id] : [id]));
  return [...new Set(mapped)];
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

// Shows how the query was understood: "Showing: Comedy · 1980s · #zombie"
function renderUnderstood(aiData) {
  const row = document.getElementById('understoodRow');
  if (!row) return;

  const chips = [];
  if (aiData) {
    if (aiData.media_type === 'tv' || currentType === 'tv') chips.push(t('type.series'));
    if (aiData.mood) chips.push(t(`moodname.${aiData.mood}`));
    // with a mood recipe the genres are only "any of", the mood name says more
    if (!aiData.genres_any) (aiData.genres || []).forEach(id => chips.push(t(`genre.${id}`)));
    (aiData.topics || []).forEach(topic => chips.push(`#${topic}`));
    if (aiData.language) chips.push(mmDisplayName('language', aiData.language));

    const { year_from: from, year_to: to } = aiData;
    if (from && to && to - from === 9) chips.push(t('home.decade', { year: from }));
    else if (from && to) chips.push(from === to ? String(from) : `${from}–${to}`);
    else if (to) chips.push(t('home.until_year', { year: to }));
    else if (from) chips.push(t('home.since_year', { year: from }));

    if (aiData.search_query) chips.push(`${t('home.title_search')}: «${aiData.search_query}»`);
  }

  row.textContent = '';
  row.hidden = chips.length === 0;
  if (!chips.length) return;

  const label = document.createElement('span');
  label.className = 'understood-label';
  label.textContent = t('home.understood');
  row.appendChild(label);
  chips.forEach(text => {
    const chip = document.createElement('span');
    chip.className = 'understood-chip';
    chip.textContent = text;
    row.appendChild(chip);
  });
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
  btn.textContent = t('home.load_more');
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

const FAV_ICONS = { on: '\u2764\uFE0F', off: '\uD83E\uDD0D' };
// an eye for "not watched yet", a check mark for "watched"
const WATCHED_ICONS = { on: '\u2705', off: '\uD83D\uDC41\uFE0F' };

function setCardButton(button, active, icons, labels) {
  button.textContent = active ? icons.on : icons.off;
  button.title = t(active ? labels.on : labels.off);
  button.setAttribute('aria-label', button.title);
}

function createCard(movie) {
  // A real link: opens in the same tab, and "open in new tab" still works for those who want it
  const card = document.createElement('a');
  const poster = movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  const cardMediaType = normalizeMediaType(movie.media_type || currentType);
  const watchedActive = isWatched(movie.id, cardMediaType);
  const title = movie.title || movie.name || '';
  const detailsUrl = () => `movie.html?id=${movie.id}&type=${cardMediaType}&region=${currentRegion}`;
  const favLabels = { on: 'card.unfavorite', off: 'card.favorite' };
  const watchedLabels = { on: 'card.unmark_watched', off: 'card.mark_watched' };

  card.className = `movie-card${watchedActive ? ' watched' : ''}`;
  card.href = detailsUrl();

  card.innerHTML = `
    <div class="card-poster-wrapper">
      <img src="${poster}" class="movie-poster" loading="lazy" alt="">
      ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
      ${watchedActive ? `<span class="watched-badge">${t('card.watched')}</span>` : ''}
      <div class="card-overlay"></div>
    </div>
    <div class="card-info">
      <h3 class="card-title"></h3>
      <span class="card-year">${(movie.release_date || movie.first_air_date || '').slice(0,4)}</span>
    </div>
    <button class="fav-btn" type="button"></button>
    <button class="watched-btn" type="button"></button>
  `;
  card.querySelector('.card-title').textContent = title;
  card.querySelector('.movie-poster').alt = title;

  const favBtn = card.querySelector('.fav-btn');
  const watchedBtn = card.querySelector('.watched-btn');
  setCardButton(favBtn, isFavorite(movie.id, cardMediaType), FAV_ICONS, favLabels);
  setCardButton(watchedBtn, watchedActive, WATCHED_ICONS, watchedLabels);

  favBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(movie);
    setCardButton(favBtn, isFavorite(movie.id, cardMediaType), FAV_ICONS, favLabels);
  });

  watchedBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatched(movie);
    const active = isWatched(movie.id, cardMediaType);
    setCardButton(watchedBtn, active, WATCHED_ICONS, watchedLabels);
    card.classList.toggle('watched', active);

    const posterWrap = card.querySelector('.card-poster-wrapper');
    let badge = card.querySelector('.watched-badge');
    if (active && !badge) {
      badge = document.createElement('span');
      badge.className = 'watched-badge';
      badge.textContent = t('card.watched');
      posterWrap.appendChild(badge);
    }
    if (!active && badge) badge.remove();
  });

  // The streaming region may have changed since the card was drawn
  card.addEventListener('click', () => { card.href = detailsUrl(); });

  return card;
}


























