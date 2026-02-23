const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  const favCount = document.getElementById('favCount');

  if (favorites.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  favCount.textContent = `${favorites.length} ${favorites.length === 1 ? 'film' : 'films'} saved`;

  grid.innerHTML = '';
  favorites.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
      : '';
    card.innerHTML = `
      <div class="card-poster-wrapper">
        <img src="${poster}" class="movie-poster" loading="lazy">
        <div class="card-overlay"></div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${movie.title}</h3>
        <span class="card-year">${movie.media_type === 'tv' ? '📺 Series' : '🎬 Movie'}</span>
      </div>
      <button class="fav-btn" title="Remove from favorites">❤️</button>
    `;
    card.querySelector('.fav-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeFavorite(movie.id);
      card.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => {
        card.remove();
        const remaining = document.getElementById('favoritesGrid').children.length;
        favCount.textContent = `${remaining} ${remaining === 1 ? 'film' : 'films'} saved`;
        if (remaining === 0) emptyState.style.display = 'flex';
      }, 300);
    });
    card.addEventListener('click', () => {
      window.open(`movie.html?id=${movie.id}&type=${movie.media_type || 'movie'}`, '_blank');
    });
    grid.appendChild(card);
  });
}

function removeFavorite(id) {
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  favorites = favorites.filter(f => f.id !== id);
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

loadFavorites();
