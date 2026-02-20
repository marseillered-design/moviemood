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

// SEARCH
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
    } catch (err) {
        console.error(err);
        showError('Search failed.');
    } finally {
        hideLoading();
    }
}

async function searchMoviesByMood(query) {

    // 1️⃣ Try direct title match
    const directResults = await searchTMDB(query);

    if (directResults.length > 0) {
        const top = directResults[0];
        if (top.title.toLowerCase().includes(query.toLowerCase())) {
            const similar = await getSimilarMovies(top.id);
            return [top, ...similar];
        }
    }

    // 2️⃣ AI fallback
    const aiResults = await searchWithAI(query);
    if (aiResults.length > 0) return aiResults;

    return directResults;
}

// AI SEARCH
async function searchWithAI(query) {
    try {
        const response = await fetch('/api/mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) return [];

        const aiData = await response.json();

        if (aiData.search_query) {
            const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(aiData.search_query)}&region=${currentRegion}`;
            const res = await fetch(url);
            const data = await res.json();
            return (data.results || []).filter(item => item.media_type === "movie");
        }

        if (aiData.genres?.length) {
            return await discoverMoviesByGenres(aiData.genres);
        }

        return [];
    } catch (err) {
        console.error("AI error:", err);
        return [];
    }
}

// TMDB
async function searchTMDB(query) {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

async function getSimilarMovies(id) {
    const url = `${TMDB_BASE_URL}/movie/${id}/similar?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

async function discoverMoviesByGenres(genres) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genres.join(',')}&region=${currentRegion}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
}

// DISPLAY
function displayMovies(movies) {
    currentMovies = movies;
    moviesGrid.innerHTML = '';
    movies.forEach(movie => {
        moviesGrid.appendChild(createMovieCard(movie));
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-movie-id', movie.id);

    const poster = movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : '';

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

    card.innerHTML = `
        <img src="${poster}" class="movie-poster">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                ⭐ ${rating} • ${year}
            </div>
            <button class="watch-btn">Where to Watch</button>
        </div>
    `;

    card.querySelector('.watch-btn')
        .addEventListener('click', () => handleWatchClick(movie.id));

    return card;
}

// WATCH PROVIDERS
async function handleWatchClick(movieId) {
    const region = countrySelect.value;
    const movieCard = document.querySelector(`[data-movie-id="${movieId}"]`);

    const existing = movieCard.querySelector('.watch-providers-container');
    if (existing) {
        existing.remove();
        return;
    }

    const providers = await getWatchProviders(movieId, region);
    displayWatchProviders(movieCard, providers);
}

async function getWatchProviders(movieId, region) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const regionData = data.results?.[region];
    if (!regionData) return null;

    return regionData;
}

function displayWatchProviders(movieCard, data) {
    const container = document.createElement('div');
    container.className = 'watch-providers-container';

    if (!data) {
        container.innerHTML = `<div class="provider-error">Not available in this region</div>`;
        movieCard.appendChild(container);
        return;
    }

    let html = '';

    const renderSection = (title, list) => {
        if (!list?.length) return '';
        let section = `<div class="provider-section"><h4>${title}</h4><div class="provider-list">`;
        list.forEach(p => {
            section += `
                <a href="${data.link}" target="_blank">
                    <img src="${TMDB_IMAGE_BASE_URL}${p.logo_path}" title="${p.provider_name}" class="provider-logo">
                </a>
            `;
        });
        section += '</div></div>';
        return section;
    };

    html += renderSection('Stream', data.flatrate);
    html += renderSection('Rent', data.rent);
    html += renderSection('Buy', data.buy);

    container.innerHTML = html || `<div class="provider-error">Not available</div>`;
    movieCard.appendChild(container);
}

// UI
function showLoading() { loading.style.display = 'block'; }
function hideLoading() { loading.style.display = 'none'; }
function showError(msg) { errorMessage.textContent = msg; errorMessage.style.display = 'block'; }
function hideError() { errorMessage.style.display = 'none'; }
function clearMovies() { moviesGrid.innerHTML = ''; }