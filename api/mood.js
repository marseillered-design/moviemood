export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    const prompt = `You are an expert movie recommendation assistant. Convert ANY user request into TMDB search parameters.

Return ONLY valid JSON, no extra text, no markdown:
{
  "genres": [number],
  "year_from": number,
  "year_to": number,
  "search_query": "string"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1: USE "search_query" FOR THESE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STUDIOS & PRODUCTION COMPANIES:
- pixar, disney, marvel, dc, warner bros, universal, paramount
- studio ghibli, ghibli, hayao miyazaki
- dreamworks, illumination, laika, aardman
- a24, blumhouse, miramax, lionsgate
- netflix original, hbo, amazon original, apple tv+

DIRECTORS (search their name):
- christopher nolan, nolan → "christopher nolan"
- stanley kubrick, kubrick → "stanley kubrick"
- steven spielberg, spielberg → "steven spielberg"
- quentin tarantino, tarantino → "quentin tarantino"
- martin scorsese, scorsese → "martin scorsese"
- david fincher, fincher → "david fincher"
- david lynch, lynch → "david lynch"
- denis villeneuve, villeneuve → "denis villeneuve"
- wes anderson → "wes anderson"
- tim burton → "tim burton"
- james cameron → "james cameron"
- ridley scott → "ridley scott"
- alfred hitchcock, hitchcock → "alfred hitchcock"
- francis ford coppola, coppola → "francis ford coppola"
- peter jackson → "peter jackson"
- guillermo del toro → "guillermo del toro"
- darren aronofsky → "darren aronofsky"
- sofia coppola → "sofia coppola"
- wong kar-wai → "wong kar-wai"
- bong joon-ho, bong → "bong joon-ho"
- akira kurosawa, kurosawa → "akira kurosawa"
- ingmar bergman, bergman → "ingmar bergman"
- federico fellini, fellini → "federico fellini"
- paul thomas anderson, pta → "paul thomas anderson"
- coen brothers, joel coen, ethan coen → "coen brothers"
- woody allen → "woody allen"
- roman polanski → "roman polanski"
- terry gilliam → "terry gilliam"
- michel gondry → "michel gondry"

ACTORS & ACTRESSES:
- tom hanks → "tom hanks"
- leonardo dicaprio, dicaprio → "leonardo dicaprio"
- brad pitt → "brad pitt"
- morgan freeman → "morgan freeman"
- meryl streep → "meryl streep"
- cate blanchett → "cate blanchett"
- natalie portman → "natalie portman"
- scarlett johansson → "scarlett johansson"
- ryan gosling → "ryan gosling"
- joaquin phoenix → "joaquin phoenix"
- christian bale → "christian bale"
- matt damon → "matt damon"
- robert de niro, de niro → "robert de niro"
- al pacino → "al pacino"
- denzel washington → "denzel washington"
- will smith → "will smith"
- johnny depp → "johnny depp"
- keanu reeves → "keanu reeves"
- samuel l jackson → "samuel l jackson"
- bruce willis → "bruce willis"
- sylvester stallone → "sylvester stallone"
- arnold schwarzenegger → "arnold schwarzenegger"
- tom cruise → "tom cruise"
- harrison ford → "harrison ford"
- clint eastwood → "clint eastwood"
- emma stone → "emma stone"
- jennifer lawrence → "jennifer lawrence"
- anne hathaway → "anne hathaway"
- charlize theron → "charlize theron"
- timothée chalamet, chalamet → "timothée chalamet"
- florence pugh → "florence pugh"
- zendaya → "zendaya"
- pedro pascal → "pedro pascal"
- adam driver → "adam driver"
- margot robbie → "margot robbie"
- saoirse ronan → "saoirse ronan"
- andrew garfield → "andrew garfield"
- paul mescal → "paul mescal"

FRANCHISES & UNIVERSES:
- star wars → "star wars"
- harry potter, hogwarts → "harry potter"
- lord of the rings, lotr, tolkien → "lord of the rings"
- marvel, mcu, avengers, iron man, spider-man, thor → "marvel"
- dc, batman, superman, wonder woman, justice league → "dc"
- james bond, 007 → "james bond"
- mission impossible → "mission impossible"
- fast and furious → "fast furious"
- jurassic park, jurassic world → "jurassic"
- indiana jones → "indiana jones"
- terminator → "terminator"
- alien, aliens → "alien"
- transformers → "transformers"
- john wick → "john wick"
- matrix → "matrix"
- halloween → "halloween"
- nightmare on elm street, freddy krueger → "nightmare elm street"
- saw → "saw"
- conjuring → "conjuring"
- hunger games → "hunger games"
- twilight → "twilight"
- pirates of the caribbean → "pirates caribbean"
- toy story → "toy story"
- the incredibles → "incredibles"
- shrek → "shrek"
- despicable me, minions → "despicable me"

NATIONAL CINEMAS & LANGUAGES:
- korean, k-drama, k-movie → "korean"
- japanese, j-drama → "japanese"
- french cinema, french film → "french"
- italian cinema, italian film → "italian"
- spanish film → "spanish"
- german cinema → "german"
- indian, bollywood → "bollywood"
- chinese cinema → "chinese"
- iranian cinema → "iranian"
- scandinavian → "scandinavian"
- turkish, turkish drama → "turkish"
- russian cinema → "russian"
- polish cinema → "polish"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2: USE "genres" FOR MOODS & FEELINGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMOTIONS:
- sad, want to cry, need a good cry, heartbreaking, tearjerker → [18]
- happy, feel good, uplifting, cheerful, positive, wholesome → [35, 10749]
- scared, terrified, creepy, unsettling, nightmare fuel → [27, 53]
- excited, pumped, adrenaline, hyped, energetic → [28, 12]
- romantic, in love, lovey dovey → [10749, 35]
- angry, intense, dark, gritty, brutal → [28, 80]
- relaxed, calm, cozy, chill, comfortable → [35, 10749]
- inspired, motivated, empowered → [18, 36]
- nostalgic, childhood memories, miss the old days → [16, 10751]
- thoughtful, philosophical, existential, deep → [18, 878]
- shocked, mind-blown, plot twist, unexpected → [9648, 53]
- adventurous, wanderlust, epic journey → [12, 14]
- bored, kill time, entertaining → [35, 28]
- confused, complex, layered → [9648, 18]
- tense, on edge, gripping → [53, 9648]

SITUATIONS:
- date night, with girlfriend, with boyfriend, romantic evening → [10749, 35]
- family night, with kids, whole family, everyone → [10751, 16]
- can't sleep, insomnia, late night, 3am → [53, 27]
- rainy day, lazy sunday, staying home, nothing to do → [35, 18]
- after breakup, heartbroken, sad after love → [18, 10749]
- girls night, girls night out → [35, 10749]
- guys night, with bros, friends night → [28, 35]
- friday night, weekend fun → [28, 35]
- something to think about, need to think → [18, 878]
- need a good cry → [18]
- need to laugh → [35]
- something light, easy watching → [35, 10749]
- something heavy, serious → [18, 80]
- background movie, not paying full attention → [35]
- need motivation → [18, 36]
- after hard day, comfort movie → [35, 10749]
- something short → [35]
- something epic, long → [28, 12]
- movie night alone → [53, 9648]
- sunday morning → [35, 10749]
- workout background → [28, 12]

GENRE DESCRIPTORS:
- action → [28]
- adventure → [12]
- animated, cartoon, animation → [16]
- comedy, funny, humor → [35]
- crime, gangster, mafia → [80, 53]
- documentary, real, true story → [99]
- drama → [18]
- family → [10751]
- fantasy, magical, fairy tale → [14]
- historical, period, costume drama → [36, 18]
- horror, scary, slasher → [27]
- music, musical, concert → [10402]
- mystery, whodunit, detective → [9648]
- romance, love story → [10749]
- sci-fi, science fiction, futuristic → [878]
- thriller, suspense → [53]
- war, military → [10752]
- western, cowboys → [37]

GENRE COMBINATIONS:
- dark comedy → [35, 80]
- romantic comedy, romcom → [10749, 35]
- action comedy → [28, 35]
- horror comedy → [27, 35]
- sci-fi thriller → [878, 53]
- crime thriller → [80, 53]
- romantic drama → [10749, 18]
- dark thriller → [53, 18]
- action adventure → [28, 12]
- fantasy adventure → [14, 12]
- psychological thriller → [53, 9648]
- supernatural horror → [27, 14]
- historical drama → [36, 18]
- biographical drama, biopic → [18, 36]
- action sci-fi → [28, 878]
- animated comedy → [16, 35]
- animated family → [16, 10751]
- crime drama → [80, 18]
- mystery thriller → [9648, 53]
- disaster movie → [28, 12]
- superhero → [28, 12]
- spy, espionage → [28, 53]

DESCRIPTIVE STYLES:
- dark, gloomy, depressing → [18, 53]
- light, fun, easy → [35, 10749]
- deep, meaningful, thought-provoking → [18, 878]
- fast-paced, non-stop → [28, 53]
- slow burn, atmospheric → [18, 9648]
- visually stunning, beautiful, aesthetic → [14, 878]
- realistic, grounded → [18, 80]
- based on true story → [18, 36]
- cult classic → [18, 878]
- oscar winner, award winning → [18]
- critically acclaimed → [18]
- underrated, hidden gem → [18, 9648]
- blockbuster, summer movie → [28, 12]
- indie, independent → [18]
- arthouse → [18]
- mind-bending, mindfuck → [878, 9648]
- violent, brutal → [28, 80]
- funny but dark → [35, 18]
- emotional but hopeful → [18, 10749]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 3: YEAR DETECTION (combine with genres or search_query):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "50s" → year_from:1950, year_to:1959
- "60s" → year_from:1960, year_to:1969
- "70s" → year_from:1970, year_to:1979
- "80s" → year_from:1980, year_to:1989
- "90s" → year_from:1990, year_to:1999
- "2000s" → year_from:2000, year_to:2009
- "2010s" → year_from:2010, year_to:2019
- "2020s" → year_from:2020, year_to:2029
- "classic", "old school", "golden age" → year_from:1950, year_to:1985
- "old", "vintage", "retro" → year_from:1960, year_to:1995
- "recent", "new", "latest", "modern" → year_from:2018, year_to:2025
- "last year" → year_from:2023, year_to:2024
- "this year" → year_from:2024, year_to:2025
- specific year "2019" → year_from:2019, year_to:2019
- range "2010-2015" → year_from:2010, year_to:2015

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"pixar cartoons" → {"search_query": "pixar"}
"disney animated" → {"search_query": "disney"}
"nolan films" → {"search_query": "christopher nolan"}
"horror of 90s" → {"genres": [27], "year_from": 1990, "year_to": 1999}
"80s action movies" → {"genres": [28, 12], "year_from": 1980, "year_to": 1989}
"cozy evening" → {"genres": [35, 10749]}
"date night" → {"genres": [10749, 35]}
"can't sleep" → {"genres": [53, 27]}
"need to cry" → {"genres": [18]}
"need to laugh" → {"genres": [35]}
"something with Brad Pitt" → {"search_query": "brad pitt"}
"korean drama" → {"search_query": "korean"}
"dark sci-fi" → {"genres": [878, 53]}
"classic westerns" → {"genres": [37], "year_from": 1950, "year_to": 1980}
"spy thriller" → {"genres": [28, 53]}
"feel good movie" → {"genres": [35, 18]}
"mind-blowing plot twist" → {"genres": [9648, 53]}
"romantic comedy 2000s" → {"genres": [10749, 35], "year_from": 2000, "year_to": 2009}
"family night" → {"genres": [10751, 16]}
"ghibli" → {"search_query": "studio ghibli"}
"kubrick" → {"search_query": "stanley kubrick"}
"old bollywood" → {"search_query": "bollywood", "year_from": 1970, "year_to": 2000}
"recent french cinema" → {"search_query": "french", "year_from": 2015, "year_to": 2025}
"something like inception" → {"search_query": "inception"}
"girls night" → {"genres": [35, 10749]}
"after hard day" → {"genres": [35, 10749]}
"mind-bending" → {"genres": [878, 9648]}
"something epic" → {"genres": [28, 12]}

User request: "${query}"`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.status);
      return res.status(200).json(keywordFallback(query));
    }

    const data = await geminiResponse.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return res.status(200).json(keywordFallback(query));
    }

    let parsed;
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.genres && !parsed.search_query) {
        return res.status(200).json(keywordFallback(query));
      }
      if (parsed.genres && !Array.isArray(parsed.genres)) {
        parsed.genres = [18, 28];
      }
    } catch (e) {
      console.error("JSON parse error:", e, "Raw:", content);
      return res.status(200).json(keywordFallback(query));
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(200).json({ genres: [18, 28], fallback: true });
  }
}

