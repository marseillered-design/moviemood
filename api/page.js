// Server-rendered pages for search engines (see vercel.json for the URLs):
//   /moods              → list of mood collections
//   /moods/:slug        → one collection ("Movies for a Rainy Day")
//   /movie/:id, /tv/:id → movie.html with real <title>, description and content filled in
//   /person/:id         → person.html, the same way
//   /movies-like/:id, /shows-like/:id → what fans of one film or series love most
//   /uk, /ru, /fr, /es, /de  → the home page in that language; the pages above also exist under
//                         these prefixes (/uk/moods/cozy-movies, /fr/movie/218-the-terminator)
//   /sitemap.xml, /robots.txt

import LIKE_DATA from './_like-data.js';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
// posters in the card grids: sharp at card size, half the weight of w500
const TMDB_CARD_URL = 'https://image.tmdb.org/t/p/w342';
const ASSET_VERSION = '20261028b';
const DAY = 86400;

// Shared quality bar: known, well-rated titles only
const DEFAULT_DISCOVER = 'sort_by=popularity.desc&vote_count.gte=1500&vote_average.gte=6.5&include_adult=false';

// ══════════════════════════════════════════════
// MOOD COLLECTIONS
// discover — TMDB /discover/movie parameters; query — what the "search" link sends to the home page
// ══════════════════════════════════════════════
const MOODS = [
  {
    slug: 'rainy-day-movies', emoji: '🌧️', title: 'Movies for a Rainy Day', query: 'rainy day',
    discover: 'with_genres=35|18|10749&with_keywords=325784|164246|319319|278730|225219|288816&without_genres=28,27,53,80,10752,878,12&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'For a day you are not leaving the house: Amélie, Notting Hill and other warm, slightly sad films you can watch back to back.'
  },
  {
    slug: 'feel-good-movies', emoji: '😊', title: 'Feel-Good Movies', query: 'feel good',
    discover: 'with_keywords=325824|325782|325832|281585|288816&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Films to watch when the day went badly, from The Intouchables to Silver Linings Playbook. Expect a lot of laughing and, now and then, a lump in the throat.'
  },
  {
    slug: 'movies-to-cry-to', emoji: '😢', title: 'Movies to Cry To', query: 'want to cry',
    discover: 'with_genres=18&with_keywords=319319|4232|156924|9872|278730&without_genres=27,28,53,9648,878&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Sometimes you need a proper cry. These love stories and dramas earn their tears honestly — keep the tissues within reach.'
  },
  {
    slug: 'date-night-movies', emoji: '💕', title: 'Date Night Movies', query: 'date night',
    discover: 'with_genres=10749&with_keywords=324429|9673|288816&without_genres=27,53&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Love stories for two: The Notebook if you are feeling sentimental, Crazy, Stupid, Love. if you would both rather laugh, and plenty in between.'
  },
  {
    slug: 'cozy-movies', emoji: '🕯️', title: 'Cozy Movies', query: 'cozy',
    discover: 'with_genres=35|10749|10751&with_keywords=325784|288816|324713|325832&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Films many of us have seen ten times and would happily see again, such as Mary Poppins and When Harry Met Sally. Make some tea: nothing here will make you jump.'
  },
  {
    slug: 'mind-bending-movies', emoji: '🌀', title: 'Mind-Bending Movies', query: 'mind bending',
    discover: 'with_genres=878|9648&with_keywords=212737|197582|325775&without_genres=16,10751,28,12&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Puzzles that play with time, memory and reality. You will want to talk about the ending — or watch it again straight away.'
  },
  {
    slug: 'plot-twist-movies', emoji: '🎭', title: 'Movies with a Plot Twist', query: 'thriller with crazy ending',
    discover: 'with_genres=53,9648&vote_average.gte=7.3',
    intro: 'Thrillers where nothing is quite what it seems. Go in knowing as little as possible and do not let anyone spoil the last act.'
  },
  {
    slug: 'halloween-movies', emoji: '🎃', title: 'Halloween Movies', query: 'halloween',
    discover: 'with_genres=27&with_keywords=3335|3358&vote_average.gte=6&vote_count.gte=800',
    intro: 'Classic slashers like Halloween and A Nightmare on Elm Street, plus The Conjuring if you prefer ghosts. If someone on the sofa scares easily, try Coraline or Gremlins.'
  },
  {
    slug: 'family-movie-night', emoji: '👨‍👩‍👧', title: 'Family Movie Night', query: 'family',
    discover: 'with_genres=10751,16',
    intro: 'Animated films that work for every age on the sofa — bright enough for kids, smart enough that adults stay awake.'
  },
  {
    slug: 'motivational-movies', emoji: '💪', title: 'Motivational Movies', query: 'inspiring',
    discover: 'with_genres=18&with_keywords=281585|325824|240&without_genres=53,80,27,9648&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Rocky gets up one more time, and Walter Mitty finally leaves his desk. Put one of these on when you need a push to start something hard.'
  },
  {
    slug: 'christmas-movies', emoji: '🎄', title: 'Christmas Movies', query: 'christmas',
    // The season's big page: three pages of the best-known films with TMDB's "christmas" tag,
    // plus classics that lack the tag (Die Hard, The Muppet Christmas Carol, Miracle on 34th Street),
    // in three groups. Horror only when it is a comedy too (Gremlins, Krampus).
    discover: 'with_keywords=207317&sort_by=vote_count.desc&vote_count.gte=400&vote_average.gte=6',
    pages: 3,
    pin: [562, 10437, 11881],
    keep: movie => !movie.genre_ids.includes(27) || movie.genre_ids.includes(35),
    sections: [
      ['xmas_family', movie => movie.genre_ids.includes(10751) || movie.genre_ids.includes(16)],
      ['xmas_romance', movie => movie.genre_ids.includes(10749)],
      ['xmas_grownup', () => true]
    ],
    intro: 'Holiday favourites old and new for the weeks when the tree is up: family films and cartoons, love stories, and comedies and action for after the kids are in bed.',
    more: 'How we picked: every film here is set at Christmas or built around it, and has been rated by hundreds or thousands of viewers on TMDB, so you will not find random TV movies. Classics like Home Alone, It’s a Wonderful Life and Die Hard sit next to newer favourites such as Klaus and The Holdovers. Each title links to its trailer and to where you can stream, rent or buy it.'
  },
  {
    slug: 'movies-to-watch-with-friends', emoji: '🍕', title: 'Movies to Watch with Friends', query: 'with friends',
    discover: 'with_genres=35,28',
    intro: 'Loud, fast and funny action comedies that survive people talking over them. Made for pizza and a full sofa.'
  },
  {
    slug: 'late-night-thrillers', emoji: '🌙', title: 'Late-Night Thrillers', query: 'crime thriller',
    discover: 'with_genres=53,80',
    intro: 'Crime thrillers for when the house is quiet and you are not ready to sleep. Tense, dark and best watched with the lights off.'
  },
  {
    slug: 'true-story-movies', emoji: '📰', title: 'Movies Based on a True Story', query: 'based on true story',
    discover: 'with_keywords=9672&with_genres=18&vote_average.gte=7',
    intro: 'Dramas about real people, from Oskar Schindler to Mark Zuckerberg. You will probably look up what happened next as soon as the credits roll.'
  },
  {
    slug: 'heist-movies', emoji: '💰', title: 'Heist Movies', query: 'heist',
    discover: 'with_keywords=10051&vote_count.gte=1000',
    intro: 'Ocean’s Eleven if you want the plan to work, Reservoir Dogs if you want to see what happens when it does not. Half the fun is watching the crew come together.'
  },
  {
    slug: 'time-travel-movies', emoji: '⏳', title: 'Time Travel Movies', query: 'time travel',
    discover: 'with_keywords=4379',
    intro: 'Some of these are pure fun, like Back to the Future. Others, like Tenet and Donnie Darko, you may need to watch twice to work out what happened.'
  },
  {
    slug: 'coming-of-age-movies', emoji: '🎒', title: 'Coming-of-Age Movies', query: 'coming of age',
    discover: 'with_keywords=10683&with_genres=18&without_genres=16,14,28,878&vote_average.gte=7',
    intro: 'Dead Poets Society and The Perks of Being a Wallflower are the usual place to start. Aftersun and Call Me by Your Name hit harder if you watch them as an adult.'
  },
  {
    slug: 'road-trip-movies', emoji: '🚗', title: 'Road Trip Movies', query: 'road trip',
    discover: 'with_keywords=7312&with_genres=35|18&without_genres=14,878,16,28&vote_count.gte=800',
    intro: 'Long drives with the wrong company. Green Book does it seriously, Dumb and Dumber as stupidly as possible. For when you want to get away without leaving the sofa.'
  },
  {
    slug: 'space-movies', emoji: '🚀', title: 'Space Movies', query: 'space',
    discover: 'with_keywords=9882|3801&with_genres=878&without_genres=16',
    intro: 'In The Martian one man tries to grow potatoes on Mars. In Alien a crew is hunted through its own ship. The rest of the science fiction here sits somewhere between the two.'
  },
  {
    slug: 'dystopian-movies', emoji: '🏙️', title: 'Dystopian Movies', query: 'dystopia',
    discover: 'with_keywords=4565',
    intro: 'Futures that went wrong, and the people pushing back. Dark, stylish worlds that say more about today than tomorrow.'
  },
  {
    slug: 'high-school-movies', emoji: '🏫', title: 'High School Movies', query: 'high school comedy',
    discover: 'with_keywords=6270&with_genres=35&vote_count.gte=800',
    intro: 'Superbad is one night spent trying to buy alcohol for a party, Ferris Bueller’s Day Off one day spent skipping school. The other teen comedies here are just as easy to rewatch.'
  },
  {
    slug: 'serial-killer-thrillers', emoji: '🔪', title: 'Serial Killer Thrillers', query: 'serial killer',
    discover: 'with_keywords=10714&with_genres=53&vote_average.gte=6.8',
    intro: 'Detectives who can’t let go: Se7en, plus Zodiac and Memories of Murder, which follow real cases that stayed unsolved for decades. For viewers with strong nerves.'
  },
  {
    slug: 'best-90s-movies', emoji: '📼', title: 'Best Movies of the 90s', query: '90s',
    discover: 'primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=4000',
    intro: 'The decade of video stores and sold-out Friday nights. The highest-rated films of the 1990s, all of which still hold up.'
  },
  {
    slug: 'best-80s-movies', emoji: '🕹️', title: 'Best Movies of the 80s', query: '80s',
    discover: 'primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&sort_by=vote_average.desc&vote_count.gte=3000',
    intro: 'The list has Back to the Future and Aliens, but also Akira and My Neighbor Totoro. It is ordered by viewer ratings, so it goes well beyond American blockbusters.'
  },
  {
    slug: 'best-anime-movies', emoji: '🎌', title: 'Best Anime Movies', query: 'anime',
    discover: 'with_genres=16&with_keywords=210024&sort_by=vote_count.desc&vote_count.gte=500',
    intro: 'From Studio Ghibli to Makoto Shinkai: the best-loved anime films, the kind that enchant children and adults alike.'
  },
  {
    slug: 'best-documentaries', emoji: '🎥', title: 'Best Documentaries', query: 'documentary',
    // best rated, without concert films (10402) and TV specials (10770) such as reunions
    discover: 'with_genres=99&without_genres=10402,10770&sort_by=vote_average.desc&vote_count.gte=700',
    intro: 'True stories told better than fiction: nature, sport, music and crime documentaries that people keep recommending.'
  }
];

// ══════════════════════════════════════════════
// LANGUAGES
// English pages live at the plain addresses, the others under a prefix: /uk/moods/cozy-movies,
// /ru/movie/218-the-terminator. The slug stays English in every language, so one film has the
// same address apart from the prefix.
// ══════════════════════════════════════════════
const LANGS = ['en', 'uk', 'ru', 'fr', 'es', 'de'];
const TMDB_LOCALES = { en: 'en-US', uk: 'uk-UA', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };
const OG_LOCALES = { en: 'en_US', uk: 'uk_UA', ru: 'ru_RU', fr: 'fr_FR', es: 'es_ES', de: 'de_DE' };
// "Where to watch" in the page's text and description: the country most readers of each
// language version are in (the browser then shows the visitor's own country)
// Premiero in the same language and, where it has one, the same country as "where to watch"
const PREMIERO_URLS = { en: 'https://thepremiero.com/en/us', uk: 'https://thepremiero.com/uk/ua', ru: 'https://thepremiero.com/ru/kz', fr: 'https://thepremiero.com/fr/fr', es: 'https://thepremiero.com/es/es', de: 'https://thepremiero.com/de/de' };
const premieroLine = lang => `<p class="footer-premiero"><span data-i18n="footer.premiero">${escapeHtml(tr(lang, 'premiero'))}</span> <a href="${PREMIERO_URLS[lang]}" data-premiero>Premiero</a></p>`;
const WATCH_COUNTRIES = { en: 'US', uk: 'UA', ru: 'KZ', fr: 'FR', es: 'ES', de: 'DE' };

