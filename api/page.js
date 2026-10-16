// Server-rendered pages for search engines (see vercel.json for the URLs):
//   /moods              → list of mood collections
//   /moods/:slug        → one collection ("Movies for a Rainy Day")
//   /movie/:id, /tv/:id → movie.html with real <title>, description and content filled in
//   /person/:id         → person.html, the same way
//   /uk, /ru, /fr, /es  → the home page in that language; the pages above also exist under
//                         these prefixes (/uk/moods/cozy-movies, /fr/movie/218-the-terminator)
//   /sitemap.xml, /robots.txt

const TMDB_API_KEY = process.env.TMDB_API_KEY || '838a2b872b36560920c01b7b50b0bb9e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ASSET_VERSION = '20261016b';
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
    intro: 'Grey sky, a blanket and nowhere to be. These are warm, funny, slightly bittersweet films that suit the sound of rain on the window — easy to sink into and hard to turn off.'
  },
  {
    slug: 'feel-good-movies', emoji: '😊', title: 'Feel-Good Movies', query: 'feel good',
    discover: 'with_keywords=325824|325782|325832|281585|288816&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Hopeful, warm-hearted films that leave you lighter than they found you. No heavy twists, no bleak endings — just good company for a couple of hours.'
  },
  {
    slug: 'movies-to-cry-to', emoji: '😢', title: 'Movies to Cry To', query: 'want to cry',
    discover: 'with_genres=18&with_keywords=319319|4232|156924|9872|278730&without_genres=27,28,53,9648,878&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Sometimes you need a proper cry. These love stories and dramas earn their tears honestly — keep the tissues within reach.'
  },
  {
    slug: 'date-night-movies', emoji: '💕', title: 'Date Night Movies', query: 'date night',
    discover: 'with_genres=10749&with_keywords=324429|9673|288816&without_genres=27,53&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Love stories both of you can agree on: real chemistry, a few laughs and a few sighs. Well-loved picks, not random new releases.'
  },
  {
    slug: 'cozy-movies', emoji: '🕯️', title: 'Cozy Movies', query: 'cozy',
    discover: 'with_genres=35|10749|10751&with_keywords=325784|288816|324713|325832&without_genres=28,27,53,80,10752,878,12,16&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Gentle, funny and familiar films that feel like a warm room in winter. No violence, no jump scares — perfect with tea and something sweet.'
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
    intro: 'Haunted houses, masked strangers and the one night of the year when it all makes sense. Horror picks for a dark October evening.'
  },
  {
    slug: 'family-movie-night', emoji: '👨‍👩‍👧', title: 'Family Movie Night', query: 'family',
    discover: 'with_genres=10751,16',
    intro: 'Animated films that work for every age on the sofa — bright enough for kids, smart enough that adults stay awake.'
  },
  {
    slug: 'motivational-movies', emoji: '💪', title: 'Motivational Movies', query: 'inspiring',
    discover: 'with_genres=18&with_keywords=281585|325824|240&without_genres=53,80,27,9648&sort_by=vote_count.desc&vote_count.gte=300',
    intro: 'Underdogs, comebacks and people who refused to quit. Put one on when you need a push to start something hard.'
  },
  {
    slug: 'christmas-movies', emoji: '🎄', title: 'Christmas Movies', query: 'christmas',
    discover: 'with_keywords=207317&with_genres=10751|35&vote_average.gte=6&vote_count.gte=800',
    intro: 'Snow, lights and second chances. Holiday favourites old and new for the weeks when the tree is up.'
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
    intro: 'Real people, real events, and the strange feeling of looking it all up afterwards. Dramas drawn from life.'
  },
  {
    slug: 'heist-movies', emoji: '💰', title: 'Heist Movies', query: 'heist',
    discover: 'with_keywords=10051&vote_count.gte=1000',
    intro: 'A crew, a plan and the moment it goes wrong. Clever capers and bank jobs where half the fun is watching the pieces click.'
  },
  {
    slug: 'time-travel-movies', emoji: '⏳', title: 'Time Travel Movies', query: 'time travel',
    discover: 'with_keywords=4379',
    intro: 'Loops, paradoxes and second attempts at the past. From light adventures to stories that tie your brain in a knot.'
  },
  {
    slug: 'coming-of-age-movies', emoji: '🎒', title: 'Coming-of-Age Movies', query: 'coming of age',
    discover: 'with_keywords=10683&with_genres=18&without_genres=16,14,28,878&vote_average.gte=7',
    intro: 'First loves, last summers and the year everything changed. Films about growing up that still hit when you already have.'
  },
  {
    slug: 'road-trip-movies', emoji: '🚗', title: 'Road Trip Movies', query: 'road trip',
    discover: 'with_keywords=7312&with_genres=35|18&without_genres=14,878,16,28&vote_count.gte=800',
    intro: 'Open roads, bad motels and travel companions who slowly become friends. For when you want to get away without leaving the sofa.'
  },
  {
    slug: 'space-movies', emoji: '🚀', title: 'Space Movies', query: 'space',
    discover: 'with_keywords=9882|3801&with_genres=878&without_genres=16',
    intro: 'Silence, distance and very small humans. Science fiction set among the stars, from tense survival stories to big-screen spectacle.'
  },
  {
    slug: 'dystopian-movies', emoji: '🏙️', title: 'Dystopian Movies', query: 'dystopia',
    discover: 'with_keywords=4565',
    intro: 'Futures that went wrong, and the people pushing back. Dark, stylish worlds that say more about today than tomorrow.'
  },
  {
    slug: 'high-school-movies', emoji: '🏫', title: 'High School Movies', query: 'high school comedy',
    discover: 'with_keywords=6270&with_genres=35&vote_count.gte=800',
    intro: 'Lockers, cliques and prom-night disasters. Teen comedies that are easy to quote and easier to rewatch.'
  },
  {
    slug: 'serial-killer-thrillers', emoji: '🔪', title: 'Serial Killer Thrillers', query: 'serial killer',
    discover: 'with_keywords=10714&with_genres=53&vote_average.gte=6.8',
    intro: 'Detectives, obsession and the slow tightening of a case. Dark psychological thrillers for viewers with strong nerves.'
  },
  {
    slug: 'best-90s-movies', emoji: '📼', title: 'Best Movies of the 90s', query: '90s',
    discover: 'primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=4000',
    intro: 'The decade of video stores and sold-out Friday nights. The highest-rated films of the 1990s, all of which still hold up.'
  },
  {
    slug: 'best-80s-movies', emoji: '🕹️', title: 'Best Movies of the 80s', query: '80s',
    discover: 'primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&sort_by=vote_average.desc&vote_count.gte=3000',
    intro: 'Synths, practical effects and heroes with one-liners. The best-loved films of the 1980s for a properly nostalgic evening.'
  }
];