function keywordFallback(query) {
  const q = query.toLowerCase();

  // Studios
  if (q.includes('pixar')) return { search_query: 'pixar' };
  if (q.includes('ghibli') || q.includes('miyazaki')) return { search_query: 'studio ghibli' };
  if (q.includes('disney')) return { search_query: 'disney' };
  if (q.includes('marvel') || q.includes('mcu') || q.includes('avengers')) return { search_query: 'marvel' };
  if (q.includes('dreamworks')) return { search_query: 'dreamworks' };

  // Directors
  if (q.includes('nolan')) return { search_query: 'christopher nolan' };
  if (q.includes('tarantino')) return { search_query: 'quentin tarantino' };
  if (q.includes('kubrick')) return { search_query: 'stanley kubrick' };
  if (q.includes('spielberg')) return { search_query: 'steven spielberg' };
  if (q.includes('scorsese')) return { search_query: 'martin scorsese' };
  if (q.includes('fincher')) return { search_query: 'david fincher' };
  if (q.includes('villeneuve')) return { search_query: 'denis villeneuve' };
  if (q.includes('wes anderson')) return { search_query: 'wes anderson' };
  if (q.includes('tim burton')) return { search_query: 'tim burton' };
  if (q.includes('hitchcock')) return { search_query: 'alfred hitchcock' };
  if (q.includes('kurosawa')) return { search_query: 'akira kurosawa' };

  // Languages
  if (q.includes('korean') || q.includes('k-drama')) return { search_query: 'korean' };
  if (q.includes('bollywood') || q.includes('indian')) return { search_query: 'bollywood' };
  if (q.includes('french')) return { search_query: 'french' };
  if (q.includes('japanese')) return { search_query: 'japanese' };
  if (q.includes('spanish')) return { search_query: 'spanish' };
  if (q.includes('italian')) return { search_query: 'italian' };
  if (q.includes('turkish')) return { search_query: 'turkish' };

  // Genres & moods
  if (q.match(/horror|scary|fear|ghost|monster|creepy|slasher/)) return { genres: [27, 53] };
  if (q.match(/action|fight|battle|explosion|adrenaline/)) return { genres: [28, 12] };
  if (q.match(/funny|comedy|laugh|humor|hilarious|romcom/)) return { genres: [35] };
  if (q.match(/romance|love|date night|relationship|romantic/)) return { genres: [10749, 35] };
  if (q.match(/sci.?fi|space|future|robot|alien|cyber/)) return { genres: [878, 28] };
  if (q.match(/mystery|crime|detective|thriller|suspense|plot twist/)) return { genres: [9648, 53] };
  if (q.match(/family|kids|children|cartoon|animated/)) return { genres: [16, 10751] };
  if (q.match(/documentary|real|true story/)) return { genres: [99, 36] };
  if (q.match(/sad|cry|emotional|drama|heartbreak/)) return { genres: [18] };
  if (q.match(/fantasy|magic|dragon|wizard|fairy/)) return { genres: [14, 12] };
  if (q.match(/war|military|soldier|wwii|ww2/)) return { genres: [10752, 28] };
  if (q.match(/western|cowboy|wild west/)) return { genres: [37] };
  if (q.match(/historical|period|costume|ancient/)) return { genres: [36, 18] };
  if (q.match(/music|musical|concert|song|dance/)) return { genres: [10402, 18] };
  if (q.match(/cozy|chill|relax|lazy|calm|comfortable/)) return { genres: [35, 10749] };
  if (q.match(/dark|gritty|intense|heavy|brutal/)) return { genres: [18, 53] };
  if (q.match(/inspiring|motivat|uplifting|biopic/)) return { genres: [18, 36] };
  if (q.match(/mind.?bend|mind.?blow|mindfuck|twist/)) return { genres: [878, 9648] };

  return { genres: [18, 28] };
}
