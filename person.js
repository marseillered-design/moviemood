const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_PROFILE_URL = 'https://image.tmdb.org/t/p/h632';

const params = new URLSearchParams(window.location.search);
const personId = params.get('id');

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function isFavoriteItem(id, mediaType) {
  const type = normalizeMediaType(mediaType);
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.some(f => f.id === id && normalizeMediaType(f.media_type) === type);
}

function toggleFavoriteItem(item) {
  const type = normalizeMediaType(item.media_type);
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const exists = favorites.some(f => f.id === item.id && normalizeMediaType(f.media_type) === type);

  if (exists) {
    favorites = favorites.filter(f => !(f.id === item.id && normalizeMediaType(f.media_type) === type));
  } else {
    favorites.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: type
    });
  }

  localStorage.setItem('favorites', JSON.stringify(favorites));
  return !exists;
}

async function loadPerson() {
  if (!personId) return;

  const [details, credits] = await Promise.all([
    fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}`).then(r => r.json()),
    fetch(`${TMDB_BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}`).then(r => r.json()),
  ]);

  document.title = `${details.name} - MovieMood`;

  if (details.profile_path) {
    const photoEl = document.getElementById('personPhoto');
    photoEl.src = `${TMDB_PROFILE_URL}${details.profile_path}`;

    document.getElementById('personHeroBlur').style.backgroundImage =
      `url(${TMDB_PROFILE_URL}${details.profile_path})`;
  }

  document.getElementById('personName').textContent = details.name;

  const dept = details.known_for_department || '';
  document.getElementById('personBadges').innerHTML = dept
    ? `<span class="person-badge">${dept}</span>`
    : '';

  const detailParts = [];
  if (details.birthday) {
    const age = details.deathday
      ? null
      : Math.floor((Date.now() - new Date(details.birthday)) / (365.25 * 24 * 3600 * 1000));
    const born = new Date(details.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    detailParts.push(`Born ${born}${age ? ` (${age} years old)` : ''}`);
  }
  if (details.deathday) {
    detailParts.push(`Died: ${details.deathday}`);
  }
  if (details.place_of_birth) {
    detailParts.push(`Place: ${details.place_of_birth}`);
  }
  document.getElementById('personDetails').innerHTML = detailParts
    .map(p => `<span class="person-detail-item">${p}</span>`)
    .join('');

  const bio = details.biography || '';
  const bioEl = document.getElementById('personBio');
  if (bio.length > 400) {
    const short = bio.slice(0, 400);
    bioEl.innerHTML = `${short}... <button class="bio-read-more" id="bioBtn">Read more</button>`;
    document.getElementById('bioBtn').addEventListener('click', () => {
      bioEl.innerHTML = bio;
    });
  } else {
    bioEl.textContent = bio;
  }

  const movies = [...(credits.cast || []), ...(credits.crew || [])]
    .filter((m, index, self) =>
      m.poster_path && self.findIndex(x => x.id === m.id) === index
    )
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 24);

  document.getElementById('personMoviesTitle').textContent =
    `Films & Series with ${details.name}`;

  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '';

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
    const role = movie.character || movie.job || '';
    const cardType = normalizeMediaType(movie.media_type || (movie.first_air_date ? 'tv' : 'movie'));
    const favIcon = isFavoriteItem(movie.id, cardType) ? '\u2764\uFE0F' : '\uD83E\uDD0D';

    card.innerHTML = `
      <div class="card-poster-wrapper">
        <img src="${TMDB_IMAGE_BASE_URL}${movie.poster_path}" class="movie-poster" loading="lazy">
        ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
        <button class="fav-btn">${favIcon}</button>
        <div class="card-overlay"></div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${movie.title || movie.name}</h3>
        <span class="card-year">${role ? role : (movie.release_date || movie.first_air_date || '').slice(0,4)}</span>
      </div>
    `;

    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', e => {
      e.stopPropagation();
      const nowFavorite = toggleFavoriteItem({
        id: movie.id,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        media_type: cardType
      });
      favBtn.textContent = nowFavorite ? '\u2764\uFE0F' : '\uD83E\uDD0D';
    });

    card.addEventListener('click', () => {
      window.open(`movie.html?id=${movie.id}&type=${cardType}`, '_blank');
    });

    grid.appendChild(card);
  });
}

loadPerson();