// [title, intro] of each collection in the other languages
const MOOD_TEXT = {
  'rainy-day-movies': {
    uk: ['Фільми для дощового дня', 'На день, коли нікуди не треба йти: «Амелі», «Ноттінґ Гілл» та інші теплі, трохи сумні фільми, які можна дивитися один за одним.'],
    ru: ['Фильмы для дождливого дня', 'На день, когда никуда не надо идти: «Амели», «Ноттинг Хилл» и другие тёплые, немного грустные фильмы, которые можно смотреть один за другим.'],
    fr: ['Films pour un jour de pluie', 'Pour une journée sans sortir de chez soi : Le Fabuleux Destin d’Amélie Poulain, Coup de foudre à Notting Hill et d’autres films tendres, un peu tristes, à enchaîner.'],
    es: ['Películas para un día de lluvia', 'Para un día sin salir de casa: Amelie, Notting Hill y otras películas cálidas y algo tristes para ver una detrás de otra.'],
    de: ['Filme für einen Regentag', 'Für einen Tag, an dem du nicht rausmusst: Die fabelhafte Welt der Amélie, Notting Hill und andere warme, leicht traurige Filme zum Hintereinanderschauen.']
  },
  'feel-good-movies': {
    uk: ['Фільми для гарного настрою', 'Фільми на вечір після поганого дня, від «1+1» до «Збірки промінців надії». Сміятиметеся багато, а часом підступить клубок до горла.'],
    ru: ['Фильмы для хорошего настроения', 'Фильмы на вечер после плохого дня, от «1+1» до «Мой парень – псих». Смеяться будете много, а иногда подступит ком к горлу.'],
    fr: ['Films feel-good', 'Des films pour les jours où rien n’a marché, d’Intouchables à Happiness Therapy. On rit beaucoup et, de temps en temps, on a la gorge serrée.'],
    es: ['Películas para levantar el ánimo', 'Películas para cuando el día ha ido mal, de Intocable a El lado bueno de las cosas. Te vas a reír mucho y, de vez en cuando, se te hará un nudo en la garganta.'],
    de: ['Feel-Good-Filme', 'Filme für Tage, an denen alles schiefging, von Ziemlich beste Freunde bis Silver Linings. Du wirst viel lachen und ab und zu einen Kloß im Hals haben.']
  },
  'movies-to-cry-to': {
    uk: ['Фільми, щоб поплакати', 'Іноді треба як слід виплакатися. Ці історії кохання та драми чесно заслуговують на кожну сльозу — тримайте серветки поруч.'],
    ru: ['Фильмы, чтобы поплакать', 'Иногда нужно как следует выплакаться. Эти истории любви и драмы честно заслуживают каждой слезы — держите салфетки под рукой.'],
    fr: ['Films pour pleurer', 'Parfois, on a besoin d’une bonne crise de larmes. Ces histoires d’amour et ces drames les méritent honnêtement : gardez les mouchoirs à portée de main.'],
    es: ['Películas para llorar', 'A veces hace falta llorar a gusto. Estas historias de amor y dramas se ganan cada lágrima con honestidad: ten los pañuelos a mano.'],
    de: ['Filme zum Weinen', 'Manchmal muss man einfach richtig weinen. Diese Liebesgeschichten und Dramen verdienen ihre Tränen ehrlich – die Taschentücher besser griffbereit halten.']
  },
  'date-night-movies': {
    uk: ['Фільми для побачення', 'Історії кохання на двох: «Щоденник пам’яті», якщо настрій сентиментальний, «Це безглузде кохання», якщо обом хочеться посміятися, і багато чого між ними.'],
    ru: ['Фильмы для свидания', 'Истории любви на двоих: «Дневник памяти», если настроение сентиментальное, «Эта дурацкая любовь», если обоим хочется посмеяться, и много чего между ними.'],
    fr: ['Films pour une soirée en amoureux', 'Des histoires d’amour à deux : N’oublie jamais si vous êtes d’humeur sentimentale, Crazy, Stupid, Love si vous préférez rire, et bien d’autres entre les deux.'],
    es: ['Películas para una cita', 'Historias de amor para dos: El diario de Noa si estáis sentimentales, Crazy, Stupid, Love. si preferís reír, y muchas más entre medias.'],
    de: ['Filme für den Date-Abend', 'Liebesgeschichten zu zweit: Wie ein einziger Tag, wenn ihr sentimental seid, Crazy, Stupid, Love., wenn ihr lieber lachen wollt, und vieles dazwischen.']
  },
  'cozy-movies': {
    uk: ['Затишні фільми', 'Фільми, які багато хто бачив разів по десять і радо подивиться знову, як-от «Мері Поппінс» і «Коли Гаррі зустрів Саллі». Заваріть чаю: лякатися тут нема чого.'],
    ru: ['Уютные фильмы', 'Фильмы, которые многие видели раз по десять и с радостью посмотрят снова, вроде «Мэри Поппинс» и «Когда Гарри встретил Салли». Заварите чаю: пугаться здесь нечего.'],
    fr: ['Films cocooning', 'Des films que beaucoup ont vus dix fois et reverraient volontiers, comme Mary Poppins et Quand Harry rencontre Sally. Préparez un thé : rien ici ne vous fera sursauter.'],
    es: ['Películas acogedoras', 'Películas que muchos han visto diez veces y volverían a ver encantados, como Mary Poppins y Cuando Harry encontró a Sally. Prepara un té: aquí nada te va a dar un susto.'],
    de: ['Gemütliche Filme', 'Filme, die viele schon zehnmal gesehen haben und gern wieder sehen, etwa Mary Poppins und Harry und Sally. Mach dir einen Tee: Hier erschreckt dich nichts.']
  },
  'mind-bending-movies': {
    uk: ['Фільми, що ламають мозок', 'Головоломки, які грають із часом, пам’яттю та реальністю. Про фінал захочеться поговорити — або одразу переглянути.'],
    ru: ['Фильмы, которые взрывают мозг', 'Головоломки, которые играют со временем, памятью и реальностью. О финале захочется поговорить — или сразу пересмотреть.'],
    fr: ['Films qui retournent le cerveau', 'Des casse-tête qui jouent avec le temps, la mémoire et la réalité. Vous voudrez parler de la fin, ou revoir le film tout de suite.'],
    es: ['Películas que te vuelan la cabeza', 'Rompecabezas que juegan con el tiempo, la memoria y la realidad. Querrás hablar del final, o volver a verla enseguida.'],
    de: ['Mindfuck-Filme', 'Rätsel, die mit Zeit, Erinnerung und Wirklichkeit spielen. Über das Ende willst du reden – oder den Film gleich noch einmal sehen.']
  },
  'plot-twist-movies': {
    uk: ['Фільми з несподіваним фіналом', 'Трилери, де ніщо не є тим, чим здається. Дивіться, знаючи якомога менше, і не дозволяйте нікому зіпсувати фінал спойлером.'],
    ru: ['Фильмы с неожиданной концовкой', 'Триллеры, где ничто не то, чем кажется. Смотрите, зная как можно меньше, и не позволяйте никому проспойлерить финал.'],
    fr: ['Films avec un twist final', 'Des thrillers où rien n’est vraiment ce qu’il paraît. Lancez-vous en en sachant le moins possible et ne laissez personne vous gâcher le dernier acte.'],
    es: ['Películas con giro final', 'Thrillers donde nada es lo que parece. Entra sabiendo lo menos posible y no dejes que nadie te destripe el último acto.'],
    de: ['Filme mit Plot-Twist', 'Thriller, in denen nichts ist, wie es scheint. So wenig wie möglich vorher wissen und sich das Finale von niemandem spoilern lassen.']
  },
  'halloween-movies': {
    uk: ['Фільми на Хелловін', 'Класичні слешери, як-от «Гелловін» і «Жах на вулиці В’язів», а ще «Закляття», якщо вам ближчі привиди. Якщо хтось на дивані легко лякається, спробуйте «Кораліну у світі кошмарів» або «Гремлінів».'],
    ru: ['Фильмы на Хэллоуин', 'Классические слэшеры вроде «Хэллоуина» и «Кошмара на улице Вязов», а ещё «Заклятие», если вам ближе призраки. Если кто-то на диване легко пугается, попробуйте «Коралину в стране кошмаров» или «Гремлинов».'],
    fr: ['Films d’Halloween', 'Des slashers classiques comme La Nuit des masques et Les Griffes de la nuit, et Conjuring si vous préférez les fantômes. Si quelqu’un sur le canapé a peur facilement, essayez Coraline ou Gremlins.'],
    es: ['Películas de Halloween', 'Slashers clásicos como La noche de Halloween y Pesadilla en Elm Street, y Expediente Warren si prefieres fantasmas. Si alguien en el sofá se asusta fácil, prueba Los mundos de Coraline o Gremlins.'],
    de: ['Halloween-Filme', 'Klassische Slasher wie Halloween - Die Nacht des Grauens und Nightmare - Mörderische Träume, dazu Conjuring, wenn dir Geister lieber sind. Wer sich leicht erschreckt, nimmt Coraline oder Gremlins.']
  },
  'family-movie-night': {
    uk: ['Фільми для сімейного вечора', 'Анімаційні фільми для будь-якого віку на дивані: яскраві для дітей і достатньо розумні, щоб дорослі не заснули.'],
    ru: ['Фильмы для семейного вечера', 'Анимационные фильмы для любого возраста на диване: яркие для детей и достаточно умные, чтобы взрослые не заснули.'],
    fr: ['Films pour une soirée en famille', 'Des films d’animation pour tous les âges sur le canapé : assez colorés pour les enfants, assez malins pour que les adultes restent éveillés.'],
    es: ['Películas para ver en familia', 'Películas de animación para todas las edades del sofá: vistosas para los niños y lo bastante listas para que los adultos no se duerman.'],
    de: ['Filme für den Familienabend', 'Animationsfilme für jedes Alter auf dem Sofa – bunt genug für Kinder, klug genug, dass die Erwachsenen wach bleiben.']
  },
  'motivational-movies': {
    uk: ['Мотивуючі фільми', 'Роккі ще раз підводиться, а Волтер Мітті нарешті йде з-за свого столу. Увімкніть один із цих фільмів, коли потрібен поштовх, щоб почати щось складне.'],
    ru: ['Мотивирующие фильмы', 'Рокки ещё раз поднимается, а Уолтер Митти наконец уходит из-за своего стола. Включите один из этих фильмов, когда нужен толчок, чтобы начать что-то трудное.'],
    fr: ['Films motivants', 'Rocky se relève une fois de plus, Walter Mitty quitte enfin son bureau. Lancez l’un de ces films quand il vous faut un coup de pouce pour commencer quelque chose de difficile.'],
    es: ['Películas motivadoras', 'Rocky se levanta una vez más y Walter Mitty por fin deja su mesa de trabajo. Pon una de estas películas cuando necesites un empujón para empezar algo difícil.'],
    de: ['Motivierende Filme', 'Rocky steht noch einmal auf, und Walter Mitty verlässt endlich seinen Schreibtisch. Schau einen dieser Filme, wenn du einen Schubs brauchst, um etwas Schweres anzufangen.']
  },
  // in Ukrainian and Russian the season is New Year first: that is what people search for
  'christmas-movies': {
    uk: ['Новорічні та різдвяні фільми', 'Улюблені святкові фільми, старі й нові, для тижнів, коли вдома стоїть ялинка: сімейні фільми й мультфільми, історії кохання, а ще комедії та бойовики на вечір, коли діти вже сплять.',
      'Як ми обирали: кожен фільм тут відбувається на Різдво чи Новий рік або побудований навколо свят, і його оцінили сотні чи тисячі глядачів на TMDB, тож випадкових телефільмів тут немає. Класика на кшталт «Сам удома», «Це прекрасне життя» і «Міцний горішок» стоїть поруч із новішими улюбленцями, як-от «Клаус». На сторінці кожного фільму є трейлер і де його подивитися, взяти в оренду чи купити.'],
    ru: ['Новогодние и рождественские фильмы', 'Любимые праздничные фильмы, старые и новые, для недель, когда дома стоит ёлка: семейные фильмы и мультфильмы, истории любви, а ещё комедии и боевики на вечер, когда дети уже спят.',
      'Как мы выбирали: каждый фильм здесь происходит на Рождество или Новый год либо построен вокруг праздников, и его оценили сотни или тысячи зрителей на TMDB, так что случайных телефильмов тут нет. Классика вроде «Один дома», «Эта замечательная жизнь» и «Крепкий орешек» стоит рядом с более новыми любимцами, например «Клаусом». На странице каждого фильма есть трейлер и где его посмотреть, взять в аренду или купить.'],
    fr: ['Films de Noël', 'Les classiques des fêtes, anciens et récents, pour les semaines où le sapin est installé : films en famille et dessins animés, histoires d’amour, comédies et action pour quand les enfants sont couchés.',
      'Notre sélection : chaque film se déroule à Noël ou tourne autour des fêtes, et a été noté par des centaines ou des milliers de spectateurs sur TMDB, donc pas de téléfilms au hasard. Des classiques comme Maman, j’ai raté l’avion, La vie est belle et Piège de cristal côtoient des favoris plus récents comme La Légende de Klaus. Chaque titre mène à sa bande-annonce et aux plateformes où le voir, le louer ou l’acheter.'],
    es: ['Películas de Navidad', 'Clásicos navideños antiguos y recientes para las semanas en que el árbol está puesto: películas familiares y de animación, historias de amor, y comedias y acción para cuando los niños ya duermen.',
      'Cómo elegimos: cada película transcurre en Navidad o gira en torno a las fiestas, y la han valorado cientos o miles de espectadores en TMDB, así que no hay telefilmes al azar. Clásicos como Solo en casa, ¡Qué bello es vivir! y Jungla de cristal conviven con favoritas más recientes como Klaus. Cada título lleva a su tráiler y a dónde verlo, alquilarlo o comprarlo.'],
    de: ['Weihnachtsfilme', 'Alte und neue Weihnachtslieblinge für die Wochen, in denen der Baum steht: Familienfilme und Animation, Liebesgeschichten sowie Komödien und Action für den Abend, wenn die Kinder schlafen.',
      'So haben wir ausgewählt: Jeder Film spielt an Weihnachten oder dreht sich um die Feiertage und wurde auf TMDB von Hunderten oder Tausenden Zuschauern bewertet – zufällige TV-Filme gibt es hier nicht. Klassiker wie Kevin – Allein zu Haus, Ist das Leben nicht schön? und Stirb langsam stehen neben neueren Lieblingen wie Klaus. Jeder Titel führt zum Trailer und dazu, wo man ihn streamen, leihen oder kaufen kann.']
  },
  'movies-to-watch-with-friends': {
    uk: ['Фільми для перегляду з друзями', 'Гучні, динамічні й смішні бойовики-комедії, які не зіпсуєш розмовами під час перегляду. Створені для піци та повного дивана.'],
    ru: ['Фильмы для просмотра с друзьями', 'Громкие, динамичные и смешные боевики-комедии, которые не испортишь разговорами во время просмотра. Созданы для пиццы и полного дивана.'],
    fr: ['Films à regarder entre amis', 'Des comédies d’action bruyantes, rapides et drôles qui résistent aux bavardages. Faites pour une pizza et un canapé plein.'],
    es: ['Películas para ver con amigos', 'Comedias de acción ruidosas, rápidas y divertidas que aguantan que todo el mundo hable encima. Hechas para pizza y un sofá lleno.'],
    de: ['Filme für einen Abend mit Freunden', 'Laute, schnelle und lustige Actionkomödien, die es aushalten, wenn alle dazwischenreden. Gemacht für Pizza und ein volles Sofa.']
  },
  'late-night-thrillers': {
    uk: ['Трилери на ніч', 'Кримінальні трилери для тих годин, коли вдома тихо, а спати ще не хочеться. Напружені, темні й найкращі з вимкненим світлом.'],
    ru: ['Триллеры на ночь', 'Криминальные триллеры для часов, когда дома тихо, а спать ещё не хочется. Напряжённые, мрачные и лучше всего с выключенным светом.'],
    fr: ['Thrillers pour la nuit', 'Des thrillers policiers pour quand la maison est silencieuse et que vous n’avez pas encore sommeil. Tendus, sombres, à regarder lumières éteintes.'],
    es: ['Thrillers para la noche', 'Thrillers criminales para cuando la casa está en silencio y aún no tienes sueño. Tensos, oscuros y mejor con la luz apagada.'],
    de: ['Thriller für späte Abende', 'Krimithriller für die Stunden, in denen das Haus still ist und du noch nicht schlafen willst. Spannend, düster und am besten bei ausgeschaltetem Licht.']
  },
  'true-story-movies': {
    uk: ['Фільми, засновані на реальних подіях', 'Драми про реальних людей, від Оскара Шиндлера до Марка Цукерберга. Щойно підуть титри, ви, мабуть, кинетеся шукати, що було далі.'],
    ru: ['Фильмы, основанные на реальных событиях', 'Драмы о реальных людях, от Оскара Шиндлера до Марка Цукерберга. Как только пойдут титры, вы, скорее всего, полезете искать, что было дальше.'],
    fr: ['Films tirés d’une histoire vraie', 'Des drames sur des personnes réelles, d’Oskar Schindler à Mark Zuckerberg. Dès le générique, vous irez sans doute chercher ce qui s’est passé ensuite.'],
    es: ['Películas basadas en hechos reales', 'Dramas sobre personas reales, de Oskar Schindler a Mark Zuckerberg. En cuanto salgan los créditos, seguramente buscarás qué pasó después.'],
    de: ['Filme nach wahren Begebenheiten', 'Dramen über reale Menschen, von Oskar Schindler bis Mark Zuckerberg. Sobald der Abspann läuft, suchst du wahrscheinlich nach, wie es weiterging.']
  },
  'heist-movies': {
    uk: ['Фільми про пограбування', '«Одинадцять друзів Оушена», якщо хочете, щоб план спрацював, і «Скажені пси», якщо цікаво, що буває, коли він провалюється. Половину задоволення дає те, як збирається команда.'],
    ru: ['Фильмы про ограбления', '«Одиннадцать друзей Оушена», если хотите, чтобы план сработал, и «Бешеные псы», если интересно, что бывает, когда он провалился. Половина удовольствия в том, как собирается команда.'],
    fr: ['Films de braquage', 'Ocean’s Eleven si vous voulez que le plan marche, Reservoir Dogs si vous voulez voir ce qui arrive quand il échoue. Une bonne partie du plaisir : regarder l’équipe se former.'],
    es: ['Películas de atracos', 'Ocean’s Eleven si quieres que el plan salga bien, Reservoir Dogs si quieres ver qué pasa cuando sale mal. La mitad de la gracia está en ver cómo se forma la banda.'],
    de: ['Heist-Filme', 'Ocean’s Eleven, wenn der Plan aufgehen soll, Reservoir Dogs, wenn du sehen willst, was passiert, wenn er scheitert. Die halbe Freude ist, wie sich die Crew zusammenfindet.']
  },
  'time-travel-movies': {
    uk: ['Фільми про подорожі в часі', 'Деякі з них суцільна розвага, як «Назад у майбутнє». Інші, як «Тенет» і «Донні Дарко», доведеться подивитися двічі, щоб зрозуміти, що сталося.'],
    ru: ['Фильмы про путешествия во времени', 'Некоторые из них чистое развлечение, как «Назад в будущее». Другие, как «Довод» и «Донни Дарко», придётся посмотреть дважды, чтобы понять, что произошло.'],
    fr: ['Films de voyage dans le temps', 'Certains sont du pur divertissement, comme Retour vers le futur. D’autres, comme Tenet et Donnie Darko, demandent deux visionnages pour comprendre ce qui s’est passé.'],
    es: ['Películas de viajes en el tiempo', 'Algunas son pura diversión, como Regreso al futuro. Otras, como Tenet y Donnie Darko, hay que verlas dos veces para entender qué ha pasado.'],
    de: ['Zeitreise-Filme', 'Manche sind reiner Spaß, wie Zurück in die Zukunft. Andere, wie Tenet und Donnie Darko, musst du zweimal sehen, um zu verstehen, was passiert ist.']
  },
  'coming-of-age-movies': {
    uk: ['Фільми про дорослішання', 'Зазвичай починають із «Товариства мертвих поетів» і «Переваг скромників». «Після сонця» й «Назви мене своїм ім’ям» сильніше зачіпають, коли дивишся їх уже дорослим.'],
    ru: ['Фильмы о взрослении', 'Обычно начинают с «Общества мёртвых поэтов» и «Хорошо быть тихоней». «Солнце моё» и «Назови меня своим именем» сильнее трогают, когда смотришь их уже взрослым.'],
    fr: ['Films sur le passage à l’âge adulte', 'On commence souvent par Le Cercle des poètes disparus et Le Monde de Charlie. Aftersun et Call Me by Your Name touchent davantage une fois adulte.'],
    es: ['Películas sobre crecer', 'Se suele empezar por El club de los poetas muertos y Las ventajas de ser un marginado. Aftersun y Call Me by Your Name llegan más hondo cuando ya eres adulto.'],
    de: ['Coming-of-Age-Filme', 'Meist fängt man mit Der Club der toten Dichter und Vielleicht lieber morgen an. Aftersun und Call Me by Your Name treffen stärker, wenn man schon erwachsen ist.']
  },
  'road-trip-movies': {
    uk: ['Роуд-муві: фільми про подорожі', 'Довга дорога й не та компанія. «Зелена книга» показує це всерйоз, а «Тупий та ще тупіший» якомога дурніше. Для вечорів, коли хочеться втекти, не встаючи з дивана.'],
    ru: ['Роуд-муви: фильмы о путешествиях', 'Долгая дорога и не та компания. «Зелёная книга» показывает это всерьёз, а «Тупой и ещё тупее» как можно глупее. Для вечеров, когда хочется сбежать, не вставая с дивана.'],
    fr: ['Road movies', 'De longs trajets en mauvaise compagnie. Green Book le raconte sérieusement, Dumb & Dumber le plus bêtement possible. Pour partir sans quitter le canapé.'],
    es: ['Road movies: películas de carretera', 'Viajes largos con la compañía equivocada. Green Book lo cuenta en serio y Dos tontos muy tontos de la forma más tonta posible. Para escaparte sin salir del sofá.'],
    de: ['Roadmovies', 'Lange Fahrten in der falschen Gesellschaft. Green Book erzählt das ernst, Dumm und Dümmer so blöd wie möglich. Für alle, die wegwollen, ohne das Sofa zu verlassen.']
  },
  'space-movies': {
    uk: ['Фільми про космос', 'У «Марсіянині» одна людина намагається виростити картоплю на Марсі. У «Чужому» на екіпаж полюють просто на його кораблі. Решта наукової фантастики тут десь посередині.'],
    ru: ['Фильмы про космос', 'В «Марсианине» один человек пытается вырастить картошку на Марсе. В «Чужом» на экипаж охотятся прямо на его корабле. Остальная фантастика здесь где-то посередине.'],
    fr: ['Films sur l’espace', 'Dans Seul sur Mars, un homme tente de faire pousser des pommes de terre sur Mars. Dans Alien, un équipage est traqué dans son propre vaisseau. Le reste de cette science-fiction se situe entre les deux.'],
    es: ['Películas del espacio', 'En Marte (The Martian), un hombre intenta cultivar patatas en Marte. En Alien, una tripulación es perseguida por su propia nave. El resto de esta ciencia ficción queda en algún punto intermedio.'],
    de: ['Weltraumfilme', 'In Der Marsianer versucht ein Mann, auf dem Mars Kartoffeln anzubauen. In Alien wird eine Crew durch ihr eigenes Schiff gejagt. Der Rest dieser Science-Fiction liegt irgendwo dazwischen.']
  },
  'dystopian-movies': {
    uk: ['Антиутопії: найкращі фільми', 'Майбутнє, яке пішло не так, і люди, що чинять опір. Похмурі й стильні світи, які говорять більше про сьогодення, ніж про завтра.'],
    ru: ['Антиутопии: лучшие фильмы', 'Будущее, которое пошло не так, и люди, которые сопротивляются. Мрачные и стильные миры, которые говорят больше о сегодняшнем дне, чем о завтрашнем.'],
    fr: ['Films dystopiques', 'Des futurs qui ont mal tourné et ceux qui résistent. Des mondes sombres et stylés qui en disent plus sur aujourd’hui que sur demain.'],
    es: ['Películas distópicas', 'Futuros que salieron mal y la gente que se rebela. Mundos oscuros y con estilo que hablan más del presente que del mañana.'],
    de: ['Dystopische Filme', 'Zukünfte, die schiefgelaufen sind, und Menschen, die sich wehren. Düstere, stilvolle Welten, die mehr über heute als über morgen erzählen.']
  },
  'high-school-movies': {
    uk: ['Фільми про школу', '«Супер перці» показують одну ніч спроб купити алкоголь на вечірку, «Вихідний день Ферріса Бюллера» один день прогулу. Решту підліткових комедій тут так само легко переглядати.'],
    ru: ['Фильмы про школу', '«SuperПерцы» показывают одну ночь попыток купить алкоголь на вечеринку, «Выходной день Ферриса Бьюллера» один день прогула. Остальные подростковые комедии здесь так же легко пересматривать.'],
    fr: ['Films de lycée', 'SuperGrave, c’est une nuit à essayer d’acheter de l’alcool pour une fête. La Folle Journée de Ferris Bueller, une journée à sécher les cours. Les autres comédies ados d’ici se revoient aussi facilement.'],
    es: ['Películas de instituto', 'Supersalidos es una noche intentando comprar alcohol para una fiesta; Todo en un día, un día haciendo novillos. Las demás comedias adolescentes de aquí se vuelven a ver con la misma facilidad.'],
    de: ['Highschool-Filme', 'In Superbad geht es eine Nacht lang darum, Alkohol für eine Party zu besorgen, in Ferris macht Blau einen Tag lang ums Schwänzen. Die anderen Teeniekomödien hier schaut man genauso leicht wieder.']
  },
  'serial-killer-thrillers': {
    uk: ['Трилери про маніяків', 'Слідчі, які не можуть відступитися: «Сім», а також «Зодіак» і «Спогади про вбивство», в основі яких реальні справи, нерозкриті десятиліттями. Для глядачів із міцними нервами.'],
    ru: ['Триллеры про маньяков', 'Следователи, которые не могут отступиться: «Семь», а ещё «Зодиак» и «Воспоминания об убийстве», в основе которых реальные дела, не раскрытые десятилетиями. Для зрителей с крепкими нервами.'],
    fr: ['Thrillers de tueurs en série', 'Des enquêteurs qui ne lâchent rien : Seven, mais aussi Zodiac et Memories of Murder, tirés d’affaires réelles restées non résolues pendant des décennies. Pour les nerfs solides.'],
    es: ['Thrillers de asesinos en serie', 'Investigadores que no sueltan el caso: Seven, y también Zodiac y Memories of Murder, basadas en crímenes reales sin resolver durante décadas. Para nervios de acero.'],
    de: ['Serienkiller-Thriller', 'Ermittler, die nicht loslassen können: Sieben, dazu Zodiac und Memories of Murder nach echten Fällen, die jahrzehntelang ungelöst blieben. Für starke Nerven.']
  },
  'best-90s-movies': {
    uk: ['Найкращі фільми 90-х', 'Десятиліття відеопрокатів і аншлагів у п’ятницю ввечері. Найвище оцінені фільми 1990-х, які й досі не застаріли.'],
    ru: ['Лучшие фильмы 90-х', 'Десятилетие видеопрокатов и аншлагов в пятницу вечером. Самые высоко оценённые фильмы 1990-х, которые до сих пор не устарели.'],
    fr: ['Meilleurs films des années 90', 'La décennie des vidéoclubs et des vendredis soir à guichets fermés. Les films les mieux notés des années 1990, qui n’ont pas pris une ride.'],
    es: ['Mejores películas de los 90', 'La década de los videoclubes y los viernes con las salas llenas. Las películas mejor valoradas de los años 90, que siguen aguantando.'],
    de: ['Die besten Filme der 90er', 'Das Jahrzehnt der Videotheken und ausverkauften Freitagabende. Die bestbewerteten Filme der 1990er, die alle noch heute bestehen.']
  },
  'best-anime-movies': {
    uk: ['Найкращі аніме-фільми', 'Від Studio Ghibli до Макото Сінкая: найулюбленіші повнометражні аніме, які зачаровують і дітей, і дорослих.'],
    ru: ['Лучшие аниме-фильмы', 'От Studio Ghibli до Макото Синкая: самые любимые полнометражные аниме, которые очаровывают и детей, и взрослых.'],
    fr: ['Meilleurs films d’anime', 'Du studio Ghibli à Makoto Shinkai : les films d’anime les plus aimés, qui enchantent petits et grands.'],
    es: ['Mejores películas de anime', 'Del Studio Ghibli a Makoto Shinkai: las películas de anime más queridas, que encantan a pequeños y mayores.'],
    de: ['Die besten Anime-Filme', 'Von Studio Ghibli bis Makoto Shinkai: die beliebtesten Anime-Filme, die Kinder und Erwachsene gleichermaßen verzaubern.']
  },
  'best-documentaries': {
    uk: ['Найкращі документальні фільми', 'Справжні історії, розказані краще за вигадку: документальні фільми про природу, спорт, музику та злочини, які всі радять.'],
    ru: ['Лучшие документальные фильмы', 'Настоящие истории, рассказанные лучше вымысла: документальные фильмы о природе, спорте, музыке и преступлениях, которые все советуют.'],
    fr: ['Meilleurs documentaires', 'Des histoires vraies mieux racontées que la fiction : nature, sport, musique et faits divers, les documentaires que tout le monde recommande.'],
    es: ['Mejores documentales', 'Historias reales contadas mejor que la ficción: documentales de naturaleza, deporte, música y crímenes que todos recomiendan.'],
    de: ['Die besten Dokumentarfilme', 'Wahre Geschichten, besser erzählt als jede Fiktion: Dokus über Natur, Sport, Musik und Verbrechen, die alle weiterempfehlen.']
  },
  'best-80s-movies': {
    uk: ['Найкращі фільми 80-х', 'У списку і «Назад у майбутнє» з «Чужими», і «Акіра» з «Моїм сусідом Тоторо». Порядок залежить від оцінок глядачів, тож тут не лише американські блокбастери.'],
    ru: ['Лучшие фильмы 80-х', 'В списке и «Назад в будущее» с «Чужими», и «Акира» с «Моим соседом Тоторо». Порядок зависит от оценок зрителей, так что здесь не только американские блокбастеры.'],
    fr: ['Meilleurs films des années 80', 'On y trouve Retour vers le futur et Aliens, le retour, mais aussi Akira et Mon voisin Totoro. Le classement suit les notes des spectateurs et dépasse donc les blockbusters américains.'],
    es: ['Mejores películas de los 80', 'Hay Regreso al futuro y Aliens: El regreso, pero también Akira y Mi vecino Totoro. El orden sigue las notas de los espectadores, así que va mucho más allá de los taquillazos americanos.'],
    de: ['Die besten Filme der 80er', 'Hier stehen Zurück in die Zukunft und Aliens - Die Rückkehr, aber auch Akira und Mein Nachbar Totoro. Sortiert nach Zuschauerwertung, also längst nicht nur US-Blockbuster.']
  }
};

