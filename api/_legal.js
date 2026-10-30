// Texts of /about, /contact and /privacy in the six languages of the site (shown by api/page.js).
// {email} becomes a link to the contact address. Privacy: change PRIVACY_UPDATED with the text.
export const CONTACT_EMAIL = 'hello@themoviemood.com';
export const PRIVACY_UPDATED = '2026-10-30';

export const LEGAL = {
  en: {
    links: { about: 'About', contact: 'Contact', privacy: 'Privacy' },
    about: {
      title: 'About MovieMood',
      description: 'MovieMood finds movies and series for your mood, with trailers and where to watch them. Free, no sign-up.',
      paragraphs: [
        'MovieMood helps you choose what to watch for your mood. Describe it in your own words, such as “rainy Sunday” or “something light after work”, and the site suggests well-loved movies and series. Each one has a trailer and a list of the services where you can watch it in your country.',
        'The site is free and needs no sign-up.',
        'Movie and series data comes from TMDB, and information on where to watch comes from JustWatch through TMDB.',
        'The MovieMood team'
      ]
    },
    contact: {
      title: 'Contact MovieMood',
      description: 'Found a mistake, have an idea or want to work together? Write to the MovieMood team.',
      paragraphs: ['Found a mistake, have an idea or want to work together? Write to us: {email}']
    },
    privacy: {
      title: 'Privacy',
      description: 'What MovieMood stores, what it sends to other services, and how to reach us about your data.',
      updated: 'Updated',
      intro: 'In short: the site has no sign-up, and we keep no personal visitor profiles on it.',
      sections: [
        ['What stays in your browser', 'Your favorites, watched titles, language, country and theme. This data stays on your device. You can delete it by clearing this site’s data in your browser.'],
        ['Mood search', 'Your text goes to our server and may be passed to the AI service Groq to pick titles. It may also stay in the server’s technical logs for a while. Please do not type personal information into the search.'],
        ['Visit statistics', 'We use Cloudflare Web Analytics, which Cloudflare says works without cookies. The site runs through Cloudflare, so Cloudflare processes technical request data such as your IP address.'],
        ['Other services', 'While you browse, your browser contacts other companies, which can see your IP address: TMDB (data and posters), YouTube (trailers; YouTube may use its own cookies), Google Fonts (fonts), and ipapi.co and ipwho.is (a backup way to find your country).'],
        ['Email', 'If you write to us, we receive your address and your message and use them only to reply.'],
        ['Questions and deleting your data', 'Write to {email}']
      ]
    }
  },
  uk: {
    links: { about: 'Про сайт', contact: 'Контакти', privacy: 'Конфіденційність' },
    about: {
      title: 'Про MovieMood',
      description: 'MovieMood підбирає фільми й серіали під настрій, із трейлерами та списком сервісів, де їх дивитися. Безкоштовно і без реєстрації.',
      paragraphs: [
        'MovieMood допомагає вибрати, що подивитися під настрій. Опишіть його своїми словами, наприклад «дощова неділя» або «щось легке після роботи», і сайт підбере улюблені глядачами фільми й серіали. Для кожного є трейлер і список сервісів, де його можна подивитися у вашій країні.',
        'Сайт безкоштовний і працює без реєстрації.',
        'Дані про фільми й серіали надає TMDB, а відомості про те, де їх дивитися, — JustWatch через TMDB.',
        'Команда MovieMood'
      ]
    },
    contact: {
      title: 'Контакти MovieMood',
      description: 'Знайшли помилку, маєте ідею чи хочете співпрацювати? Напишіть команді MovieMood.',
      paragraphs: ['Знайшли помилку, маєте ідею чи хочете співпрацювати? Напишіть нам: {email}']
    },
    privacy: {
      title: 'Конфіденційність',
      description: 'Що зберігає MovieMood, що передає іншим сервісам і як звернутися до нас щодо своїх даних.',
      updated: 'Оновлено',
      intro: 'Коротко: на сайті немає реєстрації, і ми не зберігаємо на ньому особистих профілів відвідувачів.',
      sections: [
        ['Що зберігається у вашому браузері', 'Обране, переглянуті фільми, мова, країна й тема оформлення. Ці дані залишаються на вашому пристрої. Видалити їх можна, очистивши дані сайту в браузері.'],
        ['Пошук за настроєм', 'Ваш текст надсилається на наш сервер і може передаватися сервісу штучного інтелекту Groq, щоб підібрати фільми. Текст також може тимчасово потрапляти до технічних журналів сервера. Не вводьте в пошук особисті дані.'],
        ['Відвідуваність', 'Ми використовуємо Cloudflare Web Analytics, яка, за заявою Cloudflare, працює без файлів cookie. Сайт працює через Cloudflare, тому Cloudflare обробляє технічні дані запитів, наприклад IP-адресу.'],
        ['Сторонні сервіси', 'Під час перегляду сторінок ваш браузер звертається до інших компаній, і вони можуть бачити вашу IP-адресу: TMDB (дані й постери), YouTube (трейлери; YouTube може використовувати власні файли cookie), Google Fonts (шрифти), ipapi.co та ipwho.is (запасний спосіб визначити країну).'],
        ['Листи', 'Якщо ви напишете нам, ми отримаємо вашу адресу й текст листа та використаємо їх лише для відповіді.'],
        ['Запитання й видалення даних', 'Напишіть на {email}']
      ]
    }
  },
  ru: {
    links: { about: 'О сайте', contact: 'Контакты', privacy: 'Конфиденциальность' },
    about: {
      title: 'О MovieMood',
      description: 'MovieMood подбирает фильмы и сериалы под настроение, с трейлерами и списком сервисов, где их смотреть. Бесплатно и без регистрации.',
      paragraphs: [
        'MovieMood помогает выбрать, что посмотреть под настроение. Опишите его своими словами, например «дождливое воскресенье» или «что-то лёгкое после работы», и сайт подберёт любимые зрителями фильмы и сериалы. Для каждого есть трейлер и список сервисов, где его посмотреть в вашей стране.',
        'Сайт бесплатный и работает без регистрации.',
        'Данные о фильмах и сериалах предоставляет TMDB, а сведения о том, где их смотреть, — JustWatch через TMDB.',
        'Команда MovieMood'
      ]
    },
    contact: {
      title: 'Контакты MovieMood',
      description: 'Нашли ошибку, хотите что-то предложить или обсудить сотрудничество? Напишите команде MovieMood.',
      paragraphs: ['Нашли ошибку, хотите что-то предложить или обсудить сотрудничество? Напишите нам: {email}']
    },
    privacy: {
      title: 'Конфиденциальность',
      description: 'Что хранит MovieMood, что передаёт другим сервисам и как связаться с нами по поводу своих данных.',
      updated: 'Обновлено',
      intro: 'Коротко: на сайте нет регистрации, и мы не храним на нём личные профили посетителей.',
      sections: [
        ['Что хранится у вас в браузере', 'Избранное, просмотренные фильмы, язык, страна и тема оформления. Эти данные остаются на вашем устройстве. Удалить их можно, очистив данные сайта в браузере.'],
        ['Поиск по настроению', 'Ваш текст отправляется на наш сервер и может передаваться сервису искусственного интеллекта Groq, чтобы подобрать фильмы. Текст также может на время попадать в технические журналы сервера. Не вводите в поиск личные данные.'],
        ['Посещаемость', 'Мы используем Cloudflare Web Analytics, которая, по заявлению Cloudflare, работает без файлов cookie. Сайт работает через Cloudflare, поэтому Cloudflare обрабатывает технические данные запросов, например IP-адрес.'],
        ['Сторонние сервисы', 'При просмотре страниц ваш браузер обращается к другим компаниям, и они могут видеть ваш IP-адрес: TMDB (данные и постеры), YouTube (трейлеры; YouTube может использовать собственные файлы cookie), Google Fonts (шрифты), ipapi.co и ipwho.is (запасной способ определить страну).'],
        ['Письма', 'Если вы напишете нам, мы получим ваш адрес и текст письма и используем их только для ответа.'],
        ['Вопросы и удаление данных', 'Напишите на {email}']
      ]
    }
  },
  fr: {
    links: { about: 'À propos', contact: 'Contact', privacy: 'Confidentialité' },
    about: {
      title: 'À propos de MovieMood',
      description: 'MovieMood trouve des films et des séries selon votre humeur, avec bandes-annonces et plateformes où les regarder. Gratuit et sans inscription.',
      paragraphs: [
        'MovieMood vous aide à choisir quoi regarder selon votre humeur. Décrivez-la avec vos mots, par exemple « dimanche pluvieux » ou « quelque chose de léger après le travail », et le site vous propose des films et des séries appréciés du public. Chaque titre a une bande-annonce et la liste des plateformes où le regarder dans votre pays.',
        'Le site est gratuit et ne demande aucune inscription.',
        'Les données sur les films et les séries viennent de TMDB, et les informations sur où les regarder viennent de JustWatch via TMDB.',
        'L’équipe MovieMood'
      ]
    },
    contact: {
      title: 'Contacter MovieMood',
      description: 'Une erreur, une idée ou une envie de collaborer ? Écrivez à l’équipe MovieMood.',
      paragraphs: ['Une erreur, une idée ou une envie de collaborer ? Écrivez-nous : {email}']
    },
    privacy: {
      title: 'Confidentialité',
      description: 'Ce que MovieMood conserve, ce qu’il transmet à d’autres services et comment nous contacter au sujet de vos données.',
      updated: 'Mis à jour le',
      intro: 'En bref : le site n’a pas d’inscription et nous n’y conservons aucun profil personnel de visiteur.',
      sections: [
        ['Ce qui reste dans votre navigateur', 'Vos favoris, les titres vus, la langue, le pays et le thème. Ces données restent sur votre appareil. Vous pouvez les supprimer en effaçant les données de ce site dans votre navigateur.'],
        ['Recherche par humeur', 'Votre texte est envoyé à notre serveur et peut être transmis au service d’intelligence artificielle Groq pour choisir des titres. Il peut aussi rester un temps dans les journaux techniques du serveur. N’y saisissez pas d’informations personnelles.'],
        ['Statistiques de visite', 'Nous utilisons Cloudflare Web Analytics qui, selon Cloudflare, fonctionne sans cookies. Le site passe par Cloudflare, qui traite donc des données techniques des requêtes, comme votre adresse IP.'],
        ['Autres services', 'Pendant votre navigation, votre navigateur contacte d’autres entreprises, qui peuvent voir votre adresse IP : TMDB (données et affiches), YouTube (bandes-annonces ; YouTube peut utiliser ses propres cookies), Google Fonts (polices), ipapi.co et ipwho.is (solution de secours pour trouver votre pays).'],
        ['E-mails', 'Si vous nous écrivez, nous recevons votre adresse et votre message et les utilisons uniquement pour vous répondre.'],
        ['Questions et suppression de vos données', 'Écrivez à {email}']
      ]
    }
  },
  es: {
    links: { about: 'Acerca de', contact: 'Contacto', privacy: 'Privacidad' },
    about: {
      title: 'Acerca de MovieMood',
      description: 'MovieMood encuentra películas y series para tu estado de ánimo, con tráileres y dónde verlas. Gratis y sin registro.',
      paragraphs: [
        'MovieMood te ayuda a elegir qué ver según tu estado de ánimo. Descríbelo con tus palabras, como «domingo lluvioso» o «algo ligero después del trabajo», y el sitio te propone películas y series muy queridas. Cada título tiene un tráiler y una lista de los servicios donde verlo en tu país.',
        'El sitio es gratuito y no requiere registro.',
        'Los datos de películas y series proceden de TMDB, y la información sobre dónde verlas procede de JustWatch a través de TMDB.',
        'El equipo de MovieMood'
      ]
    },
    contact: {
      title: 'Contactar con MovieMood',
      description: '¿Has encontrado un error, tienes una idea o quieres colaborar? Escribe al equipo de MovieMood.',
      paragraphs: ['¿Has encontrado un error, tienes una idea o quieres colaborar? Escríbenos: {email}']
    },
    privacy: {
      title: 'Privacidad',
      description: 'Qué guarda MovieMood, qué envía a otros servicios y cómo contactarnos sobre tus datos.',
      updated: 'Actualizado',
      intro: 'En resumen: el sitio no tiene registro y no guardamos en él perfiles personales de los visitantes.',
      sections: [
        ['Qué se queda en tu navegador', 'Tus favoritos, los títulos vistos, el idioma, el país y el tema. Estos datos se quedan en tu dispositivo. Puedes borrarlos eliminando los datos de este sitio en tu navegador.'],
        ['Búsqueda por estado de ánimo', 'Tu texto se envía a nuestro servidor y puede transmitirse al servicio de inteligencia artificial Groq para elegir títulos. También puede quedar un tiempo en los registros técnicos del servidor. No escribas datos personales en la búsqueda.'],
        ['Estadísticas de visitas', 'Usamos Cloudflare Web Analytics, que según Cloudflare funciona sin cookies. El sitio funciona a través de Cloudflare, por lo que Cloudflare trata datos técnicos de las solicitudes, como tu dirección IP.'],
        ['Otros servicios', 'Mientras navegas, tu navegador contacta con otras empresas, que pueden ver tu dirección IP: TMDB (datos y pósteres), YouTube (tráileres; YouTube puede usar sus propias cookies), Google Fonts (fuentes), e ipapi.co e ipwho.is (forma alternativa de detectar tu país).'],
        ['Correos', 'Si nos escribes, recibimos tu dirección y tu mensaje y los usamos solo para responderte.'],
        ['Preguntas y eliminación de datos', 'Escribe a {email}']
      ]
    }
  },
  de: {
    links: { about: 'Über uns', contact: 'Kontakt', privacy: 'Datenschutz' },
    about: {
      title: 'Über MovieMood',
      description: 'MovieMood findet Filme und Serien für deine Stimmung, mit Trailern und Angaben, wo du sie schauen kannst. Kostenlos und ohne Anmeldung.',
      paragraphs: [
        'MovieMood hilft dir, das Passende zu deiner Stimmung auszuwählen. Beschreib sie mit eigenen Worten, etwa „verregneter Sonntag“ oder „etwas Leichtes nach der Arbeit“, und die Seite schlägt beliebte Filme und Serien vor. Zu jedem Titel gibt es einen Trailer und eine Liste der Dienste, bei denen du ihn in deinem Land schauen kannst.',
        'Die Seite ist kostenlos und funktioniert ohne Anmeldung.',
        'Die Film- und Seriendaten stammen von TMDB, die Angaben dazu, wo man sie schauen kann, von JustWatch über TMDB.',
        'Das MovieMood-Team'
      ]
    },
    contact: {
      title: 'MovieMood kontaktieren',
      description: 'Einen Fehler gefunden, eine Idee oder Lust auf Zusammenarbeit? Schreib dem MovieMood-Team.',
      paragraphs: ['Einen Fehler gefunden, eine Idee oder Lust auf Zusammenarbeit? Schreib uns: {email}']
    },
    privacy: {
      title: 'Datenschutz',
      description: 'Was MovieMood speichert, was an andere Dienste geht und wie du uns zu deinen Daten erreichst.',
      updated: 'Aktualisiert',
      intro: 'Kurz gesagt: Die Seite hat keine Anmeldung, und wir speichern hier keine persönlichen Besucherprofile.',
      sections: [
        ['Was in deinem Browser bleibt', 'Deine Favoriten, gesehene Titel, Sprache, Land und Design. Diese Daten bleiben auf deinem Gerät. Du kannst sie löschen, indem du die Daten dieser Seite im Browser entfernst.'],
        ['Stimmungssuche', 'Dein Text geht an unseren Server und kann an den KI-Dienst Groq weitergegeben werden, um Titel auszuwählen. Er kann auch eine Zeit lang in den technischen Protokollen des Servers bleiben. Gib bitte keine persönlichen Daten in die Suche ein.'],
        ['Besuchsstatistik', 'Wir nutzen Cloudflare Web Analytics, das laut Cloudflare ohne Cookies arbeitet. Die Seite läuft über Cloudflare, daher verarbeitet Cloudflare technische Anfragedaten wie deine IP-Adresse.'],
        ['Andere Dienste', 'Beim Surfen kontaktiert dein Browser andere Unternehmen, die deine IP-Adresse sehen können: TMDB (Daten und Poster), YouTube (Trailer; YouTube kann eigene Cookies verwenden), Google Fonts (Schriften) sowie ipapi.co und ipwho.is (Ausweichlösung, um dein Land zu erkennen).'],
        ['E-Mails', 'Wenn du uns schreibst, erhalten wir deine Adresse und deine Nachricht und nutzen sie nur für die Antwort.'],
        ['Fragen und Löschen deiner Daten', 'Schreib an {email}']
      ]
    }
  }
};
