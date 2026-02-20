// TMDB API
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentRegion = 'US';

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
});

async function handleSearch() {
  const query = moodInput.value.trim();
  if (!query) return;

  moviesGrid.innerHTML = '';

  const results = await searchWithAI(query);

  if (!results.length) {
    moviesGrid.innerHTML = `<p style="color:red">No movies found</p>`;
    return;
  }

  results.forEach(movie => {
    moviesGrid.appendChild(createCard(movie));
  });
}

async function searchWithAI(query) {
  try {
    const ai = await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const aiData = await ai.json();

    if (aiData.search_query) {
      const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(aiData.search_query)}`);
      const data = await res.json();
      return data.results || [];
    }

    if (aiData.genres?.length) {
      const res = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${aiData.genres.join(',')}&region=${currentRegion}`);
      const data = await res.json();
      return data.results || [];
    }

    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function createCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';

  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : '';

  card.innerHTML = `
    <img src="${poster}" class="movie-poster">
    <h3>${movie.title}</h3>
  `;

  return card;
}