const TEXT = {
  moods: { en: 'Moods', uk: 'Настрої', ru: 'Настроения', fr: 'Humeurs', es: 'Ánimos', de: 'Stimmungen' },
  trailers: { en: 'Trailers', uk: 'Трейлери', ru: 'Трейлеры', fr: 'Bandes-annonces', es: 'Tráilers', de: 'Trailer' },
  favorites: { en: 'Favorites', uk: 'Обране', ru: 'Избранное', fr: 'Favoris', es: 'Favoritos', de: 'Favoriten' },
  footer: {
    en: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    uk: 'Цей продукт використовує TMDB API, але не схвалений і не сертифікований TMDB.',
    ru: 'Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.',
    fr: 'Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB.',
    es: 'Este producto utiliza la API de TMDB, pero no está respaldado ni certificado por TMDB.',
    de: 'Dieses Produkt nutzt die TMDB-API, wird aber nicht von TMDB unterstützt oder zertifiziert.'
  },
  // the release calendar, our sister site: one line in every footer
  premiero: { en: 'What’s coming out this week? Movie, series & game premieres —', uk: 'Що виходить цього тижня? Календар прем’єр кіно, серіалів та ігор —', ru: 'Что выходит на этой неделе? Календарь премьер кино, сериалов и игр —', fr: 'Qu’est-ce qui sort cette semaine ? Calendrier des sorties films, séries et jeux —', es: '¿Qué se estrena esta semana? Calendario de estrenos de cine, series y videojuegos —', de: 'Was startet diese Woche? Kalender für Film-, Serien- und Spielestarts —' },
  poster: { en: 'poster', uk: 'постер', ru: 'постер', fr: 'affiche', es: 'póster', de: 'Poster' },

  mood_page_title: {
    en: '{title}: {n} Picks to Watch Tonight',
    uk: '{title}: {n} фільмів на вечір',
    ru: '{title}: {n} фильмов на вечер',
    fr: '{title} : {n} films à voir ce soir',
    es: '{title}: {n} películas para esta noche',
    de: '{title}: {n} Filme für heute Abend'
  },
  not_your_mood: { en: 'Not quite your mood?', uk: 'Не зовсім ваш настрій?', ru: 'Не совсем ваше настроение?', fr: 'Pas tout à fait votre humeur ?', es: '¿No es justo tu estado de ánimo?', de: 'Nicht ganz deine Stimmung?' },
  find_more: { en: 'Find more like this', uk: 'Знайти ще схожі', ru: 'Найти ещё похожие', fr: 'Trouver d’autres films de ce genre', es: 'Encontrar más como estas', de: 'Mehr davon finden' },
  own_mood: { en: 'Describe your own mood', uk: 'Опишіть свій настрій', ru: 'Опишите своё настроение', fr: 'Décrivez votre humeur', es: 'Describe tu estado de ánimo', de: 'Beschreib deine eigene Stimmung' },
  more_moods: { en: 'More moods', uk: 'Інші настрої', ru: 'Другие настроения', fr: 'Autres humeurs', es: 'Más estados de ánimo', de: 'Weitere Stimmungen' },
  browse_by_mood: { en: 'Browse by mood', uk: 'Фільми за настроєм', ru: 'Фильмы по настроению', fr: 'Films par humeur', es: 'Películas por estado de ánimo', de: 'Filme nach Stimmung' },

  index_title: {
    en: 'Movies by Mood: Find What to Watch Tonight',
    uk: 'Фільми за настроєм: що подивитися сьогодні',
    ru: 'Фильмы по настроению: что посмотреть сегодня',
    fr: 'Films selon votre humeur : que regarder ce soir',
    es: 'Películas según tu estado de ánimo: qué ver esta noche',
    de: 'Filme nach Stimmung: Was soll ich heute schauen?'
  },
  index_desc: {
    en: 'Pick a mood — cozy, sad, mind-bending, date night — and get a hand-tuned list of films that fit it.',
    uk: 'Оберіть настрій — затишний, сумний, із закрученим сюжетом, для побачення — і отримайте добірку фільмів, що йому пасують.',
    ru: 'Выберите настроение — уютное, грустное, с закрученным сюжетом, для свидания — и получите подборку фильмов под него.',
    fr: 'Choisissez une humeur — cocooning, triste, à retourner le cerveau, en amoureux — et obtenez une sélection de films qui lui correspond.',
    es: 'Elige un estado de ánimo — acogedor, triste, para volarte la cabeza, para una cita — y obtén una selección de películas que encaje.',
    de: 'Wähl eine Stimmung – gemütlich, traurig, Mindfuck, Date-Abend – und erhalte eine handverlesene Liste passender Filme.'
  },
  index_h1: { en: 'Movies by', uk: 'Фільми за', ru: 'Фильмы по', fr: 'Films selon votre', es: 'Películas según tu', de: 'Filme nach' },
  index_h1_accent: { en: 'Mood', uk: 'настроєм', ru: 'настроению', fr: 'humeur', es: 'ánimo', de: 'Stimmung' },
  index_intro: {
    en: 'Pick how you feel and get a list of films that fit. Or describe your own mood on the {link}.',
    uk: 'Оберіть, що відчуваєте, і отримайте список фільмів під настрій. Або опишіть свій настрій на {link}.',
    ru: 'Выберите, что чувствуете, и получите список фильмов под настроение. Или опишите своё настроение на {link}.',
    fr: 'Choisissez ce que vous ressentez et obtenez une liste de films adaptés. Ou décrivez votre propre humeur sur la {link}.',
    es: 'Elige cómo te sientes y obtén una lista de películas a juego. O describe tu propio estado de ánimo en la {link}.',
    de: 'Wähl, wie du dich fühlst, und erhalte eine Liste passender Filme. Oder beschreib deine eigene Stimmung auf der {link}.'
  },
  home_link: { en: 'home page', uk: 'головній сторінці', ru: 'главной странице', fr: 'page d’accueil', es: 'página principal', de: 'Startseite' },

  not_found_title: { en: 'Page not found', uk: 'Сторінку не знайдено', ru: 'Страница не найдена', fr: 'Page introuvable', es: 'Página no encontrada', de: 'Seite nicht gefunden' },
  not_found_desc: {
    en: 'This page does not exist. Browse movies by mood instead.',
    uk: 'Такої сторінки немає. Перегляньте фільми за настроєм.',
    ru: 'Такой страницы нет. Посмотрите фильмы по настроению.',
    fr: 'Cette page n’existe pas. Découvrez plutôt des films selon votre humeur.',
    es: 'Esta página no existe. Explora películas según tu estado de ánimo.',
    de: 'Diese Seite gibt es nicht. Entdecke stattdessen Filme nach Stimmung.'
  },
  not_found_h1: { en: 'Nothing', uk: 'Тут', ru: 'Здесь', fr: 'Rien', es: 'Aquí no hay', de: 'Hier ist' },
  not_found_h1_accent: { en: 'here', uk: 'порожньо', ru: 'пусто', fr: 'ici', es: 'nada', de: 'nichts' },
  not_found_intro: {
    en: 'That page does not exist. Try one of these moods instead.',
    uk: 'Такої сторінки не існує. Спробуйте один із цих настроїв.',
    ru: 'Такой страницы не существует. Попробуйте одно из этих настроений.',
    fr: 'Cette page n’existe pas. Essayez plutôt l’une de ces humeurs.',
    es: 'Esa página no existe. Prueba uno de estos estados de ánimo.',
    de: 'Diese Seite gibt es nicht. Probier stattdessen eine dieser Stimmungen.'
  },

  // {name} already carries the year: "The Terminator (1984)"
  title_page_title: {
    en: '{name}: Where to Watch',
    uk: '{name}: де дивитися онлайн',
    ru: '{name}: где смотреть онлайн',
    fr: '{name} : où regarder en streaming',
    es: '{name}: dónde ver online',
    de: '{name} im Stream: wo online schauen'
  },
  // the same, shorter, for long film names (see fitTitle)
  title_page_short: { en: '{name}: Where to Watch', uk: '{name}: де дивитися', ru: '{name}: где смотреть', fr: '{name} : où regarder', es: '{name}: dónde ver', de: '{name} im Stream' },
  // "Where to watch Inception: Netflix, Apple TV." — first words of the description in search results
  title_page_where: {
    en: 'Where to watch {name}: {services}.',
    uk: 'Де дивитися {name}: {services}.',
    ru: 'Где смотреть {name}: {services}.',
    fr: 'Où regarder {name} : {services}.',
    es: 'Dónde ver {name}: {services}.',
    de: 'Wo kann man {name} schauen? {services}.'
  },
  // visible on the page before the browser draws the full list for the visitor's own country
  title_page_where_in: {
    en: 'Where to watch in {country}:',
    uk: 'Де дивитися ({country}):',
    ru: 'Где смотреть ({country}):',
    fr: 'Où regarder ({country}) :',
    es: 'Dónde ver ({country}):',
    de: 'Wo schauen ({country}):'
  },
  watch_stream: { en: 'stream', uk: 'підписка', ru: 'подписка', fr: 'abonnement', es: 'suscripción', de: 'Abo' },
  watch_rent: { en: 'rent', uk: 'оренда', ru: 'аренда', fr: 'location', es: 'alquiler', de: 'leihen' },
  watch_buy: { en: 'buy', uk: 'купівля', ru: 'покупка', fr: 'achat', es: 'compra', de: 'kaufen' },
  trailer: { en: 'Official Trailer', uk: 'Офіційний трейлер', ru: 'Официальный трейлер', fr: 'Bande-annonce officielle', es: 'Tráiler oficial', de: 'Offizieller Trailer' },
  title_page_desc: {
    en: 'Where to watch {name}, trailer, cast and similar titles.',
    uk: 'Де дивитися {name} онлайн: трейлер, актори та схожі фільми.',
    ru: 'Где смотреть {name} онлайн: трейлер, актёры и похожие фильмы.',
    fr: 'Où regarder {name} en streaming : bande-annonce, casting et titres similaires.',
    es: 'Dónde ver {name} online: tráiler, reparto y títulos similares.',
    de: '{name} online schauen: Stream, Trailer, Besetzung und ähnliche Titel.'
  },
  person_page_title: {
    en: '{name}: Movies and TV Shows to Watch',
    uk: '{name}: фільми та серіали',
    ru: '{name}: фильмы и сериалы',
    fr: '{name} : films et séries',
    es: '{name}: películas y series',
    de: '{name}: Filme und Serien'
  },
  person_page_desc: {
    en: '{name} movies and TV shows: {known} and more. Where to watch, trailers and similar films.',
    uk: '{name}: фільми та серіали — {known} та інші. Де дивитися, трейлери й схожі фільми.',
    ru: '{name}: фильмы и сериалы — {known} и другие. Где смотреть, трейлеры и похожие фильмы.',
    fr: 'Films et séries avec {name} : {known} et plus encore. Où les regarder, bandes-annonces et films similaires.',
    es: 'Películas y series de {name}: {known} y más. Dónde verlas, tráilers y películas similares.',
    de: 'Filme und Serien mit {name}: {known} und mehr. Wo schauen, Trailer und ähnliche Filme.'
  },
  person_page_desc_short: {
    en: '{name}: movies and TV shows, where to watch them and similar films.',
    uk: '{name}: фільми та серіали, де їх дивитися і схожі фільми.',
    ru: '{name}: фильмы и сериалы, где их смотреть и похожие фильмы.',
    fr: '{name} : films et séries, où les regarder et films similaires.',
    es: '{name}: películas y series, dónde verlas y películas similares.',
    de: '{name}: Filme und Serien, wo man sie schauen kann, und ähnliche Filme.'
  },

  // "Movies like Inception" pages
  like_h1_movie: { en: 'Movies Like {name}', uk: 'Фільми, схожі на «{name}»', ru: 'Фильмы, похожие на «{name}»', fr: 'Films comme {name}', es: 'Películas como {name}', de: 'Filme wie {name}' },
  like_h1_tv: { en: 'Shows Like {name}', uk: 'Серіали, схожі на «{name}»', ru: 'Сериалы, похожие на «{name}»', fr: 'Séries comme {name}', es: 'Series como {name}', de: 'Serien wie {name}' },
  like_title: { en: '{h1}: {n} to Watch Next', uk: '{h1}: {n} найкращих', ru: '{h1}: {n} лучших', fr: '{h1} : {n} à voir ensuite', es: '{h1}: {n} para ver después', de: '{h1}: {n} Empfehlungen' },
  like_desc: {
    en: 'What to watch after {name}: {picks} and more, {n} similar picks with trailers and where to watch.',
    uk: 'Що подивитися після «{name}»: {picks} та інші — {n} схожих, з трейлерами і де дивитися.',
    ru: 'Что посмотреть после «{name}»: {picks} и другие — {n} похожих, с трейлерами и где смотреть.',
    fr: 'Que regarder après {name} : {picks} et d’autres, {n} titres similaires avec bandes-annonces et où les regarder.',
    es: 'Qué ver después de {name}: {picks} y más, {n} títulos similares con tráilers y dónde verlos.',
    de: 'Was nach {name} schauen: {picks} und mehr – {n} ähnliche Titel mit Trailern und Streaming-Infos.'
  },
  like_intro_movie: {
    en: 'Loved {name}? These {n} films have the same feel: the ones its fans love most. Open any of them for the trailer and where to watch it.',
    uk: 'Після «{name}» хочеться ще чогось схожого? Ці {n} фільмів мають той самий настрій: їх найбільше люблять шанувальники оригіналу. Відкрийте будь-який — там трейлер і де дивитися.',
    ru: 'После «{name}» хочется ещё чего-то похожего? Эти {n} фильмов того же настроения: их больше всего любят поклонники оригинала. Откройте любой — там трейлер и где смотреть.',
    fr: 'Vous avez aimé {name} ? Ces {n} films ont la même atmosphère : ce sont ceux que ses fans préfèrent. Ouvrez-en un pour la bande-annonce et savoir où le regarder.',
    es: '¿Te gustó {name}? Estas {n} películas tienen el mismo espíritu: son las favoritas de sus fans. Abre cualquiera para ver el tráiler y dónde verla.',
    de: 'Dir hat {name} gefallen? Diese {n} Filme haben dasselbe Gefühl: die Favoriten seiner Fans. Öffne einen davon für den Trailer und wo du ihn schauen kannst.'
  },
  like_intro_tv: {
    en: 'Loved {name}? These {n} series have the same feel: the ones its fans love most. Open any of them for the trailer and where to watch it.',
    uk: 'Після «{name}» хочеться ще чогось схожого? Ці {n} серіалів мають той самий настрій: їх найбільше люблять шанувальники оригіналу. Відкрийте будь-який — там трейлер і де дивитися.',
    ru: 'После «{name}» хочется ещё чего-то похожего? Эти {n} сериалов того же настроения: их больше всего любят поклонники оригинала. Откройте любой — там трейлер и где смотреть.',
    fr: 'Vous avez aimé {name} ? Ces {n} séries ont la même atmosphère : ce sont celles que ses fans préfèrent. Ouvrez-en une pour la bande-annonce et savoir où la regarder.',
    es: '¿Te gustó {name}? Estas {n} series tienen el mismo espíritu: son las favoritas de sus fans. Abre cualquiera para ver el tráiler y dónde verla.',
    de: 'Dir hat {name} gefallen? Diese {n} Serien haben dasselbe Gefühl: die Favoriten ihrer Fans. Öffne eine davon für den Trailer und wo du sie schauen kannst.'
  },
  // movie and person pages: the same words as movie.* and person.* in i18n.js, which redraws them
  director: { en: 'Director', uk: 'Режисер', ru: 'Режиссёр', fr: 'Réalisation', es: 'Dirección', de: 'Regie' },
  cast: { en: 'Cast', uk: 'У ролях', ru: 'В ролях', fr: 'Distribution', es: 'Reparto', de: 'Besetzung' },
  genres: { en: 'Genres', uk: 'Жанри', ru: 'Жанры', fr: 'Genres', es: 'Géneros', de: 'Genres' },
  rating: { en: 'Rating', uk: 'Рейтинг', ru: 'Рейтинг', fr: 'Note', es: 'Puntuación', de: 'Bewertung' },
  similar: { en: 'More Like This', uk: 'Схожі', ru: 'Похожие', fr: 'Dans le même genre', es: 'Títulos similares', de: 'Ähnliche Titel' },
  minutes: { en: '{n} min', uk: '{n} хв', ru: '{n} мин', fr: '{n} min', es: '{n} min', de: '{n} Min.' },
  filmography: { en: 'Films & Series with {name}', uk: 'Фільми й серіали: {name}', ru: 'Фильмы и сериалы: {name}', fr: 'Films et séries : {name}', es: 'Películas y series: {name}', de: 'Filme & Serien mit {name}' },
  // the groups of the Christmas collection
  xmas_family: { en: 'Family & Animated Christmas Movies', uk: 'Сімейні та анімаційні новорічні фільми', ru: 'Семейные и анимационные новогодние фильмы', fr: 'Films de Noël en famille et d’animation', es: 'Películas navideñas familiares y de animación', de: 'Weihnachtsfilme für die ganze Familie' },
  xmas_romance: { en: 'Romantic Christmas Movies', uk: 'Романтичні різдвяні фільми', ru: 'Романтические рождественские фильмы', fr: 'Films de Noël romantiques', es: 'Películas navideñas románticas', de: 'Romantische Weihnachtsfilme' },
  xmas_grownup: { en: 'Christmas Comedies, Action & Classics', uk: 'Святкові комедії, бойовики й класика', ru: 'Праздничные комедии, боевики и классика', fr: 'Comédies, action et classiques de Noël', es: 'Comedias, acción y clásicos navideños', de: 'Weihnachtskomödien, Action und Klassiker' },
  like_where: { en: 'Where to watch {name}', uk: 'Де дивитися «{name}»', ru: 'Где смотреть «{name}»', fr: 'Où regarder {name}', es: 'Dónde ver {name}', de: 'Wo {name} schauen' },
  like_more: { en: 'More lists like this', uk: 'Ще схожі добірки', ru: 'Ещё похожие подборки', fr: 'Autres listes du même genre', es: 'Más listas parecidas', de: 'Weitere ähnliche Listen' },

  // Same as home.page_title in i18n.js, which sets the title again in the browser
  home_title: {
    en: 'MovieMood: Find a Movie for Your Mood',
    uk: 'MovieMood: фільм під ваш настрій',
    ru: 'MovieMood: фильм под ваше настроение',
    fr: 'MovieMood : un film selon votre humeur',
    es: 'MovieMood: una película para tu estado de ánimo',
    de: 'MovieMood: der passende Film für deine Stimmung'
  },
  home_desc: {
    en: 'Describe how you feel in any words and get well-loved movies and series to match: trailers, where to watch them and mood collections for every evening.',
    uk: 'Опишіть настрій будь-якими словами й отримайте улюблені глядачами фільми та серіали: трейлери, де дивитися і добірки на кожен вечір.',
    ru: 'Опишите настроение любыми словами и получите любимые зрителями фильмы и сериалы: трейлеры, где смотреть и подборки на каждый вечер.',
    fr: 'Décrivez votre humeur avec vos propres mots et obtenez des films et séries appréciés : bandes-annonces, où les regarder et sélections pour chaque soirée.',
    es: 'Describe cómo te sientes con tus palabras y obtén películas y series muy valoradas: tráilers, dónde verlas y selecciones para cada noche.',
    de: 'Beschreib mit eigenen Worten, wie du dich fühlst, und erhalte beliebte Filme und Serien dazu: Trailer, wo man sie schauen kann, und Listen für jeden Abend.'
  },
  // home.title, home.title_accent and home.subtitle in i18n.js
  home_h1: { en: 'What’s your', uk: 'Який у вас', ru: 'Какое у вас', fr: 'Quelle est votre', es: '¿Cómo te', de: 'Wie ist deine' },
  home_h1_accent: { en: 'mood?', uk: 'настрій?', ru: 'настроение?', fr: 'humeur ?', es: 'sientes?', de: 'Stimmung?' },
  home_subtitle: {
    en: 'Tell us how you feel - we’ll find the perfect film.',
    uk: 'Розкажіть, що на душі, — ми підберемо фільм.',
    ru: 'Расскажите, что на душе, — мы подберём фильм.',
    fr: 'Dites-nous comment vous vous sentez, nous trouvons le film.',
    es: 'Cuéntanos cómo te sientes y encontramos la película.',
    de: 'Sag uns, wie du dich fühlst – wir finden den passenden Film.'
  },
  // "How MovieMood works" on the home page (about.* in i18n.js)
  about: {
    title: { en: 'How MovieMood works', uk: 'Як працює MovieMood', ru: 'Как работает MovieMood', fr: 'Comment fonctionne MovieMood', es: 'Cómo funciona MovieMood', de: 'So funktioniert MovieMood' },
    q1: { en: 'Describe your mood in your own words', uk: 'Опишіть настрій своїми словами', ru: 'Опишите настроение своими словами', fr: 'Décrivez votre humeur avec vos mots', es: 'Describe tu estado de ánimo con tus palabras', de: 'Beschreib deine Stimmung mit eigenen Worten' },
    a1: { en: 'Type how you feel: “rainy Sunday”, “something light after work”, “dark sci-fi like Interstellar”. MovieMood reads the mood, genre, decade and favourite films in your words and picks well-loved titles to match.', uk: 'Напишіть, що відчуваєте: «дощова неділя», «щось легке після роботи», «похмура фантастика як Інтерстеллар». MovieMood розуміє настрій, жанр, десятиліття й улюблені фільми у ваших словах і підбирає фільми, які люблять глядачі.', ru: 'Напишите, что чувствуете: «дождливое воскресенье», «что-то лёгкое после работы», «мрачная фантастика как Интерстеллар». MovieMood понимает настроение, жанр, десятилетие и любимые фильмы в ваших словах и подбирает фильмы, которые любят зрители.', fr: 'Écrivez ce que vous ressentez : « dimanche pluvieux », « quelque chose de léger après le travail », « SF sombre comme Interstellar ». MovieMood comprend l’humeur, le genre, la décennie et les films préférés dans vos mots et choisit des titres très appréciés qui y correspondent.', es: 'Escribe cómo te sientes: «domingo lluvioso», «algo ligero después del trabajo», «ciencia ficción oscura como Interstellar». MovieMood entiende el ánimo, el género, la década y las películas favoritas en tus palabras y elige títulos muy queridos que encajan.', de: 'Schreib, wie du dich fühlst: „verregneter Sonntag“, „etwas Leichtes nach der Arbeit“, „düstere Sci-Fi wie Interstellar“. MovieMood versteht Stimmung, Genre, Jahrzehnt und Lieblingsfilme in deinen Worten und wählt beliebte Titel, die dazu passen.' },
    q2: { en: 'Where can I watch it?', uk: 'Де це подивитися?', ru: 'Где это посмотреть?', fr: 'Où le regarder ?', es: '¿Dónde puedo verla?', de: 'Wo kann ich das schauen?' },
    a2: { en: 'Every film and series page lists the streaming services, rentals and purchases in your country, with the trailer, the cast and similar titles.', uk: 'На сторінці кожного фільму й серіалу — стримінгові сервіси, оренда та купівля у вашій країні, а ще трейлер, актори й схожі фільми.', ru: 'На странице каждого фильма и сериала — стриминговые сервисы, аренда и покупка в вашей стране, а ещё трейлер, актёры и похожие фильмы.', fr: 'Chaque page de film et de série indique les plateformes de streaming, la location et l’achat dans votre pays, avec la bande-annonce, le casting et des titres similaires.', es: 'Cada página de película y serie muestra las plataformas de streaming, el alquiler y la compra en tu país, con el tráiler, el reparto y títulos similares.', de: 'Jede Film- und Serienseite zeigt Streamingdienste, Leih- und Kaufangebote in deinem Land, dazu Trailer, Besetzung und ähnliche Titel.' },
    q3: { en: 'Is it free?', uk: 'Це безкоштовно?', ru: 'Это бесплатно?', fr: 'Est-ce gratuit ?', es: '¿Es gratis?', de: 'Ist das kostenlos?' },
    a3: { en: 'Yes, and there is no sign-up. Favourites and watched titles stay in your browser, so watched films stop showing up in your suggestions.', uk: 'Так, і без реєстрації. Обране й переглянуте зберігаються у вашому браузері, тож переглянуті фільми більше не трапляються в добірках.', ru: 'Да, и без регистрации. Избранное и просмотренное хранятся в вашем браузере, поэтому просмотренные фильмы больше не попадаются в подборках.', fr: 'Oui, et sans inscription. Vos favoris et vos titres vus restent dans votre navigateur : les films déjà vus ne reviennent plus dans vos suggestions.', es: 'Sí, y sin registro. Tus favoritos y lo que ya viste se guardan en tu navegador, así que las películas vistas dejan de aparecer en tus sugerencias.', de: 'Ja, und ohne Anmeldung. Favoriten und gesehene Titel bleiben in deinem Browser, gesehene Filme tauchen deshalb nicht mehr in deinen Vorschlägen auf.' },
    q4: { en: 'Which languages?', uk: 'Якими мовами?', ru: 'На каких языках?', fr: 'Quelles langues ?', es: '¿En qué idiomas?', de: 'Welche Sprachen?' },
    a4: { en: 'English, Ukrainian, Russian, French, Spanish and German. The search understands queries in all six.', uk: 'Англійською, українською, російською, французькою, іспанською та німецькою. Пошук розуміє запити всіма шістьма.', ru: 'На английском, украинском, русском, французском, испанском и немецком. Поиск понимает запросы на всех шести.', fr: 'Anglais, ukrainien, russe, français, espagnol et allemand. La recherche comprend les demandes dans ces six langues.', es: 'Inglés, ucraniano, ruso, francés, español y alemán. El buscador entiende búsquedas en los seis.', de: 'Englisch, Ukrainisch, Russisch, Französisch, Spanisch und Deutsch. Die Suche versteht Anfragen in allen sechs.' }
  },
  // labels of the mood buttons under the search (quick.* in i18n.js)
  quick: {
    rainy: { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia', de: 'Regentag' },
    cozy: { en: 'Cozy', uk: 'Затишні', ru: 'Уютные', fr: 'Cocooning', es: 'Acogedoras', de: 'Gemütlich' },
    feel_good: { en: 'Feel-good', uk: 'Гарний настрій', ru: 'Хорошее настроение', fr: 'Feel-good', es: 'Para animarse', de: 'Gute Laune' },
    cry: { en: 'To cry to', uk: 'Поплакати', ru: 'Поплакать', fr: 'Pour pleurer', es: 'Para llorar', de: 'Zum Weinen' },
    date: { en: 'Date night', uk: 'Побачення', ru: 'Свидание', fr: 'En amoureux', es: 'Para una cita', de: 'Date-Abend' },
    mind: { en: 'Mind-bending', uk: 'Ламають мозок', ru: 'Взрыв мозга', fr: 'Casse-tête', es: 'Para pensar', de: 'Kopfkino' },
    family: { en: 'Family', uk: 'Для сім’ї', ru: 'Для семьи', fr: 'En famille', es: 'En familia', de: 'Familie' },
    nineties: { en: '90s', uk: '90-ті', ru: '90-е', fr: 'Années 90', es: 'Años 90', de: '90er' },
    all: { en: 'All moods', uk: 'Усі настрої', ru: 'Все настроения', fr: 'Toutes les humeurs', es: 'Todos los ánimos', de: 'Alle Stimmungen' }
  }
};

// Google cuts titles at about 60–65 characters: the first version that fits wins
// (the full one, then without "| MovieMood", then shorter wording, then without the year)
const fitTitle = (...versions) => versions.find(title => title.length <= 65) || versions[versions.length - 1];

const tr = (lang, key, vars) => {
  let text = TEXT[key][lang] ?? TEXT[key].en;
  for (const [name, value] of Object.entries(vars || {})) text = text.replace(`{${name}}`, value);
  return text;
};

const moodTitle = (mood, lang) => MOOD_TEXT[mood.slug]?.[lang]?.[0] || mood.title;
const moodIntro = (mood, lang) => MOOD_TEXT[mood.slug]?.[lang]?.[1] || mood.intro;
// a longer note under the list, where a collection has one
const moodMore = (mood, lang) => MOOD_TEXT[mood.slug]?.[lang]?.[2] || mood.more || '';

// The season's collection goes first in every list of moods: Halloween in October,
// Christmas from November to the first week of January
function moodsInSeasonOrder(date = new Date()) {
  const month = date.getUTCMonth();
  const season = month === 9 ? 'halloween-movies'
    : month >= 10 || (month === 0 && date.getUTCDate() <= 7) ? 'christmas-movies' : '';
  return [...MOODS].sort((a, b) => (b.slug === season) - (a.slug === season));
}

// "/moods" → "/uk/moods", "/" → "/uk"
const langPath = (lang, path) => lang === 'en' ? path : `/${lang}${path === '/' ? '' : path}`;

// The same page in every language, for search engines (hreflang)
// langs: the versions that are in the index (a version without a description of its own is not)
const alternates = (origin, path, langs = LANGS) => [
  ...langs.map(code => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(origin + langPath(code, path))}">`),
  `<link rel="alternate" hreflang="x-default" href="${escapeHtml(origin + path)}">`
].join('\n  ');

const ogLocales = lang => [
  `<meta property="og:locale" content="${OG_LOCALES[lang]}">`,
  ...LANGS.filter(code => code !== lang).map(code => `<meta property="og:locale:alternate" content="${OG_LOCALES[code]}">`)
].join('\n  ');

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON-LD sits inside <script>, so "<" must not be able to close the tag
const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// "Home › Moods › Rainy day" trail that Google can show instead of the bare address
// (paths in the trail already carry the language prefix)
const breadcrumbs = (origin, trail, lang = 'en') => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [['MovieMood', langPath(lang, '/')], ...trail].map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: `${origin}${path}`
  }))
});