// ══════════════════════════════════════════════
// LANGUAGES
// English pages live at the plain addresses, the others under a prefix: /uk/moods/cozy-movies,
// /ru/movie/218-the-terminator. The slug stays English in every language, so one film has the
// same address apart from the prefix.
// ══════════════════════════════════════════════
const LANGS = ['en', 'uk', 'ru', 'fr', 'es'];
const TMDB_LOCALES = { en: 'en-US', uk: 'uk-UA', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES' };
const OG_LOCALES = { en: 'en_US', uk: 'uk_UA', ru: 'ru_RU', fr: 'fr_FR', es: 'es_ES' };

// [title, intro] of each collection in the other languages
const MOOD_TEXT = {
  'rainy-day-movies': {
    uk: ['Фільми для дощового дня', 'Сіре небо, плед і жодних справ. Теплі, смішні й трохи сумні фільми, що пасують до шуму дощу за вікном: у них легко пірнути і важко вимкнути.'],
    ru: ['Фильмы для дождливого дня', 'Серое небо, плед и никаких дел. Тёплые, смешные и немного грустные фильмы под шум дождя за окном: в них легко погрузиться и трудно выключить.'],
    fr: ['Films pour un jour de pluie', 'Ciel gris, plaid et nulle part où aller. Des films chaleureux, drôles et un brin doux-amers qui vont bien avec la pluie contre la vitre : on s’y plonge facilement et on a du mal à arrêter.'],
    es: ['Películas para un día de lluvia', 'Cielo gris, una manta y ningún plan. Películas cálidas, divertidas y un poco agridulces que combinan con la lluvia en la ventana: fáciles de disfrutar y difíciles de apagar.']
  },
  'feel-good-movies': {
    uk: ['Фільми для гарного настрою', 'Добрі, світлі фільми, після яких стає легше на душі. Без важких поворотів і похмурих фіналів — просто приємна компанія на пару годин.'],
    ru: ['Фильмы для хорошего настроения', 'Добрые, светлые фильмы, после которых становится легче на душе. Без тяжёлых поворотов и мрачных финалов — просто приятная компания на пару часов.'],
    fr: ['Films feel-good', 'Des films pleins d’espoir et de chaleur qui vous laissent plus léger qu’avant. Pas de rebondissements pesants ni de fins sombres : juste une bonne compagnie pour quelques heures.'],
    es: ['Películas para levantar el ánimo', 'Películas optimistas y entrañables que te dejan más ligero de lo que estabas. Sin giros pesados ni finales tristes: solo buena compañía para un par de horas.']
  },
  'movies-to-cry-to': {
    uk: ['Фільми, щоб поплакати', 'Іноді треба як слід виплакатися. Ці історії кохання та драми чесно заслуговують на кожну сльозу — тримайте серветки поруч.'],
    ru: ['Фильмы, чтобы поплакать', 'Иногда нужно как следует выплакаться. Эти истории любви и драмы честно заслуживают каждой слезы — держите салфетки под рукой.'],
    fr: ['Films pour pleurer', 'Parfois, on a besoin d’une bonne crise de larmes. Ces histoires d’amour et ces drames les méritent honnêtement : gardez les mouchoirs à portée de main.'],
    es: ['Películas para llorar', 'A veces hace falta llorar a gusto. Estas historias de amor y dramas se ganan cada lágrima con honestidad: ten los pañuelos a mano.']
  },
  'date-night-movies': {
    uk: ['Фільми для побачення', 'Історії кохання, які сподобаються вам обом: справжня хімія, трохи сміху й кілька зітхань. Перевірені улюблені фільми, а не випадкові новинки.'],
    ru: ['Фильмы для свидания', 'Истории любви, которые понравятся вам обоим: настоящая химия, немного смеха и пара вздохов. Проверенные любимые фильмы, а не случайные новинки.'],
    fr: ['Films pour une soirée en amoureux', 'Des histoires d’amour qui plairont à tous les deux : une vraie alchimie, quelques rires et quelques soupirs. Des valeurs sûres, pas des nouveautés au hasard.'],
    es: ['Películas para una cita', 'Historias de amor que os gustarán a los dos: química de verdad, algunas risas y algún suspiro. Favoritas de siempre, no estrenos al azar.']
  },
  'cozy-movies': {
    uk: ['Затишні фільми', 'Ніжні, смішні й рідні фільми, наче тепла кімната взимку. Без насильства й різких лякалок — ідеально з чаєм і чимось солодким.'],
    ru: ['Уютные фильмы', 'Нежные, смешные и родные фильмы, как тёплая комната зимой. Без насилия и внезапных пугалок — идеально с чаем и чем-нибудь сладким.'],
    fr: ['Films cocooning', 'Des films doux, drôles et familiers, comme une pièce bien chaude en hiver. Pas de violence ni de sursauts : parfaits avec un thé et une douceur.'],
    es: ['Películas acogedoras', 'Películas tiernas, divertidas y familiares, como una habitación caldeada en invierno. Sin violencia ni sustos: perfectas con un té y algo dulce.']
  },
  'mind-bending-movies': {
    uk: ['Фільми, що ламають мозок', 'Головоломки, які грають із часом, пам’яттю та реальністю. Про фінал захочеться поговорити — або одразу переглянути.'],
    ru: ['Фильмы, которые взрывают мозг', 'Головоломки, которые играют со временем, памятью и реальностью. О финале захочется поговорить — или сразу пересмотреть.'],
    fr: ['Films qui retournent le cerveau', 'Des casse-tête qui jouent avec le temps, la mémoire et la réalité. Vous voudrez parler de la fin, ou revoir le film tout de suite.'],
    es: ['Películas que te vuelan la cabeza', 'Rompecabezas que juegan con el tiempo, la memoria y la realidad. Querrás hablar del final, o volver a verla enseguida.']
  },
  'plot-twist-movies': {
    uk: ['Фільми з несподіваним фіналом', 'Трилери, де ніщо не є тим, чим здається. Дивіться, знаючи якомога менше, і не дозволяйте нікому зіпсувати фінал спойлером.'],
    ru: ['Фильмы с неожиданной концовкой', 'Триллеры, где ничто не то, чем кажется. Смотрите, зная как можно меньше, и не позволяйте никому проспойлерить финал.'],
    fr: ['Films avec un twist final', 'Des thrillers où rien n’est vraiment ce qu’il paraît. Lancez-vous en en sachant le moins possible et ne laissez personne vous gâcher le dernier acte.'],
    es: ['Películas con giro final', 'Thrillers donde nada es lo que parece. Entra sabiendo lo menos posible y no dejes que nadie te destripe el último acto.']
  },
  'halloween-movies': {
    uk: ['Фільми на Хелловін', 'Будинки з привидами, незнайомці в масках і та єдина ніч на рік, коли все це доречно. Жахи для темного жовтневого вечора.'],
    ru: ['Фильмы на Хэллоуин', 'Дома с привидениями, незнакомцы в масках и та единственная ночь в году, когда всё это к месту. Ужасы для тёмного октябрьского вечера.'],
    fr: ['Films d’Halloween', 'Maisons hantées, inconnus masqués et la seule nuit de l’année où tout cela a du sens. Des films d’horreur pour une sombre soirée d’octobre.'],
    es: ['Películas de Halloween', 'Casas encantadas, desconocidos con máscara y la única noche del año en que todo encaja. Terror para una oscura noche de octubre.']
  },
  'family-movie-night': {
    uk: ['Фільми для сімейного вечора', 'Анімаційні фільми для будь-якого віку на дивані: яскраві для дітей і достатньо розумні, щоб дорослі не заснули.'],
    ru: ['Фильмы для семейного вечера', 'Анимационные фильмы для любого возраста на диване: яркие для детей и достаточно умные, чтобы взрослые не заснули.'],
    fr: ['Films pour une soirée en famille', 'Des films d’animation pour tous les âges sur le canapé : assez colorés pour les enfants, assez malins pour que les adultes restent éveillés.'],
    es: ['Películas para ver en familia', 'Películas de animación para todas las edades del sofá: vistosas para los niños y lo bastante listas para que los adultos no se duerman.']
  },
  'motivational-movies': {
    uk: ['Мотивуючі фільми', 'Аутсайдери, повернення і люди, які відмовилися здаватися. Увімкніть, коли потрібен поштовх, щоб почати щось складне.'],
    ru: ['Мотивирующие фильмы', 'Аутсайдеры, возвращения и люди, которые отказались сдаваться. Включите, когда нужен толчок, чтобы начать что-то трудное.'],
    fr: ['Films motivants', 'Des outsiders, des retours en force et des gens qui ont refusé d’abandonner. À regarder quand il vous faut un coup de pouce pour vous lancer.'],
    es: ['Películas motivadoras', 'Desvalidos, remontadas y gente que se negó a rendirse. Pon una cuando necesites un empujón para empezar algo difícil.']
  },
  'christmas-movies': {
    uk: ['Різдвяні фільми', 'Сніг, вогники й другий шанс. Улюблені святкові фільми, старі й нові, для тижнів, коли вдома стоїть ялинка.'],
    ru: ['Рождественские фильмы', 'Снег, огоньки и второй шанс. Любимые праздничные фильмы, старые и новые, для недель, когда дома стоит ёлка.'],
    fr: ['Films de Noël', 'De la neige, des guirlandes et des secondes chances. Les classiques des fêtes, anciens et récents, pour les semaines où le sapin est installé.'],
    es: ['Películas de Navidad', 'Nieve, luces y segundas oportunidades. Clásicos navideños antiguos y recientes para las semanas en que el árbol está puesto.']
  },
  'movies-to-watch-with-friends': {
    uk: ['Фільми для перегляду з друзями', 'Гучні, динамічні й смішні бойовики-комедії, які не зіпсуєш розмовами під час перегляду. Створені для піци та повного дивана.'],
    ru: ['Фильмы для просмотра с друзьями', 'Громкие, динамичные и смешные боевики-комедии, которые не испортишь разговорами во время просмотра. Созданы для пиццы и полного дивана.'],
    fr: ['Films à regarder entre amis', 'Des comédies d’action bruyantes, rapides et drôles qui résistent aux bavardages. Faites pour une pizza et un canapé plein.'],
    es: ['Películas para ver con amigos', 'Comedias de acción ruidosas, rápidas y divertidas que aguantan que todo el mundo hable encima. Hechas para pizza y un sofá lleno.']
  },
  'late-night-thrillers': {
    uk: ['Трилери на ніч', 'Кримінальні трилери для тих годин, коли вдома тихо, а спати ще не хочеться. Напружені, темні й найкращі з вимкненим світлом.'],
    ru: ['Триллеры на ночь', 'Криминальные триллеры для часов, когда дома тихо, а спать ещё не хочется. Напряжённые, мрачные и лучше всего с выключенным светом.'],
    fr: ['Thrillers pour la nuit', 'Des thrillers policiers pour quand la maison est silencieuse et que vous n’avez pas encore sommeil. Tendus, sombres, à regarder lumières éteintes.'],
    es: ['Thrillers para la noche', 'Thrillers criminales para cuando la casa está en silencio y aún no tienes sueño. Tensos, oscuros y mejor con la luz apagada.']
  },
  'true-story-movies': {
    uk: ['Фільми, засновані на реальних подіях', 'Справжні люди, справжні події і дивне відчуття, коли потім шукаєш усе в інтернеті. Драми, взяті з життя.'],
    ru: ['Фильмы, основанные на реальных событиях', 'Настоящие люди, настоящие события и странное чувство, когда потом ищешь всё в интернете. Драмы, взятые из жизни.'],
    fr: ['Films tirés d’une histoire vraie', 'De vraies personnes, de vrais événements et cette drôle d’envie de tout vérifier après coup. Des drames inspirés de la vie.'],
    es: ['Películas basadas en hechos reales', 'Personas reales, hechos reales y esa extraña sensación de buscarlo todo después. Dramas sacados de la vida.']
  },
  'heist-movies': {
    uk: ['Фільми про пограбування', 'Команда, план і мить, коли все йде не так. Хитромудрі афери й пограбування банків, де половина задоволення — дивитися, як усе складається докупи.'],
    ru: ['Фильмы про ограбления', 'Команда, план и момент, когда всё идёт не так. Хитроумные аферы и ограбления банков, где половина удовольствия — смотреть, как всё складывается.'],
    fr: ['Films de braquage', 'Une équipe, un plan et le moment où tout dérape. Des casses ingénieux où le plaisir est de voir chaque pièce s’emboîter.'],
    es: ['Películas de atracos', 'Una banda, un plan y el momento en que todo se tuerce. Golpes ingeniosos donde la mitad de la gracia es ver cómo encajan las piezas.']
  },
  'time-travel-movies': {
    uk: ['Фільми про подорожі в часі', 'Петлі, парадокси й друга спроба змінити минуле. Від легких пригод до історій, що зав’язують мозок у вузол.'],
    ru: ['Фильмы про путешествия во времени', 'Петли, парадоксы и вторая попытка изменить прошлое. От лёгких приключений до историй, которые завязывают мозг в узел.'],
    fr: ['Films de voyage dans le temps', 'Boucles, paradoxes et secondes chances dans le passé. Des aventures légères aux histoires qui vous font des nœuds au cerveau.'],
    es: ['Películas de viajes en el tiempo', 'Bucles, paradojas y segundas oportunidades en el pasado. Desde aventuras ligeras hasta historias que te hacen un nudo en la cabeza.']
  },
  'coming-of-age-movies': {
    uk: ['Фільми про дорослішання', 'Перше кохання, останнє літо і рік, коли все змінилося. Фільми про дорослішання, які зачіпають навіть тих, хто вже давно дорослий.'],
    ru: ['Фильмы о взрослении', 'Первая любовь, последнее лето и год, когда всё изменилось. Фильмы о взрослении, которые трогают даже тех, кто давно вырос.'],
    fr: ['Films sur le passage à l’âge adulte', 'Premiers amours, derniers étés et l’année où tout a changé. Des films sur le fait de grandir qui touchent même quand on a déjà grandi.'],
    es: ['Películas sobre crecer', 'Primeros amores, últimos veranos y el año en que todo cambió. Películas sobre hacerse mayor que siguen llegando aunque ya lo seas.']
  },
  'road-trip-movies': {
    uk: ['Роуд-муві: фільми про подорожі', 'Відкрита дорога, погані мотелі й попутники, які поступово стають друзями. Для тих вечорів, коли хочеться втекти, не встаючи з дивана.'],
    ru: ['Роуд-муви: фильмы о путешествиях', 'Открытая дорога, плохие мотели и попутчики, которые постепенно становятся друзьями. Для вечеров, когда хочется сбежать, не вставая с дивана.'],
    fr: ['Road movies', 'Des routes à perte de vue, des motels douteux et des compagnons de voyage qui deviennent peu à peu des amis. Pour partir sans quitter le canapé.'],
    es: ['Road movies: películas de carretera', 'Carreteras abiertas, moteles de mala muerte y compañeros de viaje que poco a poco se vuelven amigos. Para escaparte sin salir del sofá.']
  },
  'space-movies': {
    uk: ['Фільми про космос', 'Тиша, відстані й зовсім маленькі люди. Наукова фантастика серед зірок: від напружених історій виживання до масштабних видовищ.'],
    ru: ['Фильмы про космос', 'Тишина, расстояния и совсем маленькие люди. Научная фантастика среди звёзд: от напряжённых историй выживания до масштабных зрелищ.'],
    fr: ['Films sur l’espace', 'Le silence, la distance et des humains minuscules. De la science-fiction parmi les étoiles, des récits de survie haletants aux grands spectacles.'],
    es: ['Películas del espacio', 'Silencio, distancia y humanos muy pequeños. Ciencia ficción entre las estrellas, desde tensas historias de supervivencia hasta grandes espectáculos.']
  },
  'dystopian-movies': {
    uk: ['Антиутопії: найкращі фільми', 'Майбутнє, яке пішло не так, і люди, що чинять опір. Похмурі й стильні світи, які говорять більше про сьогодення, ніж про завтра.'],
    ru: ['Антиутопии: лучшие фильмы', 'Будущее, которое пошло не так, и люди, которые сопротивляются. Мрачные и стильные миры, которые говорят больше о сегодняшнем дне, чем о завтрашнем.'],
    fr: ['Films dystopiques', 'Des futurs qui ont mal tourné et ceux qui résistent. Des mondes sombres et stylés qui en disent plus sur aujourd’hui que sur demain.'],
    es: ['Películas distópicas', 'Futuros que salieron mal y la gente que se rebela. Mundos oscuros y con estilo que hablan más del presente que del mañana.']
  },
  'high-school-movies': {
    uk: ['Фільми про школу', 'Шафки, шкільні компанії й катастрофи на випускному. Підліткові комедії, які легко цитувати й ще легше переглядати.'],
    ru: ['Фильмы про школу', 'Шкафчики, школьные компании и катастрофы на выпускном. Подростковые комедии, которые легко цитировать и ещё легче пересматривать.'],
    fr: ['Films de lycée', 'Casiers, bandes rivales et bals de promo catastrophiques. Des comédies ados faciles à citer et encore plus à revoir.'],
    es: ['Películas de instituto', 'Taquillas, grupitos y bailes de graduación desastrosos. Comedias adolescentes fáciles de citar y aún más fáciles de volver a ver.']
  },
  'serial-killer-thrillers': {
    uk: ['Трилери про маніяків', 'Детективи, одержимість і розслідування, що поволі затягує петлю. Похмурі психологічні трилери для глядачів із міцними нервами.'],
    ru: ['Триллеры про маньяков', 'Детективы, одержимость и расследование, которое медленно затягивает петлю. Мрачные психологические триллеры для зрителей с крепкими нервами.'],
    fr: ['Thrillers de tueurs en série', 'Des enquêteurs, l’obsession et une enquête qui se resserre lentement. Des thrillers psychologiques sombres pour les spectateurs aux nerfs solides.'],
    es: ['Thrillers de asesinos en serie', 'Detectives, obsesión y un caso que se cierra poco a poco. Thrillers psicológicos oscuros para espectadores con nervios de acero.']
  },
  'best-90s-movies': {
    uk: ['Найкращі фільми 90-х', 'Десятиліття відеопрокатів і аншлагів у п’ятницю ввечері. Найвище оцінені фільми 1990-х, які й досі не застаріли.'],
    ru: ['Лучшие фильмы 90-х', 'Десятилетие видеопрокатов и аншлагов в пятницу вечером. Самые высоко оценённые фильмы 1990-х, которые до сих пор не устарели.'],
    fr: ['Meilleurs films des années 90', 'La décennie des vidéoclubs et des vendredis soir à guichets fermés. Les films les mieux notés des années 1990, qui n’ont pas pris une ride.'],
    es: ['Mejores películas de los 90', 'La década de los videoclubes y los viernes con las salas llenas. Las películas mejor valoradas de los años 90, que siguen aguantando.']
  },
  'best-80s-movies': {
    uk: ['Найкращі фільми 80-х', 'Синтезатори, практичні ефекти й герої з крилатими фразами. Найулюбленіші фільми 1980-х для по-справжньому ностальгійного вечора.'],
    ru: ['Лучшие фильмы 80-х', 'Синтезаторы, практические эффекты и герои с крылатыми фразами. Самые любимые фильмы 1980-х для по-настоящему ностальгического вечера.'],
    fr: ['Meilleurs films des années 80', 'Des synthés, des effets spéciaux à l’ancienne et des héros aux répliques cultes. Les films préférés des années 1980 pour une vraie soirée nostalgie.'],
    es: ['Mejores películas de los 80', 'Sintetizadores, efectos artesanales y héroes con frases míticas. Las películas más queridas de los años 80 para una noche de pura nostalgia.']
  }
};

const TEXT = {
  moods: { en: 'Moods', uk: 'Настрої', ru: 'Настроения', fr: 'Humeurs', es: 'Ánimos' },
  trailers: { en: 'Trailers', uk: 'Трейлери', ru: 'Трейлеры', fr: 'Bandes-annonces', es: 'Tráilers' },
  favorites: { en: 'Favorites', uk: 'Обране', ru: 'Избранное', fr: 'Favoris', es: 'Favoritos' },
  footer: {
    en: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    uk: 'Цей продукт використовує TMDB API, але не схвалений і не сертифікований TMDB.',
    ru: 'Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.',
    fr: 'Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB.',
    es: 'Este producto utiliza la API de TMDB, pero no está respaldado ni certificado por TMDB.'
  },
  poster: { en: 'poster', uk: 'постер', ru: 'постер', fr: 'affiche', es: 'póster' },

  mood_page_title: {
    en: '{title}: {n} Picks to Watch Tonight',
    uk: '{title}: {n} фільмів на вечір',
    ru: '{title}: {n} фильмов на вечер',
    fr: '{title} : {n} films à voir ce soir',
    es: '{title}: {n} películas para esta noche'
  },
  not_your_mood: { en: 'Not quite your mood?', uk: 'Не зовсім ваш настрій?', ru: 'Не совсем ваше настроение?', fr: 'Pas tout à fait votre humeur ?', es: '¿No es justo tu estado de ánimo?' },
  find_more: { en: 'Find more like this', uk: 'Знайти ще схожі', ru: 'Найти ещё похожие', fr: 'Trouver d’autres films de ce genre', es: 'Encontrar más como estas' },
  own_mood: { en: 'Describe your own mood', uk: 'Опишіть свій настрій', ru: 'Опишите своё настроение', fr: 'Décrivez votre humeur', es: 'Describe tu estado de ánimo' },
  more_moods: { en: 'More moods', uk: 'Інші настрої', ru: 'Другие настроения', fr: 'Autres humeurs', es: 'Más estados de ánimo' },
  browse_by_mood: { en: 'Browse by mood', uk: 'Фільми за настроєм', ru: 'Фильмы по настроению', fr: 'Films par humeur', es: 'Películas por estado de ánimo' },

  index_title: {
    en: 'Movies by Mood: Find What to Watch Tonight',
    uk: 'Фільми за настроєм: що подивитися сьогодні',
    ru: 'Фильмы по настроению: что посмотреть сегодня',
    fr: 'Films selon votre humeur : que regarder ce soir',
    es: 'Películas según tu estado de ánimo: qué ver esta noche'
  },
  index_desc: {
    en: 'Pick a mood — cozy, sad, mind-bending, date night — and get a hand-tuned list of films that fit it.',
    uk: 'Оберіть настрій — затишний, сумний, із закрученим сюжетом, для побачення — і отримайте добірку фільмів, що йому пасують.',
    ru: 'Выберите настроение — уютное, грустное, с закрученным сюжетом, для свидания — и получите подборку фильмов под него.',
    fr: 'Choisissez une humeur — cocooning, triste, à retourner le cerveau, en amoureux — et obtenez une sélection de films qui lui correspond.',
    es: 'Elige un estado de ánimo — acogedor, triste, para volarte la cabeza, para una cita — y obtén una selección de películas que encaje.'
  },
  index_h1: { en: 'Movies by', uk: 'Фільми за', ru: 'Фильмы по', fr: 'Films selon votre', es: 'Películas según tu' },
  index_h1_accent: { en: 'Mood', uk: 'настроєм', ru: 'настроению', fr: 'humeur', es: 'ánimo' },
  index_intro: {
    en: 'Pick how you feel and get a list of films that fit. Or describe your own mood on the {link}.',
    uk: 'Оберіть, що відчуваєте, і отримайте список фільмів під настрій. Або опишіть свій настрій на {link}.',
    ru: 'Выберите, что чувствуете, и получите список фильмов под настроение. Или опишите своё настроение на {link}.',
    fr: 'Choisissez ce que vous ressentez et obtenez une liste de films adaptés. Ou décrivez votre propre humeur sur la {link}.',
    es: 'Elige cómo te sientes y obtén una lista de películas a juego. O describe tu propio estado de ánimo en la {link}.'
  },
  home_link: { en: 'home page', uk: 'головній сторінці', ru: 'главной странице', fr: 'page d’accueil', es: 'página principal' },

  not_found_title: { en: 'Page not found', uk: 'Сторінку не знайдено', ru: 'Страница не найдена', fr: 'Page introuvable', es: 'Página no encontrada' },
  not_found_desc: {
    en: 'This page does not exist. Browse movies by mood instead.',
    uk: 'Такої сторінки немає. Перегляньте фільми за настроєм.',
    ru: 'Такой страницы нет. Посмотрите фильмы по настроению.',
    fr: 'Cette page n’existe pas. Découvrez plutôt des films selon votre humeur.',
    es: 'Esta página no existe. Explora películas según tu estado de ánimo.'
  },
  not_found_h1: { en: 'Nothing', uk: 'Тут', ru: 'Здесь', fr: 'Rien', es: 'Aquí no hay' },
  not_found_h1_accent: { en: 'here', uk: 'порожньо', ru: 'пусто', fr: 'ici', es: 'nada' },
  not_found_intro: {
    en: 'That page does not exist. Try one of these moods instead.',
    uk: 'Такої сторінки не існує. Спробуйте один із цих настроїв.',
    ru: 'Такой страницы не существует. Попробуйте одно из этих настроений.',
    fr: 'Cette page n’existe pas. Essayez plutôt l’une de ces humeurs.',
    es: 'Esa página no existe. Prueba uno de estos estados de ánimo.'
  },

  // {name} already carries the year: "The Terminator (1984)"
  title_page_title: {
    en: '{name}: Where to Watch',
    uk: '{name}: де дивитися онлайн',
    ru: '{name}: где смотреть онлайн',
    fr: '{name} : où regarder en streaming',
    es: '{name}: dónde ver online'
  },
  title_page_desc: {
    en: 'Where to watch {name}, trailer, cast and similar titles.',
    uk: 'Де дивитися {name} онлайн: трейлер, актори та схожі фільми.',
    ru: 'Где смотреть {name} онлайн: трейлер, актёры и похожие фильмы.',
    fr: 'Où regarder {name} en streaming : bande-annonce, casting et titres similaires.',
    es: 'Dónde ver {name} online: tráiler, reparto y títulos similares.'
  },
  person_page_title: {
    en: '{name}: Movies and TV Shows to Watch',
    uk: '{name}: фільми та серіали',
    ru: '{name}: фильмы и сериалы',
    fr: '{name} : films et séries',
    es: '{name}: películas y series'
  },
  person_page_desc: {
    en: '{name} movies and TV shows: {known} and more. Where to watch, trailers and similar films.',
    uk: '{name}: фільми та серіали — {known} та інші. Де дивитися, трейлери й схожі фільми.',
    ru: '{name}: фильмы и сериалы — {known} и другие. Где смотреть, трейлеры и похожие фильмы.',
    fr: 'Films et séries avec {name} : {known} et plus encore. Où les regarder, bandes-annonces et films similaires.',
    es: 'Películas y series de {name}: {known} y más. Dónde verlas, tráilers y películas similares.'
  },
  person_page_desc_short: {
    en: '{name}: movies and TV shows, where to watch them and similar films.',
    uk: '{name}: фільми та серіали, де їх дивитися і схожі фільми.',
    ru: '{name}: фильмы и сериалы, где их смотреть и похожие фильмы.',
    fr: '{name} : films et séries, où les regarder et films similaires.',
    es: '{name}: películas y series, dónde verlas y películas similares.'
  },

  // Same as home.page_title in i18n.js, which sets the title again in the browser
  home_title: {
    en: 'MovieMood: Find a Movie for Your Mood',
    uk: 'MovieMood: фільм під ваш настрій',
    ru: 'MovieMood: фильм под ваше настроение',
    fr: 'MovieMood : un film selon votre humeur',
    es: 'MovieMood: una película para tu estado de ánimo'
  },
  home_desc: {
    en: 'Describe how you feel in any words and get well-loved movies and series to match: trailers, where to watch them and mood collections for every evening.',
    uk: 'Опишіть настрій будь-якими словами й отримайте улюблені глядачами фільми та серіали: трейлери, де дивитися і добірки на кожен вечір.',
    ru: 'Опишите настроение любыми словами и получите любимые зрителями фильмы и сериалы: трейлеры, где смотреть и подборки на каждый вечер.',
    fr: 'Décrivez votre humeur avec vos propres mots et obtenez des films et séries appréciés : bandes-annonces, où les regarder et sélections pour chaque soirée.',
    es: 'Describe cómo te sientes con tus palabras y obtén películas y series muy valoradas: tráilers, dónde verlas y selecciones para cada noche.'
  },
  // home.title, home.title_accent and home.subtitle in i18n.js
  home_h1: { en: 'WHAT’S YOUR', uk: 'ЯКИЙ У ВАС', ru: 'КАКОЕ У ВАС', fr: 'QUELLE EST VOTRE', es: '¿CÓMO TE' },
  home_h1_accent: { en: 'MOOD?', uk: 'НАСТРІЙ?', ru: 'НАСТРОЕНИЕ?', fr: 'HUMEUR ?', es: 'SIENTES?' },
  home_subtitle: {
    en: 'Tell us how you feel - we’ll find the perfect film.',
    uk: 'Розкажіть, що на душі, — ми підберемо фільм.',
    ru: 'Расскажите, что на душе, — мы подберём фильм.',
    fr: 'Dites-nous comment vous vous sentez, nous trouvons le film.',
    es: 'Cuéntanos cómo te sientes y encontramos la película.'
  },
  // labels of the mood buttons under the search (quick.* in i18n.js)
  quick: {
    rainy: { en: 'Rainy day', uk: 'Дощовий день', ru: 'Дождливый день', fr: 'Jour de pluie', es: 'Día de lluvia' },
    cozy: { en: 'Cozy', uk: 'Затишні', ru: 'Уютные', fr: 'Cocooning', es: 'Acogedoras' },
    feel_good: { en: 'Feel-good', uk: 'Гарний настрій', ru: 'Хорошее настроение', fr: 'Feel-good', es: 'Para animarse' },
    cry: { en: 'To cry to', uk: 'Поплакати', ru: 'Поплакать', fr: 'Pour pleurer', es: 'Para llorar' },
    date: { en: 'Date night', uk: 'Побачення', ru: 'Свидание', fr: 'En amoureux', es: 'Para una cita' },
    mind: { en: 'Mind-bending', uk: 'Ламають мозок', ru: 'Взрыв мозга', fr: 'Casse-tête', es: 'Para pensar' },
    family: { en: 'Family', uk: 'Для сім’ї', ru: 'Для семьи', fr: 'En famille', es: 'En familia' },
    nineties: { en: '90s', uk: '90-ті', ru: '90-е', fr: 'Années 90', es: 'Años 90' },
    all: { en: 'All moods', uk: 'Усі настрої', ru: 'Все настроения', fr: 'Toutes les humeurs', es: 'Todos los ánimos' }
  }
};

const tr = (lang, key, vars) => {
  let text = TEXT[key][lang] ?? TEXT[key].en;
  for (const [name, value] of Object.entries(vars || {})) text = text.replace(`{${name}}`, value);
  return text;
};

const moodTitle = (mood, lang) => MOOD_TEXT[mood.slug]?.[lang]?.[0] || mood.title;
const moodIntro = (mood, lang) => MOOD_TEXT[mood.slug]?.[lang]?.[1] || mood.intro;

// "/moods" → "/uk/moods", "/" → "/uk"
const langPath = (lang, path) => lang === 'en' ? path : `/${lang}${path === '/' ? '' : path}`;

// The same page in every language, for search engines (hreflang)
const alternates = (origin, path) => [
  ...LANGS.map(code => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(origin + langPath(code, path))}">`),
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

// Titles in the page's language; addresses still need the English ones, fetched alongside
async function fetchMoodMovies(mood, lang = 'en') {
  const [local, english] = await Promise.all([
    fetchJson(buildDiscoverUrl(mood, TMDB_LOCALES[lang])),
    lang === 'en' ? null : fetchJson(buildDiscoverUrl(mood)).catch(() => null)
  ]);
  const englishTitles = new Map((english?.results || []).map(m => [m.id, m.title]));
  return (local.results || [])
    .filter(m => m.poster_path)
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
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <!-- Vercel Web Analytics -->
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <meta name="theme-color" content="#0d0d14">
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
  <script src="/nav.js?v=${ASSET_VERSION}"></script>
</body>
</html>`;
}

const moodChips = (lang, exceptSlug = '') => `<div class="mood-chips">
      ${MOODS.filter(m => m.slug !== exceptSlug).map(m => `<a class="mood-chip" href="${langPath(lang, `/moods/${m.slug}`)}">${m.emoji} ${escapeHtml(moodTitle(m, lang))}</a>`).join('\n      ')}
    </div>`;

function movieCard(movie, lang) {
  const title = movie.title || movie.name;
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  return `<a class="movie-card" href="${langPath(lang, titlePath(movie))}">
        <div class="card-poster-wrapper">
          <img src="${TMDB_IMAGE_BASE_URL}${movie.poster_path}" class="movie-poster" loading="lazy" alt="${escapeHtml(title)}${year ? ` (${year})` : ''} ${tr(lang, 'poster')}">
          ${rating ? `<span class="tmdb-mini-score card-score">${rating}</span>` : ''}
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(title)}</h3>
          <span class="card-year">${year}</span>
        </div>
      </a>`;
}

function renderMoodPage(mood, movies, origin, lang) {
  const name = moodTitle(mood, lang);
  const intro = moodIntro(mood, lang);
  const path = `/moods/${mood.slug}`;
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
    title: `${tr(lang, 'mood_page_title', { title: name, n: movies.length })} | MovieMood`,
    description: truncate(intro, 155),
    image: movies[0]?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movies[0].backdrop_path}` : '',
    head: jsonLd(itemList) + jsonLd(breadcrumbs(origin, [[tr(lang, 'moods'), langPath(lang, '/moods')], [name, langPath(lang, path)]], lang)),
    hero: `<h1 class="home-title mood-title">${escapeHtml(name)}</h1>
    <p class="home-subtitle mood-intro">${escapeHtml(intro)}</p>`,
    main: `<section class="results-section">
      <div class="movies-grid">
      ${movies.map(m => movieCard(m, lang)).join('\n      ')}
      </div>
    </section>

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
      ${MOODS.map(m => `<a class="mood-tile" href="${langPath(lang, `/moods/${m.slug}`)}">
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
    .replace(/<span data-i18n="quick\.(\w+)">[^<]*<\/span>/g, (all, key) => `<span data-i18n="quick.${key}">${escapeHtml(TEXT.quick[key]?.[lang] ?? '')}</span>`)
    .replace(/href="\/moods(\/[^"]*)?"/g, (all, rest = '') => `href="${langPath(lang, `/moods${rest}`)}"`);
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
    fetchJson(detailsUrl(TMDB_LOCALES[lang])),
    // the address is built from the English title in every language
    lang === 'en' ? null : fetchJson(detailsUrl('en-US'))
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
  const pageTitle = `${tr(lang, 'title_page_title', { name: nameWithYear })} | MovieMood`;
  const description = truncate(details.overview || tr(lang, 'title_page_desc', { name }), 155);
  const poster = details.poster_path ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}` : '';

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

  const head = `<title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${alternates(origin, basePath)}
  <meta property="og:type" content="${type === 'tv' ? 'video.tv_show' : 'video.movie'}">
  <meta property="og:site_name" content="MovieMood">
  ${ogLocales(lang)}
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${details.backdrop_path ? `<meta property="og:image" content="https://image.tmdb.org/t/p/w1280${details.backdrop_path}">\n  <meta name="twitter:card" content="summary_large_image">` : ''}
  ${jsonLd(schema)}
  ${jsonLd(breadcrumbs(origin, [[name, ownPath]], lang))}`;

  const moodsSection = `<section class="mood-more movie-moods">
    <h2 class="mood-section-title">${escapeHtml(tr(lang, 'browse_by_mood'))}</h2>
    ${moodChips(lang)}
  </section>

  `;

  // Function replacements: titles and overviews may contain "$", which String.replace would interpret
  return template
    .replace(/<html lang="[^"]*"/, () => `<html lang="${lang}"`)
    .replace('<head>', () => '<head>\n  <base href="/">')
    // the template is kept out of the index; this address is the indexable one
    .replace('<meta name="robots" content="noindex, follow">', '')
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('id="movieTitle"></h1>', () => `id="movieTitle">${escapeHtml(name)}</h1>`)
    .replace('id="movieOverview"></p>', () => `id="movieOverview">${escapeHtml(details.overview)}</p>`)
    .replace('id="moviePoster" src="" alt="Movie Poster"', () => `id="moviePoster" src="${escapeHtml(poster)}" alt="${escapeHtml(name)} ${tr(lang, 'poster')}"`)
    .replace('<div class="trailer-modal"', () => `${moodsSection}<div class="trailer-modal"`)
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
    fetchJson(personUrl(TMDB_LOCALES[lang])),
    // TMDB translates names too (Киану Ривз); the address keeps the Latin one in every language
    lang === 'en' ? null : fetchJson(personUrl('en-US')),
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
  const known = [...(credits.cast || []), ...(credits.crew || [])]
    .filter(item => !(item.genre_ids || []).some(g => [10767, 10763, 10764].includes(g)) && !/^(self|himself|herself)\b/i.test(item.character || ''))
    .filter((item, i, all) => (item.title || item.name) && all.findIndex(x => x.id === item.id) === i)
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 3)
    .map(item => item.title || item.name);
  const pageTitle = `${tr(lang, 'person_page_title', { name })} | MovieMood`;
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
  ${alternates(origin, basePath)}
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
    .replace('<head>', () => '<head>\n  <base href="/">')
    // the template is kept out of the index; this address is the indexable one
    .replace('<meta name="robots" content="noindex, follow">', '')
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('id="personName"></h1>', () => `id="personName">${escapeHtml(name)}</h1>`)
    .replace('id="personBio"></p>', () => `id="personBio">${escapeHtml(person.biography || '')}</p>`)
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

// Every page in every language; the pages themselves point to their other-language versions
async function renderSitemap(origin) {
  const moodMovies = await Promise.all(MOODS.map(mood => fetchMoodMovies(mood).catch(() => [])));
  const moviePaths = [...new Set(moodMovies.flat().map(m => titlePath(m)))];
  const paths = ['/', '/moods', ...MOODS.map(m => `/moods/${m.slug}`), ...moviePaths];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LANGS.flatMap(lang => paths.map(path => `  <url><loc>${escapeHtml(origin + langPath(lang, path))}</loc></url>`)).join('\n')}
</urlset>`;
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
    if (kind === 'robots') {
      return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, { type: 'text/plain; charset=utf-8' });
    }

    if (kind === 'sitemap') {
      return send(res, 200, await renderSitemap(origin), { type: 'application/xml; charset=utf-8' });
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
