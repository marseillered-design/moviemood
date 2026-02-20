// TMDB API Configuration
// TODO: Add your TMDB API key here
const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// State Management
let currentRegion = 'US';
let currentMovies = [];
let genreList = null; // Cache for genre list

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
    loadGenreList(); // Load genre list on startup
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    moodInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    countrySelect.addEventListener('change', (e) => {
        currentRegion = e.target.value;
        // Optionally re-search with new region
        if (currentMovies.length > 0) {
            handleSearch();
        }
    });
}

// Main Search Handler
async function handleSearch() {
    const moodQuery = moodInput.value.trim();
    
    if (!moodQuery) {
        showError('Please enter your mood or movie preference.');
        return;
    }

    if (!TMDB_API_KEY) {
        showError('TMDB API key is not configured. Please add your API key in script.js');
        return;
    }

    hideError();
    showLoading();
    clearMovies();

    try {
        // Parse mood query and search for movies
        const movies = await searchMoviesByMood(moodQuery);
        
        if (movies.length === 0) {
            showError('No movies found matching your mood. Try a different search term.');
            return;
        }

        displayMovies(movies);
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search for movies. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Search Movies by Mood
async function searchMoviesByMood(moodQuery) {
    // First, perform normal TMDB movie search
    const movieSearchResults = await searchTMDB(moodQuery);
    
    // Check if we found a movie that closely matches the query
    if (movieSearchResults.length > 0) {
        const topResult = movieSearchResults[0];
        const queryLower = moodQuery.toLowerCase().trim();
        const movieTitleLower = topResult.title.toLowerCase();
        
        // Check if the query closely matches the movie title (fuzzy match)
        // If query is similar to movie title, treat it as a movie search
        if (isLikelyMovieTitle(queryLower, movieTitleLower)) {
            // Get similar movies
            const similarMovies = await getSimilarMovies(topResult.id);
            
            // Combine: show the matched movie first, then similar movies
            // Remove duplicates (in case the matched movie appears in similar movies)
            const combinedMovies = [topResult];
            const seenIds = new Set([topResult.id]);
            
            if (similarMovies.length > 0) {
                similarMovies.forEach(movie => {
                    if (!seenIds.has(movie.id)) {
                        combinedMovies.push(movie);
                        seenIds.add(movie.id);
                    }
                });
            }
            
            return combinedMovies;
        }
    }
    
    // If no strong title match, treat input as mood description
    const genreIds = mapKeywordsToGenres(moodQuery);
    
    if (genreIds.length > 0) {
        // Use discover endpoint with genres
        return await discoverMoviesByGenres(genreIds);
    }
    
    // Fallback: return regular search results
    return movieSearchResults;
}

// Check if query is likely a movie title
function isLikelyMovieTitle(query, movieTitle) {
    // Exact match (case-insensitive)
    if (query === movieTitle) {
        return true;
    }
    
    // Remove common words for comparison
    const stopWords = ['the', 'a', 'an', 'for', 'to', 'and', 'or', 'like', 'similar', 'movies', 'movie'];
    const queryWords = query.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w.toLowerCase()));
    const titleWords = movieTitle.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w.toLowerCase()));
    
    // If no meaningful words after filtering, don't consider it a match
    if (queryWords.length === 0 || titleWords.length === 0) {
        return false;
    }
    
    // Check if query is contained in title or vice versa (for partial matches)
    const queryNormalized = queryWords.join(' ').toLowerCase();
    const titleNormalized = titleWords.join(' ').toLowerCase();
    
    if (titleNormalized.includes(queryNormalized) || queryNormalized.includes(titleNormalized)) {
        return true;
    }
    
    // If query contains most of the title words, it's likely a movie title
    const matchingWords = queryWords.filter(qw => {
        const qwLower = qw.toLowerCase();
        return titleWords.some(tw => {
            const twLower = tw.toLowerCase();
            return twLower.includes(qwLower) || qwLower.includes(twLower) || twLower === qwLower;
        });
    });
    
    // If at least 50% of query words match, consider it a movie title
    // But require at least 2 matching words for better accuracy
    const matchThreshold = Math.max(2, Math.ceil(queryWords.length * 0.5));
    return matchingWords.length >= matchThreshold;
}

