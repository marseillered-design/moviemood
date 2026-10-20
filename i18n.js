// Interface language for every page. Loaded before the page's own script.
// Gives the other scripts: t(key, vars), MM_LANG ("en"), TMDB_LANG ("en-US").
// To add a string: add a key to STRINGS with all six languages.
(function () {
  const SUPPORTED = ['en', 'uk', 'ru', 'fr', 'es', 'de'];
  const LANGUAGE_NAMES = { en: 'English', uk: 'Українська', ru: 'Русский', fr: 'Français', es: 'Español', de: 'Deutsch' };
  const TMDB_LOCALES = { en: 'en-US', uk: 'uk-UA', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };

  const STRINGS = {
    // navigation
    'nav.moods': { en: 'Moods', uk: 'Настрої', ru: 'Настроения', fr: 'Humeurs', es: 'Ánimos', de: 'Stimmungen' },
    'nav.feed': { en: 'Trailers', uk: 'Трейлери', ru: 'Трейлеры', fr: 'Bandes-annonces', es: 'Tráilers', de: 'Trailer' },
    'nav.favorites': { en: 'Favorites', uk: 'Обране', ru: 'Избранное', fr: 'Favoris', es: 'Favoritos', de: 'Favoriten' },
    'nav.seen': { en: 'Watched', uk: 'Переглянуте', ru: 'Просмотрено', fr: 'Déjà vus', es: 'Vistos', de: 'Gesehen' },
    'nav.theme': { en: 'Switch light / dark theme', uk: 'Світла / темна тема', ru: 'Светлая / тёмная тема', fr: 'Thème clair / sombre', es: 'Tema claro / oscuro', de: 'Helles / dunkles Design' },
    'nav.language': { en: 'Language', uk: 'Мова', ru: 'Язык', fr: 'Langue', es: 'Idioma', de: 'Sprache' },
    'nav.theme_short': { en: 'Theme', uk: 'Тема', ru: 'Тема', fr: 'Thème', es: 'Tema', de: 'Design' },
    'nav.menu': { en: 'Menu', uk: 'Меню', ru: 'Меню', fr: 'Menu', es: 'Menú', de: 'Menü' },

    // home
    // en must match the <title> in index.html: search engines read the page with the English interface
    'home.page_title': { en: 'MovieMood: Find a Movie for Your Mood', uk: 'MovieMood: фільм під ваш настрій', ru: 'MovieMood: фильм под ваше настроение', fr: 'MovieMood : un film selon votre humeur', es: 'MovieMood: una película para tu estado de ánimo', de: 'MovieMood: der passende Film für deine Stimmung' },
    'home.title': { en: "What's your", uk: 'Який у вас', ru: 'Какое у вас', fr: 'Quelle est votre', es: '¿Cómo te', de: 'Wie ist deine' },
    'home.title_accent': { en: 'mood?', uk: 'настрій?', ru: 'настроение?', fr: 'humeur ?', es: 'sientes?', de: 'Stimmung?' },
    'home.subtitle': { en: "Tell us how you feel - we'll find the perfect film.", uk: 'Розкажіть, що на душі, — ми підберемо фільм.', ru: 'Расскажите, что на душе, — мы подберём фильм.', fr: 'Dites-nous comment vous vous sentez, nous trouvons le film.', es: 'Cuéntanos cómo te sientes y encontramos la película.', de: 'Sag uns, wie du dich fühlst – wir finden den passenden Film.' },
    'home.search': { en: 'Search', uk: 'Знайти', ru: 'Найти', fr: 'Chercher', es: 'Buscar', de: 'Suchen' },
    'home.random': { en: 'Random', uk: 'Навмання', ru: 'Наугад', fr: 'Au hasard', es: 'Al azar', de: 'Zufall' },
    'home.random_hint': { en: 'Show random films', uk: 'Показати випадкові фільми', ru: 'Показать случайные фильмы', fr: 'Afficher des films au hasard', es: 'Mostrar películas al azar', de: 'Zufällige Filme zeigen' },
    'home.filters': { en: 'Filters', uk: 'Фільтри', ru: 'Фильтры', fr: 'Filtres', es: 'Filtros', de: 'Filter' },
    'home.region': { en: 'Streaming region', uk: 'Регіон стримінгу', ru: 'Регион стриминга', fr: 'Région de streaming', es: 'Región de streaming', de: 'Streaming-Region' },
    'home.region_detected': { en: 'Auto-detected', uk: 'Визначено автоматично', ru: 'Определено автоматически', fr: 'Détectée automatiquement', es: 'Detectada automáticamente', de: 'Automatisch erkannt' },
    'home.content_type': { en: 'Content type', uk: 'Тип', ru: 'Тип', fr: 'Type de contenu', es: 'Tipo de contenido', de: 'Inhaltstyp' },
    'home.options': { en: 'Options', uk: 'Параметри', ru: 'Параметры', fr: 'Options', es: 'Opciones', de: 'Optionen' },
    'home.include_anime': { en: 'Include Anime', uk: 'Тільки аніме', ru: 'Только аниме', fr: 'Uniquement des animes', es: 'Solo anime', de: 'Nur Anime' },
    'home.examples': { en: 'Try: "horrors of 90s" · "80s action" · "dark sci-fi like Interstellar"', uk: 'Спробуйте: «жахи 90-х» · «затишний вечір» · «комедія про зомбі»', ru: 'Попробуйте: «ужасы 90-х» · «уютный вечер» · «комедия про зомби»', fr: 'Essayez : « horreur des années 90 » · « soirée cocooning » · « comédie de zombies »', es: 'Prueba: «terror de los 90» · «noche tranquila» · «comedia de zombis»', de: 'Probier: „Horror der 90er“ · „ruhiger Abend“ · „Zombie-Komödie“' },
    'home.load_more': { en: 'Load More', uk: 'Показати ще', ru: 'Показать ещё', fr: 'Voir plus', es: 'Ver más', de: 'Mehr laden' },
    'home.browse_moods': { en: 'Browse movies by mood', uk: 'Добірки під настрій', ru: 'Подборки под настроение', fr: 'Films par humeur', es: 'Películas por ánimo', de: 'Filme nach Stimmung' },
    'home.empty_search': { en: 'No movies found. Try a different mood!', uk: 'Нічого не знайшлося. Спробуйте інший настрій!', ru: 'Ничего не нашлось. Попробуйте другое настроение!', fr: 'Aucun film trouvé. Essayez une autre humeur !', es: 'No encontramos nada. ¡Prueba con otro ánimo!', de: 'Nichts gefunden. Probier eine andere Stimmung!' },
    'home.empty_title': { en: 'No titles found. Try another search.', uk: 'Нічого не знайдено. Спробуйте інший запит.', ru: 'Ничего не найдено. Попробуйте другой запрос.', fr: 'Aucun titre trouvé. Essayez une autre recherche.', es: 'No se encontró ningún título. Prueba otra búsqueda.', de: 'Kein Titel gefunden. Versuch eine andere Suche.' },
    'home.empty_trending': { en: 'Trending is unavailable right now.', uk: 'Популярне зараз недоступне.', ru: 'Популярное сейчас недоступно.', fr: 'Les tendances sont indisponibles pour le moment.', es: 'Las tendencias no están disponibles ahora.', de: 'Die Trends sind gerade nicht verfügbar.' },
    'home.load_error': { en: "Films didn't load. A browser extension or your network may be blocking them — try again or turn off the blocker for this site.", uk: 'Фільми не завантажилися. Можливо, їх блокує розширення браузера або мережа — спробуйте ще раз або вимкніть блокувальник для цього сайту.', ru: 'Фильмы не загрузились. Возможно, их блокирует расширение браузера или сеть — попробуйте ещё раз или отключите блокировщик для этого сайта.', fr: "Les films ne se sont pas chargés. Une extension du navigateur ou votre réseau les bloque peut-être — réessayez ou désactivez le bloqueur pour ce site.", es: 'Las películas no se cargaron. Puede que una extensión del navegador o tu red las bloquee: inténtalo de nuevo o desactiva el bloqueador en este sitio.', de: 'Die Filme wurden nicht geladen. Vielleicht blockiert eine Browser-Erweiterung oder dein Netzwerk sie – versuch es noch einmal oder schalte den Blocker für diese Seite aus.' },
    'home.retry': { en: 'Try again', uk: 'Спробувати ще раз', ru: 'Попробовать ещё раз', fr: 'Réessayer', es: 'Reintentar', de: 'Erneut versuchen' },
    'home.understood': { en: 'Showing:', uk: 'Показую:', ru: 'Показываю:', fr: 'Résultats pour :', es: 'Mostrando:', de: 'Angezeigt:' },
    'home.like': { en: 'like «{title}»', uk: 'схожі на «{title}»', ru: 'похожие на «{title}»', fr: 'comme « {title} »', es: 'como «{title}»', de: 'wie „{title}“' },
    // "not too gory", "no cartoons": what the search leaves out
    'avoid.horror': { en: 'horror', uk: 'жахи', ru: 'ужасы', fr: 'horreur', es: 'terror', de: 'Horror' },
    'avoid.gore': { en: 'gore', uk: 'кров і жорстокість', ru: 'кровь и жестокость', fr: 'gore', es: 'gore', de: 'Splatter' },
    'avoid.violence': { en: 'violence', uk: 'насильство', ru: 'насилие', fr: 'violence', es: 'violencia', de: 'Gewalt' },
    'avoid.sad': { en: 'tearjerkers', uk: 'сльози', ru: 'слёзы', fr: 'mélos', es: 'dramones', de: 'Tränendrüsen' },
    'avoid.romance': { en: 'romance', uk: 'романтика', ru: 'романтика', fr: 'romance', es: 'romance', de: 'Romantik' },
    'avoid.animation': { en: 'cartoons', uk: 'мультфільми', ru: 'мультфильмы', fr: 'dessins animés', es: 'dibujos animados', de: 'Zeichentrick' },
    'avoid.kids': { en: 'kids’ films', uk: 'дитячі фільми', ru: 'детские фильмы', fr: 'films pour enfants', es: 'cine infantil', de: 'Kinderfilme' },
    'avoid.long': { en: 'over 2 hours', uk: 'довше 2 годин', ru: 'дольше 2 часов', fr: 'plus de 2 h', es: 'más de 2 horas', de: 'über 2 Stunden' },
    // above the popular titles before anything is searched, per tab
    'home.popular_movie': { en: 'Popular movies this week', uk: 'Популярні фільми тижня', ru: 'Популярные фильмы недели', fr: 'Films populaires cette semaine', es: 'Películas populares de la semana', de: 'Beliebte Filme der Woche' },
    'home.popular_tv': { en: 'Popular series this week', uk: 'Популярні серіали тижня', ru: 'Популярные сериалы недели', fr: 'Séries populaires cette semaine', es: 'Series populares de la semana', de: 'Beliebte Serien der Woche' },
    'home.popular_documentary': { en: 'Popular documentaries', uk: 'Популярні документальні фільми', ru: 'Популярные документальные фильмы', fr: 'Documentaires populaires', es: 'Documentales populares', de: 'Beliebte Dokumentarfilme' },
    'home.title_search': { en: 'title search', uk: 'пошук за назвою', ru: 'поиск по названию', fr: 'recherche par titre', es: 'búsqueda por título', de: 'Titelsuche' },
    'home.until_year': { en: 'before {year}', uk: 'до {year}', ru: 'до {year}', fr: 'avant {year}', es: 'antes de {year}', de: 'vor {year}' },
    'home.since_year': { en: 'since {year}', uk: 'з {year}', ru: 'с {year}', fr: 'depuis {year}', es: 'desde {year}', de: 'seit {year}' },
    'home.decade': { en: '{year}s', uk: '{year}-ті', ru: '{year}-е', fr: 'années {year}', es: 'años {year}', de: '{year}er' },


    // shared
    'type.movie': { en: 'Movie', uk: 'Фільм', ru: 'Фильм', fr: 'Film', es: 'Película', de: 'Film' },
    'type.movies': { en: 'Movies', uk: 'Фільми', ru: 'Фильмы', fr: 'Films', es: 'Películas', de: 'Filme' },
    'type.series': { en: 'Series', uk: 'Серіали', ru: 'Сериалы', fr: 'Séries', es: 'Series', de: 'Serien' },
    'type.one_series': { en: 'Series', uk: 'Серіал', ru: 'Сериал', fr: 'Série', es: 'Serie', de: 'Serie' },
    'type.documentary': { en: 'Documentary', uk: 'Документальні', ru: 'Документальные', fr: 'Documentaires', es: 'Documentales', de: 'Dokus' },
    'card.favorite': { en: 'Add to favorites', uk: 'Додати в обране', ru: 'Добавить в избранное', fr: 'Ajouter aux favoris', es: 'Añadir a favoritos', de: 'Zu Favoriten hinzufügen' },
    'card.unfavorite': { en: 'Remove from favorites', uk: 'Прибрати з обраного', ru: 'Убрать из избранного', fr: 'Retirer des favoris', es: 'Quitar de favoritos', de: 'Aus Favoriten entfernen' },
    'card.mark_watched': { en: 'Mark as watched', uk: 'Позначити переглянутим', ru: 'Отметить просмотренным', fr: 'Marquer comme vu', es: 'Marcar como vista', de: 'Als gesehen markieren' },
    'card.unmark_watched': { en: 'Watched - click to undo', uk: 'Переглянуто — натисніть, щоб скасувати', ru: 'Просмотрено — нажмите, чтобы отменить', fr: 'Vu - cliquez pour annuler', es: 'Vista: pulsa para deshacer', de: 'Gesehen – klicken zum Rückgängigmachen' },
    'card.watched': { en: 'Watched', uk: 'Переглянуто', ru: 'Просмотрено', fr: 'Vu', es: 'Vista', de: 'Gesehen' },
    'card.remove': { en: 'Remove', uk: 'Прибрати', ru: 'Убрать', fr: 'Retirer', es: 'Quitar', de: 'Entfernen' },
    // short labels of the mood buttons under the home page search
    'quick.rainy': { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia', de: 'Regentag' },
    'quick.cozy': { en: 'Cozy', uk: 'Затишні', ru: 'Уютные', fr: 'Cocooning', es: 'Acogedoras', de: 'Gemütlich' },
    'quick.feel_good': { en: 'Feel-good', uk: 'Гарний настрій', ru: 'Хорошее настроение', fr: 'Feel-good', es: 'Para animarse', de: 'Gute Laune' },
    'quick.cry': { en: 'To cry to', uk: 'Поплакати', ru: 'Поплакать', fr: 'Pour pleurer', es: 'Para llorar', de: 'Zum Weinen' },
    'quick.date': { en: 'Date night', uk: 'Побачення', ru: 'Свидание', fr: 'En amoureux', es: 'Para una cita', de: 'Date-Abend' },
    'quick.mind': { en: 'Mind-bending', uk: 'Ламають мозок', ru: 'Взрыв мозга', fr: 'Casse-tête', es: 'Para pensar', de: 'Kopfkino' },
    'quick.family': { en: 'Family', uk: 'Для сім’ї', ru: 'Для семьи', fr: 'En famille', es: 'En familia', de: 'Familie' },
    'quick.nineties': { en: '90s', uk: '90-ті', ru: '90-е', fr: 'Années 90', es: 'Años 90', de: '90er' },
    'quick.all': { en: 'All moods', uk: 'Усі настрої', ru: 'Все настроения', fr: 'Toutes les humeurs', es: 'Todos los ánimos', de: 'Alle Stimmungen' },
    'footer.tmdb': { en: 'This product uses the TMDB API but is not endorsed or certified by TMDB.', uk: 'Сайт використовує TMDB API, але не схвалений і не сертифікований TMDB.', ru: 'Сайт использует TMDB API, но не одобрен и не сертифицирован TMDB.', fr: "Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.", es: 'Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.', de: 'Dieses Produkt nutzt die TMDB-API, wird aber nicht von TMDB unterstützt oder zertifiziert.' },
    'discover': { en: 'Discover Movies', uk: 'Шукати фільми', ru: 'Искать фильмы', fr: 'Découvrir des films', es: 'Descubrir películas', de: 'Filme entdecken' },

    // mood recipes (api/mood.js MOOD_PROFILES)
    'moodname.cozy': { en: 'Cozy', uk: 'Затишне', ru: 'Уютное', fr: 'Cocooning', es: 'Acogedor', de: 'Gemütlich' },
    'moodname.rainy': { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia', de: 'Regentag' },
    'moodname.feelgood': { en: 'Feel-good', uk: 'Для настрою', ru: 'Для настроения', fr: 'Feel-good', es: 'Para animarse', de: 'Gute Laune' },
    'moodname.sad': { en: 'Sad', uk: 'Сумне', ru: 'Грустное', fr: 'Triste', es: 'Triste', de: 'Traurig' },
    'moodname.date': { en: 'Date night', uk: 'Для побачення', ru: 'Для свидания', fr: 'Soirée en amoureux', es: 'Cita', de: 'Date-Abend' },
    'moodname.inspiring': { en: 'Inspiring', uk: 'Надихає', ru: 'Вдохновляет', fr: 'Inspirant', es: 'Inspirador', de: 'Inspirierend' },
    'moodname.mind': { en: 'Mind-bending', uk: 'Вибух мозку', ru: 'Взрыв мозга', fr: 'Renversant', es: 'Alucinante', de: 'Kopfkino' },

    // genres (TMDB ids)
    'genre.28': { en: 'Action', uk: 'Бойовик', ru: 'Боевик', fr: 'Action', es: 'Acción', de: 'Action' },
    'genre.12': { en: 'Adventure', uk: 'Пригоди', ru: 'Приключения', fr: 'Aventure', es: 'Aventura', de: 'Abenteuer' },
    'genre.16': { en: 'Animation', uk: 'Анімація', ru: 'Анимация', fr: 'Animation', es: 'Animación', de: 'Animation' },
    'genre.35': { en: 'Comedy', uk: 'Комедія', ru: 'Комедия', fr: 'Comédie', es: 'Comedia', de: 'Komödie' },
    'genre.80': { en: 'Crime', uk: 'Кримінал', ru: 'Криминал', fr: 'Policier', es: 'Crimen', de: 'Krimi' },
    'genre.99': { en: 'Documentary', uk: 'Документальний', ru: 'Документальный', fr: 'Documentaire', es: 'Documental', de: 'Dokumentarfilm' },
    'genre.18': { en: 'Drama', uk: 'Драма', ru: 'Драма', fr: 'Drame', es: 'Drama', de: 'Drama' },
    'genre.10751': { en: 'Family', uk: 'Сімейний', ru: 'Семейный', fr: 'Familial', es: 'Familia', de: 'Familie' },
    'genre.14': { en: 'Fantasy', uk: 'Фентезі', ru: 'Фэнтези', fr: 'Fantastique', es: 'Fantasía', de: 'Fantasy' },
    'genre.36': { en: 'History', uk: 'Історичний', ru: 'Исторический', fr: 'Histoire', es: 'Historia', de: 'Historie' },
    'genre.27': { en: 'Horror', uk: 'Жахи', ru: 'Ужасы', fr: 'Horreur', es: 'Terror', de: 'Horror' },
    'genre.10402': { en: 'Music', uk: 'Музика', ru: 'Музыка', fr: 'Musique', es: 'Música', de: 'Musik' },
    'genre.9648': { en: 'Mystery', uk: 'Детектив', ru: 'Детектив', fr: 'Mystère', es: 'Misterio', de: 'Mystery' },
    'genre.10749': { en: 'Romance', uk: 'Мелодрама', ru: 'Мелодрама', fr: 'Romance', es: 'Romance', de: 'Liebesfilm' },
    'genre.878': { en: 'Sci-Fi', uk: 'Фантастика', ru: 'Фантастика', fr: 'Science-fiction', es: 'Ciencia ficción', de: 'Science-Fiction' },
    'genre.53': { en: 'Thriller', uk: 'Трилер', ru: 'Триллер', fr: 'Thriller', es: 'Suspense', de: 'Thriller' },
    'genre.10752': { en: 'War', uk: 'Воєнний', ru: 'Военный', fr: 'Guerre', es: 'Bélica', de: 'Kriegsfilm' },
    'genre.37': { en: 'Western', uk: 'Вестерн', ru: 'Вестерн', fr: 'Western', es: 'Western', de: 'Western' },

    // movie page
    'movie.play_trailer': { en: 'Play Trailer', uk: 'Дивитися трейлер', ru: 'Смотреть трейлер', fr: 'Voir la bande-annonce', es: 'Ver tráiler', de: 'Trailer abspielen' },
    'movie.add_favorite': { en: 'Add to Favorites', uk: 'В обране', ru: 'В избранное', fr: 'Ajouter aux favoris', es: 'Añadir a favoritos', de: 'Zu Favoriten' },
    'movie.in_favorites': { en: 'In Favorites', uk: 'В обраному', ru: 'В избранном', fr: 'Dans les favoris', es: 'En favoritos', de: 'In Favoriten' },
    'movie.director': { en: 'Director', uk: 'Режисер', ru: 'Режиссёр', fr: 'Réalisation', es: 'Dirección', de: 'Regie' },
    'movie.cast': { en: 'Cast', uk: 'У ролях', ru: 'В ролях', fr: 'Distribution', es: 'Reparto', de: 'Besetzung' },
    'movie.genres': { en: 'Genres', uk: 'Жанри', ru: 'Жанры', fr: 'Genres', es: 'Géneros', de: 'Genres' },
    'movie.rating': { en: 'Rating', uk: 'Рейтинг', ru: 'Рейтинг', fr: 'Note', es: 'Puntuación', de: 'Bewertung' },
    'movie.similar': { en: 'More Like This', uk: 'Схожі', ru: 'Похожие', fr: 'Dans le même genre', es: 'Títulos similares', de: 'Ähnliche Titel' },
    'movie.imdb_votes': { en: '{votes} votes on IMDb', uk: '{votes} голосів на IMDb', ru: '{votes} голосов на IMDb', fr: '{votes} votes sur IMDb', es: '{votes} votos en IMDb', de: '{votes} Stimmen auf IMDb' },
    'movie.where_to_watch': { en: 'Where to watch ({region})', uk: 'Де дивитися ({region})', ru: 'Где смотреть ({region})', fr: 'Où regarder ({region})', es: 'Dónde ver ({region})', de: 'Wo ansehen ({region})' },
    'movie.stream': { en: 'Stream', uk: 'Підписка', ru: 'Подписка', fr: 'Streaming', es: 'Suscripción', de: 'Abo' },
    'movie.rent': { en: 'Rent', uk: 'Оренда', ru: 'Аренда', fr: 'Location', es: 'Alquiler', de: 'Leihen' },
    'movie.buy': { en: 'Buy', uk: 'Купити', ru: 'Купить', fr: 'Achat', es: 'Compra', de: 'Kaufen' },
    'movie.provider_hint': { en: '{type}: {name}', uk: '{type}: {name}', ru: '{type}: {name}', fr: '{type} : {name}', es: '{type}: {name}', de: '{type}: {name}' },
    'movie.justwatch': { en: 'Streaming data by JustWatch', uk: 'Дані про стримінг: JustWatch', ru: 'Данные о стриминге: JustWatch', fr: 'Données de streaming : JustWatch', es: 'Datos de streaming: JustWatch', de: 'Streaming-Daten von JustWatch' },
    'movie.minutes': { en: '{n} min', uk: '{n} хв', ru: '{n} мин', fr: '{n} min', es: '{n} min', de: '{n} Min.' },
    'movie.minutes_episode': { en: '{n} min/ep', uk: '{n} хв/серія', ru: '{n} мин/серия', fr: '{n} min/ép.', es: '{n} min/ep.', de: '{n} Min./Folge' },

    // mood tags on the movie page (movie.js MOOD_TAGS)
    'tag.comforting': { en: 'Cozy', uk: 'Затишний', ru: 'Уютный', fr: 'Réconfortant', es: 'Acogedor', de: 'Gemütlich' },
    'tag.lighthearted': { en: 'Light', uk: 'Легкий', ru: 'Лёгкий', fr: 'Léger', es: 'Ligero', de: 'Leicht' },
    'tag.whimsical': { en: 'Whimsical', uk: 'Чарівний', ru: 'Волшебный', fr: 'Fantaisiste', es: 'Mágico', de: 'Verspielt' },
    'tag.joyful': { en: 'Joyful', uk: 'Радісний', ru: 'Радостный', fr: 'Joyeux', es: 'Alegre', de: 'Fröhlich' },
    'tag.cheerful': { en: 'Cheerful', uk: 'Життєрадісний', ru: 'Жизнерадостный', fr: 'Enjoué', es: 'Animado', de: 'Heiter' },
    'tag.hopeful': { en: 'Hopeful', uk: 'Надихає надією', ru: 'Дарит надежду', fr: "Plein d'espoir", es: 'Esperanzador', de: 'Hoffnungsvoll' },
    'tag.nostalgic': { en: 'Nostalgic', uk: 'Ностальгійний', ru: 'Ностальгический', fr: 'Nostalgique', es: 'Nostálgico', de: 'Nostalgisch' },
    'tag.sentimental': { en: 'Touching', uk: 'Зворушливий', ru: 'Трогательный', fr: 'Touchant', es: 'Conmovedor', de: 'Berührend' },
    'tag.melancholy': { en: 'Melancholic', uk: 'Меланхолійний', ru: 'Меланхоличный', fr: 'Mélancolique', es: 'Melancólico', de: 'Melancholisch' },
    'tag.bittersweet': { en: 'Bittersweet', uk: 'Гірко-солодкий', ru: 'Горько-сладкий', fr: 'Doux-amer', es: 'Agridulce', de: 'Bittersüß' },
    'tag.romantic': { en: 'Romantic', uk: 'Романтичний', ru: 'Романтичный', fr: 'Romantique', es: 'Romántico', de: 'Romantisch' },
    'tag.hilarious': { en: 'Hilarious', uk: 'Дуже смішний', ru: 'Очень смешной', fr: 'Hilarant', es: 'Divertidísimo', de: 'Urkomisch' },
    'tag.witty': { en: 'Witty', uk: 'Дотепний', ru: 'Остроумный', fr: 'Plein d’esprit', es: 'Ingenioso', de: 'Witzig' },
    'tag.absurd': { en: 'Absurd', uk: 'Абсурдний', ru: 'Абсурдный', fr: 'Absurde', es: 'Absurdo', de: 'Absurd' },
    'tag.intense': { en: 'Intense', uk: 'Напружений', ru: 'Напряжённый', fr: 'Intense', es: 'Intenso', de: 'Intensiv' },
    'tag.suspenseful': { en: 'Suspenseful', uk: 'Тримає в напрузі', ru: 'Держит в напряжении', fr: 'Haletant', es: 'De suspense', de: 'Spannend' },
    'tag.tense': { en: 'Tense', uk: 'Тривожний', ru: 'Тревожный', fr: 'Tendu', es: 'Tenso', de: 'Nervenaufreibend' },
    'tag.philosophical': { en: 'Thought-provoking', uk: 'Змушує думати', ru: 'Заставляет думать', fr: 'Qui fait réfléchir', es: 'Hace pensar', de: 'Regt zum Nachdenken an' },
    'tag.mysterious': { en: 'Mysterious', uk: 'Загадковий', ru: 'Загадочный', fr: 'Mystérieux', es: 'Misterioso', de: 'Geheimnisvoll' },
    'tag.awestruck': { en: 'Awe-inspiring', uk: 'Вражаючий', ru: 'Впечатляющий', fr: 'Grandiose', es: 'Impresionante', de: 'Überwältigend' },
    'tag.inspirational': { en: 'Inspiring', uk: 'Надихаючий', ru: 'Вдохновляющий', fr: 'Inspirant', es: 'Inspirador', de: 'Inspirierend' },

    // trailer feed
    'feed.page_title': { en: 'Trailer Feed - MovieMood', uk: 'Трейлери — MovieMood', ru: 'Трейлеры — MovieMood', fr: 'Bandes-annonces — MovieMood', es: 'Tráilers — MovieMood', de: 'Trailer — MovieMood' },
    'feed.loading': { en: 'Loading trailers...', uk: 'Завантажуємо трейлери...', ru: 'Загружаем трейлеры...', fr: 'Chargement des bandes-annonces...', es: 'Cargando tráilers...', de: 'Trailer werden geladen...' },
    'feed.none': { en: 'No trailers found right now. Try again in a minute.', uk: 'Зараз трейлерів немає. Спробуйте за хвилину.', ru: 'Сейчас трейлеров нет. Попробуйте через минуту.', fr: "Aucune bande-annonce pour l'instant. Réessayez dans une minute.", es: 'No hay tráilers ahora. Inténtalo en un minuto.', de: 'Gerade keine Trailer gefunden. Versuch es in einer Minute noch einmal.' },
    'feed.failed': { en: 'Failed to load feed. Try refresh.', uk: 'Не вдалося завантажити. Оновіть сторінку.', ru: 'Не удалось загрузить. Обновите страницу.', fr: 'Échec du chargement. Actualisez la page.', es: 'No se pudo cargar. Actualiza la página.', de: 'Laden fehlgeschlagen. Aktualisiere die Seite.' },
    'feed.like': { en: 'Like', uk: 'В обране', ru: 'В избранное', fr: "J'aime", es: 'Me gusta', de: 'Gefällt mir' },
    'feed.liked': { en: 'Liked', uk: 'В обраному', ru: 'В избранном', fr: 'Aimé', es: 'Te gusta', de: 'Gefällt dir' },
    'feed.sound_off': { en: 'Sound off', uk: 'Без звуку', ru: 'Без звука', fr: 'Son coupé', es: 'Sin sonido', de: 'Ton aus' },
    'feed.sound_on': { en: 'Sound on', uk: 'Зі звуком', ru: 'Со звуком', fr: 'Son activé', es: 'Con sonido', de: 'Ton an' },
    'feed.fit': { en: 'Whole frame', uk: 'Весь кадр', ru: 'Весь кадр', fr: 'Image entière', es: 'Imagen completa', de: 'Ganzes Bild' },
    'feed.fill': { en: 'Full screen', uk: 'На весь екран', ru: 'На весь экран', fr: 'Plein écran', es: 'Pantalla completa', de: 'Vollbild' },
    'feed.share': { en: 'Share', uk: 'Поділитися', ru: 'Поделиться', fr: 'Partager', es: 'Compartir', de: 'Teilen' },
    'feed.copied': { en: 'Link copied', uk: 'Посилання скопійовано', ru: 'Ссылка скопирована', fr: 'Lien copié', es: 'Enlace copiado', de: 'Link kopiert' },
    'feed.details': { en: 'Details', uk: 'Докладніше', ru: 'Подробнее', fr: 'Fiche', es: 'Ficha', de: 'Details' },
    'feed.close': { en: 'Back to search', uk: 'До пошуку', ru: 'К поиску', fr: 'Retour à la recherche', es: 'Volver a la búsqueda', de: 'Zurück zur Suche' },
    'feed.prev': { en: 'Previous trailer', uk: 'Попередній трейлер', ru: 'Предыдущий трейлер', fr: 'Bande-annonce précédente', es: 'Tráiler anterior', de: 'Vorheriger Trailer' },
    'feed.next': { en: 'Next trailer', uk: 'Наступний трейлер', ru: 'Следующий трейлер', fr: 'Bande-annonce suivante', es: 'Tráiler siguiente', de: 'Nächster Trailer' },

    // favorites / watched lists
    'fav.page_title': { en: 'Favorites - MovieMood', uk: 'Обране — MovieMood', ru: 'Избранное — MovieMood', fr: 'Favoris — MovieMood', es: 'Favoritos — MovieMood', de: 'Favoriten — MovieMood' },
    'fav.title': { en: 'My Favorites', uk: 'Моє обране', ru: 'Моё избранное', fr: 'Mes favoris', es: 'Mis favoritos', de: 'Meine Favoriten' },
    'fav.count': { en: 'Saved: {n}', uk: 'Збережено: {n}', ru: 'Сохранено: {n}', fr: 'Enregistrés : {n}', es: 'Guardados: {n}', de: 'Gespeichert: {n}' },
    'fav.empty_title': { en: 'No favorites yet', uk: 'Обраного поки немає', ru: 'В избранном пока пусто', fr: 'Pas encore de favoris', es: 'Aún no hay favoritos', de: 'Noch keine Favoriten' },
    'fav.empty_text': { en: 'Explore movies and hit ❤️ to save them here', uk: 'Шукайте фільми й тисніть ❤️, щоб зберегти їх тут', ru: 'Ищите фильмы и нажимайте ❤️, чтобы сохранить их здесь', fr: 'Explorez des films et appuyez sur ❤️ pour les garder ici', es: 'Explora películas y pulsa ❤️ para guardarlas aquí', de: 'Entdecke Filme und tippe auf ❤️, um sie hier zu speichern' },
    'fav.clear': { en: 'Clear all favorites', uk: 'Очистити обране', ru: 'Очистить избранное', fr: 'Vider les favoris', es: 'Vaciar favoritos', de: 'Alle Favoriten löschen' },
    'fav.clear_confirm': { en: 'Remove all favorites?', uk: 'Прибрати все з обраного?', ru: 'Убрать всё из избранного?', fr: 'Retirer tous les favoris ?', es: '¿Quitar todos los favoritos?', de: 'Alle Favoriten entfernen?' },
    'seen.page_title': { en: 'Watched - MovieMood', uk: 'Переглянуте — MovieMood', ru: 'Просмотрено — MovieMood', fr: 'Déjà vus — MovieMood', es: 'Vistos — MovieMood', de: 'Gesehen — MovieMood' },
    'seen.title': { en: 'Watched', uk: 'Переглянуте', ru: 'Просмотрено', fr: 'Déjà vus', es: 'Vistos', de: 'Gesehen' },
    'seen.count': { en: 'Watched: {n}', uk: 'Переглянуто: {n}', ru: 'Просмотрено: {n}', fr: 'Vus : {n}', es: 'Vistos: {n}', de: 'Gesehen: {n}' },
    'seen.empty_title': { en: 'No watched titles yet', uk: 'Переглянутого поки немає', ru: 'Просмотренного пока нет', fr: 'Rien de vu pour le moment', es: 'Aún no hay títulos vistos', de: 'Noch nichts gesehen' },
    'seen.empty_text': { en: 'Mark movies and series as watched to keep your history here', uk: 'Позначайте фільми й серіали переглянутими — історія буде тут', ru: 'Отмечайте фильмы и сериалы просмотренными — история будет здесь', fr: 'Marquez films et séries comme vus pour garder votre historique ici', es: 'Marca películas y series como vistas para guardar aquí tu historial', de: 'Markiere Filme und Serien als gesehen, um hier deinen Verlauf zu sammeln' },
    'seen.clear': { en: 'Clear watched history', uk: 'Очистити історію', ru: 'Очистить историю', fr: "Effacer l'historique", es: 'Borrar historial', de: 'Verlauf löschen' },
    'seen.clear_confirm': { en: 'Clear seen history?', uk: 'Очистити історію переглядів?', ru: 'Очистить историю просмотров?', fr: "Effacer l'historique ?", es: '¿Borrar el historial?', de: 'Verlauf löschen?' },

    // person page
    'person.born': { en: 'Born: {date}', uk: 'Дата народження: {date}', ru: 'Дата рождения: {date}', fr: 'Naissance : {date}', es: 'Nacimiento: {date}', de: 'Geboren: {date}' },
    'person.age': { en: 'Age: {n}', uk: 'Вік: {n}', ru: 'Возраст: {n}', fr: 'Âge : {n}', es: 'Edad: {n}', de: 'Alter: {n}' },
    'person.died': { en: 'Died: {date}', uk: 'Дата смерті: {date}', ru: 'Дата смерти: {date}', fr: 'Décès : {date}', es: 'Fallecimiento: {date}', de: 'Gestorben: {date}' },
    'person.place': { en: 'Place: {place}', uk: 'Місце народження: {place}', ru: 'Место рождения: {place}', fr: 'Lieu : {place}', es: 'Lugar: {place}', de: 'Geburtsort: {place}' },
    'person.read_more': { en: 'Read more', uk: 'Читати далі', ru: 'Читать дальше', fr: 'Lire la suite', es: 'Leer más', de: 'Mehr lesen' },
    'person.filmography': { en: 'Films & Series with {name}', uk: 'Фільми й серіали: {name}', ru: 'Фильмы и сериалы: {name}', fr: 'Films et séries : {name}', es: 'Películas y series: {name}', de: 'Filme & Serien mit {name}' }
  };

  // Static texts of each page: [selector, key, how to apply]
  //   text (default) — replace the element's text; an optional 4th item is an emoji put in front
  //   title / placeholder / aria — set that attribute instead
  const BINDINGS = [
    ['.home-subtitle:not(.mood-intro)', 'home.subtitle'],
    ['#searchBtn', 'home.search'],
    ['#surpriseBtn', 'home.random_hint', 'title'],
    ['#surpriseBtn .btn-label', 'home.random'],
    ['#filtersBtn .btn-label', 'home.filters'],
    ['.chip-icon[data-press="surpriseBtn"]', 'home.random_hint', 'title'],
    ['.chip-icon[data-press="filtersBtn"]', 'home.filters', 'title'],
    ['.region-label', 'home.region', 'text', '🌍'],
    ['.filter-group:nth-child(1) .filter-group-label', 'home.content_type'],
    ['.filter-group:nth-child(2) .filter-group-label', 'home.options'],
    ['.tab[data-type="movie"]', 'type.movies', 'text', '🎬'],
    ['.tab[data-type="tv"]', 'type.series', 'text', '📺'],
    ['.tab[data-type="documentary"]', 'type.documentary', 'text', '🎥'],
    ['.anime-toggle .toggle-label', 'home.include_anime'],
    ['.example-text', 'home.examples'],
    ['.home-footer .footer-moods', 'home.browse_moods'],
    ['.home-footer .footer-tmdb', 'footer.tmdb'],
    ['#btnPlayTrailer', 'movie.play_trailer', 'text', '▶'],
    ['.info-row[data-row="director"] .info-label', 'movie.director'],
    ['.info-row[data-row="cast"] .info-label', 'movie.cast'],
    ['.info-row[data-row="genres"] .info-label', 'movie.genres'],
    ['.info-row[data-row="rating"] .info-label', 'movie.rating'],
    ['#similarSection .section-title', 'movie.similar'],
    ['.btn-discover', 'discover'],
    ['body[data-page="favorites"] .page-title', 'fav.title'],
    ['body[data-page="favorites"] .fav-empty h2', 'fav.empty_title'],
    ['body[data-page="favorites"] .fav-empty p', 'fav.empty_text'],
    ['#clearAllBtn', 'fav.clear', 'text', '🗑️'],
    ['body[data-page="seen"] .page-title', 'seen.title'],
    ['body[data-page="seen"] .fav-empty h2', 'seen.empty_title'],
    ['body[data-page="seen"] .fav-empty p', 'seen.empty_text'],
    ['#clearSeenBtn', 'seen.clear', 'text', '🗑️']
  ];

  const PAGE_TITLES = { home: 'home.page_title', feed: 'feed.page_title', favorites: 'fav.page_title', seen: 'seen.page_title' };

  // /uk/moods/cozy-movies, /ru/movie/218-the-terminator: the server rendered the page in that
  // language. ?lang= is the server's fallback to a plain page (movie.html?id=218&ssr=0&lang=uk)
  const LANG_PREFIX = /^\/(uk|ru|fr|es|de)(?=[/?#]|$)/;
  const pathLanguage = (window.location.pathname.match(LANG_PREFIX) || [])[1]
    || [new URLSearchParams(window.location.search).get('lang')].find(code => SUPPORTED.includes(code));
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}

  function detectLanguage() {
    if (pathLanguage) {
      // a visitor who arrives on a Ukrainian page keeps Ukrainian on the next ones
      try { localStorage.setItem('lang', pathLanguage); } catch (e) {}
      return pathLanguage;
    }
    if (SUPPORTED.includes(saved)) return saved;
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
    for (const candidate of candidates) {
      const code = String(candidate).slice(0, 2).toLowerCase();
      if (SUPPORTED.includes(code)) return code;
    }
    return 'en';
  }

  const lang = detectLanguage();

  // Someone who picked a language earlier and opens an English page that also exists in theirs
  // (from a search result, say) goes to their version. Only for a choice saved in this browser:
  // search engines keep nothing between visits, so they always see the address they asked for.
  if (!pathLanguage && lang !== 'en' && saved === lang) {
    const own = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (own && own.href !== window.location.href.split(/[?#]/)[0]) {
      window.location.replace(own.href + window.location.search + window.location.hash);
    }
  }

  // "/moods" → "/uk/moods", "/?q=cozy" → "/uk?q=cozy" for the current language (or the one given)
  function langPath(path, code = lang) {
    const plain = path.replace(LANG_PREFIX, '') || '/';
    if (code === 'en') return plain.startsWith('/') ? plain : `/${plain}`;
    return `/${code}${plain.replace(/^\/(?=[?#]|$)/, '')}`;
  }

  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? (entry[lang] ?? entry.en) : key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, value);
    }
    return text;
  }

  // "Korean" / "корейська" for a language code, "France" / "Франція" for a country code
  function displayName(type, code) {
    try {
      const name = new Intl.DisplayNames([lang], { type }).of(code);
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
    } catch (e) {
      return code;
    }
  }

  const flagEmoji = code => String.fromCodePoint(...[...code.toUpperCase()].map(ch => 0x1F1A5 + ch.charCodeAt(0)));

  function applyTranslations() {
    document.documentElement.lang = lang;

    const page = document.body.dataset.page;
    if (PAGE_TITLES[page]) document.title = t(PAGE_TITLES[page]);

    for (const [selector, key, mode = 'text', emoji] of BINDINGS) {
      document.querySelectorAll(selector).forEach(el => {
        const text = t(key);
        if (mode === 'title') { el.title = text; el.setAttribute('aria-label', text); }
        else el.textContent = emoji ? `${emoji} ${text}` : text;
      });
    }

    const title = document.querySelector('.home-title:not(.mood-title)');
    if (title) {
      title.textContent = `${t('home.title')} `;
      const accent = document.createElement('span');
      accent.className = 'title-accent';
      accent.textContent = t('home.title_accent');
      title.appendChild(accent);
    }

    document.querySelectorAll('#countrySelect option').forEach(option => {
      option.textContent = `${flagEmoji(option.value)} ${displayName('region', option.value)}`;
    });

    // Short labels marked in the page itself (the mood buttons under the search)
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

    // Pages whose footer is a single plain line
    document.querySelectorAll('.home-footer p').forEach(p => {
      if (!p.children.length) p.textContent = t('footer.tmdb');
    });

    // Links to the home page and the collections stay in the visitor's language
    if (lang !== 'en') {
      document.querySelectorAll('a[href="/"], a[href^="/moods"], a[href^="/?"]').forEach(link => {
        link.setAttribute('href', langPath(link.getAttribute('href')));
      });
    }
  }

  window.MM_LANG = lang;
  window.mmLangPath = langPath;
  // for the language picker in nav.js
  window.MM_LANGUAGES = LANGUAGE_NAMES;
  window.TMDB_LANG = TMDB_LOCALES[lang];
  window.t = t;
  window.mmDisplayName = displayName;

  applyTranslations();
})();
