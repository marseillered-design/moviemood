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

document.addEventListener('DOMContentLoaded', () => {
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
    });
  });
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      moodInput.value = btn.dataset.mood;
      handleSearch();
    });
  });
  document.getElementById('animeToggle').addEventListener('change', e => {
    includeAnime = e.target.checked;
  });
  document.getElementById('surpriseBtn').addEventListener('click', handleSurprise);
});

async function handleSearch() {
  const query = moodInput.value.trim();
  if (!query) return;

  currentPage = 1;
  currentQuery = query;
  lastAiData = null;
  removeLoadMoreBtn();
  showSkeleton();

  const words = query.split(' ');
  let results = [];

  if (words.length >= 3) {
    const { results: aiResults, aiData } = await searchWithAI(query, 1);
    lastAiData = aiData;
    if (aiResults.length > 0) {
      hideSkeleton();
      displayMovies(aiResults, false);
      addLoadMoreBtn();
      return;
    }
  }

  results = await searchTMDB(query, 1);
  if (results.length > 0) {
    hideSkeleton();
    displayMovies(results, false);
    addLoadMoreBtn();
    return;
  }

  hideSkeleton();
  moviesGrid.innerHTML = `<p style="color:#ff6b6b; text-align:center; padding: 40px;">No movies found. Try a different mood!</p>`;
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

async function loadMore() {
  if (isLoading) return;
  isLoading = true;
  currentPage++;

  let results = [];

  if (lastAiData) {
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
    let endpoint = currentType === 'tv' ? 'tv' : 'movie';
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
    if (aiData.genres?.length) {
      let endpoint = currentType === 'tv' ? 'tv' : 'movie';
      let genreParam = currentType === 'documentary' ? '99' : aiData.genres.join(',');
      let animeParam = includeAnime ? '&with_keywords=210024' : '';
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&vote_count.gte=100&page=${page}${animeParam}`
      );
      const data = await res.json();
      return data.results || [];
    }
    if (aiData.search_query) {
      return await searchTMDB(aiData.search_query, page);
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
    skeleton.innerHTML = `
      <div class="skeleton-poster"></div>
      <div class="skeleton-title"></div>
    `;
    moviesGrid.appendChild(skeleton);
  }
}

function hideSkeleton() {
  document.querySelectorAll('.skeleton').forEach(s => s.remove());
}

function displayMovies(movies, append = false) {
  if (!append) moviesGrid.innerHTML = '';
  movies.forEach(movie => {
    moviesGrid.appendChild(createCard(movie));
  });
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

function toggleFavorite(movie) {
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const exists = favorites.find(f => f.id === movie.id);
  if (exists) {
    favorites = favorites.filter(f => f.id !== movie.id);
  } else {
    favorites.push({
      id: movie.id,
      title: movie.title || movie.name,
      poster_path: movie.poster_path,
      media_type: currentType
    });
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(id) {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.some(f => f.id === id);
}

function createCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  const favIcon = isFavorite(movie.id) ? '❤️' : '🤍';
  card.innerHTML = `
    <div class="card-poster-wrapper">
      <img src="${poster}" class="movie-poster" loading="lazy">
      <div class="card-overlay">
        ${rating ? `<span class="card-rating">⭐ ${rating}</span>` : ''}
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">${movie.title || movie.name}</h3>
      <span class="card-year">${(movie.release_date || movie.first_air_date || '').slice(0,4)}</span>
    </div>
    <button class="fav-btn">${favIcon}</button>
  `;
  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(movie);
    e.target.textContent = isFavorite(movie.id) ? '❤️' : '🤍';
  });
  card.addEventListener('click', () => {
    window.open(`movie.html?id=${movie.id}&type=${currentType}&region=${currentRegion}`, '_blank');
  });
  return card;
}