const slugify = text => String(text || '')
  .toLowerCase()
  .normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

// Without the language prefix. The slug comes from the English title: lists fetched in another
// language carry it as slug_title (see fetchMoodMovies)
const titlePath = (item, type = 'movie') => {
  const slug = slugify(item.slug_title ?? (item.title || item.name));
  return `/${type}/${item.id}${slug ? `-${slug}` : ''}`;
};

const truncate = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

function buildDiscoverUrl(mood, locale = 'en-US') {
  const params = new URLSearchParams(DEFAULT_DISCOVER);
  // The mood's own parameters override the defaults
  for (const [key, value] of new URLSearchParams(mood.discover)) params.set(key, value);
  params.set('api_key', TMDB_API_KEY);
  params.set('language', locale);
  return `${TMDB_BASE_URL}/discover/movie?${params}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// One collection's films in one language: its discover pages (mood.pages, one by default) and the
// films it pins by id, most-rated first when there are pins
async function fetchMoodList(mood, locale) {
  const pages = Array.from({ length: mood.pages || 1 }, (_, i) => i + 1);
  const lists = await Promise.all([
    ...pages.map(page => fetchJson(`${buildDiscoverUrl(mood, locale)}&page=${page}`)
      .then(data => data.results || [])
      // the first page is the collection; the further ones only add to it
      .catch(error => { if (page === 1) throw error; return []; })),
    ...(mood.pin || []).map(id => fetchJson(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=${locale}`)
      .then(movie => [{ ...movie, genre_ids: (movie.genres || []).map(g => g.id) }])
      .catch(() => []))
  ]);
  const seen = new Set();
  const movies = lists.flat().filter(m => !seen.has(m.id) && seen.add(m.id));
  return mood.pin ? movies.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)) : movies;
}

