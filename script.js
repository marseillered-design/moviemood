// ================= TMDB CONFIG =================
const TMDB_API_KEY = "838a2b872b36560920c01b7b50b0bb9e"; // если позже спрячем — уберём
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// ================= STATE =================
let currentMovies = [];
let currentRegion = "US";

// ================= DOM =================
const moodInput = document.getElementById("moodInput");
const searchBtn = document.getElementById("searchBtn");
const moviesGrid = document.getElementById("moviesGrid");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  searchBtn.addEventListener("click", handleSearch);
  moodInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
});

// ================= MAIN SEARCH =================
async function handleSearch() {
  const query = moodInput.value.trim();
  if (!query) return;

  showLoading();
  clearMovies();
  hideError();

  try {
    const response = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const aiData = await response.json();

    if (!aiData) throw new Error("AI failed");

    if (aiData.mode === "similar" && aiData.reference_title) {
      await handleSimilarMode(aiData.reference_title);
    } else {
      await handleFilterMode(aiData);
    }
  } catch (error) {
    console.error("AI error:", error);
    const fallback = await searchTMDB(query);
    displayMovies(fallback);
  } finally {
    hideLoading();
  }
}

// ================= SIMILAR MODE =================
async function handleSimilarMode(title) {
  const searchResults = await searchTMDB(title);

  if (!searchResults.length) {
    showError("No similar movies found.");
    return;
  }

  const referenceMovie = searchResults[0];

  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${referenceMovie.id}/similar?api_key=${TMDB_API_KEY}`
  );

  const data = await res.json();

  const filtered = data.results.filter((m) => m.vote_count > 1000);

  displayMovies(filtered);
}

// ================= FILTER MODE (SMART AI) =================
async function handleFilterMode(aiData) {
  const {
    primary_genres = [],
    exclude_genres = [],
    year_from,
    year_to,
    vote_average_gte,
    vote_count_gte = 1000,
    original_language,
    sort_by = "popularity.desc",
    type = "movie",
  } = aiData;

  const endpoint = type === "tv" ? "discover/tv" : "discover/movie";

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    sort_by,
    page: 1,
  });

  if (primary_genres.length)
    params.append("with_genres", primary_genres.join(","));

  if (exclude_genres.length)
    params.append("without_genres", exclude_genres.join(","));

  if (year_from)
    params.append("primary_release_date.gte", `${year_from}-01-01`);

  if (year_to)
    params.append("primary_release_date.lte", `${year_to}-12-31`);

  if (vote_average_gte)
    params.append("vote_average.gte", vote_average_gte);

  if (vote_count_gte)
    params.append("vote_count.gte", vote_count_gte);

  if (original_language)
    params.append("with_original_language", original_language);

  const res = await fetch(
    `${TMDB_BASE_URL}/${endpoint}?${params.toString()}`
  );

  const data = await res.json();

  displayMovies(data.results || []);
}

// ================= NORMAL SEARCH =================
async function searchTMDB(query) {
  const res = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}`
  );

  const data = await res.json();
  return data.results || [];
}

// ================= DISPLAY =================
function displayMovies(movies) {
  currentMovies = movies;
  moviesGrid.innerHTML = "";

  movies.forEach((movie) => {
    const card = createMovieCard(movie);
    moviesGrid.appendChild(card);
  });
}

function createMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
    : "";

  card.innerHTML = `
    <img src="${poster}" alt="${movie.title}">
    <div class="movie-info">
      <h3>${movie.title}</h3>
      <p>⭐ ${movie.vote_average?.toFixed(1) || "N/A"}</p>
    </div>
  `;

  card.addEventListener("click", () => {
    window.location.href = \`movie.html?id=\${movie.id}\`;
  });

  return card;
}

// ================= UI HELPERS =================
function showLoading() {
  if (loading) loading.style.display = "block";
}

function hideLoading() {
  if (loading) loading.style.display = "none";
}

function showError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  if (errorMessage) errorMessage.style.display = "none";
}

function clearMovies() {
  moviesGrid.innerHTML = "";
}