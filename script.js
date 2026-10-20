// TMDB
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
// card-sized posters: w342 is sharp at the size cards are shown and half the weight of w500
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
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
// Any country code: TMDB knows where to watch in almost every country
const isRegionCode = code => /^[A-Z]{2}$/.test(String(code || ''));
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

// The picker in the filters lists a few countries; a detected one that is not there is added
function setRegion(code) {
  currentRegion = code;
  if (!countrySelect) return;
  if (![...countrySelect.options].some(option => option.value === code)) {
    const option = document.createElement('option');
    option.value = code;
    const flag = String.fromCodePoint(...[...code].map(ch => 0x1F1A5 + ch.charCodeAt(0)));
    option.textContent = `${flag} ${mmDisplayName('region', code)}`;
    countrySelect.appendChild(option);
  }
  countrySelect.value = code;
}

// Where the visitor is, fresh on every visit (people travel). A country picked by hand
// in the filters wins until it is changed again.
async function detectRegion() {
  const saved = mmRegion.get();
  let picked = false;
  try { picked = localStorage.getItem('region_manual') === '1'; } catch (e) {}
  if (isRegionCode(saved)) setRegion(saved);
  if (picked && isRegionCode(saved)) return;

  const providers = [
    // Vercel knows the country of every request: no third-party service, nothing to block
    async () => {
      const data = await fetchJsonWithTimeout('/api/page?kind=geo');
      return data?.country;
    },
    async () => {
      const data = await fetchJsonWithTimeout('https://ipapi.co/json/');
      return data?.country_code;
    },
    async () => {
      const data = await fetchJsonWithTimeout('https://ipwho.is/');
      return data?.country_code;
    }
  ];

  for (const getCountry of providers) {
    const country = String(await getCountry() || '').toUpperCase();
    if (isRegionCode(country)) {
      setRegion(country);
      mmRegion.set(country);
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
    es: { focus: 'Describe tu estado de ánimo...', prompts: ["películas de terror de los 90", "película romántica para esta noche", "comedia divertida con amigos", "ciencia ficción en el espacio", "algo ligero después del trabajo"] },
    de: { focus: 'Beschreib deine Stimmung...', prompts: ["Horrorfilme der 90er", "romantischer Film für heute Abend", "lustige Komödie mit Freunden", "Science-Fiction im Weltraum", "etwas Leichtes nach der Arbeit"] }
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
    mmRegion.set(currentRegion);
    // picked by hand: kept instead of the detected country (see detectRegion)
    try { localStorage.setItem('region_manual', '1'); } catch (e) {}
  });
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      currentPage = 1;
      lastAiData = null;
      removeLoadMoreBtn();
      if (moodInput.value.trim()) handleSearch(true);
      else loadTrendingMixed();
    });
  });
  
  document.getElementById('animeToggle').addEventListener('change', e => {
    includeAnime = e.target.checked;
  });
  
  document.getElementById('surpriseBtn').addEventListener('click', handleSurprise);
  // the small round chips on phones do what the big buttons do
  document.querySelectorAll('[data-press]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById(chip.dataset.press)?.click();
      chip.classList.toggle('active', document.getElementById(chip.dataset.press)?.classList.contains('active'));
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
});