// Titles in the page's language; addresses still need the English ones, fetched alongside
async function fetchMoodMovies(mood, lang = 'en') {
  const [local, english] = await Promise.all([
    fetchMoodList(mood, TMDB_LOCALES[lang]),
    lang === 'en' ? null : fetchMoodList(mood, 'en-US').catch(() => null)
  ]);
  const englishTitles = new Map((english || []).map(m => [m.id, m.title]));
  return local
    .filter(m => m.poster_path && (!mood.keep || mood.keep(m)))
    .map(m => lang === 'en' ? m : {
      ...m,
      // unknown → no slug, and the movie page adds it with a redirect
      slug_title: englishTitles.get(m.id) || (m.original_language === 'en' ? m.original_title : '')
    });
}

function getOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${String(proto).split(',')[0]}://${host}`;
}

function send(res, status, body, { type = 'text/html; charset=utf-8', maxAge = DAY } = {}) {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', status === 200
    ? `public, s-maxage=${maxAge}, stale-while-revalidate=${7 * DAY}`
    : 'public, s-maxage=60');
  return res.status(status).send(body);
}

// ══════════════════════════════════════════════
// PAGE TEMPLATES
// ══════════════════════════════════════════════
// path — the page's address without the language prefix; noindex pages get no language alternates
function layout({ lang = 'en', origin, path, title, description, image, head = '', hero, main, noindex = false }) {
  const canonical = `${origin}${langPath(lang, path)}`;
  return `<!DOCTYPE html>
<html lang="${lang}" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${escapeHtml(canonical)}">
  ${alternates(origin, path)}`}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MovieMood">
  ${ogLocales(lang)}
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image || `${origin}/og-image.png`)}">
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}">
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,700&family=Inter:wght@300;400;500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,700&family=Inter:wght@300;400;500;600&display=swap"></noscript>
  <link rel="icon" href="/favicon.ico?v=3" sizes="16x16 32x32 48x48">
  <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml">
  <link rel="icon" href="/icon-192.png?v=3" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3">
  <link rel="manifest" href="/site.webmanifest">
  <!-- Cloudflare Web Analytics (Cloudflare → Analytics & Logs → Web Analytics) -->
  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "7bdb18122f374e60984fb2931f067490"}'></script>
  <meta name="theme-color" content="#120c09">
  ${head}
  <script>
    try {
      const saved = localStorage.getItem('theme');
      const light = saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    } catch (e) {}
  </script>
