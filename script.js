// TMDB
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentRegion = 'US';
let currentType = 'movie';
let includeAnime = false;

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
});

async function handleSearch() {
  const query = moodInput.value.trim();
  if (!query) return;

  moviesGrid.innerHTML = '';

  const words = query.split(' ');
  let results = [];

  // 1️⃣ Если 3+ слов — сначала пробуем AI
  if (words.length >= 3) {
    results = await searchWithAI(query);

    if (results.length > 0) {
      displayMovies(results);
      return;
    }
  }

  // 2️⃣ Если AI ничего не дал — обычный поиск
  results = await searchTMDB(query);

  if (results.length > 0) {
    displayMovies(results);
    return;
  }

  // 3️⃣ Если вообще ничего
  moviesGrid.innerHTML = `<p style="color:red">No movies found</p>`;
}

async function searchTMDB(query) {
  try {
    let endpoint = currentType === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function searchWithAI(query) {
  try {
    const ai = await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!ai.ok) return [];
    const aiData = await ai.json();

    if (aiData.genres?.length) {
      let endpoint = currentType === 'tv' ? 'tv' : 'movie';
      let genreParam = currentType === 'documentary' ? '99' : aiData.genres.join(',');
      let animeParam = includeAnime ? '&with_keywords=210024' : '';
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&vote_count.gte=100${animeParam}`
      );
      const data = await res.json();
      return data.results || [];
    }

    if (aiData.search_query) {
      return await searchTMDB(aiData.search_query);
    }

    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function displayMovies(movies) {
  moviesGrid.innerHTML = '';
  movies.forEach(movie => {
    moviesGrid.appendChild(createCard(movie));
  });
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
  const favIcon = isFavorite(movie.id) ? '❤️' : '🤍';
  card.innerHTML = `
    <img src="${poster}" class="movie-poster">
    <h3>${movie.title || movie.name}</h3>
    <button class="fav-btn">${favIcon}</button>
  `;
  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(movie);
    e.target.textContent = isFavorite(movie.id) ? '❤️' : '🤍';
  });
  card.addEventListener('click', () => {
    window.open(`movie.html?id=${movie.id}&type=${currentType}`, '_blank');
  });
  return card;
}
