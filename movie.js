const TMDB_API_KEY = '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

const params = new URLSearchParams(window.location.search);
const movieId = params.get('id');
const mediaType = params.get('type') || 'movie';
const region = params.get('region') || 'US';

let trailerKey = null;
let isMuted = true;

function normalizeMediaType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function isFavoriteItem(id, type) {
  const media = normalizeMediaType(type);
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.some(f => f.id === id && normalizeMediaType(f.media_type) === media);
}

function toggleFavoriteItem(item) {
  const media = normalizeMediaType(item.media_type);
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const exists = favorites.some(f => f.id === item.id && normalizeMediaType(f.media_type) === media);

  if (exists) {
    favorites = favorites.filter(f => !(f.id === item.id && normalizeMediaType(f.media_type) === media));
  } else {
    favorites.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: media
    });
  }

  localStorage.setItem('favorites', JSON.stringify(favorites));
  return !exists;
}

async function loadMovie() {
  if (!movieId) return;

  const endpoint = normalizeMediaType(mediaType);
  const [details, credits, videos, providers, similar] = await Promise.all([
    fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`).then(r => r.json()),
    fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}/credits?api_key=${TMDB_API_KEY}&language=en-US`).then(r => r.json()),
    fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`).then(r => r.json()),
    fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`).then(r => r.json()),
    fetch(`${TMDB_BASE_URL}/${endpoint}/${movieId}/similar?api_key=${TMDB_API_KEY}&language=en-US`).then(r => r.json()),
  ]);

  const title = details.title || details.name;
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);
  const runtime = details.runtime ? `${details.runtime} min` : details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min/ep` : '';
  const rating = details.vote_average?.toFixed(1);

  document.title = `${title} - MovieMood`;

  if (details.backdrop_path) {
    document.getElementById('heroBackdrop').style.backgroundImage = `url(${TMDB_BACKDROP_URL}${details.backdrop_path})`;
  }

  document.getElementById('movieTitle').textContent = title;
  document.getElementById('detailsTitle').textContent = title;
  document.getElementById('movieOverview').textContent = details.overview;
  document.getElementById('tmdbRating').textContent = rating;

  const metaParts = [year, runtime, rating ? `Rating ${rating}` : ''].filter(Boolean);
  document.getElementById('heroMeta').innerHTML = metaParts.map(p => `<span>${p}</span>`).join(' · ');

  const badges = details.genres?.slice(0, 3).map(g => `<span class="badge">${g.name}</span>`).join('') || '';
  document.getElementById('heroBadges').innerHTML = badges;

  document.getElementById('movieGenres').innerHTML = details.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || '';

  if (details.poster_path) {
    document.getElementById('moviePoster').src = `${TMDB_IMAGE_BASE_URL}${details.poster_path}`;
  }

  if (details.imdb_id) {
    const imdbLink = document.getElementById('imdbLink');
    imdbLink.href = `https://www.imdb.com/title/${details.imdb_id}`;
    imdbLink.style.display = 'inline-flex';
  }

  const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
    || videos.results?.find(v => v.site === 'YouTube');

  if (trailer) {
    trailerKey = trailer.key;
    startHeroVideo(trailer.key);
    setTimeout(() => {
      const heroIframe = document.getElementById('heroIframe');
      if (!heroIframe && trailerKey) startHeroVideo(trailerKey);
    }, 600);
  }

  document.getElementById('btnPlayTrailer').addEventListener('click', () => {
    if (trailerKey) openTrailerModal(trailerKey);
  });

  document.getElementById('muteBtn').addEventListener('click', toggleMute);

  setupFavoriteBtn(details);

  const director = credits.crew?.find(p => p.job === 'Director') || credits.crew?.find(p => p.department === 'Directing');
  if (director) {
    document.getElementById('movieDirector').innerHTML =
      `<span class="person-chip" onclick="window.open('person.html?id=${director.id}', '_blank')">
        <img src="${director.profile_path ? 'https://image.tmdb.org/t/p/w185' + director.profile_path : 'https://via.placeholder.com/32x32?text=?'}" alt="${director.name}">
        ${director.name}
      </span>`;
  }

  const castHTML = credits.cast?.slice(0, 8).map(a =>
    `<div class="actor-card" onclick="window.open('person.html?id=${a.id}', '_blank')">
      <img src="${a.profile_path ? 'https://image.tmdb.org/t/p/w185' + a.profile_path : 'https://via.placeholder.com/70x100?text=?'}" alt="${a.name}">
      <span class="actor-name">${a.name}</span>
      <span class="actor-char">${a.character}</span>
    </div>`
  ).join('') || '';
  document.getElementById('movieCast').innerHTML = castHTML;

  const regionData = providers.results?.[region] || providers.results?.US;
  if (regionData) {
    const types = [
      { key: 'flatrate', label: 'Stream' },
      { key: 'rent', label: 'Rent' },
      { key: 'buy', label: 'Buy' },
    ];

    let html = '';
    types.forEach(({ key, label }) => {
      if (regionData[key]?.length) {
        html += `<div class="provider-group"><span class="provider-label">${label}</span><div class="provider-logos">`;
        html += regionData[key].map(p => `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" alt="${p.provider_name}" class="provider-logo-img">`).join('');
        html += `</div></div>`;
      }
    });

    if (html) {
      document.getElementById('watchProviders').innerHTML = `<div class="providers-wrapper"><span class="providers-title">Where to watch (${region})</span>${html}</div>`;
    }
  }

  if (similar.results?.length) {
    const similarSection = document.getElementById('similarSection');
    const similarGrid = document.getElementById('similarGrid');
    similarSection.style.display = 'block';

    const similarItems = similar.results.slice(0, 12);
    similarGrid.innerHTML = similarItems.map(m => {
      const simRating = m.vote_average ? m.vote_average.toFixed(1) : '';
      const fav = isFavoriteItem(m.id, mediaType) ? '\u2764\uFE0F' : '\uD83E\uDD0D';
      return `
        <div class="similar-card" data-id="${m.id}" data-type="${normalizeMediaType(mediaType)}" data-title="${(m.title || m.name || '').replace(/"/g, '&quot;')}" data-poster="${m.poster_path || ''}">
          <div class="similar-poster-wrap">
            <img src="${m.poster_path ? TMDB_IMAGE_BASE_URL + m.poster_path : ''}" alt="${m.title || m.name}">
            ${simRating ? `<span class="tmdb-mini-score card-score">${simRating}</span>` : ''}
            <button class="similar-fav-btn">${fav}</button>
          </div>
          <span>${m.title || m.name}</span>
        </div>
      `;
    }).join('');

    similarGrid.querySelectorAll('.similar-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.similar-fav-btn')) return;
        const id = card.dataset.id;
        const type = card.dataset.type;
        window.open(`movie.html?id=${id}&type=${type}&region=${region}`, '_blank');
      });
    });

    similarGrid.querySelectorAll('.similar-fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.similar-card');
        const id = Number(card.dataset.id);
        const type = card.dataset.type;
        const title = card.dataset.title;
        const poster_path = card.dataset.poster || null;

        const nowFavorite = toggleFavoriteItem({ id, title, poster_path, media_type: type });
        btn.textContent = nowFavorite ? '\u2764\uFE0F' : '\uD83E\uDD0D';
      });
    });
  }

  document.getElementById('modalClose').addEventListener('click', closeTrailerModal);
  document.getElementById('trailerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('trailerModal')) closeTrailerModal();
  });
}