</head>
<body class="home-body" data-page="moods">
  <div class="bg-orbs">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <div class="noise-overlay"></div>

  <!-- Same nav as the rest of the site: nav.js turns this into links, favorites and a menu -->
  <nav class="home-nav">
    <a href="${langPath(lang, '/')}" class="nav-logo">MOVIEMOOD</a>
    <div>
      <a href="${langPath(lang, '/moods')}" class="nav-text-link">${tr(lang, 'moods')}</a>
      <a href="/feed.html" class="nav-text-link">${tr(lang, 'trailers')}</a>
      <a href="/favorites.html" class="nav-text-link">${tr(lang, 'favorites')}</a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle theme">
        <span class="icon-sun">&#x2600;&#xFE0F;</span>
        <span class="icon-moon">&#x1F319;</span>
      </button>
    </div>
  </nav>

  <header class="home-hero mood-hero">
    ${hero}
  </header>

  <main class="home-main">
    ${main}
  </main>

  <footer class="home-footer">
    <p>${escapeHtml(tr(lang, 'footer'))}</p>
    ${premieroLine(lang)}
  </footer>

  <script>
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  </script>
  <script src="/i18n.js?v=${ASSET_VERSION}"></script>
  <script src="/urls.js?v=${ASSET_VERSION}"></script>
  <script src="/nav.js?v=${ASSET_VERSION}"></script>
</body>
</html>`;
}

const moodChips = (lang, exceptSlug = '') => `<div class="mood-chips">
      ${moodsInSeasonOrder().filter(m => m.slug !== exceptSlug).map(m => `<a class="mood-chip" href="${langPath(lang, `/moods/${m.slug}`)}">${m.emoji} ${escapeHtml(moodTitle(m, lang))}</a>`).join('\n      ')}
    </div>`;

function movieCard(movie, lang, path = titlePath(movie)) {
  const title = movie.title || movie.name;
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  return `<a class="movie-card" href="${langPath(lang, path)}">
        <div class="card-poster-wrapper">
          <img src="${TMDB_CARD_URL}${movie.poster_path}" class="movie-poster" loading="lazy" alt="${escapeHtml(title)}${year ? ` (${year})` : ''} ${tr(lang, 'poster')}">
          ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(title)}</h3>
          <span class="card-year">${year}</span>
        </div>
      </a>`;
}

// One title of a "movies like X" list with what it is about: the description is what makes
// each list worth reading (and different from the next one)
function likeItem(item, lang, position) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
  const genres = (item.genres || []).slice(0, 3).map(g => g.name).join(' · ');
  const overview = truncate(item.overview, 300);
  return `<li class="like-item">
        <a class="like-item-poster" href="${langPath(lang, item.path)}">
          <img src="${TMDB_CARD_URL}${item.poster_path}" loading="lazy" alt="${escapeHtml(title)}${year ? ` (${year})` : ''} ${tr(lang, 'poster')}" width="120" height="180">
        </a>
        <div class="like-item-text">
          <h2 class="like-item-title"><span class="like-item-number">${position}.</span> <a href="${langPath(lang, item.path)}">${escapeHtml(title)}</a>${year ? ` <span class="like-item-year">(${year})</span>` : ''}</h2>
          <p class="like-item-meta">${[rating && `★ ${rating}`, genres].filter(Boolean).join(' · ')}</p>
          ${overview ? `<p class="like-item-overview">${escapeHtml(overview)}</p>` : ''}
        </div>
      </li>`;
}

function renderMoodPage(mood, movies, origin, lang) {
  const name = moodTitle(mood, lang);
  const intro = moodIntro(mood, lang);
  const path = `/moods/${mood.slug}`;
  const grid = list => `<div class="movies-grid">
      ${list.map(m => movieCard(m, lang)).join('\n      ')}
      </div>`;
  // A collection with groups shows each under its own heading (searches like "romantic christmas
  // movies" land on them); a film goes to the first group it fits
  let results = `<section class="results-section">
      ${grid(movies)}
    </section>`;
  if (mood.sections) {
    const groups = mood.sections.map(([key]) => ({ key, movies: [] }));
    for (const m of movies) groups[mood.sections.findIndex(([, fits]) => fits(m))].movies.push(m);
    results = groups.filter(group => group.movies.length).map(group => `<section class="results-section">
      <h2 class="mood-section-title mood-group-title">${escapeHtml(tr(lang, group.key))}</h2>
      ${grid(group.movies)}
    </section>`).join('\n\n    ');
  }
  const more = moodMore(mood, lang);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description: intro,
    inLanguage: lang,
    itemListElement: movies.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.title,
      url: `${origin}${langPath(lang, titlePath(m))}`
    }))
  };

  return layout({
    lang,
    origin,
    path,
    title: fitTitle(
      `${tr(lang, 'mood_page_title', { title: name, n: movies.length })} | MovieMood`,
      tr(lang, 'mood_page_title', { title: name, n: movies.length }),
      `${name} | MovieMood`
    ),
    description: truncate(intro, 155),
    image: movies[0]?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movies[0].backdrop_path}` : '',
    head: jsonLd(itemList) + jsonLd(breadcrumbs(origin, [[tr(lang, 'moods'), langPath(lang, '/moods')], [name, langPath(lang, path)]], lang)),
    hero: `<h1 class="home-title mood-title">${escapeHtml(name)}</h1>
    <p class="home-subtitle mood-intro">${escapeHtml(intro)}</p>`,
    main: `${results}${more ? `

    <section class="mood-more"><p class="mood-intro mood-note">${escapeHtml(more)}</p></section>` : ''}

    <section class="mood-cta">
      <p>${escapeHtml(tr(lang, 'not_your_mood'))}</p>
      <a class="search-btn mood-cta-btn" href="${langPath(lang, '/')}?q=${encodeURIComponent(mood.query)}">${escapeHtml(tr(lang, 'find_more'))}</a>
      <a class="mood-chip" href="${langPath(lang, '/')}">${escapeHtml(tr(lang, 'own_mood'))}</a>
    </section>

    <section class="mood-more">
      <h2 class="mood-section-title">${escapeHtml(tr(lang, 'more_moods'))}</h2>
      ${moodChips(lang, mood.slug)}
    </section>`
  });
}

// ══════════════════════════════════════════════
// "MOVIES LIKE X"
// /movies-like/27205-inception, /shows-like/1399-game-of-thrones: the titles fans of one film
// or series love most. The lists are built once by scripts/build_like.py (api/_like-data.js);
// the page only fetches the titles in its language.
// ══════════════════════════════════════════════
const LIKE_PREFIXES = { movie: '/movies-like', tv: '/shows-like' };
// "/movie/27205-inception" → "/movies-like/27205-inception"
const likePath = path => path.replace(/^\/(movie|tv)\//, (_, type) => `${LIKE_PREFIXES[type]}/`);
const likeEntry = (type, id) => LIKE_DATA[`${type}/${id}`];

async function renderLikePage(type, id, origin, requestedPath, lang) {
  const entry = likeEntry(type, id);
  if (!entry) return null;
  const basePath = likePath(entry.path);
  const ownPath = langPath(lang, basePath);
  if (requestedPath !== ownPath) return { redirect: ownPath };

  // "/tv/1399-game-of-thrones" → the series in the page's language
  const details = path => {
    const [, kind, titleId] = path.match(/^\/(movie|tv)\/(\d+)/);
    return fetchJson(`${TMDB_BASE_URL}/${kind}/${titleId}?api_key=${TMDB_API_KEY}&language=${TMDB_LOCALES[lang]}`)
      .then(item => ({ ...item, path }));
  };
  const [source, ...found] = await Promise.all([
    details(entry.path),
    ...entry.picks.map(path => details(path).catch(() => null))
  ]);
  const picks = found.filter(item => item?.poster_path);

  const name = source.title || source.name;
  const year = (source.release_date || source.first_air_date || '').slice(0, 4);
  const h1 = tr(lang, `like_h1_${type}`, { name });
  const pickName = item => item.title || item.name;
  const intro = tr(lang, `like_intro_${type}`, { name, n: picks.length });
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    description: intro,
    inLanguage: lang,
    itemListElement: picks.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pickName(item),
      url: `${origin}${langPath(lang, item.path)}`
    }))
  };
  // the picks that have a list of their own: one more step for visitors and search engines
  const moreLists = picks.filter(item => LIKE_DATA[item.path.replace(/^\/(movie|tv)\/(\d+).*/, '$1/$2')]);
  const rating = source.vote_average ? source.vote_average.toFixed(1) : '';

  return layout({
    lang,
    origin,
    path: basePath,
    title: fitTitle(
      `${tr(lang, 'like_title', { h1, n: picks.length })} | MovieMood`,
      tr(lang, 'like_title', { h1, n: picks.length }),
      `${h1} | MovieMood`,
      h1
    ),
    description: truncate(tr(lang, 'like_desc', { name, n: picks.length, picks: picks.slice(0, 3).map(pickName).join(', ') }), 155),
    image: source.backdrop_path ? `https://image.tmdb.org/t/p/w1280${source.backdrop_path}` : '',
    head: jsonLd(itemList) + jsonLd(breadcrumbs(origin, [[name, langPath(lang, entry.path)], [h1, ownPath]], lang)),
    hero: `<h1 class="home-title mood-title">${escapeHtml(h1)}</h1>
    <p class="home-subtitle mood-intro">${escapeHtml(intro)}</p>
    <a class="like-source" href="${langPath(lang, entry.path)}">
      ${source.poster_path ? `<img src="${TMDB_CARD_URL}${source.poster_path}" alt="${escapeHtml(name)} ${tr(lang, 'poster')}" width="48" height="72">` : ''}
      <span class="like-source-text">
        <strong>${escapeHtml(name)}</strong>
        <span class="like-source-meta">${[year, rating && `★ ${rating}`].filter(Boolean).join(' · ')}</span>
        <span class="like-source-link">${escapeHtml(tr(lang, 'like_where', { name }))} →</span>
      </span>
    </a>`,
    main: `<section class="results-section">
      <ol class="like-list">
      ${picks.map((item, i) => likeItem(item, lang, i + 1)).join('\n      ')}
      </ol>
    </section>
    ${moreLists.length ? `
    <section class="mood-more">
      <h2 class="mood-section-title">${escapeHtml(tr(lang, 'like_more'))}</h2>
      <div class="mood-chips">
      ${moreLists.map(item => `<a class="mood-chip" href="${langPath(lang, likePath(item.path))}">${escapeHtml(tr(lang, `like_h1_${item.path.startsWith('/tv/') ? 'tv' : 'movie'}`, { name: pickName(item) }))}</a>`).join('\n      ')}
      </div>
    </section>` : ''}

    <section class="mood-more">
      <h2 class="mood-section-title">${escapeHtml(tr(lang, 'browse_by_mood'))}</h2>
      ${moodChips(lang)}
    </section>`
  });
}

function renderMoodIndex(origin, lang) {
  const homeLink = `<a href="${langPath(lang, '/')}">${escapeHtml(tr(lang, 'home_link'))}</a>`;
  return layout({
    lang,
    origin,
    path: '/moods',
    title: `${tr(lang, 'index_title')} | MovieMood`,
    description: tr(lang, 'index_desc'),
    head: jsonLd(breadcrumbs(origin, [[tr(lang, 'moods'), langPath(lang, '/moods')]], lang)),
    hero: `<h1 class="home-title mood-title">${escapeHtml(tr(lang, 'index_h1'))} <span class="title-accent">${escapeHtml(tr(lang, 'index_h1_accent'))}</span></h1>
    <p class="home-subtitle mood-intro">${escapeHtml(tr(lang, 'index_intro')).replace('{link}', homeLink)}</p>`,
    main: `<section class="mood-list">
      ${moodsInSeasonOrder().map(m => `<a class="mood-tile"href="${langPath(lang, `/moods/${m.slug}`)}">
        <span class="mood-tile-emoji">${m.emoji}</span>
        <h2 class="mood-tile-title">${escapeHtml(moodTitle(m, lang))}</h2>
        <p class="mood-tile-text">${escapeHtml(truncate(moodIntro(m, lang), 110))}</p>
      </a>`).join('\n      ')}
    </section>`
  });
}

function renderNotFound(origin, lang = 'en') {
  return layout({
    lang,
    origin,
    path: '/moods',
    noindex: true,
    title: `${tr(lang, 'not_found_title')} | MovieMood`,
    description: tr(lang, 'not_found_desc'),
    hero: `<h1 class="home-title mood-title">${escapeHtml(tr(lang, 'not_found_h1'))} <span class="title-accent">${escapeHtml(tr(lang, 'not_found_h1_accent'))}</span></h1>
    <p class="home-subtitle mood-intro">${escapeHtml(tr(lang, 'not_found_intro'))}</p>`,
    main: `<section class="mood-more">${moodChips(lang)}</section>`
  });
}