// Map keywords to TMDB genre IDs
function mapKeywordsToGenres(query) {
    const lowerQuery = query.toLowerCase();
    
    // Horror keywords - prioritize genre 27
    const horrorKeywords = [
        'horror', 'scary', 'creepy', 'terrifying', 'ghost', 
        'paranormal', 'zombie', 'slasher', 'monster', 'demon',
        'frightening', 'spooky'
    ];
    
    // Check for horror keywords first (priority)
    const hasHorrorKeyword = horrorKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Check for dark/psychological (thriller combination)
    const hasDarkOrPsychological = lowerQuery.includes('dark') || lowerQuery.includes('psychological');
    
    const genreMap = {
        // Science Fiction
        'space': 878,
        'sci-fi': 878,
        'scifi': 878,
        'science fiction': 878,
        'futuristic': 878,
        'alien': 878,
        
        // Thriller
        'thriller': 53,
        'suspense': 53,
        'tense': 53,
        'intense': 53,
        
        // Romance
        'romantic': 10749,
        'romance': 10749,
        'love': 10749,
        'romantic comedy': 10749,
        'romcom': 10749,
        
        // Comedy
        'funny': 35,
        'comedy': 35,
        'humor': 35,
        'humorous': 35,
        'light': 35,
        'comedic': 35,
        
        // Drama
        'sad': 18,
        'drama': 18,
        'emotional': 18,
        'serious': 18,
        'melodrama': 18,
        
        // Additional mappings
        'action': 28,
        'adventure': 12,
        'animation': 16,
        'crime': 80,
        'documentary': 99,
        'family': 10751,
        'fantasy': 14,
        'history': 36,
        'music': 10402,
        'mystery': 9648,
        'war': 10752,
        'western': 37
    };
    
    const foundGenres = [];
    const seenGenres = new Set();
    
    // Prioritize horror genre (27) if horror keywords detected
    if (hasHorrorKeyword) {
        foundGenres.push(27);
        seenGenres.add(27);
    }
    
    // Combine with thriller (53) if dark or psychological appears
    if (hasDarkOrPsychological && !seenGenres.has(53)) {
        foundGenres.push(53);
        seenGenres.add(53);
    }
    
    // Check for other genre keywords
    for (const [keyword, genreId] of Object.entries(genreMap)) {
        // Skip 'dark' here since we handle it separately for thriller combination
        if (keyword === 'dark') continue;
        
        if (lowerQuery.includes(keyword) && !seenGenres.has(genreId)) {
            foundGenres.push(genreId);
            seenGenres.add(genreId);
        }
    }
    
    return foundGenres;
}

// Search TMDB API
async function searchTMDB(query) {
    // Search endpoint: /search/movie
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('TMDB search error:', error);
        throw error;
    }
}

