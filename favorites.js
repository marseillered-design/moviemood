const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

async function enrichMovie(movie) {
  try {
    const endpoint = movie.media_type === 'tv' ? 'tv' : 'movie';
    const res = await fetch(`${TMDB_BASE_URL}/${endpoint}/${movie.id}?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return {
      ...movie,
      rating: data.vote_average?.toFixed(1),
      year: (data.release_date || data.first_air_date || '').slice(0, 4),
      genres: data.genres?.slice(0, 2).map(g => g.name) || [],
    };
  } catch {
    return movie;
  }
}

function removeFavorite(id) {
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  favorites = favorites.filter(f => f.id !== id);
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function updateCount() {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const countEl = document.getElementById('favCount');
  const actionsEl = document.getElementById('favActions');
  if (favorites.length > 0) {
    countEl.textContent = `${favorites.length} ${favorites.length === 1 ? 'film' : 'films'} saved`;
    actionsEl.style.display = 'flex';
  } else {
    countEl.textContent = '';
    actionsEl.style.display = 'none';
  }
}

function createCard(movie) {
  const card = document.createElement('div');
  card.className = 'fav-card';
  card.dataset.id = movie.id;

  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : '';

  const typeLabel = movie.media_type === 'tv' ? '📺 Series' : '🎬 Movie';
  const rating = movie.rating ? `⭐ ${movie.rating}` : '';
  const year = movie.year || '';
  const genres = movie.genres?.join(' · ') || '';

  card.innerHTML = `
    <div class="fav-card-poster">
      <img src="${poster}" alt="${movie.title}" loading="lazy">
      <div class="fav-card-overlay">
        <button class="fav-remove-btn" title="Remove from favorites">✕ Remove</button>
      </div>
      ${rating ? `<span class="fav-rating">${rating}</span>` : ''}
    </div>
    <div class="fav-card-info">
      <h3 class="fav-card-title">${movie.title}</h3>
      <div class="fav-card-meta">
        <span class="fav-type">${typeLabel}</span>
        ${year ? `<span class="fav-year">${year}</span>` : ''}
      </div>
      ${genres ? `<span class="fav-genres">${genres}</span>` : ''}
    </div>
  `;

  card.querySelector('.fav-remove-btn').addEventListener('click', e => {
    e.stopPropagation();
    removeFavorite(movie.id);
    card.style.animation = 'favCardOut 0.3s ease forwards';
    setTimeout(() => {
      card.remove();
      updateCount();
      const remaining = document.getElementById('favoritesGrid').children.length;
      if (remaining === 0) {
        document.getElementById('emptyState').style.display = 'flex';
      }
    }, 300);
  });

  card.addEventListener('click', () => {
    window.open(`movie.html?id=${movie.id}&type=${movie.media_type || 'movie'}`, '_blank');
  });

  return card;
}

async function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');

  if (favorites.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  updateCount();

  // Show skeleton while loading
  grid.innerHTML = '';
  favorites.forEach(() => {
    const skeleton = document.createElement('div');
    skeleton.className = 'fav-card fav-skeleton';
    skeleton.innerHTML = `
      <div class="fav-skeleton-poster"></div>
      <div class="fav-skeleton-info">
        <div class="fav-skeleton-title"></div>
        <div class="fav-skeleton-meta"></div>
      </div>
    `;
    grid.appendChild(skeleton);
  });

  // Enrich with TMDB data in parallel
  const enriched = await Promise.all(favorites.map(enrichMovie));

  // Replace skeletons with real cards
  grid.innerHTML = '';
  enriched.forEach((movie, i) => {
    const card = createCard(movie);
    card.style.animationDelay = `${i * 0.05}s`;
    card.style.animation = `favCardIn 0.4s ease ${i * 0.05}s both`;
    grid.appendChild(card);
  });

  // Clear all button
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('Remove all favorites?')) {
      localStorage.removeItem('favorites');
      grid.innerHTML = '';
      emptyState.style.display = 'flex';
      updateCount();
    }
  });
}

loadFavorites();