// Home pages in the other languages: index.html with the texts search engines read translated
// (the English home page is the static index.html itself; i18n.js translates the rest in the browser)
async function renderHomePage(origin, lang) {
  const templateRes = await fetch(`${origin}/index.html`);
  if (!templateRes.ok) throw new Error(`template ${templateRes.status}`);
  const template = await templateRes.text();

  const title = tr(lang, 'home_title');
  const description = tr(lang, 'home_desc');
  const canonical = `${origin}${langPath(lang, '/')}`;
  const setMeta = (html, attr, name, value) => html.replace(
    new RegExp(`<meta ${attr}="${name}" content="[^"]*">`),
    () => `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
  );

  let html = template
    .replace(/<html lang="[^"]*"/, () => `<html lang="${lang}"`)
    // /uk/ and /uk would resolve the page's relative links differently
    .replace('<head>', () => '<head>\n  <base href="/">')
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*">(\s*<link rel="alternate"[^>]*>)*/, () => `<link rel="canonical" href="${escapeHtml(canonical)}">\n  ${alternates(origin, '/')}\n  ${ogLocales(lang)}`)
    .replace(/<h1 class="home-title">[\s\S]*?<\/h1>/, () => `<h1 class="home-title">${escapeHtml(tr(lang, 'home_h1'))} <span class="title-accent">${escapeHtml(tr(lang, 'home_h1_accent'))}</span></h1>`)
    .replace(/<p class="home-subtitle">[^<]*<\/p>/, () => `<p class="home-subtitle">${escapeHtml(tr(lang, 'home_subtitle'))}</p>`)
    .replace(/<(h2|h3|p)([^>]*) data-i18n="about\.(\w+)">[^<]*<\/\1>/g, (all, tag, attrs, key) => `<${tag}${attrs} data-i18n="about.${key}">${escapeHtml(TEXT.about[key]?.[lang] ?? '')}</${tag}>`)
    .replace(/<span data-i18n="quick\.(\w+)">[^<]*<\/span>/g, (all, key) => `<span data-i18n="quick.${key}">${escapeHtml(TEXT.quick[key]?.[lang] ?? '')}</span>`)
    .replace(/<p class="footer-premiero">[\s\S]*?<\/p>/, () => premieroLine(lang))
    .replace(/href="\/moods(\/[^"]*)?"/g, (all, rest = '') => `href="${langPath(lang, `/moods${rest}`)}"`);
  // the structured data names this page, in its language, at its own address
  html = html.replace(
    '{"@type":"WebPage","name":"MovieMood: Find a Movie for Your Mood","url":"https://www.themoviemood.com/"',
    () => `{"@type":"WebPage","name":${JSON.stringify(title)},"url":${JSON.stringify(canonical)},"inLanguage":"${lang}"`
  );
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', canonical);
  return html;
}

// movie.html stays the single source of the movie page markup: it is fetched as a static
// file and the parts search engines need are filled in before movie.js takes over.
// Returns the page's HTML, or { redirect } when the address is not the page's own one
// ("/movie/218" or an old title → "/movie/218-the-terminator"): one address per film for search engines
async function renderTitlePage(type, id, origin, requestedPath, lang = 'en') {
  const detailsUrl = locale => `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=${locale}`;
  const [templateRes, details, english] = await Promise.all([
    fetch(`${origin}/movie.html`),
    fetchJson(`${detailsUrl(TMDB_LOCALES[lang])}&append_to_response=videos,watch/providers,credits,recommendations,similar,translations&include_video_language=en,${lang}`),
    // the address is built from the English title in every language; so are the addresses of
    // the similar titles linked from the page
    lang === 'en' ? null : fetchJson(`${detailsUrl('en-US')}&append_to_response=credits,recommendations,similar`)
  ]);
  const basePath = titlePath(english || details, type);
  const ownPath = langPath(lang, basePath);
  if (requestedPath !== ownPath) return { redirect: ownPath };

  if (!templateRes.ok) throw new Error(`template ${templateRes.status}`);
  const template = await templateRes.text();

  const name = details.title || details.name;
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);
  const canonical = `${origin}${ownPath}`;
  const nameWithYear = `${name}${year ? ` (${year})` : ''}`;
  const pageTitle = fitTitle(
    `${tr(lang, 'title_page_title', { name: nameWithYear })} | MovieMood`,
    tr(lang, 'title_page_title', { name: nameWithYear }),
    tr(lang, 'title_page_short', { name: nameWithYear }),
    tr(lang, 'title_page_short', { name: truncate(name, 45) })
  );
  const poster = details.poster_path ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}` : '';

  // A version in another language with no description of its own repeats the English page:
  // kept out of the index (its links are still followed), the English page stands for it
  const noindex = lang !== 'en' && !details.overview;
  // The language versions search engines are pointed to: the same rule, for every language at once
  const described = new Set((details.translations?.translations || [])
    .filter(item => item.data?.overview).map(item => `${item.iso_639_1}-${item.iso_3166_1}`));
  const indexedLangs = LANGS.filter(code => code === 'en' || described.has(TMDB_LOCALES[code]) || (code === lang && !noindex));

  // Streaming services in the country of this language version
  const country = WATCH_COUNTRIES[lang];
  const watch = details['watch/providers']?.results?.[country] || {};
  const services = [];
  // "HBO Max Amazon Channel" is HBO Max again, bought through Amazon: one name is enough
  const isChannel = provider => / (amazon|apple tv|roku premium) channel$|with ads$/i.test(provider.provider_name || '');
  for (const [kind, label] of [['flatrate', 'watch_stream'], ['rent', 'watch_rent'], ['buy', 'watch_buy']]) {
    for (const provider of (watch[kind] || []).filter(p => !isChannel(p))) {
      const known = services.find(item => item.name === provider.provider_name);
      if (known) known.kinds.push(tr(lang, label));
      else services.push({ name: provider.provider_name, kinds: [tr(lang, label)] });
    }
  }
  const serviceNames = services.slice(0, 3).map(item => item.name).join(', ');
  const description = truncate(
    [serviceNames && tr(lang, 'title_page_where', { name, services: serviceNames }), details.overview || tr(lang, 'title_page_desc', { name })]
      .filter(Boolean).join(' '),
    155
  );
  const countryName = (() => {
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(country); } catch (e) { return country; }
  })();
  const providersHtml = services.length
    ? `<p class="providers-ssr">${escapeHtml(tr(lang, 'title_page_where_in', { country: countryName }))} ${services.slice(0, 8)
      .map(item => `${escapeHtml(item.name)} (${escapeHtml(item.kinds.join(', '))})`).join(', ')}</p>`
    : '';

  // The trailer, described for video search: official trailer first, recaps of older films last
  const trailerRank = video => {
    let rank = ({ Trailer: 0, Teaser: 4 })[video.type] ?? 8;
    if (!video.official) rank += 1;
    if (/official trailer|main trailer/i.test(video.name || '')) rank -= 1;
    if (/journey|recap|look ?back|retrospective|tribute|anniversary|reaction|tv spot|review/i.test(video.name || '')) rank += 3;
    if (video.iso_639_1 === lang) rank -= 0.5;
    return rank;
  };
  const trailer = (details.videos?.results || [])
    .filter(video => video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type))
    .sort((a, b) => trailerRank(a) - trailerRank(b))[0];
  const video = trailer ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `${nameWithYear} — ${tr(lang, 'trailer')}`,
    description: truncate(details.overview || `${nameWithYear} — ${tr(lang, 'trailer')}`, 300),
    thumbnailUrl: [`https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`],
    uploadDate: trailer.published_at || details.release_date || details.first_air_date || undefined,
    embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
    inLanguage: trailer.iso_639_1 || undefined
  } : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': type === 'tv' ? 'TVSeries' : 'Movie',
    name,
    alternateName: english && (english.title || english.name) !== name ? (english.title || english.name) : undefined,
    inLanguage: lang,
    url: canonical,
    description: details.overview || undefined,
    image: poster || undefined,
    datePublished: details.release_date || details.first_air_date || undefined,
    genre: (details.genres || []).map(g => g.name),
    aggregateRating: details.vote_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: Number(details.vote_average.toFixed(1)),
      bestRating: 10,
      ratingCount: details.vote_count
    } : undefined
  };

  // The big picture at the top is the page's largest element: the browser gets it from the HTML at
  // once (the same sizes movie.js asks for: w780 on phones, w1280 wider), instead of after the
  // scripts have asked TMDB about the film
  const backdrop = size => `https://image.tmdb.org/t/p/${size}${details.backdrop_path}`;
  const backdropHead = details.backdrop_path ? `<link rel="preload" as="image" href="${backdrop('w780')}" media="(max-width: 600px)" fetchpriority="high">
  <link rel="preload" as="image" href="${backdrop('w1280')}" media="(min-width: 601px)" fetchpriority="high">
  <style>#heroBackdrop{background-image:url(${backdrop('w780')})}@media (min-width:601px){#heroBackdrop{background-image:url(${backdrop('w1280')})}}</style>` : '';

  const head = `<title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${noindex ? '' : alternates(origin, basePath, indexedLangs)}
  <meta property="og:type" content="${type === 'tv' ? 'video.tv_show' : 'video.movie'}">
  <meta property="og:site_name" content="MovieMood">
  ${ogLocales(lang)}
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${details.backdrop_path ? `<meta property="og:image" content="https://image.tmdb.org/t/p/w1280${details.backdrop_path}">\n  <meta name="twitter:card" content="summary_large_image">` : ''}
  ${backdropHead}
  ${jsonLd(schema)}
  ${video ? jsonLd(video) : ''}
  ${jsonLd(breadcrumbs(origin, [[name, ownPath]], lang))}`;

  // What movie.js draws in the browser, already in the page: search engines get the cast, genres
  // and similar titles as text and links instead of an almost empty page
  const overview = details.overview || english?.overview || '';
  const genres = details.genres || [];
  const rating = details.vote_average ? details.vote_average.toFixed(1) : '';
  const metaHtml = [year, details.runtime ? tr(lang, 'minutes', { n: details.runtime }) : '', rating ? `${tr(lang, 'rating')} ${rating}` : '']
    .filter(Boolean).map(part => `<span>${escapeHtml(part)}</span>`).join(' · ');
  const crew = details.credits?.crew || [];
  const director = crew.find(p => p.job === 'Director') || crew.find(p => p.department === 'Directing');
  // people's addresses carry the Latin name, as on their own pages (Кіану Рівз → keanu-reeves)
  const englishNames = new Map([...(english?.credits?.cast || []), ...(english?.credits?.crew || [])].map(p => [p.id, p.name]));
  const personLink = person => langPath(lang, personPath({ id: person.id, name: englishNames.get(person.id) || person.name }));
  const directorHtml = director ? `<a class="person-chip" href="${personLink(director)}">
        ${director.profile_path ? `<img src="https://image.tmdb.org/t/p/w185${director.profile_path}" alt="${escapeHtml(director.name)}">` : ''}
        ${escapeHtml(director.name)}
      </a>` : '';
  const castHtml = (details.credits?.cast || []).slice(0, 8).map(actor => `<a class="actor-card" href="${personLink(actor)}">
      ${actor.profile_path ? `<img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" alt="${escapeHtml(actor.name)}" loading="lazy">` : ''}
      <span class="actor-name">${escapeHtml(actor.name)}</span>
      <span class="actor-char">${escapeHtml(actor.character)}</span>
    </a>`).join('');
  // recommendations first, then similar titles, as pickSimilar() in movie.js
  const englishTitles = new Map([...(english?.recommendations?.results || []), ...(english?.similar?.results || [])]
    .map(item => [item.id, item.title || item.name]));
  const seen = new Set([id]);
  const similarItems = [...(details.recommendations?.results || []), ...(details.similar?.results || [])]
    .filter(item => item.poster_path && item.vote_count >= 50 && !seen.has(item.id) && seen.add(item.id))
    .slice(0, 12);
  const similarHtml = similarItems.map(item => {
    const itemName = item.title || item.name;
    const itemRating = item.vote_average ? item.vote_average.toFixed(1) : '';
    const path = titlePath(lang === 'en' ? item : { ...item, slug_title: englishTitles.get(item.id) || (item.original_language === 'en' ? item.original_title || item.original_name : '') }, type);
    return `<a class="similar-card" href="${langPath(lang, path)}">
          <div class="similar-poster-wrap">
            <img src="${TMDB_CARD_URL}${item.poster_path}" loading="lazy" alt="${escapeHtml(itemName)}">
            ${itemRating ? `<span class="tmdb-mini-score card-score">${itemRating}</span>` : ''}
          </div>
          <span>${escapeHtml(itemName)}</span>
        </a>`;
  }).join('');

  // "Movies like Inception": the list built around this title, when there is one
  const like = likeEntry(type, id);
  const moodsSection = `<section class="mood-more movie-moods">
    ${like ? `<a class="like-cta" href="${langPath(lang, likePath(like.path))}">${escapeHtml(tr(lang, `like_h1_${type}`, { name }))} →</a>` : ''}
    <h2 class="mood-section-title">${escapeHtml(tr(lang, 'browse_by_mood'))}</h2>
    ${moodChips(lang)}
  </section>

  `;

  // Function replacements: titles and overviews may contain "$", which String.replace would interpret
  return template
    .replace(/<html lang="[^"]*"/, () => `<html lang="${lang}"`)
    .replace('<head>', () => '<head>\n  <base href="/">')
    // the template is kept out of the index; this address is the indexable one (see noindex above)
    .replace('<meta name="robots" content="noindex, follow">', noindex ? '<meta name="robots" content="noindex, follow">' : '')
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('id="heroBadges"></div>', () => `id="heroBadges">${genres.slice(0, 3).map(g => `<span class="badge">${escapeHtml(g.name)}</span>`).join('')}</div>`)
    .replace('id="movieTitle"></h1>', () => `id="movieTitle">${escapeHtml(name)}</h1>`)
    .replace('id="heroMeta"></div>', () => `id="heroMeta">${metaHtml}</div>`)
    .replace('id="movieOverview"></p>', () => `id="movieOverview">${escapeHtml(overview)}</p>`)
    .replace(/<span class="info-label">Director<\/span>/, () => `<span class="info-label">${escapeHtml(tr(lang, 'director'))}</span>`)
    .replace(/<span class="info-label">Cast<\/span>/, () => `<span class="info-label">${escapeHtml(tr(lang, 'cast'))}</span>`)
    .replace(/<span class="info-label">Genres<\/span>/, () => `<span class="info-label">${escapeHtml(tr(lang, 'genres'))}</span>`)
    .replace(/<span class="info-label">Rating<\/span>/, () => `<span class="info-label">${escapeHtml(tr(lang, 'rating'))}</span>`)
    .replace('id="movieDirector"></div>', () => `id="movieDirector">${directorHtml}</div>`)
    .replace('id="movieCast"></div>', () => `id="movieCast">${castHtml}</div>`)
    .replace('id="movieGenres"></div>', () => `id="movieGenres">${genres.map(g => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('')}</div>`)
    .replace('id="tmdbRating"></span>', () => `id="tmdbRating">${rating}</span>`)
    .replace('id="similarSection" style="display: none;"', () => similarHtml ? 'id="similarSection"' : 'id="similarSection" style="display: none;"')
    .replace('<h2 class="section-title">More Like This</h2>', () => `<h2 class="section-title">${escapeHtml(tr(lang, 'similar'))}</h2>`)
    .replace('id="similarGrid"></div>', () => `id="similarGrid">${similarHtml}</div>`)
    .replace('<div class="hero-providers" id="watchProviders"></div>', () => `<div class="hero-providers" id="watchProviders">${providersHtml}</div>`)
    .replace('id="moviePoster" src="" alt="Movie Poster"', () => `id="moviePoster" src="${escapeHtml(poster)}" alt="${escapeHtml(name)} ${tr(lang, 'poster')}"`)
    .replace('<div class="trailer-modal"', () => `${moodsSection}<footer class="home-footer">
    <p>${escapeHtml(tr(lang, 'footer'))}</p>
    ${premieroLine(lang)}
  </footer>

  <div class="trailer-modal"`)
    .replace('<script src="movie.js', () => `<script>window.__MM_PAGE = ${JSON.stringify({ id: String(id), type }).replace(/</g, '\\u003c')};</script>\n  <script src="movie.js`);
}

const personPath = person => {
  const slug = slugify(person.name);
  return `/person/${person.id}${slug ? `-${slug}` : ''}`;
};

// Same idea as renderTitlePage, with person.html as the template.
// Returns the HTML, or { redirect } when the address is not the person's own one.
async function renderPersonPage(id, origin, requestedPath, lang = 'en') {
  const personUrl = locale => `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}&language=${locale}`;
  const [templateRes, person, english, credits] = await Promise.all([
    fetch(`${origin}/person.html`),
    fetchJson(`${personUrl(TMDB_LOCALES[lang])}&append_to_response=translations`),
    // TMDB translates names too (Киану Ривз); the address keeps the Latin one in every language,
    // and the films linked from the page keep their English addresses
    lang === 'en' ? null : fetchJson(`${personUrl('en-US')}&append_to_response=combined_credits`),
    fetchJson(`${TMDB_BASE_URL}/person/${id}/combined_credits?api_key=${TMDB_API_KEY}&language=${TMDB_LOCALES[lang]}`).catch(() => ({}))
  ]);
  const basePath = personPath(english || person);
  const ownPath = langPath(lang, basePath);
  if (requestedPath !== ownPath) return { redirect: ownPath };

  if (!templateRes.ok) throw new Error(`template ${templateRes.status}`);
  const template = await templateRes.text();

  const name = person.name;
  const canonical = `${origin}${ownPath}`;
  // Best-known work first: it goes into the description, which shows up in search results
  // (talk shows and other guest appearances left out, as in person.js)
  const work = [...(credits.cast || []), ...(credits.crew || [])]
    .filter(item => !(item.genre_ids || []).some(g => [10767, 10763, 10764].includes(g)) && !/^(self|himself|herself)\b/i.test(item.character || ''))
    .filter((item, i, all) => (item.title || item.name) && all.findIndex(x => x.id === item.id) === i)
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  const known = work.slice(0, 3).map(item => item.title || item.name);
  // The filmography person.js draws, already in the page as links to the films
  const englishCredits = english?.combined_credits;
  const englishTitles = new Map([...(englishCredits?.cast || []), ...(englishCredits?.crew || [])]
    .map(item => [`${item.media_type}/${item.id}`, item.title || item.name]));
  const filmographyHtml = work.filter(item => item.poster_path).slice(0, 24).map(item => {
    const itemType = item.media_type === 'tv' ? 'tv' : 'movie';
    const path = titlePath(lang === 'en' ? item : { ...item, slug_title: englishTitles.get(`${itemType}/${item.id}`) || '' }, itemType);
    return movieCard(item, lang, path);
  }).join('\n      ');
  // A version in another language with no biography of its own is a list of posters and little
  // else: kept out of the index, while its links to the films are still followed
  const noindex = lang !== 'en' && !person.biography;
  const described = new Set((person.translations?.translations || [])
    .filter(item => item.data?.biography).map(item => `${item.iso_639_1}-${item.iso_3166_1}`));
  const indexedLangs = LANGS.filter(code => code === 'en' || described.has(TMDB_LOCALES[code]) || (code === lang && !noindex));
  const pageTitle = fitTitle(`${tr(lang, 'person_page_title', { name })} | MovieMood`, tr(lang, 'person_page_title', { name }));
  const description = truncate(
    known.length
      ? tr(lang, 'person_page_desc', { name, known: known.join(', ') })
      : person.biography || tr(lang, 'person_page_desc_short', { name }),
    155
  );
  const photo = person.profile_path ? `https://image.tmdb.org/t/p/h632${person.profile_path}` : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName: english && english.name !== name ? english.name : undefined,
    url: canonical,
    image: photo || undefined,
    birthDate: person.birthday || undefined,
    deathDate: person.deathday || undefined,
    birthPlace: person.place_of_birth || undefined,
    jobTitle: person.known_for_department || undefined,
    description: person.biography ? truncate(person.biography, 300) : undefined
  };

  const head = `<title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${noindex ? '' : alternates(origin, basePath, indexedLangs)}
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="MovieMood">
  ${ogLocales(lang)}
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${photo ? `<meta property="og:image" content="${escapeHtml(photo)}">` : ''}
  ${jsonLd(schema)}
  ${jsonLd(breadcrumbs(origin, [[name, ownPath]], lang))}`;

  // Function replacements: names and biographies may contain "$", which String.replace would interpret
  return template
    .replace(/<html lang="[^"]*"/, () => `<html lang="${lang}"`)
    .replace(/<p class="footer-premiero">[\s\S]*?<\/p>/, () => premieroLine(lang))
    .replace('<head>', () => '<head>\n  <base href="/">')
    // the template is kept out of the index; this address is the indexable one (see noindex above)
    .replace('<meta name="robots" content="noindex, follow">', noindex ? '<meta name="robots" content="noindex, follow">' : '')
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('id="personName"></h1>', () => `id="personName">${escapeHtml(name)}</h1>`)
    .replace('id="personBio"></p>', () => `id="personBio">${escapeHtml(person.biography || '')}</p>`)
    .replace('id="personMoviesTitle"></h2>', () => `id="personMoviesTitle">${escapeHtml(tr(lang, 'filmography', { name }))}</h2>`)
    .replace('id="moviesGrid"></div>', () => `id="moviesGrid">${filmographyHtml}</div>`)
    .replace('id="personPhoto" src="" alt=""', () => `id="personPhoto" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}"`)
    .replace('<script src="person.js', () => `<script>window.__MM_PAGE = ${JSON.stringify({ id: String(id) }).replace(/</g, '\\u003c')};</script>\n  <script src="person.js`);
}

