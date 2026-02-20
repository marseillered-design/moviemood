// TMDB API Configuration
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// State
let currentRegion = 'US';
let currentMovies = [];

// DOM
const moodInput = document.getElementById('moodInput');
const searchBtn = document.getElementById('searchBtn');
const countrySelect = document.getElementById('countrySelect');
const moviesGrid = document.getElementById('moviesGrid');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Init
document.addEventListener('DOMContentLoaded', () => {
    searchBtn.addEventListener('click', handleSearch);
    moodInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    countrySelect.addEventListener('change', (e) => {
        currentRegion = e.target.value;
    });
});

// Main Search
async function handleSearch() {
    const moodQuery = moodInput.value.trim();
    if (!moodQuery) {
        showError('Please enter your mood.');
        return;
    }

    hideError();
    showLoading();
    clearMovies();

    try {
        const movies = await searchMoviesByMood(moodQuery);
        if (!movies.length) {
            showError('No movies found.');
            return;
        }
        displayMovies(movies);
    } catch (error) {
        console.error(error);
        showError('Search failed.');
    } finally {
        hideLoading();
    }
}

// Smart Search Logic
async function searchMoviesByMood(moodQuery) {

    // 1️⃣ Try normal movie search first
    const movieSearchResults = await searchTMDB(moodQuery);

    if (movieSearchResults.length > 0) {
        const topResult = movieSearchResults[0];
        if (isLikelyMovieTitle(moodQuery.toLowerCase(), topResult.title.toLowerCase())) {
            const similar = await getSimilarMovies(topResult.id);
            return [topResult, ...similar];
        }
    }

    // 2️⃣ Use AI for mood search
    const aiResults = await searchWithAI(moodQuery);
    if (aiResults.length > 0) return aiResults;

    // 3️⃣ Fallback
    return movieSearchResults;
}

// AI Search
async function searchWithAI(moodQuery) {
    try {
        const response = await fetch("/api/mood", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: moodQuery })
        });

        if (!response.ok) throw new Error("AI failed");

        const aiData = await response.json();

        // Use search_query if exists
        if (aiData.search_query) {
            const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(aiData.search_query)}&page=1&region=${currentRegion}`;
            const res = await fetch(url);
            const data = await res.json();
            return (data.results || []).filter(item => item.media_type === "movie");
        }

        // Fallback to genres
        if (aiData.genres && aiData.genres.length > 0) {
            return await discoverMoviesByGenres(aiData.genres);
        }

        return [];
    } catch (err) {
        console.error("AI search error:", err);
        return [];
    }
}

// TMDB Search
async function searchTMDB(query) {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

// Similar Movies
async function getSimilarMovies(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

// Discover by Genres
async function discoverMoviesByGenres(genreIds) {
    const genreParam = genreIds.join(',');
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&page=1&region=${currentRegion}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

// Simple Title Match
function isLikelyMovieTitle(query, title) {
    return title.includes(query) || query.includes(title);
}

// UI Rendering
function displayMovies(movies) {
    currentMovies = movies;
    moviesGrid.innerHTML = '';
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';

        const poster = movie.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
            : '';

        card.innerHTML = `
            <img src="${poster}" alt="${movie.title}" />
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average || 'N/A'}</p>
        `;

        moviesGrid.appendChild(card);
    });
}

// UI Helpers
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }
function showError(msg) { errorMessage.textContent = msg; errorMessage.style.display = 'block'; }
function hideError() { errorMessage.style.display = 'none'; }
function clearMovies() { moviesGrid.innerHTML = ''; }