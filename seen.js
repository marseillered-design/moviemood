const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function getSeenList() {
  try {
    const parsed = JSON.parse(localStorage.getItem('watched') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSeenList(items) {
  localStorage.setItem('watched', JSON.stringify(items));
}

function removeSeen(id, mediaType = 'movie') {
  const normalizedType = normalizeMediaType(mediaType);
  const seen = getSeenList().filter(item => !(item.id === id && normalizeMediaType(item.media_type) === normalizedType));
  setSeenList(seen);
}

async function enrichTitle(item) {
  try {
    const mediaType = normalizeMediaType(item.media_type);
    const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${item.id}?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return {
      ...item,
      title: item.title || item.name || data.title || data.name,
      rating: data.vote_average?.toFixed(1),
      year: (data.release_date || data.first_air_date || '').slice(0, 4),
      genres: data.genres?.slice(0, 2).map(genre => genre.name) || []
    };
  } catch {
    return item;
  }
}

function updateSeenCount() {
  const seen = getSeenList();
  const countEl = document.getElementById('seenCount');
  const actionsEl = document.getElementById('seenActions');

  if (seen.length > 0) {
    countEl.textContent = `${seen.length} ${seen.length === 1 ? 'title' : 'titles'} watched`;
    actionsEl.style.display = 'flex';
  } else {
    countEl.textContent = '';
    actionsEl.style.display = 'none';
  }
}

function createSeenCard(item) {
  const card = document.createElement('div');
  card.className = 'fav-card';
  card.dataset.id = item.id;

  const poster = item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : '';
  const mediaType = normalizeMediaType(item.media_type);
  const typeLabel = mediaType === 'tv' ? 'Series' : 'Movie';
  const rating = item.rating ? `${item.rating}` : '';
  const year = item.year || '';
  const genres = item.genres?.join(' / ') || '';

  card.innerHTML = `
    <div class="fav-card-poster">
      <img src="${poster}" alt="${item.title}" loading="lazy">
      <div class="fav-card-overlay">
        <button class="fav-remove-btn" title="Remove from seen">Remove</button>
      </div>
      ${rating ? `<span class="fav-rating">${rating}</span>` : ''}
      <span class="watched-badge watched-badge-static">Watched</span>
    </div>
    <div class="fav-card-info">
      <h3 class="fav-card-title">${item.title}</h3>
      <div class="fav-card-meta">
        <span class="fav-type">${typeLabel}</span>
        ${year ? `<span class="fav-year">${year}</span>` : ''}
      </div>
      ${genres ? `<span class="fav-genres">${genres}</span>` : ''}
    </div>
  `;

  card.querySelector('.fav-remove-btn').addEventListener('click', e => {
    e.stopPropagation();
    removeSeen(item.id, mediaType);
    card.style.animation = 'favCardOut 0.3s ease forwards';
    setTimeout(() => {
      card.remove();
      updateSeenCount();
      const remaining = document.getElementById('seenGrid').children.length;
      if (remaining === 0) {
        document.getElementById('emptyState').style.display = 'flex';
      }
    }, 300);
  });

  card.addEventListener('click', () => {
    window.open(`movie.html?id=${item.id}&type=${mediaType}`, '_blank');
  });

  return card;
}

async function loadSeen() {
  const seen = getSeenList().sort((a, b) => (b.watched_at || 0) - (a.watched_at || 0));
  const grid = document.getElementById('seenGrid');
  const emptyState = document.getElementById('emptyState');

  if (seen.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  updateSeenCount();

  grid.innerHTML = '';
  seen.forEach(() => {
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

  const enriched = await Promise.all(seen.map(enrichTitle));

  grid.innerHTML = '';
  enriched.forEach((item, index) => {
    const card = createSeenCard(item);
    card.style.animationDelay = `${index * 0.05}s`;
    card.style.animation = `favCardIn 0.4s ease ${index * 0.05}s both`;
    grid.appendChild(card);
  });

  document.getElementById('clearSeenBtn').addEventListener('click', () => {
    if (confirm('Remove all watched titles?')) {
      localStorage.removeItem('watched');
      grid.innerHTML = '';
      emptyState.style.display = 'flex';
      updateSeenCount();
    }
  });
}

loadSeen();
