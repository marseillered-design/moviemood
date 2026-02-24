export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    const prompt = `You are an expert movie recommendation assistant. Convert ANY user request into TMDB search parameters.

Return ONLY valid JSON, no extra text, no markdown. Choose ONE of these formats:

FORMAT A — for studios/companies:
{"company_id": number}

FORMAT B — for genres/moods:
{"genres": [number], "year_from": number, "year_to": number}

FORMAT C — for specific titles/directors/actors/languages:
{"search_query": "string", "year_from": number, "year_to": number}

year_from and year_to are always optional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPANY IDs — use FORMAT A for these:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pixar → 3
disney, walt disney → 2
marvel, mcu, avengers, iron man, spider-man, thor, captain america, black panther → 420
dc, batman, superman, wonder woman, justice league, aquaman, shazam, flash → 9993
dreamworks → 521
studio ghibli, ghibli, miyazaki → 10342
a24 → 41077
blumhouse → 3172
illumination, minions, despicable me → 6704
warner bros → 174
universal → 33
paramount → 4
20th century fox → 25
sony pictures → 5
lionsgate → 1632
miramax → 14
new line cinema → 12
amblin entertainment, spielberg company → 56
legendary pictures → 923

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH QUERY — use FORMAT C for these:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRANCHISES:
- star wars → "star wars"
- harry potter, hogwarts → "harry potter"
- lord of the rings, lotr, tolkien → "lord of the rings"
- james bond, 007 → "james bond"
- mission impossible → "mission impossible"
- fast and furious → "fast furious"
- jurassic park, jurassic world → "jurassic"
- indiana jones → "indiana jones"
- terminator → "terminator"
- alien, aliens → "alien"
- john wick → "john wick"
- matrix → "matrix"
- halloween → "halloween"
- nightmare on elm street → "nightmare elm street"
- saw → "saw"
- conjuring → "conjuring"
- hunger games → "hunger games"
- twilight → "twilight"
- pirates of the caribbean → "pirates caribbean"
- planet of the apes → "planet apes"
- transformers → "transformers"
- x-men → "x-men"
- shrek → "shrek"
- toy story → "toy story"
- finding nemo → "finding nemo"
- incredibles → "incredibles"
- ice age → "ice age"
- kung fu panda → "kung fu panda"
- how to train your dragon → "how to train dragon"
- hotel transylvania → "hotel transylvania"
- madagascar → "madagascar"
- moana → "moana"
- frozen → "frozen"
- coco → "coco"
- up → "up pixar"
- wall-e → "wall-e"
- ratatouille → "ratatouille"

DIRECTORS:
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
- bong joon-ho, parasite director, bong → "bong joon-ho"
- akira kurosawa, kurosawa → "akira kurosawa"
- ingmar bergman → "ingmar bergman"
- federico fellini, fellini → "federico fellini"
- paul thomas anderson, pta → "paul thomas anderson"
- coen brothers, joel coen → "coen brothers"
- woody allen → "woody allen"
- terry gilliam → "terry gilliam"
- michel gondry → "michel gondry"
- robert zemeckis → "robert zemeckis"
- ron howard → "ron howard"
- clint eastwood director → "clint eastwood"
- oliver stone → "oliver stone"
- brian de palma → "brian de palma"
- ang lee → "ang lee"
- zhang yimou → "zhang yimou"
- park chan-wook → "park chan-wook"

ACTORS:
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
- cillian murphy → "cillian murphy"
- paul mescal → "paul mescal"
- austin butler → "austin butler"
- andrew garfield → "andrew garfield"
- tom holland → "tom holland"
- robert pattinson → "robert pattinson"
- dwayne johnson, the rock → "dwayne johnson"
- chris pratt → "chris pratt"
- chris hemsworth → "chris hemsworth"
- chris evans → "chris evans"
- robert downey jr → "robert downey"
- vin diesel → "vin diesel"
- liam neeson → "liam neeson"
- russell crowe → "russell crowe"
- colin farrell → "colin farrell"
- jude law → "jude law"
- benedict cumberbatch → "benedict cumberbatch"
- daniel craig → "daniel craig"
- idris elba → "idris elba"
- michael b jordan → "michael b jordan"
- oscar isaac → "oscar isaac"
- jake gyllenhaal → "jake gyllenhaal"
- michael fassbender → "michael fassbender"
- james mcavoy → "james mcavoy"
- lupita nyongo → "lupita nyong'o"
- viola davis → "viola davis"
- chadwick boseman → "chadwick boseman"

NATIONAL CINEMAS & LANGUAGES:
- korean, k-drama, k-movie, korean film → "korean"
- japanese, j-drama, japanese film → "japanese"
- french cinema, french film → "french"
- italian cinema → "italian"
- spanish film → "spanish"
- german cinema → "german"
- bollywood, indian film → "bollywood"
- chinese cinema → "chinese"
- iranian cinema → "iranian"
- scandinavian cinema → "scandinavian"
- turkish drama → "turkish"
- russian cinema → "russian"
- polish cinema → "polish"
- ukrainian film → "ukrainian"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENRES — use FORMAT B for moods/feelings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TMDB Genre IDs:
28=Action, 12=Adventure, 16=Animation, 35=Comedy,
80=Crime, 99=Documentary, 18=Drama, 10751=Family,
14=Fantasy, 36=History, 27=Horror, 10402=Music,
9648=Mystery, 10749=Romance, 878=Sci-Fi,
53=Thriller, 10752=War, 37=Western

EMOTIONS & FEELINGS:
- sad, want to cry, need a good cry, heartbreaking, tearjerker → [18]
- happy, feel good, uplifting, cheerful, positive, wholesome → [35, 10749]
- scared, terrified, creepy, unsettling, nightmare → [27, 53]
- excited, pumped, adrenaline, hyped, energetic → [28, 12]
- romantic, in love, lovey dovey → [10749, 35]
- angry, intense, brutal → [28, 80]
- relaxed, calm, cozy, chill → [35, 10749]
- inspired, motivated, empowered → [18, 36]
- nostalgic, childhood memories → [16, 10751]
- thoughtful, philosophical, deep, existential → [18, 878]
- mind-blown, mind-bending, mindfuck, plot twist → [9648, 53]
- adventurous, epic journey → [12, 14]
- tense, on edge, gripping → [53, 9648]
- confused, complex, layered → [9648, 18]

SITUATIONS:
- date night, with girlfriend, romantic evening → [10749, 35]
- family night, with kids, whole family → [10751, 16]
- can't sleep, insomnia, late night, 3am → [53, 27]
- rainy day, lazy sunday, staying home → [35, 18]
- after breakup, heartbroken → [18, 10749]
- girls night → [35, 10749]
- guys night, with bros → [28, 35]
- friday night, weekend → [28, 35]
- need motivation → [18, 36]
- after hard day, comfort movie → [35, 10749]
- something light → [35, 10749]
- something heavy, serious → [18, 80]
- background movie → [35]
- movie night alone → [53, 9648]
- sunday morning → [35, 10749]

GENRE DESCRIPTORS:
- action → [28]
- adventure → [12]
- animated, cartoon, animation → [16]
- comedy, funny, humor → [35]
- crime, gangster, mafia → [80, 53]
- documentary → [99]
- drama → [18]
- family → [10751]
- fantasy, magical → [14]
- historical, period drama → [36, 18]
- horror, scary, slasher → [27]
- musical → [10402]
- mystery, detective, whodunit → [9648]
- romance → [10749]
- sci-fi, science fiction → [878]
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
- action adventure → [28, 12]
- fantasy adventure → [14, 12]
- psychological thriller → [53, 9648]
- supernatural horror → [27, 14]
- historical drama → [36, 18]
- biopic, biographical → [18, 36]
- spy, espionage → [28, 53]
- superhero → [28, 12]
- disaster → [28, 12]

DESCRIPTIVE STYLES:
- dark, gloomy → [18, 53]
- light, easy watching → [35, 10749]
- deep, thought-provoking → [18, 878]
- fast-paced → [28, 53]
- slow burn, atmospheric → [18, 9648]
- visually stunning, aesthetic → [14, 878]
- realistic, grounded → [18, 80]
- based on true story → [18, 36]
- oscar winner, award winning → [18]
- indie, independent → [18]
- arthouse → [18]
- cult classic → [18, 878]
- underrated, hidden gem → [18, 9648]
- blockbuster → [28, 12]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YEAR DETECTION (add to any format):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 50s → year_from:1950, year_to:1959
- 60s → year_from:1960, year_to:1969
- 70s → year_from:1970, year_to:1979
- 80s → year_from:1980, year_to:1989
- 90s → year_from:1990, year_to:1999
- 2000s → year_from:2000, year_to:2009
- 2010s → year_from:2010, year_to:2019
- 2020s → year_from:2020, year_to:2029
- classic, golden age → year_from:1950, year_to:1985
- old, vintage, retro → year_from:1960, year_to:1995
- recent, new, latest → year_from:2020, year_to:2025
- modern → year_from:2010, year_to:2025
- this year → year_from:2024, year_to:2025
- last year → year_from:2023, year_to:2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"pixar cartoons" → {"company_id": 3}
"disney animated" → {"company_id": 2}
"dc movies" → {"company_id": 9993}
"marvel films" → {"company_id": 420}
"ghibli" → {"company_id": 10342}
"a24" → {"company_id": 41077}
"blumhouse horror" → {"company_id": 3172}
"nolan films" → {"search_query": "christopher nolan"}
"horror of 90s" → {"genres": [27], "year_from": 1990, "year_to": 1999}
"80s action" → {"genres": [28, 12], "year_from": 1980, "year_to": 1989}
"cozy evening" → {"genres": [35, 10749]}
"date night" → {"genres": [10749, 35]}
"can't sleep" → {"genres": [53, 27]}
"need to cry" → {"genres": [18]}
"need to laugh" → {"genres": [35]}
"brad pitt movies" → {"search_query": "brad pitt"}
"korean drama" → {"search_query": "korean"}
"dark sci-fi" → {"genres": [878, 53]}
"classic westerns" → {"genres": [37], "year_from": 1950, "year_to": 1980}
"romantic comedy 2000s" → {"genres": [10749, 35], "year_from": 2000, "year_to": 2009}
"family night" → {"genres": [10751, 16]}
"old bollywood" → {"search_query": "bollywood", "year_from": 1970, "year_to": 2000}
"mind-bending thriller" → {"genres": [9648, 53]}
"feel good movie" → {"genres": [35, 18]}
"girls night" → {"genres": [35, 10749]}
"after hard day" → {"genres": [35, 10749]}
"something epic" → {"genres": [28, 12]}
"star wars" → {"search_query": "star wars"}
"harry potter" → {"search_query": "harry potter"}
"recent horror" → {"genres": [27], "year_from": 2018, "year_to": 2025}
"old disney classics" → {"company_id": 2, "year_from": 1937, "year_to": 1995}

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

      if (!parsed.genres && !parsed.search_query && !parsed.company_id) {
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

  // Companies — exact match first
  if (q.includes('pixar')) return { company_id: 3 };
  if (q.includes('ghibli') || q.includes('miyazaki')) return { company_id: 10342 };
  if (q.includes('dreamworks')) return { company_id: 521 };
  if (q.includes('a24')) return { company_id: 41077 };
  if (q.includes('blumhouse')) return { company_id: 3172 };
  if (q.includes('illumination') || q.includes('minion')) return { company_id: 6704 };
  if (q.includes('marvel') || q.includes('mcu') || q.includes('avengers') || q.includes('iron man') || q.includes('spider-man')) return { company_id: 420 };
  if (q.includes(' dc ') || q.includes('dc movie') || q.includes('dc film') || q.includes('batman') || q.includes('superman') || q.includes('wonder woman') || q.includes('justice league')) return { company_id: 9993 };
  if (q.includes('disney') && !q.includes('pixar')) return { company_id: 2 };

  // Directors
  if (q.includes('nolan')) return { search_query: 'christopher nolan' };
  if (q.includes('tarantino')) return { search_query: 'quentin tarantino' };
  if (q.includes('kubrick')) return { search_query: 'stanley kubrick' };
  if (q.includes('spielberg')) return { search_query: 'steven spielberg' };
  if (q.includes('scorsese')) return { search_query: 'martin scorsese' };
  if (q.includes('fincher')) return { search_query: 'david fincher' };
  if (q.includes('villeneuve')) return { search_query: 'denis villeneuve' };
  if (q.includes('hitchcock')) return { search_query: 'alfred hitchcock' };
  if (q.includes('kurosawa')) return { search_query: 'akira kurosawa' };
  if (q.includes('wes anderson')) return { search_query: 'wes anderson' };
  if (q.includes('tim burton')) return { search_query: 'tim burton' };

  // Franchises
  if (q.includes('star wars')) return { search_query: 'star wars' };
  if (q.includes('harry potter')) return { search_query: 'harry potter' };
  if (q.includes('lord of the rings') || q.includes('lotr')) return { search_query: 'lord of the rings' };
  if (q.includes('james bond') || q.includes('007')) return { search_query: 'james bond' };
  if (q.includes('john wick')) return { search_query: 'john wick' };
  if (q.includes('matrix')) return { search_query: 'matrix' };
  if (q.includes('hunger games')) return { search_query: 'hunger games' };

  // Languages
  if (q.includes('korean') || q.includes('k-drama')) return { search_query: 'korean' };
  if (q.includes('bollywood') || q.includes('indian')) return { search_query: 'bollywood' };
  if (q.includes('french')) return { search_query: 'french' };
  if (q.includes('japanese')) return { search_query: 'japanese' };
  if (q.includes('spanish')) return { search_query: 'spanish' };
  if (q.includes('italian')) return { search_query: 'italian' };
  if (q.includes('turkish')) return { search_query: 'turkish' };

  // Genres & moods
  if (q.match(/horror|scary|ghost|monster|creepy|slasher/)) return { genres: [27, 53] };
  if (q.match(/action|fight|battle|explosion|adrenaline/)) return { genres: [28, 12] };
  if (q.match(/funny|comedy|laugh|humor|hilarious/)) return { genres: [35] };
  if (q.match(/romance|love|date night|romantic/)) return { genres: [10749, 35] };
  if (q.match(/sci.?fi|space|future|robot|alien/)) return { genres: [878, 28] };
  if (q.match(/mystery|crime|detective|thriller|suspense/)) return { genres: [9648, 53] };
  if (q.match(/family|kids|children|cartoon|animated/)) return { genres: [16, 10751] };
  if (q.match(/documentary|true story/)) return { genres: [99, 36] };
  if (q.match(/sad|cry|emotional|drama|heartbreak/)) return { genres: [18] };
  if (q.match(/fantasy|magic|dragon|wizard/)) return { genres: [14, 12] };
  if (q.match(/war|military|soldier|wwii/)) return { genres: [10752, 28] };
  if (q.match(/western|cowboy/)) return { genres: [37] };
  if (q.match(/musical|concert|song|dance/)) return { genres: [10402, 18] };
  if (q.match(/cozy|chill|relax|lazy|calm/)) return { genres: [35, 10749] };
  if (q.match(/dark|gritty|intense|heavy/)) return { genres: [18, 53] };
  if (q.match(/mind.?bend|mind.?blow|twist/)) return { genres: [878, 9648] };

  return { genres: [18, 28] };
}
