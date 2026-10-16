// Interface language for every page. Loaded before the page's own script.
// Gives the other scripts: t(key, vars), MM_LANG ("en"), TMDB_LANG ("en-US").
// To add a string: add a key to STRINGS with all five languages.
(function () {
  const SUPPORTED = ['en', 'uk', 'ru', 'fr', 'es'];
  const LANGUAGE_NAMES = { en: 'English', uk: 'Українська', ru: 'Русский', fr: 'Français', es: 'Español' };
  const TMDB_LOCALES = { en: 'en-US', uk: 'uk-UA', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES' };

  const STRINGS = {
    // navigation
    'nav.moods': { en: 'Moods', uk: 'Настрої', ru: 'Настроения', fr: 'Humeurs', es: 'Ánimos' },
    'nav.feed': { en: 'Trailers', uk: 'Трейлери', ru: 'Трейлеры', fr: 'Bandes-annonces', es: 'Tráilers' },
    'nav.favorites': { en: 'Favorites', uk: 'Обране', ru: 'Избранное', fr: 'Favoris', es: 'Favoritos' },
    'nav.seen': { en: 'Watched', uk: 'Переглянуте', ru: 'Просмотрено', fr: 'Déjà vus', es: 'Vistos' },
    'nav.theme': { en: 'Switch light / dark theme', uk: 'Світла / темна тема', ru: 'Светлая / тёмная тема', fr: 'Thème clair / sombre', es: 'Tema claro / oscuro' },
    'nav.language': { en: 'Language', uk: 'Мова', ru: 'Язык', fr: 'Langue', es: 'Idioma' },
    'nav.theme_short': { en: 'Theme', uk: 'Тема', ru: 'Тема', fr: 'Thème', es: 'Tema' },
    'nav.menu': { en: 'Menu', uk: 'Меню', ru: 'Меню', fr: 'Menu', es: 'Menú' },

    // home
    // en must match the <title> in index.html: search engines read the page with the English interface
    'home.page_title': { en: 'MovieMood: Find a Movie for Your Mood', uk: 'MovieMood: фільм під ваш настрій', ru: 'MovieMood: фильм под ваше настроение', fr: 'MovieMood : un film selon votre humeur', es: 'MovieMood: una película para tu estado de ánimo' },
    'home.title': { en: "WHAT'S YOUR", uk: 'ЯКИЙ У ВАС', ru: 'КАКОЕ У ВАС', fr: 'QUELLE EST VOTRE', es: '¿CÓMO TE' },
    'home.title_accent': { en: 'MOOD?', uk: 'НАСТРІЙ?', ru: 'НАСТРОЕНИЕ?', fr: 'HUMEUR ?', es: 'SIENTES?' },
    'home.subtitle': { en: "Tell us how you feel - we'll find the perfect film.", uk: 'Розкажіть, що на душі, — ми підберемо фільм.', ru: 'Расскажите, что на душе, — мы подберём фильм.', fr: 'Dites-nous comment vous vous sentez, nous trouvons le film.', es: 'Cuéntanos cómo te sientes y encontramos la película.' },
    'home.search': { en: 'Search', uk: 'Знайти', ru: 'Найти', fr: 'Chercher', es: 'Buscar' },
    'home.random': { en: 'Random', uk: 'Навмання', ru: 'Наугад', fr: 'Au hasard', es: 'Al azar' },
    'home.random_hint': { en: 'Show random films', uk: 'Показати випадкові фільми', ru: 'Показать случайные фильмы', fr: 'Afficher des films au hasard', es: 'Mostrar películas al azar' },
    'home.filters': { en: 'Filters', uk: 'Фільтри', ru: 'Фильтры', fr: 'Filtres', es: 'Filtros' },
    'home.region': { en: 'Streaming region:', uk: 'Регіон стримінгу:', ru: 'Регион стриминга:', fr: 'Région de streaming :', es: 'Región de streaming:' },
    'home.region_detected': { en: 'Auto-detected', uk: 'Визначено автоматично', ru: 'Определено автоматически', fr: 'Détectée automatiquement', es: 'Detectada automáticamente' },
    'home.content_type': { en: 'Content type', uk: 'Тип', ru: 'Тип', fr: 'Type de contenu', es: 'Tipo de contenido' },
    'home.options': { en: 'Options', uk: 'Параметри', ru: 'Параметры', fr: 'Options', es: 'Opciones' },
    'home.include_anime': { en: 'Include Anime', uk: 'Тільки аніме', ru: 'Только аниме', fr: 'Uniquement des animes', es: 'Solo anime' },
    'home.examples': { en: 'Try: "horrors of 90s" · "80s action" · "dark sci-fi like Interstellar"', uk: 'Спробуйте: «жахи 90-х» · «затишний вечір» · «комедія про зомбі»', ru: 'Попробуйте: «ужасы 90-х» · «уютный вечер» · «комедия про зомби»', fr: 'Essayez : « horreur des années 90 » · « soirée cocooning » · « comédie de zombies »', es: 'Prueba: «terror de los 90» · «noche tranquila» · «comedia de zombis»' },
    'home.load_more': { en: 'Load More', uk: 'Показати ще', ru: 'Показать ещё', fr: 'Voir plus', es: 'Ver más' },
    'home.browse_moods': { en: 'Browse movies by mood', uk: 'Добірки під настрій', ru: 'Подборки под настроение', fr: 'Films par humeur', es: 'Películas por ánimo' },
    'home.empty_search': { en: 'No movies found. Try a different mood!', uk: 'Нічого не знайшлося. Спробуйте інший настрій!', ru: 'Ничего не нашлось. Попробуйте другое настроение!', fr: 'Aucun film trouvé. Essayez une autre humeur !', es: 'No encontramos nada. ¡Prueba con otro ánimo!' },
    'home.empty_title': { en: 'No titles found. Try another search.', uk: 'Нічого не знайдено. Спробуйте інший запит.', ru: 'Ничего не найдено. Попробуйте другой запрос.', fr: 'Aucun titre trouvé. Essayez une autre recherche.', es: 'No se encontró ningún título. Prueba otra búsqueda.' },
    'home.empty_trending': { en: 'Trending is unavailable right now.', uk: 'Популярне зараз недоступне.', ru: 'Популярное сейчас недоступно.', fr: 'Les tendances sont indisponibles pour le moment.', es: 'Las tendencias no están disponibles ahora.' },
    'home.load_error': { en: "Films didn't load. A browser extension or your network may be blocking them — try again or turn off the blocker for this site.", uk: 'Фільми не завантажилися. Можливо, їх блокує розширення браузера або мережа — спробуйте ще раз або вимкніть блокувальник для цього сайту.', ru: 'Фильмы не загрузились. Возможно, их блокирует расширение браузера или сеть — попробуйте ещё раз или отключите блокировщик для этого сайта.', fr: "Les films ne se sont pas chargés. Une extension du navigateur ou votre réseau les bloque peut-être — réessayez ou désactivez le bloqueur pour ce site.", es: 'Las películas no se cargaron. Puede que una extensión del navegador o tu red las bloquee: inténtalo de nuevo o desactiva el bloqueador en este sitio.' },
    'home.retry': { en: 'Try again', uk: 'Спробувати ще раз', ru: 'Попробовать ещё раз', fr: 'Réessayer', es: 'Reintentar' },
    'home.understood': { en: 'Showing:', uk: 'Показую:', ru: 'Показываю:', fr: 'Résultats pour :', es: 'Mostrando:' },
    'home.like': { en: 'like «{title}»', uk: 'схожі на «{title}»', ru: 'похожие на «{title}»', fr: 'comme « {title} »', es: 'como «{title}»' },
    // "not too gory", "no cartoons": what the search leaves out
    'avoid.horror': { en: 'horror', uk: 'жахи', ru: 'ужасы', fr: 'horreur', es: 'terror' },
    'avoid.gore': { en: 'gore', uk: 'кров і жорстокість', ru: 'кровь и жестокость', fr: 'gore', es: 'gore' },
    'avoid.violence': { en: 'violence', uk: 'насильство', ru: 'насилие', fr: 'violence', es: 'violencia' },
    'avoid.sad': { en: 'tearjerkers', uk: 'сльози', ru: 'слёзы', fr: 'mélos', es: 'dramones' },
    'avoid.romance': { en: 'romance', uk: 'романтика', ru: 'романтика', fr: 'romance', es: 'romance' },
    'avoid.animation': { en: 'cartoons', uk: 'мультфільми', ru: 'мультфильмы', fr: 'dessins animés', es: 'dibujos animados' },
    'avoid.kids': { en: 'kids’ films', uk: 'дитячі фільми', ru: 'детские фильмы', fr: 'films pour enfants', es: 'cine infantil' },
    'avoid.long': { en: 'over 2 hours', uk: 'довше 2 годин', ru: 'дольше 2 часов', fr: 'plus de 2 h', es: 'más de 2 horas' },
    'home.title_search': { en: 'title search', uk: 'пошук за назвою', ru: 'поиск по названию', fr: 'recherche par titre', es: 'búsqueda por título' },
    'home.until_year': { en: 'before {year}', uk: 'до {year}', ru: 'до {year}', fr: 'avant {year}', es: 'antes de {year}' },
    'home.since_year': { en: 'since {year}', uk: 'з {year}', ru: 'с {year}', fr: 'depuis {year}', es: 'desde {year}' },
    'home.decade': { en: '{year}s', uk: '{year}-ті', ru: '{year}-е', fr: 'années {year}', es: 'años {year}' },


    // shared
    'type.movie': { en: 'Movie', uk: 'Фільм', ru: 'Фильм', fr: 'Film', es: 'Película' },
    'type.movies': { en: 'Movies', uk: 'Фільми', ru: 'Фильмы', fr: 'Films', es: 'Películas' },
    'type.series': { en: 'Series', uk: 'Серіали', ru: 'Сериалы', fr: 'Séries', es: 'Series' },
    'type.one_series': { en: 'Series', uk: 'Серіал', ru: 'Сериал', fr: 'Série', es: 'Serie' },
    'type.documentary': { en: 'Documentary', uk: 'Документальні', ru: 'Документальные', fr: 'Documentaires', es: 'Documentales' },
    'card.favorite': { en: 'Add to favorites', uk: 'Додати в обране', ru: 'Добавить в избранное', fr: 'Ajouter aux favoris', es: 'Añadir a favoritos' },
    'card.unfavorite': { en: 'Remove from favorites', uk: 'Прибрати з обраного', ru: 'Убрать из избранного', fr: 'Retirer des favoris', es: 'Quitar de favoritos' },
    'card.mark_watched': { en: 'Mark as watched', uk: 'Позначити переглянутим', ru: 'Отметить просмотренным', fr: 'Marquer comme vu', es: 'Marcar como vista' },
    'card.unmark_watched': { en: 'Watched - click to undo', uk: 'Переглянуто — натисніть, щоб скасувати', ru: 'Просмотрено — нажмите, чтобы отменить', fr: 'Vu - cliquez pour annuler', es: 'Vista: pulsa para deshacer' },
    'card.watched': { en: 'Watched', uk: 'Переглянуто', ru: 'Просмотрено', fr: 'Vu', es: 'Vista' },
    'card.remove': { en: 'Remove', uk: 'Прибрати', ru: 'Убрать', fr: 'Retirer', es: 'Quitar' },
    // short labels of the mood buttons under the home page search
    'quick.rainy': { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia' },
    'quick.cozy': { en: 'Cozy', uk: 'Затишні', ru: 'Уютные', fr: 'Cocooning', es: 'Acogedoras' },
    'quick.feel_good': { en: 'Feel-good', uk: 'Гарний настрій', ru: 'Хорошее настроение', fr: 'Feel-good', es: 'Para animarse' },
    'quick.cry': { en: 'To cry to', uk: 'Поплакати', ru: 'Поплакать', fr: 'Pour pleurer', es: 'Para llorar' },
    'quick.date': { en: 'Date night', uk: 'Побачення', ru: 'Свидание', fr: 'En amoureux', es: 'Para una cita' },
    'quick.mind': { en: 'Mind-bending', uk: 'Ламають мозок', ru: 'Взрыв мозга', fr: 'Casse-tête', es: 'Para pensar' },
    'quick.family': { en: 'Family', uk: 'Для сім’ї', ru: 'Для семьи', fr: 'En famille', es: 'En familia' },
    'quick.nineties': { en: '90s', uk: '90-ті', ru: '90-е', fr: 'Années 90', es: 'Años 90' },
    'quick.all': { en: 'All moods', uk: 'Усі настрої', ru: 'Все настроения', fr: 'Toutes les humeurs', es: 'Todos los ánimos' },
    'footer.tmdb': { en: 'This product uses the TMDB API but is not endorsed or certified by TMDB.', uk: 'Сайт використовує TMDB API, але не схвалений і не сертифікований TMDB.', ru: 'Сайт использует TMDB API, но не одобрен и не сертифицирован TMDB.', fr: "Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.", es: 'Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.' },
    'discover': { en: 'Discover Movies', uk: 'Шукати фільми', ru: 'Искать фильмы', fr: 'Découvrir des films', es: 'Descubrir películas' },

    // mood recipes (api/mood.js MOOD_PROFILES)
    'moodname.cozy': { en: 'Cozy', uk: 'Затишне', ru: 'Уютное', fr: 'Cocooning', es: 'Acogedor' },
    'moodname.rainy': { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia' },
    'moodname.feelgood': { en: 'Feel-good', uk: 'Для настрою', ru: 'Для настроения', fr: 'Feel-good', es: 'Para animarse' },
    'moodname.sad': { en: 'Sad', uk: 'Сумне', ru: 'Грустное', fr: 'Triste', es: 'Triste' },
    'moodname.date': { en: 'Date night', uk: 'Для побачення', ru: 'Для свидания', fr: 'Soirée en amoureux', es: 'Cita' },
    'moodname.inspiring': { en: 'Inspiring', uk: 'Надихає', ru: 'Вдохновляет', fr: 'Inspirant', es: 'Inspirador' },
    'moodname.mind': { en: 'Mind-bending', uk: 'Вибух мозку', ru: 'Взрыв мозга', fr: 'Renversant', es: 'Alucinante' },

    // genres (TMDB ids)
    'genre.28': { en: 'Action', uk: 'Бойовик', ru: 'Боевик', fr: 'Action', es: 'Acción' },
    'genre.12': { en: 'Adventure', uk: 'Пригоди', ru: 'Приключения', fr: 'Aventure', es: 'Aventura' },
    'genre.16': { en: 'Animation', uk: 'Анімація', ru: 'Анимация', fr: 'Animation', es: 'Animación' },
    'genre.35': { en: 'Comedy', uk: 'Комедія', ru: 'Комедия', fr: 'Comédie', es: 'Comedia' },
    'genre.80': { en: 'Crime', uk: 'Кримінал', ru: 'Криминал', fr: 'Policier', es: 'Crimen' },
    'genre.99': { en: 'Documentary', uk: 'Документальний', ru: 'Документальный', fr: 'Documentaire', es: 'Documental' },
    'genre.18': { en: 'Drama', uk: 'Драма', ru: 'Драма', fr: 'Drame', es: 'Drama' },
    'genre.10751': { en: 'Family', uk: 'Сімейний', ru: 'Семейный', fr: 'Familial', es: 'Familia' },
    'genre.14': { en: 'Fantasy', uk: 'Фентезі', ru: 'Фэнтези', fr: 'Fantastique', es: 'Fantasía' },
    'genre.36': { en: 'History', uk: 'Історичний', ru: 'Исторический', fr: 'Histoire', es: 'Historia' },
    'genre.27': { en: 'Horror', uk: 'Жахи', ru: 'Ужасы', fr: 'Horreur', es: 'Terror' },
    'genre.10402': { en: 'Music', uk: 'Музика', ru: 'Музыка', fr: 'Musique', es: 'Música' },
    'genre.9648': { en: 'Mystery', uk: 'Детектив', ru: 'Детектив', fr: 'Mystère', es: 'Misterio' },
    'genre.10749': { en: 'Romance', uk: 'Мелодрама', ru: 'Мелодрама', fr: 'Romance', es: 'Romance' },
    'genre.878': { en: 'Sci-Fi', uk: 'Фантастика', ru: 'Фантастика', fr: 'Science-fiction', es: 'Ciencia ficción' },
    'genre.53': { en: 'Thriller', uk: 'Трилер', ru: 'Триллер', fr: 'Thriller', es: 'Suspense' },
    'genre.10752': { en: 'War', uk: 'Воєнний', ru: 'Военный', fr: 'Guerre', es: 'Bélica' },
    'genre.37': { en: 'Western', uk: 'Вестерн', ru: 'Вестерн', fr: 'Western', es: 'Western' },

    // movie page
    'movie.play_trailer': { en: 'Play Trailer', uk: 'Дивитися трейлер', ru: 'Смотреть трейлер', fr: 'Voir la bande-annonce', es: 'Ver tráiler' },
    'movie.add_favorite': { en: 'Add to Favorites', uk: 'В обране', ru: 'В избранное', fr: 'Ajouter aux favoris', es: 'Añadir a favoritos' },
    'movie.in_favorites': { en: 'In Favorites', uk: 'В обраному', ru: 'В избранном', fr: 'Dans les favoris', es: 'En favoritos' },
    'movie.director': { en: 'Director', uk: 'Режисер', ru: 'Режиссёр', fr: 'Réalisation', es: 'Dirección' },
    'movie.cast': { en: 'Cast', uk: 'У ролях', ru: 'В ролях', fr: 'Distribution', es: 'Reparto' },
    'movie.genres': { en: 'Genres', uk: 'Жанри', ru: 'Жанры', fr: 'Genres', es: 'Géneros' },
    'movie.rating': { en: 'Rating', uk: 'Рейтинг', ru: 'Рейтинг', fr: 'Note', es: 'Puntuación' },
    'movie.similar': { en: 'More Like This', uk: 'Схожі', ru: 'Похожие', fr: 'Dans le même genre', es: 'Títulos similares' },
    'movie.where_to_watch': { en: 'Where to watch ({region})', uk: 'Де дивитися ({region})', ru: 'Где смотреть ({region})', fr: 'Où regarder ({region})', es: 'Dónde ver ({region})' },
    'movie.stream': { en: 'Stream', uk: 'Підписка', ru: 'Подписка', fr: 'Streaming', es: 'Suscripción' },
    'movie.rent': { en: 'Rent', uk: 'Оренда', ru: 'Аренда', fr: 'Location', es: 'Alquiler' },
    'movie.buy': { en: 'Buy', uk: 'Купити', ru: 'Купить', fr: 'Achat', es: 'Compra' },
    'movie.provider_hint': { en: '{type}: {name}', uk: '{type}: {name}', ru: '{type}: {name}', fr: '{type} : {name}', es: '{type}: {name}' },
    'movie.justwatch': { en: 'Streaming data by JustWatch', uk: 'Дані про стримінг: JustWatch', ru: 'Данные о стриминге: JustWatch', fr: 'Données de streaming : JustWatch', es: 'Datos de streaming: JustWatch' },
    'movie.minutes': { en: '{n} min', uk: '{n} хв', ru: '{n} мин', fr: '{n} min', es: '{n} min' },
    'movie.minutes_episode': { en: '{n} min/ep', uk: '{n} хв/серія', ru: '{n} мин/серия', fr: '{n} min/ép.', es: '{n} min/ep.' },

    // mood tags on the movie page (movie.js MOOD_TAGS)
    'tag.comforting': { en: 'Cozy', uk: 'Затишний', ru: 'Уютный', fr: 'Réconfortant', es: 'Acogedor' },
    'tag.lighthearted': { en: 'Light', uk: 'Легкий', ru: 'Лёгкий', fr: 'Léger', es: 'Ligero' },
    'tag.whimsical': { en: 'Whimsical', uk: 'Чарівний', ru: 'Волшебный', fr: 'Fantaisiste', es: 'Mágico' },
    'tag.joyful': { en: 'Joyful', uk: 'Радісний', ru: 'Радостный', fr: 'Joyeux', es: 'Alegre' },
    'tag.cheerful': { en: 'Cheerful', uk: 'Життєрадісний', ru: 'Жизнерадостный', fr: 'Enjoué', es: 'Animado' },
    'tag.hopeful': { en: 'Hopeful', uk: 'Надихає надією', ru: 'Дарит надежду', fr: "Plein d'espoir", es: 'Esperanzador' },
    'tag.nostalgic': { en: 'Nostalgic', uk: 'Ностальгійний', ru: 'Ностальгический', fr: 'Nostalgique', es: 'Nostálgico' },
    'tag.sentimental': { en: 'Touching', uk: 'Зворушливий', ru: 'Трогательный', fr: 'Touchant', es: 'Conmovedor' },
    'tag.melancholy': { en: 'Melancholic', uk: 'Меланхолійний', ru: 'Меланхоличный', fr: 'Mélancolique', es: 'Melancólico' },
    'tag.bittersweet': { en: 'Bittersweet', uk: 'Гірко-солодкий', ru: 'Горько-сладкий', fr: 'Doux-amer', es: 'Agridulce' },
    'tag.romantic': { en: 'Romantic', uk: 'Романтичний', ru: 'Романтичный', fr: 'Romantique', es: 'Romántico' },
    'tag.hilarious': { en: 'Hilarious', uk: 'Дуже смішний', ru: 'Очень смешной', fr: 'Hilarant', es: 'Divertidísimo' },
    'tag.witty': { en: 'Witty', uk: 'Дотепний', ru: 'Остроумный', fr: 'Plein d’esprit', es: 'Ingenioso' },
    'tag.absurd': { en: 'Absurd', uk: 'Абсурдний', ru: 'Абсурдный', fr: 'Absurde', es: 'Absurdo' },
    'tag.intense': { en: 'Intense', uk: 'Напружений', ru: 'Напряжённый', fr: 'Intense', es: 'Intenso' },
    'tag.suspenseful': { en: 'Suspenseful', uk: 'Тримає в напрузі', ru: 'Держит в напряжении', fr: 'Haletant', es: 'De suspense' },
    'tag.tense': { en: 'Tense', uk: 'Тривожний', ru: 'Тревожный', fr: 'Tendu', es: 'Tenso' },
    'tag.philosophical': { en: 'Thought-provoking', uk: 'Змушує думати', ru: 'Заставляет думать', fr: 'Qui fait réfléchir', es: 'Hace pensar' },
    'tag.mysterious': { en: 'Mysterious', uk: 'Загадковий', ru: 'Загадочный', fr: 'Mystérieux', es: 'Misterioso' },
    'tag.awestruck': { en: 'Awe-inspiring', uk: 'Вражаючий', ru: 'Впечатляющий', fr: 'Grandiose', es: 'Impresionante' },
    'tag.inspirational': { en: 'Inspiring', uk: 'Надихаючий', ru: 'Вдохновляющий', fr: 'Inspirant', es: 'Inspirador' },

    // trailer feed
    'feed.page_title': { en: 'Trailer Feed - MovieMood', uk: 'Трейлери — MovieMood', ru: 'Трейлеры — MovieMood', fr: 'Bandes-annonces — MovieMood', es: 'Tráilers — MovieMood' },
    'feed.loading': { en: 'Loading trailers...', uk: 'Завантажуємо трейлери...', ru: 'Загружаем трейлеры...', fr: 'Chargement des bandes-annonces...', es: 'Cargando tráilers...' },
    'feed.none': { en: 'No trailers found right now. Try again in a minute.', uk: 'Зараз трейлерів немає. Спробуйте за хвилину.', ru: 'Сейчас трейлеров нет. Попробуйте через минуту.', fr: "Aucune bande-annonce pour l'instant. Réessayez dans une minute.", es: 'No hay tráilers ahora. Inténtalo en un minuto.' },
    'feed.failed': { en: 'Failed to load feed. Try refresh.', uk: 'Не вдалося завантажити. Оновіть сторінку.', ru: 'Не удалось загрузить. Обновите страницу.', fr: 'Échec du chargement. Actualisez la page.', es: 'No se pudo cargar. Actualiza la página.' },
    'feed.like': { en: 'Like', uk: 'В обране', ru: 'В избранное', fr: "J'aime", es: 'Me gusta' },
    'feed.liked': { en: 'Liked', uk: 'В обраному', ru: 'В избранном', fr: 'Aimé', es: 'Te gusta' },
    'feed.sound_off': { en: 'Sound off', uk: 'Без звуку', ru: 'Без звука', fr: 'Son coupé', es: 'Sin sonido' },
    'feed.sound_on': { en: 'Sound on', uk: 'Зі звуком', ru: 'Со звуком', fr: 'Son activé', es: 'Con sonido' },
    'feed.fit': { en: 'Whole frame', uk: 'Весь кадр', ru: 'Весь кадр', fr: 'Image entière', es: 'Imagen completa' },
    'feed.fill': { en: 'Full screen', uk: 'На весь екран', ru: 'На весь экран', fr: 'Plein écran', es: 'Pantalla completa' },
    'feed.share': { en: 'Share', uk: 'Поділитися', ru: 'Поделиться', fr: 'Partager', es: 'Compartir' },
    'feed.copied': { en: 'Link copied', uk: 'Посилання скопійовано', ru: 'Ссылка скопирована', fr: 'Lien copié', es: 'Enlace copiado' },
    'feed.details': { en: 'Details', uk: 'Докладніше', ru: 'Подробнее', fr: 'Fiche', es: 'Ficha' },
    'feed.close': { en: 'Back to search', uk: 'До пошуку', ru: 'К поиску', fr: 'Retour à la recherche', es: 'Volver a la búsqueda' },
    'feed.prev': { en: 'Previous trailer', uk: 'Попередній трейлер', ru: 'Предыдущий трейлер', fr: 'Bande-annonce précédente', es: 'Tráiler anterior' },
    'feed.next': { en: 'Next trailer', uk: 'Наступний трейлер', ru: 'Следующий трейлер', fr: 'Bande-annonce suivante', es: 'Tráiler siguiente' },

    // favorites / watched lists
    'fav.page_title': { en: 'Favorites - MovieMood', uk: 'Обране — MovieMood', ru: 'Избранное — MovieMood', fr: 'Favoris — MovieMood', es: 'Favoritos — MovieMood' },
    'fav.title': { en: 'My Favorites', uk: 'Моє обране', ru: 'Моё избранное', fr: 'Mes favoris', es: 'Mis favoritos' },
    'fav.count': { en: 'Saved: {n}', uk: 'Збережено: {n}', ru: 'Сохранено: {n}', fr: 'Enregistrés : {n}', es: 'Guardados: {n}' },
    'fav.empty_title': { en: 'No favorites yet', uk: 'Обраного поки немає', ru: 'В избранном пока пусто', fr: 'Pas encore de favoris', es: 'Aún no hay favoritos' },
    'fav.empty_text': { en: 'Explore movies and hit ❤️ to save them here', uk: 'Шукайте фільми й тисніть ❤️, щоб зберегти їх тут', ru: 'Ищите фильмы и нажимайте ❤️, чтобы сохранить их здесь', fr: 'Explorez des films et appuyez sur ❤️ pour les garder ici', es: 'Explora películas y pulsa ❤️ para guardarlas aquí' },
    'fav.clear': { en: 'Clear all favorites', uk: 'Очистити обране', ru: 'Очистить избранное', fr: 'Vider les favoris', es: 'Vaciar favoritos' },
    'fav.clear_confirm': { en: 'Remove all favorites?', uk: 'Прибрати все з обраного?', ru: 'Убрать всё из избранного?', fr: 'Retirer tous les favoris ?', es: '¿Quitar todos los favoritos?' },
    'seen.page_title': { en: 'Watched - MovieMood', uk: 'Переглянуте — MovieMood', ru: 'Просмотрено — MovieMood', fr: 'Déjà vus — MovieMood', es: 'Vistos — MovieMood' },
    'seen.title': { en: 'Watched', uk: 'Переглянуте', ru: 'Просмотрено', fr: 'Déjà vus', es: 'Vistos' },
    'seen.count': { en: 'Watched: {n}', uk: 'Переглянуто: {n}', ru: 'Просмотрено: {n}', fr: 'Vus : {n}', es: 'Vistos: {n}' },
    'seen.empty_title': { en: 'No watched titles yet', uk: 'Переглянутого поки немає', ru: 'Просмотренного пока нет', fr: 'Rien de vu pour le moment', es: 'Aún no hay títulos vistos' },
    'seen.empty_text': { en: 'Mark movies and series as watched to keep your history here', uk: 'Позначайте фільми й серіали переглянутими — історія буде тут', ru: 'Отмечайте фильмы и сериалы просмотренными — история будет здесь', fr: 'Marquez films et séries comme vus pour garder votre historique ici', es: 'Marca películas y series como vistas para guardar aquí tu historial' },
    'seen.clear': { en: 'Clear watched history', uk: 'Очистити історію', ru: 'Очистить историю', fr: "Effacer l'historique", es: 'Borrar historial' },
    'seen.clear_confirm': { en: 'Clear seen history?', uk: 'Очистити історію переглядів?', ru: 'Очистить историю просмотров?', fr: "Effacer l'historique ?", es: '¿Borrar el historial?' },

    // person page
    'person.born': { en: 'Born: {date}', uk: 'Дата народження: {date}', ru: 'Дата рождения: {date}', fr: 'Naissance : {date}', es: 'Nacimiento: {date}' },
    'person.age': { en: 'Age: {n}', uk: 'Вік: {n}', ru: 'Возраст: {n}', fr: 'Âge : {n}', es: 'Edad: {n}' },
    'person.died': { en: 'Died: {date}', uk: 'Дата смерті: {date}', ru: 'Дата смерти: {date}', fr: 'Décès : {date}', es: 'Fallecimiento: {date}' },
    'person.place': { en: 'Place: {place}', uk: 'Місце народження: {place}', ru: 'Место рождения: {place}', fr: 'Lieu : {place}', es: 'Lugar: {place}' },
    'person.read_more': { en: 'Read more', uk: 'Читати далі', ru: 'Читать дальше', fr: 'Lire la suite', es: 'Leer más' },
    'person.filmography': { en: 'Films & Series with {name}', uk: 'Фільми й серіали: {name}', ru: 'Фильмы и сериалы: {name}', fr: 'Films et séries : {name}', es: 'Películas y series: {name}' }
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
  const LANG_PREFIX = /^\/(uk|ru|fr|es)(?=[/?#]|$)/;
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