function startHeroVideo(key) {
  const wrapper = document.getElementById('heroVideoWrapper');
  wrapper.innerHTML = `<iframe id="heroIframe" src="https://www.youtube.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&rel=0&modestbranding=1&enablejsapi=1&playsinline=1" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  document.getElementById('muteBtn').style.display = 'flex';
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.textContent = '\uD83D\uDD07';
}

function toggleMute() {
  isMuted = !isMuted;
  const iframe = document.getElementById('heroIframe');
  const btn = document.getElementById('muteBtn');
  if (iframe) {
    const key = trailerKey;
    const muteParam = isMuted ? 1 : 0;
    iframe.src = `https://www.youtube.com/embed/${key}?autoplay=1&mute=${muteParam}&controls=0&loop=1&playlist=${key}&rel=0&modestbranding=1&playsinline=1`;
  }
  btn.textContent = isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
}

function openTrailerModal(key) {
  const modal = document.getElementById('trailerModal');
  document.getElementById('trailerContainer').innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  modal.classList.remove('active');
  document.getElementById('trailerContainer').innerHTML = '';
  document.body.style.overflow = '';
}

function setupFavoriteBtn(details) {
  const btn = document.getElementById('btnFavorite');
  const id = parseInt(movieId, 10);
  const normalizedType = normalizeMediaType(mediaType);

  const isFav = () => isFavoriteItem(id, normalizedType);

  const update = () => {
    btn.textContent = isFav() ? 'In Favorites' : 'Add to Favorites';
  };

  update();
  btn.addEventListener('click', () => {
    toggleFavoriteItem({
      id,
      title: details.title || details.name,
      poster_path: details.poster_path,
      media_type: normalizedType
    });
    update();
  });
}

loadMovie();