// Shared by movie and person pages: redirect to the page's own address, or send the HTML
function sendPage(res, page) {
  if (page.redirect) {
    res.setHeader('Location', page.redirect);
    res.setHeader('Cache-Control', `public, s-maxage=${DAY}`);
    return res.status(308).end();
  }
  return send(res, 200, page);
}

// Every page in every language; the pages themselves point to their other-language versions.
// Besides the films of the collections: what is popular, new, trending and best rated, films
// and series — the titles people search "where to watch" for.
// /sitemap.xml lists the parts: /sitemap/moods.xml (collections and their films, "movies like"
// pages) and /sitemap/lists-1.xml, lists-2.xml (the lists below). Each part asks TMDB at most
// about 30 times: Cloudflare's free plan allows 50 requests out of one request.
const SITEMAP_LISTS = [
  [
    ['movie', 'movie/popular', 5], ['movie', 'movie/top_rated', 10], ['movie', 'movie/now_playing', 3],
    ['movie', 'movie/upcoming', 2], ['movie', 'trending/movie/week', 5], ['tv', 'tv/popular', 5]
  ],
  [
    ['tv', 'tv/top_rated', 5], ['tv', 'trending/tv/week', 3],
    // anime and documentaries rarely make the general lists
    ['movie', 'discover/movie?with_genres=16&with_keywords=210024&sort_by=vote_count.desc', 5],
    ['tv', 'discover/tv?with_genres=16&with_keywords=210024&sort_by=vote_count.desc', 5],
    ['movie', 'discover/movie?with_genres=99&sort_by=vote_count.desc', 5],
    ['tv', 'discover/tv?with_genres=99&sort_by=vote_count.desc', 3]
  ]
];
const SITEMAP_PARTS = ['moods', ...SITEMAP_LISTS.map((_, i) => `lists-${i + 1}`)];

const urlset = (origin, paths) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LANGS.flatMap(lang => paths.map(path => `  <url><loc>${escapeHtml(origin + langPath(lang, path))}</loc></url>`)).join('\n')}
</urlset>`;

// part: '' for the index, or one of SITEMAP_PARTS; null for an unknown part
async function renderSitemap(origin, part = '') {
  if (!part) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_PARTS.map(name => `  <sitemap><loc>${escapeHtml(`${origin}/sitemap/${name}.xml`)}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
  }
  if (part === 'moods') {
    const moodMovies = await Promise.all(MOODS.map(mood => fetchMoodMovies(mood).catch(() => [])));
    const titlePaths = [...new Set(moodMovies.flat().map(m => titlePath(m)))];
    const likePaths = Object.values(LIKE_DATA).map(entry => likePath(entry.path));
    return urlset(origin, ['/', '/moods', ...MOODS.map(m => `/moods/${m.slug}`), ...likePaths, ...titlePaths]);
  }
  const lists = SITEMAP_LISTS[SITEMAP_PARTS.indexOf(part) - 1];
  if (!lists) return null;
  const found = await Promise.all(lists.flatMap(([type, list, pages]) =>
    Array.from({ length: pages }, (_, i) =>
      fetchJson(`${TMDB_BASE_URL}/${list}${list.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US&page=${i + 1}`)
        .then(data => (data.results || [])
          .filter(item => !item.adult && item.poster_path && (item.vote_count || 0) >= 20)
          .map(item => titlePath(item, type)))
        .catch(() => []))));
  return urlset(origin, [...new Set(found.flat())]);
}

// ══════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════
export default async function handler(req, res) {
  const origin = getOrigin(req);
  const query = req.query || Object.fromEntries(new URL(req.url, origin).searchParams);
  const kind = String(query.kind || '');
  // "/uk/moods" arrives as kind=moods&lang=uk (vercel.json); no lang is English
  const lang = LANGS.includes(query.lang) ? query.lang : 'en';
  const prefix = langPath(lang, '');
  // the plain pages pick the language up from ?lang= (i18n.js)
  const fallbackLang = lang === 'en' ? '' : `&lang=${lang}`;

  try {
    // IMDb rating of one title (TMDB does not have it): OMDb, kept for a day by Vercel's cache.
    // Needs OMDB_API_KEY in Vercel; without it the movie page shows the plain IMDb link.
    if (kind === 'imdb') {
      const imdbId = String(query.id || '');
      const key = (process.env.OMDB_API_KEY || '').trim();
      if (!/^tt\d{5,10}$/.test(imdbId) || !key) return send(res, 200, JSON.stringify({ rating: null }), { type: 'application/json; charset=utf-8', maxAge: 3600 });
      const data = await fetchJson(`https://www.omdbapi.com/?i=${imdbId}&apikey=${encodeURIComponent(key)}`).catch(() => ({}));
      const rating = /^\d+(\.\d)?$/.test(data.imdbRating || '') ? data.imdbRating : null;
      const votes = /^[\d,]+$/.test(data.imdbVotes || '') ? data.imdbVotes : null;
      return send(res, 200, JSON.stringify({ rating, votes }), { type: 'application/json; charset=utf-8' });
    }

    if (kind === 'geo') {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({ country: String(req.headers['x-vercel-ip-country'] || '') }));
    }

    // Crawlers that collect sites for AI models are kept out (PerplexityBot made 2–3 requests a
    // second, nearly all of the site's traffic); search engines and AI search stay welcome. Those
    // that ignore robots.txt are stopped by the "Block AI crawlers" rule in Cloudflare WAF.
    if (kind === 'robots') {
      const aiBots = ['PerplexityBot', 'GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent', 'Amazonbot', 'cohere-ai', 'Diffbot', 'img2dataset'];
      return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /tmdb/\nDisallow: /tmdb-img/\n\n${aiBots.map(bot => `User-agent: ${bot}`).join('\n')}\nDisallow: /\n\nSitemap: ${origin}/sitemap.xml\n`, { type: 'text/plain; charset=utf-8' });
    }

    if (kind === 'sitemap') {
      const xml = await renderSitemap(origin, String(query.part || ''));
      if (!xml) return send(res, 404, renderNotFound(origin, lang));
      return send(res, 200, xml, { type: 'application/xml; charset=utf-8' });
    }

    if (kind === 'home') {
      if (lang === 'en') {
        res.setHeader('Location', '/');
        return res.status(308).end();
      }
      try {
        return send(res, 200, await renderHomePage(origin, lang));
      } catch (error) {
        console.error('Home page error:', error);
        res.setHeader('Location', `/?lang=${lang}`);
        return res.status(302).end();
      }
    }

    if (kind === 'moods') {
      return send(res, 200, renderMoodIndex(origin, lang));
    }

    if (kind === 'mood') {
      const mood = MOODS.find(m => m.slug === String(query.slug || '').toLowerCase());
      if (!mood) return send(res, 404, renderNotFound(origin, lang));
      const movies = await fetchMoodMovies(mood, lang);
      return send(res, 200, renderMoodPage(mood, movies, origin, lang));
    }

    if (kind === 'title') {
      const type = query.type === 'tv' ? 'tv' : 'movie';
      // ":id" from vercel.json is the whole last part of the address: "218-the-terminator"
      const segment = String(query.id || '');
      const id = parseInt(segment, 10);
      if (!id) return send(res, 404, renderNotFound(origin, lang));
      try {
        return sendPage(res, await renderTitlePage(type, id, origin, `${prefix}/${type}/${segment}`, lang));
      } catch (error) {
        if (error.message === 'TMDB 404') return send(res, 404, renderNotFound(origin, lang));
        // The plain client-side page still works without the server-rendered extras
        // (ssr=0 stops movie.js from sending the visitor straight back here)
        console.error('Title page error:', error);
        res.setHeader('Location', `/movie.html?id=${id}&type=${type}&ssr=0${fallbackLang}`);
        return res.status(302).end();
      }
    }

    if (kind === 'like') {
      const type = query.type === 'tv' ? 'tv' : 'movie';
      const segment = String(query.id || '');
      const id = parseInt(segment, 10);
      const page = id ? await renderLikePage(type, id, origin, `${prefix}${LIKE_PREFIXES[type]}/${segment}`, lang).catch(error => {
        if (error.message === 'TMDB 404') return null;
        throw error;
      }) : null;
      if (!page) return send(res, 404, renderNotFound(origin, lang));
      return sendPage(res, page);
    }

    if (kind === 'person') {
      // ":id" is the whole last part of the address: "6384-keanu-reeves"
      const segment = String(query.id || '');
      const id = parseInt(segment, 10);
      if (!id) return send(res, 404, renderNotFound(origin, lang));
      try {
        return sendPage(res, await renderPersonPage(id, origin, `${prefix}/person/${segment}`, lang));
      } catch (error) {
        if (error.message === 'TMDB 404') return send(res, 404, renderNotFound(origin, lang));
        console.error('Person page error:', error);
        res.setHeader('Location', `/person.html?id=${id}&ssr=0${fallbackLang}`);
        return res.status(302).end();
      }
    }

    return send(res, 404, renderNotFound(origin, lang));
  } catch (error) {
    console.error('Page handler error:', error);
    return send(res, 500, renderNotFound(origin, lang));
  }
}
