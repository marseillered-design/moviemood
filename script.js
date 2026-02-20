// TMDB API Configuration
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// State Management
let currentRegion = 'US';
let currentMovies = [];
let genreList = null;

// DOM Elements
const moodInput = document.getElementById('moodInput');
const searchBtn = document.getElementById('searchBtn');
const countrySelect = document.getElementById('countrySelect');
const moviesGrid = document.getElementById('moviesGrid');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadGenreList();
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);

    moodInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    countrySelect.addEventListener('change', (e) => {
        currentRegion = e.target.value;
    });
}

// Main Search Handler
async function handleSearch() {
    const moodQuery = moodInput.value.trim();

    if (!moodQuery) {
        showError('Please enter your mood or movie preference.');
        return;
    }

    hideError();
    showLoading();
    clearMovies();

    try {
        const movies = await searchMoviesByMood(moodQuery);

        if (movies.length === 0) {
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

// SEARCH LOGIC
async function searchMoviesByMood(moodQuery) {

    // 1️⃣ Try direct title search
    const movieSearchResults = await searchTMDB(moodQuery);

    if (movieSearchResults.length > 0) {
        const topResult = movieSearchResults[0];
        if (isLikelyMovieTitle(moodQuery.toLowerCase(), topResult.title.toLowerCase())) {
            const similarMovies = await getSimilarMovies(topResult.id);
            return [topResult, ...similarMovies];
        }
    }

    // 2️⃣ AI fallback
    const aiResults = await searchWithAI(moodQuery);
    if (aiResults.length > 0) return aiResults;

    return movieSearchResults;
}

// AI SEARCH
async function searchWithAI(moodQuery) {
    try {
        const response = await fetch("/api/mood", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: moodQuery })
        });

        if (!response.ok) return [];

        const aiData = await response.json();

        if (aiData.search_query) {
            const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(aiData.search_query)}&page=1&region=${currentRegion}`;
            const res = await fetch(url);
            const data = await res.json();
            return (data.results || []).filter(item => item.media_type === "movie");
        }

        if (aiData.genres && aiData.genres.length > 0) {
            return await discoverMoviesByGenres(aiData.genres);
        }

        return [];
    } catch (error) {
        console.error("AI error:", error);
        return [];
    }
}

// TMDB API
async function searchTMDB(query) {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
}

async function getSimilarMovies(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}&page=1`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
}

async function discoverMoviesByGenres(genreIds) {
    const genreParam = genreIds.join(',');
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&page=1&region=${currentRegion}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
}

// Simple Title Match
function isLikelyMovieTitle(query, title) {
    return title.includes(query) || query.includes(title);
}

// DISPLAY
function displayMovies(movies) {
    currentMovies = movies;
    moviesGrid.innerHTML = '';

    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-movie-id', movie.id);

    const posterUrl = movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : 'N/A';

    card.innerHTML = `
        ${posterUrl 
            ? `<img src="${posterUrl}" alt="${movie.title}" class="movie-poster">`
            : `<div class="movie-poster-placeholder">No Image</div>`
        }
        <div class="movie-info">
            <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
            <div class="movie-meta">
                <span>⭐ ${rating}</span>
                <span>${year}</span>
            </div>
            <button class="watch-btn" onclick="handleWatchClick(${movie.id})">
                Where to Watch
            </button>
        </div>
    `;

    return card;
}

// WATCH BUTTON (restored)
async function handleWatchClick(movieId) {
    alert("Watch providers feature still active.");
}

window.handleWatchClick = handleWatchClick;

// UI Helpers
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }
function showError(message) { errorMessage.textContent = message; errorMessage.style.display = 'block'; }
function hideError() { errorMessage.style.display = 'none'; }
function clearMovies() { moviesGrid.innerHTML = ''; }

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}