async function loadTrendingUnderSearch() {
  if (!moodInput || moodInput.value.trim()) return;
  await loadTrendingMixed(true);
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
  setResultsHeading(null);
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
  setResultsHeading(null);
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

// What is popular this week, for the tab that is open: films, series or documentaries
// ("trending" is both films and series)
async function fetchTrendingMixed(page = 1, preferredType = currentType) {
  try {
    const base = `api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&page=${page}`;
    const sources = currentType === 'documentary'
      ? [['movie', `${TMDB_BASE_URL}/discover/movie?${base}&with_genres=99&sort_by=popularity.desc&vote_count.gte=50`]]
      : (currentType === 'trending' ? ['movie', 'tv'] : [normalizeMediaType(currentType)])
        .map(type => [type, `${TMDB_BASE_URL}/trending/${type}/week?${base}`]);

    const lists = await Promise.all(sources.map(async ([type, url]) => {
      const res = await fetch(url);
      const data = res.ok ? await res.json() : { results: [] };
      return (data.results || []).map(item => ({ ...item, media_type: type }));
    }));

    const merged = lists.flat()
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

// "Popular movies this week" above the list nobody asked for yet; a search has its own
// "Showing: ..." line instead (null hides the heading)
function setResultsHeading(text) {
  const heading = document.getElementById('resultsHeading');
  if (!heading) return;
  heading.textContent = text || '';
  heading.hidden = !text;
}

async function loadTrendingMixed(resetPage = true) {
  if (resetPage) {
    currentPage = 1;
    currentQuery = '';
    lastAiData = { mode: 'trending_mixed' };
    removeLoadMoreBtn();
    renderUnderstood(null);
    setResultsHeading(t(`home.popular_${currentType === 'tv' || currentType === 'documentary' ? currentType : 'movie'}`));
  }

  showSkeleton();
  const results = await fetchTrendingMixed(currentPage, currentType);
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
    results = await fetchTrendingMixed(currentPage, currentType);
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
      return markTitleMatches(await personalizeItems(filtered, { preferredType: 'trending' }));
    }

    const endpoint = currentType === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await res.json();
    return markTitleMatches(data.results || []);
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Found by name: shown even when already watched (see displayMovies)
const markTitleMatches = items => items.map(item => ({ ...item, title_match: true }));

// "inception", "amelie": for comparing what was typed with TMDB titles
const normalizeTitle = text => String(text || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '');

const tmdbJson = url => fetch(url).then(res => res.json()).catch(() => ({}));
const LIKE_LOCALES = ['en-US', 'ru-RU', 'uk-UA', 'fr-FR', 'es-ES'];

// The title the visitor compares with. The AI names it in English with its year; otherwise
// the typed name is looked up, in the page language first ("Начало" is Inception in Russian).
async function findLikeSource(aiData) {
  const src = aiData.like_source;
  if (src?.title) {
    const yearParam = src.year ? `&${src.type === 'tv' ? 'first_air_date_year' : 'year'}=${src.year}` : '';
    const data = await tmdbJson(`${TMDB_BASE_URL}/search/${src.type}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(src.title)}${yearParam}`);
    const item = (data.results || [])[0];
    if (item) return { ...item, media_type: src.type };
  }

  const wanted = normalizeTitle(aiData.like_title);
  const locales = [TMDB_LANG, ...LIKE_LOCALES.filter(code => code !== TMDB_LANG)];
  let fallback = null;
  for (const locale of locales) {
    const data = await tmdbJson(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=${locale}&query=${encodeURIComponent(aiData.like_title)}`);
    const candidates = (data.results || []).slice(0, 10)
      .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && (item.vote_count || 0) >= 50);
    // the title that was meant: its name starts with what was typed, and many people know it
    const named = candidates.filter(item => [item.title, item.name, item.original_title, item.original_name]
      .some(name => name && normalizeTitle(name).startsWith(wanted)));
    if (named.length) return named.sort((a, b) => b.vote_count - a.vote_count)[0];
    fallback = fallback || candidates.find(item => item.vote_count >= 1000) || null;
  }
  return fallback;
}

// The AI's picks, each looked up on TMDB (in the page language, so titles and posters fit)
async function resolveLikePicks(picks) {
  const found = await Promise.all(picks.map(async pick => {
    const yearParam = pick.year ? `&${pick.type === 'tv' ? 'first_air_date_year' : 'year'}=${pick.year}` : '';
    const data = await tmdbJson(`${TMDB_BASE_URL}/search/${pick.type}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&query=${encodeURIComponent(pick.title)}${yearParam}`);
    // "Paprika" is the anime, not "Paprika Western": the same name first, then the best-known
    const results = (data.results || []).slice(0, 5);
    const wanted = normalizeTitle(pick.title);
    const item = results.find(r => [r.title, r.name, r.original_title, r.original_name].some(name => normalizeTitle(name) === wanted))
      || results.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0];
    return item ? { ...item, media_type: pick.type } : null;
  }));
  return found.filter(Boolean);
}

// Without the AI: titles that share the source's TMDB keywords, rare keywords counting more
// ("subconscious" says more than "spy"), plus a little for TMDB's own recommendations.
// Sequels are left out: "like Harry Potter" means other worlds, not the next Harry Potter.
async function rankLikeByKeywords(source) {
  const { id, type } = source;
  const base = `${TMDB_BASE_URL}/${type}/${id}`;
  const [details, keywordData, recommendations] = await Promise.all([
    tmdbJson(`${base}?api_key=${TMDB_API_KEY}`),
    tmdbJson(`${base}/keywords?api_key=${TMDB_API_KEY}`),
    tmdbJson(`${base}/recommendations?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}`)
  ]);
  const keywords = (keywordData.keywords || keywordData.results || []).slice(0, 20);
  const genres = new Set((details.genres || []).map(g => g.id));
  const ownName = normalizeTitle(details.title || details.name).slice(0, 8);

  const lists = await Promise.all(keywords.map(keyword => tmdbJson(
    `${TMDB_BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&language=${TMDB_LANG}&with_keywords=${keyword.id}&sort_by=vote_count.desc&vote_count.gte=${type === 'tv' ? 150 : 300}`
  )));
  const score = new Map();
  const items = new Map();
  const add = (item, weight) => {
    score.set(item.id, (score.get(item.id) || 0) + weight);
    items.set(item.id, item);
  };
  lists.forEach(list => {
    const weight = Math.log10(5000 / Math.max(list.total_results || 1, 5));
    (list.results || []).forEach(item => add(item, weight));
  });
  (recommendations.results || []).slice(0, 10).forEach(item => add(item, 0.5));
  score.delete(id);

  return [...score.entries()]
    .map(([itemId, points]) => {
      const item = items.get(itemId);
      const sharedGenres = (item.genre_ids || []).filter(g => genres.has(g)).length;
      return { item: { ...item, media_type: type }, sharedGenres, total: points + sharedGenres * 0.6 };
    })
    .filter(({ item, sharedGenres }) => sharedGenres > 0 && item.poster_path && !normalizeTitle(item.title || item.name).startsWith(ownName))
    .sort((a, b) => b.total - a.total)
    .map(({ item }) => item);
}

// "movies like Inception". Page 1: the AI's picks (or the keyword ranking without them);
// next pages continue with the keyword ranking. What was shown is kept in aiData.
async function fetchLikeTitle(aiData, page) {
  if (!aiData._like) {
    const source = await findLikeSource(aiData);
    if (!source) return [];
    aiData._like = { id: source.id, type: source.media_type, name: source.title || source.name };
    aiData._likeShown = new Set([`${source.media_type}:${source.id}`]);
  }
  const shown = aiData._likeShown;
  const fresh = item => {
    const key = `${item.media_type}:${item.id}`;
    if (!item.poster_path || shown.has(key)) return false;
    shown.add(key);
    return true;
  };

  let items = page === 1 && aiData.like_picks?.length ? (await resolveLikePicks(aiData.like_picks)).filter(fresh) : [];
  if (items.length < 12) {
    aiData._likeRanked = aiData._likeRanked || await rankLikeByKeywords(aiData._like);
    for (const item of aiData._likeRanked) {
      if (items.length >= 20) break;
      if (fresh(item)) items.push(item);
    }
  }
  return items;
}

async function fetchByAiData(aiData, page = 1) {
  try {
    const endpoint = (currentType === 'tv' || aiData.media_type === 'tv') ? 'tv' : 'movie';

    if (aiData.like_title && !aiData._likeMissing) {
      const similar = await fetchLikeTitle(aiData, page);
      if (similar.length) return similar;
      // title not found: the rest of the query ("dark sci-fi") decides
      if (!aiData._like) aiData._likeMissing = true;
      else return [];
    }

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
    // ("nothing scary" has no genre at all, only things to leave out)
    if (aiData.genres?.length || aiData.genres_any?.length || aiData.keywords?.length || aiData.language || aiData.year_from || aiData.year_to ||
        aiData.exclude_genres?.length || aiData.exclude_keywords?.length) {
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
      // Moods and topics ("zombie", "friendship"): the most rated (best-loved) films first,
      // not this month's releases. Otherwise: well-known modern films first.
      const sortBy = hasYears ? 'vote_average.desc' : (aiData.sort === 'votes' || keywordIds.length ? 'vote_count.desc' : 'popularity.desc');
      // Popularity alone surfaces brand-new releases nobody has rated yet,
      // so require enough votes and a decent score. Topics, countries, TV and docs
      // are smaller pools and get a lower bar.
      const isNarrow = keywordIds.length > 0 || Boolean(aiData.language);
      const isMainstreamMovie = endpoint === 'movie' && !isDocumentary && !isNarrow && !isMood;
      const minVotes = hasYears ? 200 : (isMainstreamMovie ? 1000 : (isMood ? 300 : 100));
      const ratingParam = hasYears ? '' : `&vote_average.gte=${isNarrow ? 6 : 6.5}`;
      const languageParam = aiData.language ? `&with_original_language=${aiData.language}` : '';

      // A bare "comedy" or "horror" means live-action films, not cartoons that share the genre
      const isPlainGenre = endpoint === 'movie' && genreIds.length === 1 && !keywordIds.length && !isMood && ![16, 10751, 99].includes(genreIds[0]);
      // "epic fantasy adventure" too: cartoons only when animation, family or anime was asked for
      const wantsCartoons = includeAnime || isMood || genreIds.some(g => [16, 10751].includes(g));
      const skipCartoons = endpoint === 'movie' && !isDocumentary && genreIds.length > 0 && !wantsCartoons;
      // series use their own genre ids; never exclude a genre that was asked for
      const moodExcluded = endpoint === 'tv' ? mapGenresToTv(aiData.exclude_genres || []) : (aiData.exclude_genres || []);
      const excludedGenres = [...moodExcluded.filter(g => !genreIds.includes(g)), ...(isPlainGenre || skipCartoons ? [16] : [])];
      const excludeParam = (excludedGenres.length ? `&without_genres=${[...new Set(excludedGenres)].join(',')}` : '') +
        // "not too gory", "no tearjerkers"
        (aiData.exclude_keywords?.length ? `&without_keywords=${aiData.exclude_keywords.join('|')}` : '') +
        // "not too long" (series only have episode lengths)
        (aiData.max_runtime && endpoint === 'movie' ? `&with_runtime.lte=${aiData.max_runtime}` : '');

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

// Films that never arrive (a blocker extension, a filtering network) must not leave grey
// placeholders forever: after this long the visitor gets an explanation and a retry button
const LOAD_TIMEOUT_MS = 10000;
let loadTimer = null;

function showSkeleton() {
  moviesGrid.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'movie-card skeleton';
    skeleton.innerHTML = `<div class="skeleton-poster"></div><div class="skeleton-title"></div>`;
    moviesGrid.appendChild(skeleton);
  }
  clearTimeout(loadTimer);
  loadTimer = setTimeout(showLoadError, LOAD_TIMEOUT_MS);
}

function hideSkeleton() {
  clearTimeout(loadTimer);
  document.querySelectorAll('.skeleton').forEach(s => s.remove());
}

function showLoadError() {
  if (!moviesGrid.querySelector('.skeleton')) return;
  const box = document.createElement('div');
  box.className = 'load-error';
  const text = document.createElement('p');
  text.textContent = t('home.load_error');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-btn';
  button.textContent = t('home.retry');
  // the query is kept in the address bar, so a reload repeats the same search
  button.addEventListener('click', () => window.location.reload());
  box.append(text, button);
  moviesGrid.replaceChildren(box);
  removeLoadMoreBtn();
}

function renderEmptyState(message) {
  moviesGrid.innerHTML = `<p style="color:#ff6b6b; text-align:center; padding: 40px;">${message}</p>`;
}

// Shows how the query was understood: "Showing: Comedy · 1980s · #zombie"
function renderUnderstood(aiData) {
  const row = document.getElementById('understoodRow');
  if (!row) return;

  const chips = [];
  if (aiData?._like) {
    // "movies like Inception": the results are that title's recommendations, genres say nothing
    chips.push(t('home.like', { title: aiData._like.name }));
  } else if (aiData) {
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

    (aiData.avoid || []).forEach(what => chips.push(`🚫 ${t(`avoid.${what}`)}`));

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

// Titles marked as watched are not suggested again (they stay on the "Watched" page),
// unless the visitor looked one up by name
function displayMovies(movies, append = false) {
  if (!append) moviesGrid.innerHTML = '';
  const watched = new Set(getWatchedList().map(w => `${normalizeMediaType(w.media_type)}:${w.id}`));
  movies
    .filter(movie => movie.title_match || !watched.has(`${normalizeMediaType(movie.media_type || currentType)}:${movie.id}`))
    .forEach(movie => moviesGrid.appendChild(createCard(movie)));
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
// The eye in both states, like the heart: a watched title gets a lit-up eye (see .watched-btn.active)
const WATCHED_ICONS = { on: '\uD83D\uDC41\uFE0F', off: '\uD83D\uDC41\uFE0F' };

function setCardButton(button, active, icons, labels) {
  button.textContent = active ? icons.on : icons.off;
  button.classList.toggle('active', active);
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
  const detailsUrl = () => mmTitleUrl(movie, cardMediaType);
  const favLabels = { on: 'card.unfavorite', off: 'card.favorite' };
  const watchedLabels = { on: 'card.unmark_watched', off: 'card.mark_watched' };

  card.className = `movie-card${watchedActive ? ' watched' : ''}`;
  card.href = detailsUrl();

  card.innerHTML = `
    <div class="card-poster-wrapper">
      <img src="${poster}" class="movie-poster" loading="lazy" alt="">
      ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
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
  });

  // The streaming region may have changed since the card was drawn
  card.addEventListener('click', () => { card.href = detailsUrl(); });

  return card;
}


























