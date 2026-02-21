const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const grid = document.getElementById('favoritesGrid');
  const emptyMessage = document.getElementById('emptyMessage');

  if (favorites.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  grid.innerHTML = '';
  favorites.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
      : '';
    card.innerHTML = `
      <img src="${poster}" class="movie-poster">
      <h3>${movie.title}</h3>
      <button class="fav-btn">❤️</button>
    `;
    card.querySelector('.fav-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeFavorite(movie.id);
      card.remove();
      if (document.getElementById('favoritesGrid').children.length === 0) {
        emptyMessage.style.display = 'block';
      }
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