// Get similar movies for a given movie ID
async function getSimilarMovies(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}&page=1`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('TMDB similar movies error:', error);
        throw error;
    }
}

// Discover movies by genres with region support
async function discoverMoviesByGenres(genreIds) {
    // Build URL with genre filter and region
    const genreParam = genreIds.join(',');
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreParam}&sort_by=popularity.desc&page=1&region=${currentRegion}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('TMDB discover error:', error);
        throw error;
    }
}

// Load genre list from TMDB (for future use if needed)
async function loadGenreList() {
    if (genreList) return genreList;
    
    const url = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn('Failed to load genre list');
            return null;
        }
        
        const data = await response.json();
        genreList = data.genres || [];
        return genreList;
    } catch (error) {
        console.error('Error loading genre list:', error);
        return null;
    }
}

// Get Watch Providers for a Movie
async function getWatchProviders(movieId, region = null) {
    // Watch providers endpoint: /movie/{movie_id}/watch/providers
    const selectedRegion = region || currentRegion;
    const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        const regionData = data.results[selectedRegion] || {};
        
        return {
            link: regionData.link || null,       // Link to watch page
            flatrate: regionData.flatrate || [], // Streaming services
            rent: regionData.rent || [],         // Rent options
            buy: regionData.buy || []            // Buy options
        };
    } catch (error) {
        console.error('Watch providers error:', error);
        throw error;
    }
}

// Display Movies
function displayMovies(movies) {
    currentMovies = movies;
    moviesGrid.innerHTML = '';
    
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Create Movie Card Element
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
            ? `<img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.parentElement.querySelector('.movie-poster-placeholder').style.display='flex'; this.style.display='none';">`
            : ''
        }
        <div class="movie-poster-placeholder" ${posterUrl ? 'style="display:none;"' : ''}>
            No Image Available
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
            <div class="movie-meta">
                <span class="movie-rating">
                    <span class="rating-star">★</span>
                    ${rating}
                </span>
                <span class="movie-year">${year}</span>
            </div>
            <button class="watch-btn" onclick="handleWatchClick(${movie.id}, '${currentRegion}')">
                Where to Watch
            </button>
        </div>
    `;
    
    return card;
}

// Handle Watch Button Click
async function handleWatchClick(movieId, region) {
    // Get the current region from dropdown
    const selectedRegion = countrySelect.value;
    
    // Find the movie card element
    const movieCard = document.querySelector(`[data-movie-id="${movieId}"]`);
    if (!movieCard) return;
    
    // Check if providers are already displayed
    const existingProviders = movieCard.querySelector('.watch-providers-container');
    if (existingProviders) {
        // Toggle visibility
        existingProviders.style.display = existingProviders.style.display === 'none' ? 'block' : 'none';
        return;
    }
    
    // Show loading state
    const watchBtn = movieCard.querySelector('.watch-btn');
    const originalBtnText = watchBtn.textContent;
    watchBtn.textContent = 'Loading...';
    watchBtn.disabled = true;
    
    try {
        // Fetch watch providers for the selected region
        const providers = await getWatchProviders(movieId, selectedRegion);
        
        // Display providers under the movie card
        displayWatchProviders(movieCard, providers, selectedRegion);
    } catch (error) {
        console.error('Error fetching watch providers:', error);
        showProviderError(movieCard, 'Failed to load watch providers. Please try again.');
    } finally {
        watchBtn.textContent = originalBtnText;
        watchBtn.disabled = false;
    }
}

// Display Watch Providers under Movie Card
function displayWatchProviders(movieCard, providers, region) {
    // Remove existing provider display if any
    const existing = movieCard.querySelector('.watch-providers-container');
    if (existing) {
        existing.remove();
    }
    
    // Check if any providers are available
    const hasFlatrate = providers.flatrate && providers.flatrate.length > 0;
    const hasRent = providers.rent && providers.rent.length > 0;
    const hasBuy = providers.buy && providers.buy.length > 0;
    
    if (!hasFlatrate && !hasRent && !hasBuy) {
        showProviderError(movieCard, 'Not available in this region');
        return;
    }
    
    // Create provider container
    const container = document.createElement('div');
    container.className = 'watch-providers-container';
    
    let html = '';
    
    // Display flatrate (subscription) providers
    if (hasFlatrate) {
        html += '<div class="provider-section"><h4 class="provider-type">Stream</h4><div class="provider-list">';
        providers.flatrate.forEach(provider => {
            const logoUrl = provider.logo_path 
                ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}`
                : null;
            const providerLink = providers.link || '#';
            html += `
                <a href="${escapeHtml(providerLink)}" target="_blank" rel="noopener noreferrer" class="provider-item" title="${escapeHtml(provider.provider_name)}">
                    ${logoUrl 
                        ? `<img src="${logoUrl}" alt="${escapeHtml(provider.provider_name)}" class="provider-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                           <span class="provider-name-fallback" style="display:none;">${escapeHtml(provider.provider_name)}</span>`
                        : `<span class="provider-name">${escapeHtml(provider.provider_name)}</span>`
                    }
                </a>
            `;
        });
        html += '</div></div>';
    }
    
    // Display rent providers
    if (hasRent) {
        html += '<div class="provider-section"><h4 class="provider-type">Rent</h4><div class="provider-list">';
        providers.rent.forEach(provider => {
            const logoUrl = provider.logo_path 
                ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}`
                : null;
            const providerLink = providers.link || '#';
            html += `
                <a href="${escapeHtml(providerLink)}" target="_blank" rel="noopener noreferrer" class="provider-item" title="${escapeHtml(provider.provider_name)}">
                    ${logoUrl 
                        ? `<img src="${logoUrl}" alt="${escapeHtml(provider.provider_name)}" class="provider-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                           <span class="provider-name-fallback" style="display:none;">${escapeHtml(provider.provider_name)}</span>`
                        : `<span class="provider-name">${escapeHtml(provider.provider_name)}</span>`
                    }
                </a>
            `;
        });
        html += '</div></div>';
    }
    
    // Display buy providers
    if (hasBuy) {
        html += '<div class="provider-section"><h4 class="provider-type">Buy</h4><div class="provider-list">';
        providers.buy.forEach(provider => {
            const logoUrl = provider.logo_path 
                ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}`
                : null;
            const providerLink = providers.link || '#';
            html += `
                <a href="${escapeHtml(providerLink)}" target="_blank" rel="noopener noreferrer" class="provider-item" title="${escapeHtml(provider.provider_name)}">
                    ${logoUrl 
                        ? `<img src="${logoUrl}" alt="${escapeHtml(provider.provider_name)}" class="provider-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                           <span class="provider-name-fallback" style="display:none;">${escapeHtml(provider.provider_name)}</span>`
                        : `<span class="provider-name">${escapeHtml(provider.provider_name)}</span>`
                    }
                </a>
            `;
        });
        html += '</div></div>';
    }
    
    container.innerHTML = html;
    movieCard.appendChild(container);
}

// Show Provider Error Message
function showProviderError(movieCard, message) {
    const existing = movieCard.querySelector('.watch-providers-container');
    if (existing) {
        existing.remove();
    }
    
    const container = document.createElement('div');
    container.className = 'watch-providers-container';
    container.innerHTML = `<div class="provider-error">${escapeHtml(message)}</div>`;
    movieCard.appendChild(container);
}

// Utility Functions
function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function clearMovies() {
    moviesGrid.innerHTML = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for global access
window.handleWatchClick = handleWatchClick;
