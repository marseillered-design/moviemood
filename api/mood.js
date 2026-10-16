export default async function handler(req, res) {
  try {
    const { query } = req.body;
    // { debug: true } in the request adds _ai: what happened with each AI (no key, HTTP error, ok)
    const debug = req.body.debug === true;
    const reply = (body, aiStatus) => res.status(200).json(debug ? { ...body, _ai: aiStatus } : body);

    if (!query) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    // ══════════════════════════════════════════════
    // STEP 1: Check local database first (instant, free)
    // ══════════════════════════════════════════════
    // Ukrainian / Russian / French / Spanish queries are mapped to English first
    const translated = translateQuery(query);
    const lookupText = translated.changed ? translated.text : query;

    // "movies like Inception": the client lists what fans of that title also liked.
    // The rest of the query ("dark sci-fi like ...") is the fallback if the title is not found.
    const like = extractLikeTitle(query);
    if (like) {
      const restParsed = like.rest ? resolveLocally(translateQuery(like.rest).text) : null;
      const answer = { ...(restParsed?.result || { title_query: like.title }), like_title: like.title };
      if (restParsed?.parsed.media_type) answer.media_type = restParsed.parsed.media_type;
      // The AI knows which films fans of a title love; without it the client compares TMDB keywords
      const picks = await askLikePicks(query, like);
      if (picks.data) Object.assign(answer, picks.data);
      console.log(`[LIKE] "${query}" → ${JSON.stringify(answer)}`);
      return reply(answer, picks.status);
    }

    // "scary but not too gory": "not too gory" is a filter, the parser reads only "scary but".
    // A query that is nothing but a negation ("not too heavy") is still read as a whole.
    const negations = extractNegations(lookupText.toLowerCase());
    const strippedLocal = negations.any && negations.text ? resolveLocally(negations.text) : null;

    // Phrase database + concept parser (genre, mood, topic, decade, country)
    const local = strippedLocal?.result ? strippedLocal : resolveLocally(lookupText);

    // If no AI answers: best local guess, or a plain title search when nothing
    // was understood. title_query lets the client try a title search first
    // ("Звёздные войны" must not become a war movie list).
    const localFallback = () => {
      if (!local.result) return negations.any ? applyNegations({}, negations) : { search_query: query };
      return applyNegations(local.maybeTitle ? { ...local.result, title_query: query } : local.result, negations);
    };

    // A half-understood query goes to the AI instead of matching on a single known word
    const providers = AI_PROVIDERS.filter(provider => provider.key());
    // (a query that was only a negation, "nothing too scary", needs no AI either)
    if (local.confident || (negations.any && !negations.text) || !providers.length) {
      console.log(`[LOCAL] "${query}" (${lookupText}) → ${JSON.stringify(local.result)}`);
      return reply(localFallback(), local.confident ? 'not_needed' : 'no_key');
    }

    // ══════════════════════════════════════════════
    // STEP 2: Ask the AI (Groq)
    // ══════════════════════════════════════════════
    // The visitor waits for all of them together, so they share one time budget
    const deadline = Date.now() + AI_TIME_BUDGET_MS;
    const statuses = [];
    for (const provider of providers) {
      const timeLeft = deadline - Date.now();
      if (timeLeft < 500) break;

      console.log(`[LOCAL MISS] "${query}" (${lookupText}) → calling ${provider.name}`);
      const answer = await provider.ask(buildPrompt(query), timeLeft);
      const parsed = answer.content ? parseAiAnswer(answer.content) : null;

      if (parsed) {
        // The AI only returns genres/years; the topic, country and movie/series come from the parser
        return reply(applyNegations(enrich(parsed, local.parsed), negations), [...statuses, `${provider.name}: ok`].join(' | '));
      }
      const status = answer.error || `unusable answer: ${answer.content.slice(0, 200)}`;
      console.error(`${provider.name} failed:`, status);
      statuses.push(`${provider.name}: ${status}`);
    }

    return reply(localFallback(), statuses.join(' | ') || 'timeout');
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(200).json({ genres: [18, 28], fallback: true });
  }
}

// ══════════════════════════════════════════════
// AI PROVIDERS
// Each one gets the same prompt and returns { content } or { error }.
// Set GROQ_API_KEY in Vercel; the model can be overridden with GROQ_MODEL.
// Another AI can be added to AI_PROVIDERS later: they are asked in order.
// ══════════════════════════════════════════════
const AI_TIME_BUDGET_MS = 5000;

// a key pasted with a stray space or line break is rejected
const envValue = name => (process.env[name] || '').trim();

async function postJson(url, options, timeoutMs) {
  try {
    const response = await fetch(url, { ...options, method: 'POST', signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `http_${response.status}: ${errorText.slice(0, 300)}`, status: response.status, errorText };
    }
    return { data: await response.json() };
  } catch (error) {
    return { error: `request_failed: ${error?.name || error}` };
  }
}

// Groq: fast and free to start with. Models come and go, so a retired one falls through to the next.
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];

async function askGroq(prompt, timeoutMs) {
  const models = envValue('GROQ_MODEL') ? [envValue('GROQ_MODEL')] : GROQ_MODELS;
  const started = Date.now();
  let lastError = 'no model tried';

  for (const model of models) {
    const timeLeft = timeoutMs - (Date.now() - started);
    if (timeLeft < 300) break;

    const result = await postJson('https://api.groq.com/openai/v1/chat/completions', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${envValue('GROQ_API_KEY')}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_completion_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    }, timeLeft);

    if (result.data) return { content: result.data.choices?.[0]?.message?.content || '' };
    lastError = `${model} ${result.error}`;
    // only an unknown or retired model is worth another try; quota or outage errors are not
    const modelGone = (result.status === 404 || result.status === 400) && /model/i.test(result.errorText || '');
    if (!modelGone) break;
  }
  return { error: lastError };
}

const AI_PROVIDERS = [
  { name: 'groq', key: () => envValue('GROQ_API_KEY'), ask: askGroq },
];

// "movies like Inception": the AI names the source title and 20 titles its fans also love.
// The client looks each of them up on TMDB. Returns { data: { like_source, like_picks } | null, status }.
async function askLikePicks(query, like) {
  const providers = AI_PROVIDERS.filter(provider => provider.key());
  if (!providers.length) return { data: null, status: 'no_key' };

  const deadline = Date.now() + AI_TIME_BUDGET_MS;
  const statuses = [];
  for (const provider of providers) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < 500) break;
    const answer = await provider.ask(buildLikePrompt(query, like), timeLeft);
    const data = answer.content ? parseLikeAnswer(answer.content) : null;
    if (data) return { data, status: [...statuses, `${provider.name}: ok`].join(' | ') };
    statuses.push(`${provider.name}: ${answer.error || `unusable answer: ${answer.content.slice(0, 200)}`}`);
  }
  return { data: null, status: statuses.join(' | ') || 'timeout' };
}

function buildLikePrompt(query, like) {
  return `A visitor of a movie recommendation site typed: "${query}"
They want titles similar to "${like.title}" (the title may be written in English, Ukrainian, Russian, French or Spanish).${like.rest ? `
Their other wishes: "${like.rest}".` : ''}
Return ONLY valid JSON, no markdown:
{"source": {"title": "original English title", "year": 2010, "type": "movie"},
 "picks": [{"title": "English title", "year": 1999, "type": "movie"}]}
Rules:
- "source" is the title they meant; "type" is "movie" or "tv".
- "picks": exactly 20 well-known, well-rated titles that fans of the source genuinely love for the same reasons (tone, themes, style), best matches first.
- No sequels, prequels, remakes or spin-offs of the source, and not the source itself.
- Same type as the source (series for a series), unless the wishes say otherwise.
- Use official English titles and the release year (first air year for series).`;
}

// { like_source, like_picks } or null
function parseLikeAnswer(content) {
  try {
    const clean = content.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const title = item => item && typeof item.title === 'string' && item.title.trim()
      ? { title: item.title.trim().slice(0, 100), year: Number.isInteger(item.year) ? item.year : undefined, type: item.type === 'tv' ? 'tv' : 'movie' }
      : null;
    const picks = (Array.isArray(parsed.picks) ? parsed.picks : []).map(title).filter(Boolean).slice(0, 20);
    if (picks.length < 5) return null;
    return { like_source: title(parsed.source) || undefined, like_picks: picks };
  } catch (e) {
    return null;
  }
}

// The AI's JSON, or null when it is missing or unusable
function parseAiAnswer(content) {
  try {
    const clean = content.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.genres && !parsed.search_query && !parsed.company_id) return null;
    if (parsed.genres && !Array.isArray(parsed.genres)) parsed.genres = [18, 28];
    return parsed;
  } catch (e) {
    return null;
  }
}

function buildPrompt(query) {
  return `You are an expert movie recommendation assistant. Convert ANY user request into TMDB search parameters.
Return ONLY valid JSON, no extra text, no markdown. Choose ONE of these formats:
FORMAT A — for studios/companies:
{"company_id": number}
FORMAT B — for genres/moods:
{"genres": [number], "year_from": number, "year_to": number}
FORMAT C — for specific titles/directors/actors/languages:
{"search_query": "string", "year_from": number, "year_to": number}
year_from and year_to are always optional.
COMPANY IDs:
pixar=3, disney=2, marvel=420, dc=9993, dreamworks=521,
studio ghibli=10342, a24=41077, blumhouse=3172,
illumination=6704, warner bros=174, universal=33,
paramount=4, sony=5, lionsgate=1632
TMDB Genre IDs:
28=Action, 12=Adventure, 16=Animation, 35=Comedy,
80=Crime, 99=Documentary, 18=Drama, 10751=Family,
14=Fantasy, 36=History, 27=Horror, 10402=Music,
9648=Mystery, 10749=Romance, 878=Sci-Fi,
53=Thriller, 10752=War, 37=Western
YEAR DETECTION:
50s=1950-1959, 60s=1960-1969, 70s=1970-1979,
80s=1980-1989, 90s=1990-1999, 2000s=2000-2009,
2010s=2010-2019, 2020s=2020-2029,
classic=1950-1985, recent/new=2020-2025
RULES:
company_id for studios/brands (pixar, marvel, dc, ghibli, a24...)
search_query for directors, actors, franchises, national cinemas
genres for moods, emotions, situations, descriptors
Add year_from/year_to when time period is mentioned
The request can be in any language (English, Ukrainian, Russian, French, Spanish...). Understand it in its own language; the JSON format stays the same. For search_query use the English or original title/name.
EXAMPLES:
"фильм про шахматиста" → {"genres": [18]}
"щось як Інтерстеллар" → {"genres": [878, 18]}
"films de Tarantino" → {"search_query": "quentin tarantino"}
"películas de Studio Ghibli" → {"company_id": 10342}
"something like inception" → {"genres": [9648, 878]}
"cozy sunday" → {"genres": [35, 10749]}
"zombie apocalypse" → {"genres": [27, 878]}
"revenge story" → {"genres": [28, 53]}
"cyberpunk action" → {"genres": [878, 28]}
"medical drama" → {"genres": [18]}
"prison escape" → {"genres": [18, 28]}
"dark 90s thriller" → {"genres": [53, 18], "year_from": 1990, "year_to": 1999}
User request: "${query}"`;
}

// ══════════════════════════════════════════════
// PROMPTS DATABASE (1000+ entries)
// ══════════════════════════════════════════════
const promptsDB = {
  // ══════════════════════════════════════════════
  // STUDIOS & COMPANIES
  // ══════════════════════════════════════════════
  "pixar": { company_id: 3 },
  "pixar movies": { company_id: 3 },
  "pixar films": { company_id: 3 },
  "pixar cartoons": { company_id: 3 },
  "pixar animated": { company_id: 3 },
  "classic pixar": { company_id: 3, year_from: 1995, year_to: 2010 },
  "new pixar": { company_id: 3, year_from: 2015, year_to: 2025 },
  "disney": { company_id: 2 },
  "disney movies": { company_id: 2 },
  "disney animated": { company_id: 2 },
  "disney classics": { company_id: 2, year_from: 1937, year_to: 1999 },
  "old disney": { company_id: 2, year_from: 1937, year_to: 1999 },
  "classic disney": { company_id: 2, year_from: 1937, year_to: 1999 },
  "disney princess": { company_id: 2, genres: [16, 10751] },
  "new disney": { company_id: 2, year_from: 2010, year_to: 2025 },
  "disney live action": { company_id: 2 },
  "walt disney": { company_id: 2 },
  "marvel": { company_id: 420 },
  "marvel movies": { company_id: 420 },
  "marvel films": { company_id: 420 },
  "mcu": { company_id: 420 },
  "avengers": { search_query: "avengers" },
  "iron man": { search_query: "iron man" },
  "spider-man": { search_query: "spider-man" },
  "spiderman": { search_query: "spider-man" },
  "thor": { search_query: "thor marvel" },
  "captain america": { search_query: "captain america" },
  "black panther": { search_query: "black panther" },
  "guardians of the galaxy": { search_query: "guardians of the galaxy" },
  "doctor strange": { search_query: "doctor strange" },
  "black widow": { search_query: "black widow" },
  "ant-man": { search_query: "ant-man" },
  "dc": { company_id: 9993 },
  "dc movies": { company_id: 9993 },
  "dc films": { company_id: 9993 },
  "dc comics": { company_id: 9993 },
  "batman": { search_query: "batman" },
  "superman": { search_query: "superman" },
  "wonder woman": { search_query: "wonder woman" },
  "justice league": { search_query: "justice league" },
  "aquaman": { search_query: "aquaman" },
  "the flash": { search_query: "the flash dc" },
  "joker": { search_query: "joker" },
  "studio ghibli": { company_id: 10342 },
  "ghibli": { company_id: 10342 },
  "ghibli movies": { company_id: 10342 },
  "miyazaki": { company_id: 10342 },
  "hayao miyazaki": { company_id: 10342 },
  "spirited away": { search_query: "spirited away" },
  "my neighbor totoro": { search_query: "my neighbor totoro" },
  "princess mononoke": { search_query: "princess mononoke" },
  "howls moving castle": { search_query: "howl's moving castle" },
  "nausicaa": { search_query: "nausicaa" },
  "castle in the sky": { search_query: "castle in the sky" },
  "kiki's delivery service": { search_query: "kiki's delivery service" },
  "dreamworks": { company_id: 521 },
  "dreamworks animation": { company_id: 521 },
  "shrek": { search_query: "shrek" },
  "kung fu panda": { search_query: "kung fu panda" },
  "how to train your dragon": { search_query: "how to train your dragon" },
  "httyd": { search_query: "how to train your dragon" },
  "madagascar": { search_query: "madagascar" },
  "the croods": { search_query: "the croods" },
  "trolls": { search_query: "trolls" },
  "bee movie": { search_query: "bee movie" },
  "illumination": { company_id: 6704 },
  "minions": { search_query: "minions" },
  "despicable me": { search_query: "despicable me" },
  "the secret life of pets": { search_query: "secret life of pets" },
  "sing": { search_query: "sing illumination" },
  "a24": { company_id: 41077 },
  "a24 movies": { company_id: 41077 },
  "a24 films": { company_id: 41077 },
  "a24 horror": { company_id: 41077, genres: [27] },
  "blumhouse": { company_id: 3172 },
  "blumhouse horror": { company_id: 3172 },
  "blumhouse movies": { company_id: 3172 },
  "warner bros": { company_id: 174 },
  "universal": { company_id: 33 },
  "paramount": { company_id: 4 },
  "sony pictures": { company_id: 5 },
  "lionsgate": { company_id: 1632 },
  "miramax": { company_id: 14 },

  // ══════════════════════════════════════════════
  // FRANCHISES
  // ══════════════════════════════════════════════
  "star wars": { search_query: "star wars" },
  "star wars movies": { search_query: "star wars" },
  "harry potter": { search_query: "harry potter" },
  "hogwarts": { search_query: "harry potter" },
  "fantastic beasts": { search_query: "fantastic beasts" },
  "lord of the rings": { search_query: "lord of the rings" },
  "lotr": { search_query: "lord of the rings" },
  "the hobbit": { search_query: "the hobbit" },
  "tolkien": { search_query: "tolkien" },
  "james bond": { search_query: "james bond" },
  "007": { search_query: "james bond" },
  "mission impossible": { search_query: "mission impossible" },
  "fast and furious": { search_query: "fast furious" },
  "fast furious": { search_query: "fast furious" },
  "jurassic park": { search_query: "jurassic park" },
  "jurassic world": { search_query: "jurassic world" },
  "indiana jones": { search_query: "indiana jones" },
  "terminator": { search_query: "terminator" },
  "alien": { search_query: "alien" },
  "aliens": { search_query: "aliens" },
  "john wick": { search_query: "john wick" },
  "matrix": { search_query: "matrix" },
  "the matrix": { search_query: "matrix" },
  "halloween": { search_query: "halloween" },
  "nightmare on elm street": { search_query: "nightmare elm street" },
  "freddy krueger": { search_query: "nightmare elm street" },
  "friday the 13th": { search_query: "friday 13th" },
  "jason voorhees": { search_query: "friday 13th" },
  "saw": { search_query: "saw" },
  "conjuring": { search_query: "conjuring" },
  "the conjuring": { search_query: "conjuring" },
  "hunger games": { search_query: "hunger games" },
  "twilight": { search_query: "twilight" },
  "pirates of the caribbean": { search_query: "pirates of the caribbean" },
  "transformers": { search_query: "transformers" },
  "x-men": { search_query: "x-men" },
  "xmen": { search_query: "x-men" },
  "toy story": { search_query: "toy story" },
  "finding nemo": { search_query: "finding nemo" },
  "finding dory": { search_query: "finding dory" },
  "the incredibles": { search_query: "incredibles" },
  "incredibles": { search_query: "incredibles" },
  "ice age": { search_query: "ice age" },
  "hotel transylvania": { search_query: "hotel transylvania" },
  "moana": { search_query: "moana" },
  "frozen": { search_query: "frozen" },
  "coco": { search_query: "coco pixar" },
  "wall-e": { search_query: "wall-e" },
  "up": { search_query: "up pixar" },
  "ratatouille": { search_query: "ratatouille" },
  "inside out": { search_query: "inside out pixar" },
  "soul": { search_query: "soul pixar" },
  "brave": { search_query: "brave pixar" },
  "monsters inc": { search_query: "monsters inc" },
  "encanto": { search_query: "encanto" },
  "turning red": { search_query: "turning red" },
  "luca": { search_query: "luca pixar" },
  "elemental": { search_query: "elemental pixar" },
  "zootopia": { search_query: "zootopia" },
  "tangled": { search_query: "tangled" },
  "big hero 6": { search_query: "big hero 6" },
  "wreck it ralph": { search_query: "wreck-it ralph" },

  // ══════════════════════════════════════════════
  // DIRECTORS
  // ══════════════════════════════════════════════
  "nolan": { search_query: "christopher nolan" },
  "christopher nolan": { search_query: "christopher nolan" },
  "nolan movies": { search_query: "christopher nolan" },
  "nolan films": { search_query: "christopher nolan" },
  "tarantino": { search_query: "quentin tarantino" },
  "quentin tarantino": { search_query: "quentin tarantino" },
  "kubrick": { search_query: "stanley kubrick" },
  "stanley kubrick": { search_query: "stanley kubrick" },
  "spielberg": { search_query: "steven spielberg" },
  "steven spielberg": { search_query: "steven spielberg" },
  "scorsese": { search_query: "martin scorsese" },
  "martin scorsese": { search_query: "martin scorsese" },
  "fincher": { search_query: "david fincher" },
  "david fincher": { search_query: "david fincher" },
  "lynch": { search_query: "david lynch" },
  "david lynch": { search_query: "david lynch" },
  "villeneuve": { search_query: "denis villeneuve" },
  "denis villeneuve": { search_query: "denis villeneuve" },
  "wes anderson": { search_query: "wes anderson" },
  "tim burton": { search_query: "tim burton" },
  "james cameron": { search_query: "james cameron" },
  "ridley scott": { search_query: "ridley scott" },
  "hitchcock": { search_query: "alfred hitchcock" },
  "alfred hitchcock": { search_query: "alfred hitchcock" },
  "coppola": { search_query: "francis ford coppola" },
  "francis ford coppola": { search_query: "francis ford coppola" },
  "peter jackson": { search_query: "peter jackson" },
  "guillermo del toro": { search_query: "guillermo del toro" },
  "del toro": { search_query: "guillermo del toro" },
  "darren aronofsky": { search_query: "darren aronofsky" },
  "aronofsky": { search_query: "darren aronofsky" },
  "sofia coppola": { search_query: "sofia coppola" },
  "wong kar-wai": { search_query: "wong kar-wai" },
  "bong joon-ho": { search_query: "bong joon-ho" },
  "bong": { search_query: "bong joon-ho" },
  "kurosawa": { search_query: "akira kurosawa" },
  "akira kurosawa": { search_query: "akira kurosawa" },
  "ingmar bergman": { search_query: "ingmar bergman" },
  "bergman": { search_query: "ingmar bergman" },
  "fellini": { search_query: "federico fellini" },
  "federico fellini": { search_query: "federico fellini" },
  "paul thomas anderson": { search_query: "paul thomas anderson" },
  "pta": { search_query: "paul thomas anderson" },
  "coen brothers": { search_query: "coen brothers" },
  "woody allen": { search_query: "woody allen" },
  "terry gilliam": { search_query: "terry gilliam" },
  "robert zemeckis": { search_query: "robert zemeckis" },
  "zemeckis": { search_query: "robert zemeckis" },
  "ron howard": { search_query: "ron howard" },
  "oliver stone": { search_query: "oliver stone" },
  "park chan-wook": { search_query: "park chan-wook" },
  "zhang yimou": { search_query: "zhang yimou" },
  "ang lee": { search_query: "ang lee" },
  "sam raimi": { search_query: "sam raimi" },
  "raimi": { search_query: "sam raimi" },
  "christopher nolan early films": { search_query: "christopher nolan", year_from: 1998, year_to: 2006 },

  // ══════════════════════════════════════════════
  // ACTORS & ACTRESSES
  // ══════════════════════════════════════════════
  "tom hanks": { search_query: "tom hanks" },
  "tom hanks movies": { search_query: "tom hanks" },
  "leonardo dicaprio": { search_query: "leonardo dicaprio" },
  "dicaprio": { search_query: "leonardo dicaprio" },
  "leo dicaprio": { search_query: "leonardo dicaprio" },
  "brad pitt": { search_query: "brad pitt" },
  "morgan freeman": { search_query: "morgan freeman" },
  "meryl streep": { search_query: "meryl streep" },
  "cate blanchett": { search_query: "cate blanchett" },
  "natalie portman": { search_query: "natalie portman" },
  "scarlett johansson": { search_query: "scarlett johansson" },
  "ryan gosling": { search_query: "ryan gosling" },
  "gosling": { search_query: "ryan gosling" },
  "joaquin phoenix": { search_query: "joaquin phoenix" },
  "christian bale": { search_query: "christian bale" },
  "matt damon": { search_query: "matt damon" },
  "robert de niro": { search_query: "robert de niro" },
  "de niro": { search_query: "robert de niro" },
  "al pacino": { search_query: "al pacino" },
  "pacino": { search_query: "al pacino" },
  "denzel washington": { search_query: "denzel washington" },
  "denzel": { search_query: "denzel washington" },
  "will smith": { search_query: "will smith" },
  "johnny depp": { search_query: "johnny depp" },
  "depp": { search_query: "johnny depp" },
  "keanu reeves": { search_query: "keanu reeves" },
  "keanu": { search_query: "keanu reeves" },
  "samuel l jackson": { search_query: "samuel l jackson" },
  "bruce willis": { search_query: "bruce willis" },
  "sylvester stallone": { search_query: "sylvester stallone" },
  "stallone": { search_query: "sylvester stallone" },
  "arnold schwarzenegger": { search_query: "arnold schwarzenegger" },
  "schwarzenegger": { search_query: "arnold schwarzenegger" },
  "arnie": { search_query: "arnold schwarzenegger" },
  "tom cruise": { search_query: "tom cruise" },
  "harrison ford": { search_query: "harrison ford" },
  "clint eastwood": { search_query: "clint eastwood" },
  "eastwood": { search_query: "clint eastwood" },
  "emma stone": { search_query: "emma stone" },
  "jennifer lawrence": { search_query: "jennifer lawrence" },
  "anne hathaway": { search_query: "anne hathaway" },
  "charlize theron": { search_query: "charlize theron" },
  "timothee chalamet": { search_query: "timothée chalamet" },
  "chalamet": { search_query: "timothée chalamet" },
  "florence pugh": { search_query: "florence pugh" },
  "zendaya": { search_query: "zendaya" },
  "pedro pascal": { search_query: "pedro pascal" },
  "adam driver": { search_query: "adam driver" },
  "margot robbie": { search_query: "margot robbie" },
  "cillian murphy": { search_query: "cillian murphy" },
  "paul mescal": { search_query: "paul mescal" },
  "austin butler": { search_query: "austin butler" },
  "andrew garfield": { search_query: "andrew garfield" },
  "tom holland": { search_query: "tom holland" },
  "robert pattinson": { search_query: "robert pattinson" },
  "pattinson": { search_query: "robert pattinson" },
  "dwayne johnson": { search_query: "dwayne johnson" },
  "the rock": { search_query: "dwayne johnson" },
  "chris pratt": { search_query: "chris pratt" },
  "chris hemsworth": { search_query: "chris hemsworth" },
  "chris evans": { search_query: "chris evans" },
  "robert downey jr": { search_query: "robert downey" },
  "rdj": { search_query: "robert downey" },
  "vin diesel": { search_query: "vin diesel" },
  "liam neeson": { search_query: "liam neeson" },
  "neeson": { search_query: "liam neeson" },
  "russell crowe": { search_query: "russell crowe" },
  "colin farrell": { search_query: "colin farrell" },
  "benedict cumberbatch": { search_query: "benedict cumberbatch" },
  "cumberbatch": { search_query: "benedict cumberbatch" },
  "daniel craig": { search_query: "daniel craig" },
  "idris elba": { search_query: "idris elba" },
  "jake gyllenhaal": { search_query: "jake gyllenhaal" },
  "gyllenhaal": { search_query: "jake gyllenhaal" },
  "oscar isaac": { search_query: "oscar isaac" },
  "michael fassbender": { search_query: "michael fassbender" },
  "viola davis": { search_query: "viola davis" },
  "lupita nyongo": { search_query: "lupita nyong'o" },
  "chadwick boseman": { search_query: "chadwick boseman" },
  "angela bassett": { search_query: "angela bassett" },
  "halle berry": { search_query: "halle berry" },
  "nicole kidman": { search_query: "nicole kidman" },
  "julia roberts": { search_query: "julia roberts" },
  "reese witherspoon": { search_query: "reese witherspoon" },
  "cate winslet": { search_query: "kate winslet" },
  "kate winslet": { search_query: "kate winslet" },
  "gwyneth paltrow": { search_query: "gwyneth paltrow" },
  "judi dench": { search_query: "judi dench" },
  "helen mirren": { search_query: "helen mirren" },
  "gary oldman": { search_query: "gary oldman" },
  "anthony hopkins": { search_query: "anthony hopkins" },
  "hopkins": { search_query: "anthony hopkins" },
  "jack nicholson": { search_query: "jack nicholson" },
  "nicholson": { search_query: "jack nicholson" },
  "dustin hoffman": { search_query: "dustin hoffman" },
  "gene hackman": { search_query: "gene hackman" },
  "robert redford": { search_query: "robert redford" },
  "paul newman": { search_query: "paul newman" },
  "marlon brando": { search_query: "marlon brando" },
  "brando": { search_query: "marlon brando" },
  "humphrey bogart": { search_query: "humphrey bogart" },
  "bogart": { search_query: "humphrey bogart" },
  "james dean": { search_query: "james dean" },
  "audrey hepburn": { search_query: "audrey hepburn" },
  "grace kelly": { search_query: "grace kelly" },
  "marilyn monroe": { search_query: "marilyn monroe" },
  "clint eastwood actor": { search_query: "clint eastwood" },

  // ══════════════════════════════════════════════
  // NATIONAL CINEMAS
  // ══════════════════════════════════════════════
  "korean": { search_query: "korean" },
  "korean movies": { search_query: "korean" },
  "korean drama": { search_query: "korean" },
  "k-drama": { search_query: "korean" },
  "k-movie": { search_query: "korean" },
  "korean horror": { search_query: "korean horror" },
  "korean thriller": { search_query: "korean thriller" },
  "korean romance": { search_query: "korean romance" },
  "korean action": { search_query: "korean action" },
  "parasite": { search_query: "parasite bong" },
  "oldboy": { search_query: "oldboy" },
  "train to busan": { search_query: "train to busan" },
  "the wailing": { search_query: "the wailing" },
  "squid game": { search_query: "squid game" },
  "japanese": { search_query: "japanese" },
  "japanese movies": { search_query: "japanese" },
  "japanese anime": { search_query: "anime" },
  "j-drama": { search_query: "japanese drama" },
  "japanese horror": { search_query: "japanese horror" },
  "japanese thriller": { search_query: "japanese thriller" },
  "ringu": { search_query: "ring japanese" },
  "akira": { search_query: "akira anime" },
  "french": { search_query: "french" },
  "french movies": { search_query: "french" },
  "french cinema": { search_query: "french" },
  "french romance": { search_query: "french romance" },
  "french comedy": { search_query: "french comedy" },
  "french thriller": { search_query: "french thriller" },
  "french horror": { search_query: "french horror" },
  "new french extremity": { search_query: "french horror extreme" },
  "french new wave": { search_query: "french new wave cinema" },
  "italian": { search_query: "italian" },
  "italian cinema": { search_query: "italian" },
  "italian movies": { search_query: "italian" },
  "spaghetti western": { genres: [37], search_query: "spaghetti western" },
  "italian horror": { search_query: "italian horror" },
  "spanish": { search_query: "spanish" },
  "spanish movies": { search_query: "spanish" },
  "spanish horror": { search_query: "spanish horror" },
  "german": { search_query: "german" },
  "german cinema": { search_query: "german" },
  "german movies": { search_query: "german" },
  "bollywood": { search_query: "bollywood" },
  "indian movies": { search_query: "bollywood" },
  "indian cinema": { search_query: "bollywood" },
  "hindi movies": { search_query: "hindi" },
  "old bollywood": { search_query: "bollywood", year_from: 1970, year_to: 2000 },
  "classic bollywood": { search_query: "bollywood", year_from: 1950, year_to: 1990 },
  "new bollywood": { search_query: "bollywood", year_from: 2010, year_to: 2025 },
  "bollywood romance": { search_query: "bollywood romance" },
  "bollywood action": { search_query: "bollywood action" },
  "chinese": { search_query: "chinese" },
  "chinese cinema": { search_query: "chinese" },
  "chinese movies": { search_query: "chinese" },
  "kung fu movies": { search_query: "kung fu" },
  "hong kong": { search_query: "hong kong" },
  "turkish": { search_query: "turkish" },
  "turkish drama": { search_query: "turkish drama" },
  "turkish movies": { search_query: "turkish" },
  "russian": { search_query: "russian" },
  "russian cinema": { search_query: "russian" },
  "russian movies": { search_query: "russian" },
  "soviet cinema": { search_query: "soviet film", year_from: 1950, year_to: 1991 },
  "scandinavian": { search_query: "scandinavian" },
  "nordic": { search_query: "nordic film" },
  "swedish movies": { search_query: "swedish film" },
  "danish movies": { search_query: "danish film" },
  "norwegian movies": { search_query: "norwegian film" },
  "iranian": { search_query: "iranian" },
  "iranian cinema": { search_query: "iranian" },
  "polish": { search_query: "polish film" },
  "ukrainian": { search_query: "ukrainian film" },
  "latin american": { search_query: "latin american film" },
  "mexican": { search_query: "mexican film" },
  "argentinian": { search_query: "argentinian film" },
  "brazilian": { search_query: "brazilian film" },

  // ══════════════════════════════════════════════
  // GENRES — PURE
  // ══════════════════════════════════════════════
  "action": { genres: [28] },
  "action movies": { genres: [28] },
  "action films": { genres: [28] },
  "adventure": { genres: [12] },
  "adventure movies": { genres: [12] },
  "animation": { genres: [16] },
  "animated": { genres: [16] },
  "animated movies": { genres: [16] },
  "cartoons": { genres: [16] },
  "comedy": { genres: [35] },
  "comedies": { genres: [35] },
  "comedy movies": { genres: [35] },
  "crime": { genres: [80] },
  "crime movies": { genres: [80] },
  "documentary": { genres: [99] },
  "documentaries": { genres: [99] },
  "drama": { genres: [18] },
  "dramas": { genres: [18] },
  "family": { genres: [10751] },
  "family movies": { genres: [10751] },
  "family films": { genres: [10751] },
  "fantasy": { genres: [14] },
  "fantasy movies": { genres: [14] },
  "history": { genres: [36] },
  "historical": { genres: [36, 18] },
  "horror": { genres: [27] },
  "horror movies": { genres: [27] },
  "horror films": { genres: [27] },
  "music": { genres: [10402] },
  "musical": { genres: [10402] },
  "mystery": { genres: [9648] },
  "mystery movies": { genres: [9648] },
  "romance": { genres: [10749] },
  "romantic": { genres: [10749, 35] },
  "romance movies": { genres: [10749] },
  "sci-fi": { genres: [878] },
  "scifi": { genres: [878] },
  "science fiction": { genres: [878] },
  "thriller": { genres: [53] },
  "thrillers": { genres: [53] },
  "war": { genres: [10752] },
  "war movies": { genres: [10752] },
  "western": { genres: [37] },
  "westerns": { genres: [37] },
  "western movies": { genres: [37] },

  // ══════════════════════════════════════════════
  // GENRE COMBINATIONS
  // ══════════════════════════════════════════════
  "romantic comedy": { genres: [10749, 35] },
  "romcom": { genres: [10749, 35] },
  "rom com": { genres: [10749, 35] },
  "action comedy": { genres: [28, 35] },
  "horror comedy": { genres: [27, 35] },
  "dark comedy": { genres: [35, 80] },
  "black comedy": { genres: [35, 80] },
  "crime comedy": { genres: [80, 35] },
  "sci-fi thriller": { genres: [878, 53] },
  "sci fi thriller": { genres: [878, 53] },
  "crime thriller": { genres: [80, 53] },
  "psychological thriller": { genres: [53, 9648] },
  "action thriller": { genres: [28, 53] },
  "romantic drama": { genres: [10749, 18] },
  "crime drama": { genres: [80, 18] },
  "historical drama": { genres: [36, 18] },
  "fantasy adventure": { genres: [14, 12] },
  "action adventure": { genres: [28, 12] },
  "supernatural horror": { genres: [27, 14] },
  "found footage horror": { genres: [27] },
  "slasher": { genres: [27] },
  "slasher movies": { genres: [27] },
  "survival horror": { genres: [27, 53] },
  "biopic": { genres: [18, 36] },
  "biographical": { genres: [18, 36] },
  "biographical drama": { genres: [18, 36] },
  "spy": { genres: [28, 53] },
  "spy movies": { genres: [28, 53] },
  "spy thriller": { genres: [28, 53] },
  "espionage": { genres: [28, 53] },
  "superhero": { genres: [28, 12] },
  "superhero movies": { genres: [28, 12] },
  "disaster": { genres: [28, 12] },
  "disaster movies": { genres: [28, 12] },
  "heist": { genres: [80, 53] },
  "heist movies": { genres: [80, 53] },
  "gangster": { genres: [80, 18] },
  "gangster movies": { genres: [80, 18] },
  "mafia": { genres: [80, 18] },
  "teen comedy": { genres: [35, 10751] },
  "coming of age": { genres: [18, 35] },
  "coming of age drama": { genres: [18] },
  "road movie": { genres: [12, 18] },
  "road trip": { genres: [12, 35] },
  "buddy movie": { genres: [35, 28] },
  "buddy cop": { genres: [28, 35] },
  "zombie": { genres: [27] },
  "zombie movies": { genres: [27] },
  "vampire": { genres: [27, 14] },
  "vampire movies": { genres: [27, 14] },

  // ══════════════════════════════════════════════
  // DECADES — GENRES BY ERA
  // ══════════════════════════════════════════════
  // 1930s-40s
  "1930s": { year_from: 1930, year_to: 1939 },
  "30s movies": { year_from: 1930, year_to: 1939 },
  "1940s": { year_from: 1940, year_to: 1949 },
  "40s movies": { year_from: 1940, year_to: 1949 },
  "film noir": { genres: [80, 9648], year_from: 1940, year_to: 1960 },
  "classic hollywood": { year_from: 1930, year_to: 1960 },
  "golden age hollywood": { year_from: 1930, year_to: 1960 },
  "old hollywood": { year_from: 1930, year_to: 1965 },
  // 1950s
  "50s movies": { year_from: 1950, year_to: 1959 },
  "1950s": { year_from: 1950, year_to: 1959 },
  "50s horror": { genres: [27], year_from: 1950, year_to: 1959 },
  "50s sci-fi": { genres: [878], year_from: 1950, year_to: 1959 },
  "50s westerns": { genres: [37], year_from: 1950, year_to: 1959 },
  "50s romance": { genres: [10749], year_from: 1950, year_to: 1959 },
  // 1960s
  "60s movies": { year_from: 1960, year_to: 1969 },
  "1960s": { year_from: 1960, year_to: 1969 },
  "60s horror": { genres: [27], year_from: 1960, year_to: 1969 },
  "60s comedy": { genres: [35], year_from: 1960, year_to: 1969 },
  "60s drama": { genres: [18], year_from: 1960, year_to: 1969 },
  "60s westerns": { genres: [37], year_from: 1960, year_to: 1969 },
  "60s sci-fi": { genres: [878], year_from: 1960, year_to: 1969 },
  "60s romance": { genres: [10749], year_from: 1960, year_to: 1969 },
  "60s musicals": { genres: [10402], year_from: 1960, year_to: 1969 },
  "new wave cinema": { genres: [18], year_from: 1958, year_to: 1972 },
  // 1970s
  "70s movies": { year_from: 1970, year_to: 1979 },
  "1970s": { year_from: 1970, year_to: 1979 },
  "70s horror": { genres: [27], year_from: 1970, year_to: 1979 },
  "70s action": { genres: [28], year_from: 1970, year_to: 1979 },
  "70s drama": { genres: [18], year_from: 1970, year_to: 1979 },
  "70s thriller": { genres: [53], year_from: 1970, year_to: 1979 },
  "70s crime": { genres: [80], year_from: 1970, year_to: 1979 },
  "70s sci-fi": { genres: [878], year_from: 1970, year_to: 1979 },
  "70s comedy": { genres: [35], year_from: 1970, year_to: 1979 },
  "70s romance": { genres: [10749], year_from: 1970, year_to: 1979 },
  "70s westerns": { genres: [37], year_from: 1970, year_to: 1979 },
  "grindhouse": { genres: [27, 28], year_from: 1965, year_to: 1985 },
  "blaxploitation": { genres: [28, 80], year_from: 1970, year_to: 1979 },
  "new hollywood": { genres: [18, 80], year_from: 1967, year_to: 1980 },
  // 1980s
  "80s movies": { year_from: 1980, year_to: 1989 },
  "1980s": { year_from: 1980, year_to: 1989 },
  "80s horror": { genres: [27], year_from: 1980, year_to: 1989 },
  "80s horrors": { genres: [27], year_from: 1980, year_to: 1989 },
  "horror 80s": { genres: [27], year_from: 1980, year_to: 1989 },
  "horrors of 80s": { genres: [27], year_from: 1980, year_to: 1989 },
  "horror of 80s": { genres: [27], year_from: 1980, year_to: 1989 },
  "80s action": { genres: [28], year_from: 1980, year_to: 1989 },
  "80s action movies": { genres: [28, 12], year_from: 1980, year_to: 1989 },
  "80s comedy": { genres: [35], year_from: 1980, year_to: 1989 },
  "80s drama": { genres: [18], year_from: 1980, year_to: 1989 },
  "80s sci-fi": { genres: [878], year_from: 1980, year_to: 1989 },
  "80s thriller": { genres: [53], year_from: 1980, year_to: 1989 },
  "80s romance": { genres: [10749, 35], year_from: 1980, year_to: 1989 },
  "80s teen": { genres: [35, 18], year_from: 1980, year_to: 1989 },
  "80s adventure": { genres: [12], year_from: 1980, year_to: 1989 },
  "80s animation": { genres: [16], year_from: 1980, year_to: 1989 },
  "80s slasher": { genres: [27], year_from: 1980, year_to: 1989 },
  "80s fantasy": { genres: [14], year_from: 1980, year_to: 1989 },
  "80s war movies": { genres: [10752], year_from: 1980, year_to: 1989 },
  "80s crime": { genres: [80], year_from: 1980, year_to: 1989 },
  "retro action": { genres: [28], year_from: 1980, year_to: 1995 },
  // 1990s
  "90s movies": { year_from: 1990, year_to: 1999 },
  "1990s": { year_from: 1990, year_to: 1999 },
  "90s horror": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors of 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror of 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s action": { genres: [28], year_from: 1990, year_to: 1999 },
  "90s action movies": { genres: [28, 12], year_from: 1990, year_to: 1999 },
  "90s comedy": { genres: [35], year_from: 1990, year_to: 1999 },
  "90s drama": { genres: [18], year_from: 1990, year_to: 1999 },
  "90s sci-fi": { genres: [878], year_from: 1990, year_to: 1999 },
  "90s thriller": { genres: [53], year_from: 1990, year_to: 1999 },
  "90s romance": { genres: [10749, 35], year_from: 1990, year_to: 1999 },
  "90s teen": { genres: [35, 18], year_from: 1990, year_to: 1999 },
  "90s animation": { genres: [16], year_from: 1990, year_to: 1999 },
  "90s adventure": { genres: [12], year_from: 1990, year_to: 1999 },
  "90s crime": { genres: [80], year_from: 1990, year_to: 1999 },
  "90s fantasy": { genres: [14], year_from: 1990, year_to: 1999 },
  "90s war movies": { genres: [10752], year_from: 1990, year_to: 1999 },
  "90s slasher": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s romcom": { genres: [10749, 35], year_from: 1990, year_to: 1999 },
  "90s cartoons": { genres: [16, 10751], year_from: 1990, year_to: 1999 },
  "90s family": { genres: [10751], year_from: 1990, year_to: 1999 },
  "90s classics": { year_from: 1990, year_to: 1999 },
  // 2000s
  "2000s movies": { year_from: 2000, year_to: 2009 },
  "2000s": { year_from: 2000, year_to: 2009 },
  "2000s horror": { genres: [27], year_from: 2000, year_to: 2009 },
  "2000s action": { genres: [28], year_from: 2000, year_to: 2009 },
  "2000s comedy": { genres: [35], year_from: 2000, year_to: 2009 },
  "2000s drama": { genres: [18], year_from: 2000, year_to: 2009 },
  "2000s sci-fi": { genres: [878], year_from: 2000, year_to: 2009 },
  "2000s thriller": { genres: [53], year_from: 2000, year_to: 2009 },
  "2000s romance": { genres: [10749, 35], year_from: 2000, year_to: 2009 },
  "2000s romcom": { genres: [10749, 35], year_from: 2000, year_to: 2009 },
  "2000s animation": { genres: [16], year_from: 2000, year_to: 2009 },
  "2000s teen": { genres: [35, 18], year_from: 2000, year_to: 2009 },
  "2000s crime": { genres: [80], year_from: 2000, year_to: 2009 },
  "2000s fantasy": { genres: [14, 12], year_from: 2000, year_to: 2009 },
  "early 2000s": { year_from: 2000, year_to: 2005 },
  // 2010s
  "2010s movies": { year_from: 2010, year_to: 2019 },
  "2010s": { year_from: 2010, year_to: 2019 },
  "2010s horror": { genres: [27], year_from: 2010, year_to: 2019 },
  "2010s action": { genres: [28], year_from: 2010, year_to: 2019 },
  "2010s drama": { genres: [18], year_from: 2010, year_to: 2019 },
  "2010s comedy": { genres: [35], year_from: 2010, year_to: 2019 },
  "2010s sci-fi": { genres: [878], year_from: 2010, year_to: 2019 },
  "2010s romance": { genres: [10749], year_from: 2010, year_to: 2019 },
  "2010s thriller": { genres: [53], year_from: 2010, year_to: 2019 },
  "last decade": { year_from: 2010, year_to: 2019 },
  // 2020s
  "2020s movies": { year_from: 2020, year_to: 2025 },
  "2020s": { year_from: 2020, year_to: 2025 },
  "2020s horror": { genres: [27], year_from: 2020, year_to: 2025 },
  "2020s drama": { genres: [18], year_from: 2020, year_to: 2025 },
  "recent movies": { year_from: 2022, year_to: 2025 },
  "new releases": { year_from: 2023, year_to: 2025 },
  "this year": { year_from: 2024, year_to: 2025 },
  "last year": { year_from: 2023, year_to: 2024 },
  "recent horror": { genres: [27], year_from: 2018, year_to: 2025 },
  "recent action": { genres: [28], year_from: 2018, year_to: 2025 },
  "recent drama": { genres: [18], year_from: 2018, year_to: 2025 },
  "new movies": { year_from: 2022, year_to: 2025 },
  "latest movies": { year_from: 2023, year_to: 2025 },
  "modern movies": { year_from: 2010, year_to: 2025 },
  "classic movies": { year_from: 1940, year_to: 1985 },
  "classic films": { year_from: 1940, year_to: 1985 },
  "old movies": { year_from: 1940, year_to: 1990 },
  "vintage movies": { year_from: 1940, year_to: 1985 },
  "vintage films": { year_from: 1940, year_to: 1985 },
  "retro movies": { year_from: 1960, year_to: 1990 },

  // ══════════════════════════════════════════════
  // MOODS & EMOTIONS
  // ══════════════════════════════════════════════
  "sad": { genres: [18] },
  "want to cry": { genres: [18] },
  "need to cry": { genres: [18] },
  "feel like crying": { genres: [18] },
  "something sad": { genres: [18] },
  "tearjerker": { genres: [18] },
  "emotional": { genres: [18] },
  "heartbreaking": { genres: [18] },
  "make me cry": { genres: [18] },
  "cry my eyes out": { genres: [18] },
  "happy": { genres: [35, 10749] },
  "feel good": { genres: [35, 18] },
  "feel good movie": { genres: [35, 18] },
  "uplifting": { genres: [35, 18] },
  "cheerful": { genres: [35] },
  "positive vibes": { genres: [35, 10749] },
  "wholesome": { genres: [35, 10751] },
  "something happy": { genres: [35] },
  "make me laugh": { genres: [35] },
  "need to laugh": { genres: [35] },
  "funny": { genres: [35] },
  "hilarious": { genres: [35] },
  "laugh out loud": { genres: [35] },
  "scared": { genres: [27, 53] },
  "want to be scared": { genres: [27] },
  "something scary": { genres: [27] },
  "creepy": { genres: [27, 9648] },
  "terrifying": { genres: [27] },
  "nightmare": { genres: [27] },
  "disturbing": { genres: [27, 18] },
  "unsettling": { genres: [27, 9648] },
  "dark and creepy": { genres: [27, 53] },
  "excited": { genres: [28, 12] },
  "pumped": { genres: [28] },
  "adrenaline": { genres: [28, 12] },
  "hyped": { genres: [28] },
  "intense": { genres: [28, 53] },
  "edge of seat": { genres: [53, 28] },
  "thrilling": { genres: [53] },
  "relaxed": { genres: [35, 10749] },
  "calm": { genres: [35, 10749] },
  "cozy": { genres: [35, 10749] },
  "chill": { genres: [35, 10749] },
  "cozy evening": { genres: [35, 10749] },
  "chill movie": { genres: [35, 10749] },
  "something light": { genres: [35, 10749] },
  "easy watching": { genres: [35, 10749] },
  "not too heavy": { genres: [35, 10749] },
  "easy to watch": { genres: [35, 10749] },
  "inspired": { genres: [18, 36] },
  "motivating": { genres: [18, 36] },
  "motivational": { genres: [18, 36] },
  "inspiring": { genres: [18, 36] },
  "empowering": { genres: [18, 36] },
  "nostalgic": { genres: [16, 10751] },
  "childhood": { genres: [16, 10751] },
  "childhood movies": { genres: [16, 10751] },
  "childhood favorites": { genres: [16, 10751] },
  "miss childhood": { genres: [16, 10751] },
  "thoughtful": { genres: [18, 878] },
  "philosophical": { genres: [18, 878] },
  "deep": { genres: [18, 878] },
  "something to think about": { genres: [18, 878] },
  "thought provoking": { genres: [18, 878] },
  "mind blowing": { genres: [878, 9648] },
  "mind-blowing": { genres: [878, 9648] },
  "mind bending": { genres: [878, 9648] },
  "mind-bending": { genres: [878, 9648] },
  "plot twist": { genres: [9648, 53] },
  "unpredictable": { genres: [9648, 53] },
  "keeps you guessing": { genres: [9648, 53] },
  "mindfuck": { genres: [878, 9648] },
  "complex": { genres: [9648, 18] },
  "layered": { genres: [9648, 18] },
  "adventurous": { genres: [12, 14] },
  "epic": { genres: [28, 12] },
  "something epic": { genres: [28, 12] },
  "grand": { genres: [28, 12] },
  "spectacular": { genres: [28, 12] },
  "big blockbuster": { genres: [28, 12] },
  "romantic": { genres: [10749, 35] },
  "in love": { genres: [10749] },
  "love story": { genres: [10749] },
  "lovey dovey": { genres: [10749, 35] },
  "want romance": { genres: [10749] },
  "something romantic": { genres: [10749, 35] },
  "dark": { genres: [18, 53] },
  "dark movie": { genres: [18, 53] },
  "gloomy": { genres: [18, 53] },
  "dark and gritty": { genres: [18, 80] },
  "gritty": { genres: [18, 80] },
  "brutal": { genres: [18, 28] },
  "heavy": { genres: [18, 53] },
  "serious": { genres: [18] },
  "dark and heavy": { genres: [18, 53] },
  "tense": { genres: [53] },
  "gripping": { genres: [53, 9648] },
  "suspenseful": { genres: [53] },
  "on the edge": { genres: [53, 28] },
  "cannot stop watching": { genres: [53, 9648] },
  "binge worthy": { genres: [53, 9648] },

  // ══════════════════════════════════════════════
  // SITUATIONS — VERY DETAILED
  // ══════════════════════════════════════════════
  // DATE & RELATIONSHIP
  "date night": { genres: [10749, 35] },
  "date night movie": { genres: [10749, 35] },
  "first date": { genres: [10749, 35] },
  "movie for a date": { genres: [10749, 35] },
  "with girlfriend": { genres: [10749, 35] },
  "with boyfriend": { genres: [10749, 35] },
  "with my partner": { genres: [10749, 35] },
  "romantic evening": { genres: [10749, 35] },
  "romantic night": { genres: [10749, 35] },
  "anniversary": { genres: [10749, 18] },
  "valentines day": { genres: [10749, 35] },
  "valentine": { genres: [10749, 35] },
  // BREAKUP & HEARTBREAK
  "after breakup": { genres: [18, 10749] },
  "breakup movie": { genres: [18] },
  "heartbroken": { genres: [18] },
  "got dumped": { genres: [18, 35] },
  "healing heart": { genres: [18, 10749] },
  "moving on": { genres: [18, 35] },
  "end of relationship": { genres: [18] },
  "broken heart": { genres: [18] },
  "crying over ex": { genres: [18] },
  "sad after love": { genres: [18] },
  "eat ice cream and cry": { genres: [18, 10749] },
  // FAMILY & KIDS
  "family night": { genres: [10751, 16] },
  "family movie night": { genres: [10751, 16] },
  "with kids": { genres: [10751, 16] },
  "for the whole family": { genres: [10751, 16] },
  "for kids": { genres: [10751, 16] },
  "with children": { genres: [10751, 16] },
  "with toddlers": { genres: [16, 10751] },
  "sunday family": { genres: [10751, 16] },
  "family weekend": { genres: [10751, 16] },
  "christmas family": { genres: [10751, 35] },
  "for all ages": { genres: [10751, 16] },
  "kids movies": { genres: [10751, 16] },
  "for my daughter": { genres: [10751, 16] },
  "for my son": { genres: [10751, 16] },
  "kids animation": { genres: [16, 10751] },
  // GIRLS NIGHT
  "girls night": { genres: [35, 10749] },
  "girls night out": { genres: [35, 10749] },
  "girls night in": { genres: [35, 10749] },
  "chick flick": { genres: [10749, 35] },
  "with girlfriends": { genres: [35, 10749] },
  "girls weekend": { genres: [35, 10749] },
  "bachelorette": { genres: [35, 10749] },
  "wine and movie": { genres: [35, 10749] },
  "ladies night": { genres: [35, 10749] },
  // GUYS NIGHT
  "guys night": { genres: [28, 35] },
  "boys night": { genres: [28, 35] },
  "with the bros": { genres: [28, 35] },
  "with friends": { genres: [28, 35] },
  "group movie night": { genres: [28, 35] },
  "bro movie": { genres: [28, 35] },
  "lads night": { genres: [28, 35] },
  "stag night": { genres: [28, 35] },
  // TIME OF DAY
  "morning": { genres: [35, 10749] },
  "sunday morning": { genres: [35, 10749] },
  "lazy morning": { genres: [35] },
  "saturday morning": { genres: [35, 10751] },
  "morning movie": { genres: [35, 10749] },
  "afternoon": { genres: [35, 12] },
  "sunday afternoon": { genres: [35, 18] },
  "evening": { genres: [53, 9648] },
  "friday night": { genres: [28, 35] },
  "saturday night": { genres: [28, 35] },
  "weekend": { genres: [28, 35] },
  "late night": { genres: [53, 27] },
  "midnight": { genres: [27, 53] },
  "3am": { genres: [27, 53] },
  "cant sleep": { genres: [53, 27] },
  "can't sleep": { genres: [53, 27] },
  "insomnia": { genres: [53, 27] },
  "cant sleep movie": { genres: [53, 9648] },
  "late night movie": { genres: [53, 27] },
  "night owl": { genres: [53, 27] },
  // WEATHER & SEASON
  "rainy day": { genres: [35, 18] },
  "rainy evening": { genres: [35, 18] },
  "rainy sunday": { genres: [35, 18] },
  "raining outside": { genres: [35, 18] },
  "cozy rainy day": { genres: [35, 10749] },
  "snowy day": { genres: [35, 10749] },
  "winter evening": { genres: [35, 10749] },
  "cold outside": { genres: [35, 10749] },
  "hot summer": { genres: [28, 12] },
  "summer movie": { genres: [28, 12] },
  "summer night": { genres: [35, 10749] },
  "christmas movie": { genres: [35, 10751] },
  "christmas": { genres: [35, 10751] },
  "halloween movie": { genres: [27] },
  "thanksgiving": { genres: [35, 10751] },
  "new year": { genres: [35, 10749] },
  // ENERGY STATE
  "no energy": { genres: [35, 10749] },
  "tired": { genres: [35, 10749] },
  "exhausted": { genres: [35, 10749] },
  "after hard day": { genres: [35, 10749] },
  "after work": { genres: [35, 10749] },
  "long day at work": { genres: [35, 10749] },
  "stressed out": { genres: [35, 10749] },
  "need to unwind": { genres: [35, 10749] },
  "want to relax": { genres: [35, 10749] },
  "comfort movie": { genres: [35, 10749] },
  "comfort watch": { genres: [35, 10749] },
  "background noise": { genres: [35] },
  "background movie": { genres: [35] },
  "half watching": { genres: [35] },
  "not paying full attention": { genres: [35] },
  "while eating": { genres: [35] },
  "lunch movie": { genres: [35] },
  "energetic": { genres: [28, 12] },
  "full of energy": { genres: [28, 12] },
  "workout motivation": { genres: [28, 12] },
  "before gym": { genres: [28, 12] },
  "pump me up": { genres: [28, 12] },
  // MENTAL STATE
  "bored": { genres: [28, 35] },
  "nothing to do": { genres: [28, 35] },
  "kill time": { genres: [28, 35] },
  "procrastinating": { genres: [35, 53] },
  "overthinking": { genres: [9648, 18] },
  "anxious": { genres: [35, 10749] },
  "depressed": { genres: [18, 35] },
  "lonely": { genres: [18, 35] },
  "alone": { genres: [18, 9648] },
  "solo movie night": { genres: [53, 9648] },
  "home alone": { genres: [53, 9648] },
  "want to escape": { genres: [12, 14] },
  "need distraction": { genres: [28, 35] },
  "overthink less": { genres: [35] },
  "need inspiration": { genres: [18, 36] },
  "feeling empty": { genres: [18] },
  "feeling lost": { genres: [18, 12] },
  "need motivation": { genres: [18, 36] },
  // SOCIAL
  "movie marathon": { genres: [28, 12] },
  "marathon": { genres: [28, 12] },
  "binge watch": { genres: [53, 9648] },
  "party": { genres: [35, 28] },
  "house party": { genres: [35, 28] },
  "drinking game": { genres: [35, 28] },
  "movie night": { genres: [53, 35] },
  "sleepover": { genres: [35, 27] },
  "sleepover movie": { genres: [35, 27] },
  "slumber party": { genres: [35, 27] },
  "first movie together": { genres: [10749, 35] },
  "new to cinema": { genres: [28, 12] },
  // FOOD-RELATED
  "pizza night": { genres: [35, 28] },
  "popcorn movie": { genres: [28, 35] },
  "junk food and movie": { genres: [28, 35] },
  "movie snacks": { genres: [28, 35] },
  "takeout night": { genres: [35, 28] },
  "delivery and movie": { genres: [35, 28] },
  // SPECIFIC VIBES
  "cozy autumn": { genres: [35, 9648] },
  "autumn vibes": { genres: [35, 9648] },
  "halloween vibes": { genres: [27, 9648] },
  "spooky season": { genres: [27] },
  "holiday vibes": { genres: [35, 10751] },
  "summer vibes": { genres: [12, 35] },
  "beach vibes": { genres: [35, 12] },
  "camping vibes": { genres: [12, 27] },
  "road trip vibes": { genres: [12, 35] },
  "monday blues": { genres: [35, 10749] },
  "end of week": { genres: [35, 28] },
  "sunday scaries": { genres: [35, 10749] },
  "lazy sunday": { genres: [35, 18] },
  "nothing on tv": { genres: [28, 35] },

  // ══════════════════════════════════════════════
  // STYLE & QUALITY
  // ══════════════════════════════════════════════
  "oscar winner": { genres: [18] },
  "oscar winners": { genres: [18] },
  "oscar nominated": { genres: [18] },
  "award winning": { genres: [18] },
  "critically acclaimed": { genres: [18] },
  "best picture": { genres: [18] },
  "academy award": { genres: [18] },
  "cannes winner": { genres: [18] },
  "indie": { genres: [18] },
  "indie movies": { genres: [18] },
  "independent film": { genres: [18] },
  "arthouse": { genres: [18] },
  "arthouse film": { genres: [18] },
  "cult classic": { genres: [18, 878] },
  "cult movie": { genres: [18, 878] },
  "cult following": { genres: [18, 878] },
  "underrated": { genres: [18, 9648] },
  "hidden gem": { genres: [18, 9648] },
  "hidden gems": { genres: [18, 9648] },
  "underrated gems": { genres: [18, 9648] },
  "overrated": { genres: [28, 18] },
  "blockbuster": { genres: [28, 12] },
  "summer blockbuster": { genres: [28, 12] },
  "popcorn flick": { genres: [28, 35] },
  "guilty pleasure": { genres: [35, 28] },
  "so bad its good": { genres: [35, 28] },
  "visually stunning": { genres: [14, 878] },
  "beautiful cinematography": { genres: [18, 14] },
  "aesthetic": { genres: [18, 14] },
  "slow burn": { genres: [18, 9648] },
  "slow paced": { genres: [18, 9648] },
  "fast paced": { genres: [28, 53] },
  "realistic": { genres: [18, 80] },
  "based on true story": { genres: [18, 36] },
  "true story": { genres: [18, 36] },
  "based on book": { genres: [18, 14] },
  "book adaptation": { genres: [18, 14] },
  "deep meaning": { genres: [18, 878] },
  "meaningful": { genres: [18] },

  // ══════════════════════════════════════════════
  // TOPICS & THEMES
  // ══════════════════════════════════════════════
  "space": { genres: [878] },
  "space movies": { genres: [878] },
  "space exploration": { genres: [878, 12] },
  "aliens": { genres: [878, 27] },
  "alien invasion": { genres: [878, 28] },
  "robots": { genres: [878] },
  "ai movies": { genres: [878] },
  "artificial intelligence": { genres: [878] },
  "time travel": { genres: [878, 12] },
  "parallel universe": { genres: [878, 9648] },
  "post apocalyptic": { genres: [878, 28] },
  "apocalypse": { genres: [878, 28] },
  "dystopia": { genres: [878, 18] },
  "dystopian": { genres: [878, 18] },
  "cyberpunk": { genres: [878, 28] },
  "virtual reality": { genres: [878] },
  "superpowers": { genres: [28, 12] },
  "magic": { genres: [14] },
  "dragons": { genres: [14, 12] },
  "medieval": { genres: [14, 28] },
  "mythology": { genres: [14, 36] },
  "greek mythology": { genres: [14, 36] },
  "vikings": { genres: [28, 36] },
  "pirates": { genres: [12, 28] },
  "survival": { genres: [28, 53] },
  "survival movies": { genres: [28, 53] },
  "wilderness survival": { genres: [12, 28] },
  "ocean": { genres: [12, 27] },
  "sea adventure": { genres: [12] },
  "underwater": { genres: [12, 878] },
  "jungle": { genres: [12, 27] },
  "desert": { genres: [12, 53] },
  "mountains": { genres: [12, 28] },
  "serial killer": { genres: [9648, 80] },
  "serial killers": { genres: [9648, 80] },
  "murder mystery": { genres: [9648, 80] },
  "whodunit": { genres: [9648] },
  "detective": { genres: [9648, 80] },
  "detective movies": { genres: [9648, 80] },
  "police": { genres: [80, 28] },
  "cop movies": { genres: [80, 28] },
  "prison": { genres: [18, 80] },
  "prison movies": { genres: [18, 80] },
  "court drama": { genres: [18, 80] },
  "legal drama": { genres: [18, 80] },
  "political": { genres: [18, 36] },
  "political thriller": { genres: [53, 18] },
  "conspiracy": { genres: [53, 9648] },
  "corruption": { genres: [18, 80] },
  "religion": { genres: [18, 36] },
  "faith": { genres: [18, 36] },
  "sports": { genres: [18] },
  "sports movies": { genres: [18] },
  "football": { genres: [18] },
  "boxing": { genres: [18, 28] },
  "boxing movies": { genres: [18, 28] },
  "sports drama": { genres: [18] },
  "music movies": { genres: [10402, 18] },
  "rock music": { genres: [10402, 18] },
  "hip hop": { genres: [10402, 18] },
  "dance": { genres: [10402, 35] },
  "dance movies": { genres: [10402, 35] },
  "concert film": { genres: [99, 10402] },
  "food": { genres: [35, 18] },
  "cooking": { genres: [35, 18] },
  "food documentary": { genres: [99] },
  "fashion": { genres: [18, 35] },
  "fashion documentary": { genres: [99] },
  "travel": { genres: [12, 35] },
  "travel movies": { genres: [12, 35] },
  "love triangle": { genres: [10749, 18] },
  "forbidden love": { genres: [10749, 18] },
  "unrequited love": { genres: [10749, 18] },
  "long distance": { genres: [10749, 18] },
  "second chance romance": { genres: [10749, 35] },
  "enemies to lovers": { genres: [10749, 35] },
  "friendship": { genres: [35, 18] },
  "growing up": { genres: [18, 35] },
  "loss": { genres: [18] },
  "grief": { genres: [18] },
  "death": { genres: [18] },
  "mental health": { genres: [18, 53] },
  "depression": { genres: [18] },
  "addiction": { genres: [18, 80] },
  "war drama": { genres: [10752, 18] },
  "wwii": { genres: [10752, 18] },
  "world war 2": { genres: [10752, 18] },
  "world war ii": { genres: [10752, 18] },
  "vietnam war": { genres: [10752, 18] },
  "cold war": { genres: [53, 36] },
  "nuclear": { genres: [53, 878] },
  "terrorism": { genres: [53, 28] },
  "heist film": { genres: [80, 53] },
  "bank robbery": { genres: [80, 28] },
  "true crime": { genres: [99, 80] },
  "nature documentary": { genres: [99] },
  "history documentary": { genres: [99, 36] },
  "crime documentary": { genres: [99, 80] },
  "war documentary": { genres: [99, 10752] },
  "music documentary": { genres: [99, 10402] },
  "food documentary": { genres: [99] },
  "sports documentary": { genres: [99] },
  "science documentary": { genres: [99, 878] },
  "anime": { search_query: "anime" },
  "anime movies": { search_query: "anime movie" },
  "anime film": { search_query: "anime movie" },
  "anime action": { search_query: "anime action" },
  "anime romance": { search_query: "anime romance" },
  "anime horror": { search_query: "anime horror" },
  "anime sci-fi": { search_query: "anime sci-fi" },
  "isekai": { search_query: "isekai anime" },
  "shonen": { search_query: "shonen anime" },
  "shoujo": { search_query: "shoujo anime" },
  "mecha": { search_query: "mecha anime" },
  // ══════════════════════════════════════════════
  // USER-SUBMITTED QUERIES (from запросы_для_киносайта.txt)
  // ══════════════════════════════════════════════

  // 90s HORROR — all variants including typos
  "90s horrors": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors of 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horor 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrer 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "hororr 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horor": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horrer": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s hororr": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors of 90": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror of 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors from 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horrors 1990s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror 1990s": { genres: [27], year_from: 1990, year_to: 1999 },
  "scary 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "creepy 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s scary": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s creepy": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s hroror": { genres: [27], year_from: 1990, year_to: 1999 },
  "hrror 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "hrorror 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "90 horror": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror nineties": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s scary film": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror moovies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror moveis": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror movis": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s scary moovies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s creepy moovies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s scary movies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s scary movie": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s creepy movies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s creepy movie": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror films": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror film": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror stuff": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror vibe": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror vibes": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s horror mood": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror movies from the 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "horror films from the 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "scary movies from the 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "creepy 90s movies": { genres: [27], year_from: 1990, year_to: 1999 },
  "dark 90s horror": { genres: [27], year_from: 1990, year_to: 1999 },
  "dark horror 90s": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s dark horror": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s thriller horror": { genres: [27, 53], year_from: 1990, year_to: 1999 },
  "90s horror thriller": { genres: [27, 53], year_from: 1990, year_to: 1999 },
  "90s slashers": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s slasher movies": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s supernatural horror": { genres: [27], year_from: 1990, year_to: 1999 },
  "90s psychological horror": { genres: [27, 53], year_from: 1990, year_to: 1999 },
  "90s mystery horror": { genres: [27, 9648], year_from: 1990, year_to: 1999 },
  "90s cult horror": { genres: [27], year_from: 1990, year_to: 1999 },

  // DARK SCI-FI — all variants
  "dark sci-fi": { genres: [878, 53] },
  "dark sci fi": { genres: [878, 53] },
  "dark scifi": { genres: [878, 53] },
  "dark scyfi": { genres: [878, 53] },
  "dark scify": { genres: [878, 53] },
  "dark scyfy": { genres: [878, 53] },
  "dark scyfii": { genres: [878, 53] },
  "dark sci fii": { genres: [878, 53] },
  "dark scifii": { genres: [878, 53] },
  "dark science fiction": { genres: [878, 53] },
  "dark science-fiction": { genres: [878, 53] },
  "dark science ficiton": { genres: [878, 53] },
  "dark science-ficiton": { genres: [878, 53] },
  "dark futuristic movie": { genres: [878, 53] },
  "dark futurstic movie": { genres: [878, 53] },
  "dark future movie": { genres: [878, 53] },
  "dark future movies": { genres: [878, 53] },
  "dark space movie": { genres: [878, 53] },
  "dark space movies": { genres: [878, 53] },
  "dark cyberpunk": { genres: [878, 53] },
  "dark cyberpunk movie": { genres: [878, 53] },
  "dark cyberpnuk": { genres: [878, 53] },
  "dark cyberpunk movies": { genres: [878, 53] },
  "dark dystopian sci-fi": { genres: [878, 18] },
  "dark dystopian sci fi": { genres: [878, 18] },
  "dark dystopian scifi": { genres: [878, 18] },
  "dark dystpoian sci-fi": { genres: [878, 18] },
  "dark dystopian scifii": { genres: [878, 18] },
  "serious sci-fi": { genres: [878, 18] },
  "serious scifi": { genres: [878, 18] },
  "moody sci-fi": { genres: [878, 18] },
  "grim sci-fi": { genres: [878, 18] },
  "bleak sci-fi": { genres: [878, 18] },
  "philosophical sci-fi": { genres: [878, 18] },
  "deep sci-fi": { genres: [878, 18] },
  "smart sci-fi": { genres: [878, 18] },
  "intelligent sci-fi": { genres: [878, 18] },
  "thought provoking sci-fi": { genres: [878, 18] },
  "thought-provoking sci-fi": { genres: [878, 18] },
  "sci-fi like interstellar": { genres: [878, 18] },
  "scifi like interstellar": { genres: [878, 18] },
  "dark sci-fi like interstellar": { genres: [878, 53] },
  "dark scifi like interstellar": { genres: [878, 53] },
  "sci fi like interstellar": { genres: [878, 18] },
  "movies like interstellar": { genres: [878, 18] },
  "films like interstellar": { genres: [878, 18] },
  "something like interstellar": { genres: [878, 18] },
  "similar to interstellar": { genres: [878, 18] },
  "like interstellar but darker": { genres: [878, 53] },
  "interstellar vibe": { genres: [878, 18] },
  "interstellar vibes": { genres: [878, 18] },
  "intersteller vibe": { genres: [878, 18] },
  "interstelar vibe": { genres: [878, 18] },
  "interstaller vibe": { genres: [878, 18] },
  "intersteler like": { genres: [878, 18] },
  "interstalar vibe": { genres: [878, 18] },
  "interstelar like": { genres: [878, 18] },
  "dark scifi like intersteler": { genres: [878, 53] },
  "dark sci fi like interstalar": { genres: [878, 53] },
  "space drama": { genres: [878, 18] },
  "space sci-fi": { genres: [878] },
  "space scifi": { genres: [878] },
  "space thriller sci-fi": { genres: [878, 53] },
  "mind-bending sci-fi": { genres: [878, 9648] },
  "mind bending sci-fi": { genres: [878, 9648] },
  "brain melting sci-fi": { genres: [878, 9648] },

  // FEEL-GOOD — all variants
  "feel-good movies for tonight": { genres: [35, 18] },
  "feel good movies for tonight": { genres: [35, 18] },
  "feelgood movies for tonight": { genres: [35, 18] },
  "feel-good movie for tonight": { genres: [35, 18] },
  "feel good movie for tonight": { genres: [35, 18] },
  "feelgood movie for tonight": { genres: [35, 18] },
  "feel-good tonight": { genres: [35, 18] },
  "feel good tonight": { genres: [35, 18] },
  "feelgood tonight": { genres: [35, 18] },
  "something feel-good tonight": { genres: [35, 18] },
  "something feel good tonight": { genres: [35, 18] },
  "fun movie for tonight": { genres: [35] },
  "light movie for tonight": { genres: [35, 10749] },
  "easy movie for tonight": { genres: [35, 10749] },
  "comfort movie for tonight": { genres: [35, 10749] },
  "comfort watch tonight": { genres: [35, 10749] },
  "cozy movie tonight": { genres: [35, 10749] },
  "cozy watch tonight": { genres: [35, 10749] },
  "movie for a cozy night": { genres: [35, 10749] },
  "movie for cozy night": { genres: [35, 10749] },
  "feel-good watch": { genres: [35, 18] },
  "feel good watch": { genres: [35, 18] },
  "uplifting movie tonight": { genres: [35, 18] },
  "uplifting movies tonight": { genres: [35, 18] },
  "happy movie tonight": { genres: [35] },
  "positive vibes movie": { genres: [35, 18] },
  "positive vibe movie": { genres: [35, 18] },
  "wholesome movie tonight": { genres: [35, 10751] },
  "wholesome movies tonight": { genres: [35, 10751] },
  "good vibes movie": { genres: [35, 18] },
  "good vibe movie": { genres: [35, 18] },
  "lighthearted movie tonight": { genres: [35, 10749] },
  "light-hearted movie tonight": { genres: [35, 10749] },
  "easy watch tonight": { genres: [35, 10749] },
  "easy watching tonight": { genres: [35, 10749] },
  "not too heavy tonight": { genres: [35, 10749] },
  "movie for after work": { genres: [35, 10749] },
  "movie after hard day": { genres: [35, 10749] },
  "movie to relax": { genres: [35, 10749] },
  "something to relax with": { genres: [35, 10749] },
  "want to relax movie": { genres: [35, 10749] },
  "need to unwind movie": { genres: [35, 10749] },
  "relaxed movie night": { genres: [35, 10749] },
  "calm movie night": { genres: [35, 10749] },
  "chill movie night": { genres: [35, 10749] },
  "cozy evening movie": { genres: [35, 10749] },
  "feel gud movie": { genres: [35, 18] },
  "feelgoood movie": { genres: [35, 18] },
  "feelgoid movie": { genres: [35, 18] },
  "feel-good moovie": { genres: [35, 18] },
  "feel-good moveis": { genres: [35, 18] },
  "feelgood moovies": { genres: [35, 18] },
  "comfort moovie tonight": { genres: [35, 10749] },
  "cozzy movie night": { genres: [35, 10749] },
  "cozy movei tonight": { genres: [35, 10749] },
  "easy wach tonight": { genres: [35, 10749] },
  "easy wath tonight": { genres: [35, 10749] },
  "uplifitng movie": { genres: [35, 18] },
  "upfliting movie tonight": { genres: [35, 18] },
  "lighthearted moovie tonight": { genres: [35, 10749] },
  "feel good moovie": { genres: [35, 18] },
  "feel gud tonight": { genres: [35, 18] },
  "feelgood tonite": { genres: [35, 18] },
  "comfrt movie tonight": { genres: [35, 10749] },
  "comort movie tonight": { genres: [35, 10749] },

  // MIND-BENDING THRILLER — all variants
  "mind-bending thriller": { genres: [9648, 53] },
  "mind bending thriller": { genres: [9648, 53] },
  "mindbending thriller": { genres: [9648, 53] },
  "mind-bending thrillers": { genres: [9648, 53] },
  "mind bending thrillers": { genres: [9648, 53] },
  "mindfuck thriller": { genres: [9648, 53] },
  "brain melting thriller": { genres: [9648, 53] },
  "brain-melting thriller": { genres: [9648, 53] },
  "brainmelting thriller": { genres: [9648, 53] },
  "twisty thriller": { genres: [9648, 53] },
  "twisted thriller": { genres: [9648, 53] },
  "plot twist thriller": { genres: [9648, 53] },
  "plot-twist thriller": { genres: [9648, 53] },
  "crazy twist thriller": { genres: [9648, 53] },
  "wtf thriller": { genres: [9648, 53] },
  "what the fuck ending thriller": { genres: [9648, 53] },
  "smart thriller": { genres: [9648, 53] },
  "intelligent thriller": { genres: [9648, 53] },
  "complex thriller": { genres: [9648, 53] },
  "layered thriller": { genres: [9648, 53] },
  "something mind-bending": { genres: [9648, 878] },
  "something mind bending": { genres: [9648, 878] },
  "mind blowing thriller": { genres: [9648, 53] },
  "mind-blowing thriller": { genres: [9648, 53] },
  "thought provoking thriller": { genres: [9648, 53] },
  "thought-provoking thriller": { genres: [9648, 53] },
  "trippy thriller": { genres: [9648, 53] },
  "weird thriller": { genres: [9648, 53] },
  "confusing thriller but good": { genres: [9648, 53] },
  "thriller that messes with your head": { genres: [9648, 53] },
  "thriller that breaks your brain": { genres: [9648, 53] },
  "thriller with crazy ending": { genres: [9648, 53] },
  "shocking ending thriller": { genres: [9648, 53] },
  "twisted ending thriller": { genres: [9648, 53] },
  "mind benging thriller": { genres: [9648, 53] },
  "mind bending thriler": { genres: [9648, 53] },
  "mind-bending thriler": { genres: [9648, 53] },
  "mindfuk thriller": { genres: [9648, 53] },
  "mindfcuk thriller": { genres: [9648, 53] },
  "brain meltng thriller": { genres: [9648, 53] },
  "brain meltin thriller": { genres: [9648, 53] },
  "brainmelitng thriller": { genres: [9648, 53] },
  "plottwist thriller": { genres: [9648, 53] },
  "crazi twist thriller": { genres: [9648, 53] },
  "psychologial thriller": { genres: [9648, 53] },
  "intellegent thriller": { genres: [9648, 53] },
  "smart thriler": { genres: [9648, 53] },
  "wtf thrillr": { genres: [9648, 53] },
  "psychological mystery thriller": { genres: [9648, 53] },
  "trippy movie": { genres: [9648, 878] },
  "trippy movies": { genres: [9648, 878] },
  "trippy moovie": { genres: [9648, 878] },
  "tripy movie": { genres: [9648, 878] },

  // COMFORT ANIME — all variants
  "best comfort anime": { search_query: "anime slice of life" },
  "comfort anime": { search_query: "anime slice of life" },
  "best comfort anime series": { search_query: "anime slice of life" },
  "comfort anime series": { search_query: "anime slice of life" },
  "cozy anime": { search_query: "anime slice of life" },
  "cozy anime series": { search_query: "anime slice of life" },
  "feel-good anime": { search_query: "anime slice of life" },
  "feel good anime": { search_query: "anime slice of life" },
  "feelgood anime": { search_query: "anime slice of life" },
  "relaxing anime": { search_query: "anime slice of life" },
  "chill anime": { search_query: "anime slice of life" },
  "wholesome anime": { search_query: "anime wholesome" },
  "anime to relax": { search_query: "anime slice of life" },
  "anime for comfort": { search_query: "anime slice of life" },
  "anime to heal": { search_query: "anime healing" },
  "healing anime": { search_query: "anime healing" },
  "soft anime": { search_query: "anime slice of life" },
  "cute anime": { search_query: "anime cute" },
  "warm anime": { search_query: "anime heartwarming" },
  "sad but healing anime": { search_query: "anime emotional healing" },
  "easy anime": { search_query: "anime slice of life" },
  "easy watch anime": { search_query: "anime slice of life" },
  "anime for bad day": { search_query: "anime slice of life" },
  "anime after hard day": { search_query: "anime slice of life" },
  "anime to unwind": { search_query: "anime slice of life" },
  "anime with good vibes": { search_query: "anime wholesome" },
  "comforting anime": { search_query: "anime slice of life" },
  "best cozy anime": { search_query: "anime slice of life" },
  "best healing anime": { search_query: "anime healing" },
  "anime for lonely night": { search_query: "anime slice of life" },
  "anime for rainy day": { search_query: "anime slice of life" },
  "slice of life anime": { search_query: "anime slice of life" },
  "heartwarming anime": { search_query: "anime heartwarming" },
  "comfort anime movies": { search_query: "anime movie" },
  "comfort anime film": { search_query: "anime movie" },
  "anime comfort watch": { search_query: "anime slice of life" },
  "comfrt anime": { search_query: "anime slice of life" },
  "comort anime": { search_query: "anime slice of life" },
  "comfort anmie": { search_query: "anime slice of life" },
  "anime comforrt": { search_query: "anime slice of life" },
  "wholsome anime": { search_query: "anime wholesome" },
  "healng anime": { search_query: "anime healing" },
  "slice of live anime": { search_query: "anime slice of life" },
  "cozzy anime": { search_query: "anime slice of life" },
  "feel gud anime": { search_query: "anime slice of life" },
  "relaxng anime": { search_query: "anime slice of life" },
  "heartwaming anime": { search_query: "anime heartwarming" },
  "soft anmie": { search_query: "anime slice of life" },

  // EASY WATCH — all variants
  "easy watch": { genres: [35, 10749] },
  "easy watching": { genres: [35, 10749] },
  "easy to watch": { genres: [35, 10749] },
  "easy watch movie": { genres: [35, 10749] },
  "easy watch movies": { genres: [35, 10749] },
  "easy watch film": { genres: [35, 10749] },
  "easy watch films": { genres: [35, 10749] },
  "easy watch for tonight": { genres: [35, 10749] },
  "not too heavy": { genres: [35, 10749] },
  "light watch": { genres: [35, 10749] },
  "light movie": { genres: [35, 10749] },
  "light movies": { genres: [35, 10749] },
  "easy movie": { genres: [35, 10749] },
  "easy movies": { genres: [35, 10749] },
  "simple movie": { genres: [35, 10749] },
  "simple movies": { genres: [35, 10749] },
  "background movie": { genres: [35] },
  "background movies": { genres: [35] },
  "background noise movie": { genres: [35] },
  "half watching movie": { genres: [35] },
  "half-watch movie": { genres: [35] },
  "movie while eating": { genres: [35] },
  "lunch movie": { genres: [35] },
  "after work movie": { genres: [35, 10749] },
  "after hard day movie": { genres: [35, 10749] },
  "movie to unwind": { genres: [35, 10749] },
  "relaxing movie": { genres: [35, 10749] },
  "relaxed movie": { genres: [35, 10749] },
  "chill movie": { genres: [35, 10749] },
  "soft watch": { genres: [35, 10749] },
  "low effort watch": { genres: [35, 10749] },
  "easy-going movie": { genres: [35, 10749] },
  "easy going movie": { genres: [35, 10749] },
  "no brain movie": { genres: [35] },
  "turn your brain off movie": { genres: [35] },
  "turn-your-brain-off movie": { genres: [35] },
  "easy wach": { genres: [35, 10749] },
  "easy wath": { genres: [35, 10749] },
  "easy wtach": { genres: [35, 10749] },
  "eazy watch": { genres: [35, 10749] },
  "easy whatch": { genres: [35, 10749] },
  "light moovie": { genres: [35, 10749] },
  "background moovie": { genres: [35] },
  "cozy movei": { genres: [35, 10749] },
  "comfort moovie": { genres: [35, 10749] },
  "simpple movie": { genres: [35, 10749] },
  "relxing movie": { genres: [35, 10749] },
  "chll movie": { genres: [35, 10749] },
  "turn ur brain off movie": { genres: [35] },

  // SAD BUT BEAUTIFUL
  "sad but beautiful": { genres: [18, 10749] },
  "beautifully sad": { genres: [18, 10749] },
  "sad and beautiful": { genres: [18, 10749] },
  "beautiful and sad": { genres: [18, 10749] },
  "melancholic but beautiful": { genres: [18] },
  "melancholy movie": { genres: [18] },
  "melancholic movie": { genres: [18] },
  "bittersweet movie": { genres: [18, 10749] },
  "bittersweet films": { genres: [18, 10749] },
  "beautiful sadness movie": { genres: [18] },
  "sad aesthetic movie": { genres: [18] },
  "beautiful drama": { genres: [18] },
  "poetic sad movie": { genres: [18] },
  "poetic sad films": { genres: [18] },
  "tragic but beautiful": { genres: [18] },
  "heartbreaking but beautiful": { genres: [18] },
  "sad romance but beautiful": { genres: [18, 10749] },
  "beautifully heartbreaking": { genres: [18] },
  "beautifully tragic": { genres: [18] },
  "sad elegant movie": { genres: [18] },
  "beautiful emotional movie": { genres: [18] },
  "sad art film": { genres: [18] },
  "sad arthouse movie": { genres: [18] },
  "sad but gorgeous": { genres: [18] },
  "beautiful pain movie": { genres: [18] },
  "cry but beautiful": { genres: [18] },
  "crying but beautiful": { genres: [18] },
  "tearjerker but beautiful": { genres: [18] },
  "sad but beutiful": { genres: [18, 10749] },
  "beautifuly sad": { genres: [18, 10749] },
  "sad n beautiful": { genres: [18, 10749] },
  "beautifully sadd": { genres: [18, 10749] },
  "sadd but beautiful": { genres: [18, 10749] },
  "tragic but beautifull": { genres: [18] },
  "bitersweet movie": { genres: [18, 10749] },
  "bitterswet movie": { genres: [18, 10749] },
  "melancholic moovie": { genres: [18] },
  "poetic sad moovie": { genres: [18] },
  "heartbraking but beautiful": { genres: [18] },
  "cry but beautifull": { genres: [18] },

  // BRAIN MELTING / MIND BENDING
  "brain melting": { genres: [9648, 878] },
  "brain-melting": { genres: [9648, 878] },
  "brain melting movie": { genres: [9648, 878] },
  "brain melting movies": { genres: [9648, 878] },
  "brain-melting movie": { genres: [9648, 878] },
  "brainmelting movie": { genres: [9648, 878] },
  "brain melt movie": { genres: [9648, 878] },
  "brain melt films": { genres: [9648, 878] },
  "melt my brain movie": { genres: [9648, 878] },
  "movie that melts your brain": { genres: [9648, 878] },
  "movies that melt your brain": { genres: [9648, 878] },
  "mind bending": { genres: [9648, 878] },
  "mind-bending": { genres: [9648, 878] },
  "mind bending movie": { genres: [9648, 878] },
  "mind-bending movie": { genres: [9648, 878] },
  "mindfuck": { genres: [9648, 878] },
  "mindfuck movie": { genres: [9648, 878] },
  "mindfuck movies": { genres: [9648, 878] },
  "mindfuck sci-fi": { genres: [9648, 878] },
  "wtf movie": { genres: [9648, 53] },
  "wtf movies": { genres: [9648, 53] },
  "what did i just watch movie": { genres: [9648, 53] },
  "what did i just watch movies": { genres: [9648, 53] },
  "movie that breaks your brain": { genres: [9648, 878] },
  "movies that break your brain": { genres: [9648, 878] },
  "crazy plot twist movie": { genres: [9648, 53] },
  "movie with crazy twist": { genres: [9648, 53] },
  "shocking twist movie": { genres: [9648, 53] },
  "twisted movie": { genres: [9648, 53] },
  "plot twist movie": { genres: [9648, 53] },
  "plot twist movies": { genres: [9648, 53] },
  "confusing but good movie": { genres: [9648, 53] },
  "movies like inception": { genres: [9648, 878] },
  "something like inception": { genres: [9648, 878] },
  "intelligent mind-bender": { genres: [9648, 878] },
  "smart mind-bending movie": { genres: [9648, 878] },
  "brain meltng": { genres: [9648, 878] },
  "brain meltin": { genres: [9648, 878] },
  "mind benging": { genres: [9648, 878] },
  "mind bendng": { genres: [9648, 878] },
  "mindfuk": { genres: [9648, 878] },
  "mindfcuk": { genres: [9648, 878] },
  "mndfuck": { genres: [9648, 878] },
  "plot twst movie": { genres: [9648, 53] },
  "incepton like": { genres: [9648, 878] },
  "wtf moovie": { genres: [9648, 53] },
  "crazy plottwist": { genres: [9648, 53] },
  "confusng but good movie": { genres: [9648, 53] },
  "trippy moovie": { genres: [9648, 878] },
  "mind benging": { genres: [9648, 878] },
  "mind bening": { genres: [9648, 878] },
  "plottwist movie": { genres: [9648, 53] },
  "twisted mistery": { genres: [9648, 53] },
  "mind blwoing": { genres: [9648, 878] },
  "mind blowng": { genres: [9648, 878] },
  "mindblowing": { genres: [9648, 878] },

  // FILMS THAT RUIN YOU / DEVASTATING
  "films that ruin you": { genres: [18] },
  "film that ruins you": { genres: [18] },
  "movie that ruins you": { genres: [18] },
  "movies that ruin you": { genres: [18] },
  "films that will ruin you": { genres: [18] },
  "movie that will ruin you": { genres: [18] },
  "movies that will ruin you": { genres: [18] },
  "devastating movie": { genres: [18] },
  "devastating movies": { genres: [18] },
  "heartbreaking movie": { genres: [18] },
  "heartbreaking movies": { genres: [18] },
  "soul crushing movie": { genres: [18] },
  "soul-crushing movie": { genres: [18] },
  "soul crushing films": { genres: [18] },
  "emotionally devastating movie": { genres: [18] },
  "emotionally devastating films": { genres: [18] },
  "painful movie": { genres: [18] },
  "films that ruin u": { genres: [18] },
  "film that ruin you": { genres: [18] },
  "movie that ruin you": { genres: [18] },
  "movies that ruin u": { genres: [18] },
  "films that will ruin u": { genres: [18] },
  "devestating movie": { genres: [18] },
  "devastatng movie": { genres: [18] },
  "heartbraking movie": { genres: [18] },
  "heart breking movie": { genres: [18] },
  "soul crushng movie": { genres: [18] },
  "emotionally devestating movie": { genres: [18] },
  "painfull movie": { genres: [18] },
  "tear me appart movie": { genres: [18] },
  "ruin my life moovie": { genres: [18] },
  "make me suffer moovie": { genres: [18] },

  // WTF ENDING / CRAZY ENDING
  "wtf ending": { genres: [9648, 53] },
  "crazy ending": { genres: [9648, 53] },
  "shocking ending": { genres: [9648, 53] },
  "twisted ending": { genres: [9648, 53] },
  "must watch before you die": { genres: [18] },
  "must-watch before you die": { genres: [18] },
  "essential watch": { genres: [18] },
  "all time classic": { genres: [18] },
  "wild ending": { genres: [9648, 53] },
  "insane ending": { genres: [9648, 53] },
  "mindfuk ending": { genres: [9648, 53] },
  "shocking plottwist": { genres: [9648, 53] },
  "unexpected ending": { genres: [9648, 53] },
  "ending you wont see coming": { genres: [9648, 53] },
  "wtf endng": { genres: [9648, 53] },
  "crazy endng": { genres: [9648, 53] },
  "shockng ending": { genres: [9648, 53] },
  "twistd ending": { genres: [9648, 53] },
  "wild endng": { genres: [9648, 53] },
  "insane endng": { genres: [9648, 53] },
  "unexpected endig": { genres: [9648, 53] },
  "twisted endng": { genres: [9648, 53] },
  "ending you wont se coming": { genres: [9648, 53] },

  // MUST WATCH / CLASSICS
  "must watch before you die": { genres: [18] },
  "must-watch before you die": { genres: [18] },
  "essential watch": { genres: [18] },
  "all time classic": { genres: [18] },
  "must wach movie": { genres: [18] },
  "must wath movie": { genres: [18] },
  "must-see moovie": { genres: [18] },
  "must see moovie": { genres: [18] },
  "must see moveis": { genres: [18] },
  "essential moovie": { genres: [18] },
  "essensial movie": { genres: [18] },
  "alltime classic": { genres: [18] },
  "all time clasic": { genres: [18] },
  "greatest moveis ever": { genres: [18] },
  "top moveis of all time": { genres: [18] },
  "movie bucketlist": { genres: [18] },
  "film bucekt list": { genres: [18] },
  "must wtach before you die": { genres: [18] },

  // FEMALE RAGE / REVENGE WOMAN
  "female rage": { genres: [18, 53] },
  "revenge woman": { genres: [18, 53] },
  "angry woman": { genres: [18, 53] },
  "femlae rage": { genres: [18, 53] },
  "female rag": { genres: [18, 53] },
  "female raeg": { genres: [18, 53] },
  "femail rage": { genres: [18, 53] },
  "feamle rage": { genres: [18, 53] },
  "revenge women movie": { genres: [18, 53] },
  "angry women movie": { genres: [18, 53] },
  "woman revnge movie": { genres: [18, 53] },
  "girl rgae movie": { genres: [18, 53] },
  "female rge movie": { genres: [18, 53] },

  // TOXIC ROMANCE
  "toxic romance": { genres: [18, 10749] },
  "toxic relationship": { genres: [18, 10749] },
  "obsessive love": { genres: [18, 10749] },
  "toxic romace": { genres: [18, 10749] },
  "toxic realtionship": { genres: [18, 10749] },
  "toxic relashionship": { genres: [18, 10749] },
  "toxic relatonship": { genres: [18, 10749] },
  "obsesive love": { genres: [18, 10749] },
  "obsessivee love": { genres: [18, 10749] },
  "dark romnace": { genres: [18, 10749] },
  "messed up romace": { genres: [18, 10749] },
  "twisted romnace": { genres: [18, 10749] },
  "red flag romnace": { genres: [18, 10749] },
  "messy relatonship": { genres: [18, 10749] },
  "messy realtionships": { genres: [18, 10749] },
  "messy relatonships": { genres: [18, 10749] },
  "messy realtionship": { genres: [18, 10749] },
  "realtionship drama": { genres: [18, 10749] },
  "toxic cuples": { genres: [18, 10749] },
  "chaotic realtionship movie": { genres: [18, 10749] },
  "complicated relatonship movie": { genres: [18, 10749] },
  "toxic couple": { genres: [18, 10749] },
  "relationship drama": { genres: [18, 10749] },
  "messy relationships": { genres: [18, 10749] },
  "messy relationship": { genres: [18, 10749] },

  // VILLAIN WINS / NO HAPPY ENDING
  "villain wins": { genres: [18, 53] },
  "bad guy wins": { genres: [18, 53] },
  "no happy ending": { genres: [18, 53] },
  "vilain wins": { genres: [18, 53] },
  "villan wins": { genres: [18, 53] },
  "villian wins": { genres: [18, 53] },
  "badguy wins": { genres: [18, 53] },
  "bad guy wns": { genres: [18, 53] },
  "no happy enging": { genres: [18, 53] },
  "evil wns": { genres: [18, 53] },
  "villain victroy": { genres: [18, 53] },
  "bleak endng movie": { genres: [18, 53] },

  // FOUND FOOTAGE
  "found footage": { genres: [27] },
  "camcorder horror": { genres: [27] },
  "mockumentary horror": { genres: [27] },
  "foundfootage": { genres: [27] },
  "found futage": { genres: [27] },
  "found fotage": { genres: [27] },
  "found foootage": { genres: [27] },
  "mockumentry horror": { genres: [27] },
  "cam corder horror": { genres: [27] },
  "camcoder horror": { genres: [27] },
  "handheld horor": { genres: [27] },
  "blair wich vibe": { genres: [27] },
  "paranromal found footage": { genres: [27] },

  // GRIEF / LOSS
  "grief movie": { genres: [18] },
  "grief": { genres: [18] },
  "loss": { genres: [18] },
  "mourning": { genres: [18] },
  "grief moovie": { genres: [18] },
  "greif movie": { genres: [18] },
  "grieff movie": { genres: [18] },
  "grief moveis": { genres: [18] },
  "mournng movie": { genres: [18] },
  "loss moovie": { genres: [18] },
  "bereavment movie": { genres: [18] },
  "berievement movie": { genres: [18] },
  "coping with los movie": { genres: [18] },

  // UNHINGED WOMAN
  "unhinged woman": { genres: [18, 53] },
  "chaotic woman": { genres: [18, 53] },
  "unstable woman": { genres: [18, 53] },
  "unhinged women": { genres: [18, 53] },
  "unhingd woman": { genres: [18, 53] },
  "unhinged wman": { genres: [18, 53] },
  "chaotic women": { genres: [18, 53] },
  "unstabel woman": { genres: [18, 53] },
  "unstable wman": { genres: [18, 53] },
  "crazy women movie": { genres: [18, 53] },
  "female breakdwon movie": { genres: [18, 53] },

  // COQUETTE / FEMININE AESTHETIC
  "coquette movie": { genres: [18, 10749] },
  "soft girl aesthetic": { genres: [18, 10749] },
  "feminine aesthetic": { genres: [18, 10749] },
  "coquete movie": { genres: [18, 10749] },
  "coquette moovie": { genres: [18, 10749] },
  "coquett movie": { genres: [18, 10749] },
  "soft girl esthetic movie": { genres: [18, 10749] },
  "feminine esthetic movie": { genres: [18, 10749] },
  "girly esthetic movie": { genres: [18, 10749] },
  "pretty pink moovie": { genres: [18, 10749] },
  "dreamy feminime movie": { genres: [18, 10749] },

  // GOTHIC ROMANCE
  "gothic romance": { genres: [18, 10749, 14] },
  "dark romance": { genres: [18, 10749] },
  "victorian romance": { genres: [18, 10749, 36] },
  "gothik romance": { genres: [18, 10749, 14] },
  "gothic romace": { genres: [18, 10749, 14] },
  "gothic romnace": { genres: [18, 10749, 14] },
  "gothic romanse": { genres: [18, 10749, 14] },
  "victorian romace": { genres: [18, 10749, 36] },
  "victorian romnace": { genres: [18, 10749, 36] },
  "gothic love strory": { genres: [18, 10749, 14] },
  "wuthering hights vibe": { genres: [18, 10749] },
  "dracula romnace vibe": { genres: [27, 10749, 14] },
  "gothic peiod drama": { genres: [18, 36, 10749] },

  // FUNNY — typos
  "funy": { genres: [35] },
  "funni": { genres: [35] },
  "funnny": { genres: [35] },
  "funy movie": { genres: [35] },
  "funny moovie": { genres: [35] },
  "comedyy": { genres: [35] },
  "comedis": { genres: [35] },
  "comdy": { genres: [35] },
  "romcm": { genres: [35, 10749] },
  "romcoms": { genres: [35, 10749] },
  "rom-coms": { genres: [35, 10749] },
  "rom coms": { genres: [35, 10749] },

  // SAD — typos
  "sadd": { genres: [18] },
  "sad moovie": { genres: [18] },
  "tear jerker": { genres: [18] },
  "tearjerkr": { genres: [18] },
  "emotionl movie": { genres: [18] },
  "emotinal movie": { genres: [18] },
  "depresing movie": { genres: [18] },
  "melancholy flm": { genres: [18] },
  "cry my eyes out moovie": { genres: [18] },

  // SCARY — typos
  "scary moovie": { genres: [27] },
  "scary moveis": { genres: [27] },
  "scary movis": { genres: [27] },
  "horrer movie": { genres: [27] },
  "horor movie": { genres: [27] },
  "crepy movie": { genres: [27] },
  "terrifing movie": { genres: [27] },
  "terrifiying movie": { genres: [27] },
  "supernatral horror": { genres: [27, 14] },
  "haunted moovie": { genres: [27] },

  // ACTION — typos
  "acion movie": { genres: [28] },
  "acton movie": { genres: [28] },
  "aciton movie": { genres: [28] },
  "action moovie": { genres: [28] },
  "adrenline movie": { genres: [28, 12] },
  "fast paced acion": { genres: [28] },
  "adventure aciton": { genres: [28, 12] },
  "pump me up moovie": { genres: [28, 12] },

  // ROMANCE — typos
  "romnace": { genres: [10749, 35] },
  "romance moovie": { genres: [10749] },
  "romatic movie": { genres: [10749, 35] },
  "romatic movies": { genres: [10749, 35] },
  "love stroy movie": { genres: [10749] },
  "date nite movie": { genres: [10749, 35] },
  "romcom moovie": { genres: [10749, 35] },
  "rom-com moovie": { genres: [10749, 35] },
  "romatnic drama": { genres: [10749, 18] },

  // FAMILY — typos
  "famly movie": { genres: [10751, 16] },
  "faily movie": { genres: [10751, 16] },
  "family moovie": { genres: [10751, 16] },
  "kids moovie": { genres: [10751, 16] },
  "family firendly movie": { genres: [10751, 16] },
  "family freindly movie": { genres: [10751, 16] },
  "animated famly movie": { genres: [16, 10751] },
  "wholsome family movie": { genres: [10751, 16] },

  // MYSTERY — typos
  "mistery": { genres: [9648] },
  "mystrey": { genres: [9648] },
  "mysteri": { genres: [9648] },
  "mystery moovie": { genres: [9648] },
  "detective moovie": { genres: [9648, 80] },
  "murder mistery": { genres: [9648, 80] },
  "investgation movie": { genres: [9648, 80] },
  "twisty mistery": { genres: [9648, 53] },

  // INSPIRING — typos
  "inspirng": { genres: [18, 36] },
  "inspiratonal movie": { genres: [18, 36] },
  "motivatonal movie": { genres: [18, 36] },
  "empowerng movie": { genres: [18, 36] },
  "uplfting drama": { genres: [18, 36] },
  "overcoming ods movie": { genres: [18, 36] },
  "hopefull movie": { genres: [18, 36] },

  // ANIMATED — typos
  "animated moovie": { genres: [16] },
  "animaton movie": { genres: [16] },
  "animeted movie": { genres: [16] },
  "carton movie": { genres: [16, 10751] },
  "cartoon moovie": { genres: [16, 10751] },
  "anime moovie": { search_query: "anime movie" },
  "beautifull animation movie": { genres: [16] },

  // HISTORICAL — typos
  "historcal movie": { genres: [36, 18] },
  "historial movie": { genres: [36, 18] },
  "historical moovie": { genres: [36, 18] },
  "period drma": { genres: [36, 18] },
  "history moovie": { genres: [36, 18] },
  "based on histroy": { genres: [36, 18] },
  "true stroy period movie": { genres: [36, 18] },
  "ancint history movie": { genres: [36, 18] },
  "historcal movie": { genres: [36, 18] },

  // MUSICAL — typos
  "muscial": { genres: [10402] },
  "musical moovie": { genres: [10402] },
  "msuical movie": { genres: [10402] },
  "dance moovie": { genres: [10402, 35] },
  "broadway vibe movie": { genres: [10402] },
  "jukbox musical": { genres: [10402] },
  "music drma": { genres: [10402, 18] },

};

// ══════════════════════════════════════════════
// MULTILINGUAL QUERIES (uk, ru, fr, es → English)
// Mood/genre words are mapped to the English vocabulary of promptsDB,
// so "уютный дождливый вечер" is looked up as "cozy rainy evening".
// "*" at the end of a word = any ending (уютн* → уютный, уютное, ...).
// An empty key ('') lists filler words that are simply dropped.
// ══════════════════════════════════════════════
const I18N_TERMS = {
  // content type
  "movie": ["фильм*", "фільм*", "кино", "кіно", "киношк*", "pelicula*", "peli", "pelis"],
  "series": ["сериал*", "серіал*", "serie"],
  "cartoon": ["мультик*", "мультфильм*", "мультфільм*", "dessin anime", "dessins animes", "dibujos animados"],
  "anime": ["аниме", "аніме"],
  "documentary": ["документал*", "documentaire*", "documental*"],

  // genres
  "comedy": ["комеди*", "комеді*", "comedie*", "comedia*"],
  "funny": ["смешн*", "смішн*", "весел*", "drole*", "marrant*", "gracios*", "divertid*"],
  "laugh": ["посмеят*", "посміят*", "поржать", "поржати", "rire", "rigoler", "reir", "reirse"],
  "horror": ["ужас*", "жах*", "хоррор*", "horreur", "epouvante", "terror"],
  "scary": ["страшн*", "жутк*", "моторошн*", "лячн*", "effrayant*", "qui fait peur", "de miedo", "da miedo", "terrorific*"],
  "action": ["боевик*", "бойовик*", "экшн", "экшен", "екшн", "екшен", "accion"],
  "thriller": ["триллер*", "трилер*"],
  "mystery": ["детектив*", "загадочн*", "загадков*", "mystere*", "misterio*", "policier*"],
  "drama": ["драм*", "drame*"],
  "romantic": ["романтич*", "romantique*", "romantico*", "romantica*"],
  "romance": ["мелодрам*", "любов*", "любви", "кохан*", "amour", "amor"],
  "fantasy": ["фэнтези", "фентези", "фентезі", "fantastique*", "fantasia"],
  "sci-fi": ["фантастик*", "science fiction", "ciencia ficcion"],
  "adventure": ["приключен*", "пригод*", "aventure*", "aventura*"],
  "family": ["семейн*", "сімейн*", "родинн*", "с семьей", "з сім'єю", "з родиною", "с родителями", "з батьками", "en famille", "famille", "familial*", "en familia", "familia"],
  "with kids": ["с детьми", "з дітьми", "для детей", "для дітей", "детск*", "дитяч*", "avec les enfants", "pour enfants", "enfants", "con ninos", "para ninos", "infantil*"],
  "historical": ["историческ*", "історичн*", "historique*", "historico*", "historica*"],
  "war": ["войн*", "війн*", "военн*", "воєнн*", "guerre", "guerra"],
  "western": ["вестерн*"],
  "musical": ["мюзикл*", "comedie musicale"],
  "crime": ["криминал*", "кримінал*", "crimen"],
  "gangster": ["гангстер*", "мафи*", "мафі*"],
  "superhero": ["супергеро*", "superheros", "super-heros", "superheroe*"],
  "zombie": ["зомби", "зомбі", "zombi", "zombis"],
  "vampire": ["вампир*", "вампір*", "vampiro*"],
  "space": ["космос*", "космич*", "космічн*", "espace", "espacio"],
  "based on true story": ["на реальных событиях", "на реальних подіях", "реальн* истори*", "реальн* істор*", "histoire vraie", "faits reels", "historia real", "hechos reales"],
  "time travel": ["путешестви* во времени", "подорож* у часі", "voyage dans le temps", "viajes en el tiempo", "viaje en el tiempo"],
  "suspense": ["напряженн*", "напружен*"],
  "psychological thriller": ["психологическ* триллер*", "психологічн* трилер*", "thriller psychologique", "thriller psicologico"],

  // moods
  "cozy": ["уютн*", "затишн*", "cocooning", "douillet*", "acogedor*"],
  "chill": ["расслаб*", "розслаб*", "спокойн*", "спокійн*", "detendre", "detente", "relajar*", "relajante*", "tranquil*"],
  "something light": ["легк*", "легеньк*", "ненапряжн*", "leger", "legere", "ligero", "ligera"],
  "dark": ["мрачн*", "темн*", "похмур*", "sombre*", "oscuro", "oscura"],
  "sad": ["грустн*", "сумн*", "печальн*", "triste*"],
  "want to cry": ["поплакат*", "поплакати", "плакат*", "поплач*", "pleurer", "llorar"],
  "feel good": ["позитивн*", "жизнеутверждающ*", "життєствердн*", "для настроения", "для настрою", "поднять настроение", "підняти настрій", "pour le moral", "bonne humeur", "buen humor"],
  "uplifting": ["трогательн*", "зворушлив*", "душевн*", "добр* фильм*", "добр* фільм*", "emouvant*", "touchant*", "conmovedor*", "emotiv*"],
  "inspiring": ["вдохновля*", "мотивир*", "мотивац*", "надиха*", "мотиву*", "inspirant*", "motivant*", "inspirador*", "motivador*"],
  "mind bending": ["взрыв мозга", "вынос мозга", "вибух мозку", "винос мозку", "запутанн*", "заплутан*", "неожиданн* концовк*", "несподіван* кінцівк*"],
  "bored": ["скучно", "скучаю", "нудно", "нудьг*", "ennuie", "ennui", "aburrid*"],
  "lonely": ["одинок*", "самотн*", "seul", "seule", "solitari*"],
  "alone": ["наедине", "наодинці", "сам на сам", "tout seul", "toute seule", "a solas"],
  "tired": ["устал*", "втомил*", "втомлен*", "fatigue*", "cansad*"],
  "after hard day": ["после тяжелого дня", "после работы", "після важкого дня", "після роботи", "apres le travail", "apres une dure journee", "despues del trabajo", "despues de un dia duro"],
  "broken heart": ["расставан*", "розставан*", "разбит* сердц*", "розбит* серц*", "apres une rupture", "coeur brise", "ruptura", "corazon roto"],
  "nostalgic": ["ностальги*", "ностальгі*", "nostalgi*"],
  "epic": ["эпическ*", "эпичн*", "епічн*", "epique*", "epico", "epica"],

  // time, season, company
  "tonight": ["сегодня вечером", "сьогодні ввечері", "сьогодні увечері", "на вечер", "на вечір", "ce soir", "esta noche"],
  "evening": ["вечер*", "вечір*", "вечор*", "ввечері", "увечері", "soir", "soiree"],
  "late night": ["ночь*", "ночи", "ніч*", "ночі", "вночі", "на ніч", "nuit", "noche"],
  "rainy day": ["дожд*", "дощ*", "pluie", "pluvieu*", "lluvia", "lluvios*"],
  "winter evening": ["зимн*", "зимов*", "зима", "зимой", "взимку", "hiver", "invierno"],
  "cozy autumn": ["осен*", "осін*", "восени", "automne", "otono"],
  "summer vibes": ["летн*", "літн*", "лето", "летом", "літо", "влітку", "verano"],
  "christmas": ["рождеств*", "різдв*", "новогодн*", "новорічн*", "noel", "navidad*", "naviden*"],
  "halloween": ["хэллоуин*", "хеллоуин*", "хелловін*", "гелловін*"],
  "weekend": ["выходн*", "вихідн*", "week-end", "fin de semana"],
  "sunday": ["воскресень*", "неділ*", "dimanche", "domingo"],
  "date night": ["свидани*", "побаченн*", "с девушкой", "з дівчиною", "с парнем", "з хлопцем", "с женой", "з дружиною", "с мужем", "з чоловіком", "вдвоем", "удвох", "вдвох", "en couple", "en amoureux", "rendez-vous", "en pareja", "con mi novia", "con mi novio", "cita"],
  "with friends": ["с друзьями", "з друзями", "с подругами", "з подругами", "в компании", "в компанії", "entre amis", "avec des amis", "entre potes", "con amigos", "con amigas"],

  // topics (see TOPIC_WORDS)
  "ghost": ["призрак*", "привид*", "fantome*", "fantasma*"],
  "witch": ["ведьм*", "відьм*", "sorciere*", "bruja*"],
  "magic": ["маги*", "магі*", "волшеб*", "чарівн*", "magie", "magia"],
  "dragon": ["дракон*"],
  "heist": ["ограблен*", "пограбуван*", "braquage*", "atraco*"],
  "alien": ["инопланет*", "пришельц*", "прибульц*", "іншопланет*", "extraterrestre*"],
  "robot": ["робот*"],
  "prison": ["тюрьм*", "тюрем*", "в'язниц*", "carcel"],
  "survival": ["выживан*", "виживан*", "survie", "supervivencia"],
  "revenge": ["месть", "мести", "помст*", "venganza"],
  "spy": ["шпион*", "шпигун*", "espion*", "espia*"],
  "serial killer": ["маньяк*", "маніяк*", "серийн* убийц*", "серійн* вбивц*", "tueur en serie", "asesino en serie"],
  "dog": ["собак*", "пес", "песик*", "chien*", "perro*"],
  "cat": ["кот", "коты", "кошк*", "кіт", "коти", "кішк*", "gato*"],
  "dinosaur": ["динозавр*", "dinosaure*", "dinosaurio*"],
  "shark": ["акул*", "requin*", "tiburon*"],
  "pirate": ["пират*", "пірат*"],
  "wedding": ["свадьб*", "свадеб*", "весіл*", "mariage", "boda", "bodas"],
  "high school": ["школ*", "шкільн*", "lycee", "ecole", "escuela", "instituto"],
  "teen": ["подростк*", "підлітк*", "ados", "adolescent*"],
  "sports": ["спорт*", "deporte*"],
  "football": ["футбол*", "futbol"],
  "boxing": ["бокс*", "boxe", "boxeo"],
  "dance": ["танц*", "danse", "baile*"],
  "music": ["музык*", "музик*", "musique", "musica"],
  "cooking": ["кулинар*", "кулінар*", "готовк*", "про еду", "про їжу", "cuisine", "cocina"],
  "world war ii": ["втор* миров*", "друг* світов*", "seconde guerre mondiale", "segunda guerra mundial"],
  "biography": ["биографи*", "біографі*", "байопик*", "biographi*", "biografi*"],
  "monster": ["монстр*", "чудовищ*", "чудовиськ*", "monstre*", "monstruo*"],
  "demon": ["демон*"],
  "end of the world": ["конец света", "кінець світу", "fin du monde", "fin del mundo"],
  "apocalypse": ["апокалипс*", "апокаліпс*"],
  "post apocalyptic": ["постапокалип*", "постапокаліп*"],
  "dystopia": ["антиутопи*", "антиутопі*", "dystopie*", "distopi*"],
  "cyberpunk": ["киберпанк*", "кіберпанк*"],
  "friendship": ["дружб*", "amitie", "amistad"],
  "fairy tale": ["сказк*", "сказоч*", "казк*", "казков*", "conte de fees", "cuento de hadas"],
  "police": ["полицейск*", "поліцейськ*", "policia*"],
  "doctor": ["врач*", "лікар*", "medecin*", "medico*"],
  "lawyer": ["адвокат*", "avocat*", "abogad*"],
  "hacker": ["хакер*"],
  "martial arts": ["боевые искусства", "боевых искусств*", "бойові мистецтва", "кунг-фу", "каратэ", "карате", "arts martiaux", "artes marciales"],
  "samurai": ["самура*"],
  "ninja": ["ниндзя", "ніндзя"],
  "princess": ["принцесс*", "принцес*", "princesse*", "princesa*"],
  "road trip": ["роуд-муви", "роуд муви", "дорожн* приключен*", "дорожн* пригод*"],
  "summer": ["про лето", "про літо"],
  "coming of age": ["взрослени*", "дорослішан*"],
  "treasure": ["сокровищ*", "скарб*", "tresor*", "tesoro*"],

  // decades in words
  "70s": ["семидесят*", "сімдесят*"],
  "80s": ["восьмидесят*", "вісімдесят*"],
  "90s": ["девяност*", "дев'яност*"],
  "2000s": ["двухтысячн*", "двотисячн*", "нулевых", "нульових"],

  // origin
  "korean": ["корейск*", "корейськ*", "coreen*", "corean*"],
  "k drama": ["дорам*"],
  "japanese": ["японск*", "японськ*", "japonais*", "japones*"],
  "french": ["французск*", "французьк*", "francais*", "frances", "francesa*"],
  "italian": ["итальянск*", "італійськ*", "italien*", "italiano*", "italiana*"],
  "spanish": ["испанск*", "іспанськ*", "espagnol*", "espanol*"],
  "german": ["немецк*", "німецьк*", "allemand*", "aleman*"],
  "indian": ["индийск*", "індійськ*", "болливуд*", "боллівуд*"],
  "chinese": ["китайск*", "китайськ*", "chinois*"],
  "ukrainian": ["украинск*", "українськ*", "ukrainien*", "ucranian*"],
  "turkish": ["турецк*", "турецьк*", "turque*", "turco*"],

  // negations: "не страшный" → "not scary", "без крови" → "without gory"
  "not": ["не", "pas", "pas de"],
  "without": ["без", "sans", "sin"],
  "too": ["слишком", "занадто", "надто", "trop", "demasiado"],
  "gory": ["кровав*", "кривав*", "кровищ*", "sanglant*", "sangrient*"],
  "violence": ["насили*", "насильств*", "жестокост*", "жорстокост*", "жестк*", "жорстк*", "violencia", "violent*"],
  "long": ["длинн*", "довг*", "долг*", "largo*", "larga*"],

  // glue words
  "best": ["лучш*", "найкращ*", "кращ*", "meilleur*", "mejor*"],
  "new": ["нов*", "свеж*", "свіж*", "nouveau", "nouveaux", "nouveautes", "nuevo*", "nueva*"],
  "classic": ["классик*", "классическ*", "класик*", "класичн*", "classique*", "clasico*", "clasica*"],
  "old": ["стары*", "старо*", "старі*", "старе", "vieux", "vieil*", "viejo*", "vieja*"],
  "like": ["похож* на", "схож* на", "типа", "в стиле", "у стилі", "comme", "dans le style de", "como", "parecid* a", "al estilo de"],
  "something": ["что-то", "что то", "что-нибудь", "что нибудь", "щось", "quelque chose", "algo"],
  "for": ["для", "pour", "para"],
  "watch": ["посмотреть", "глянуть", "подивитис*", "глянути", "regarder", "ver"],
  "": ["про", "как", "это", "мне", "мені", "или", "або", "под", "что", "які", "des", "les", "une", "del", "los", "las", "una", "que", "avec", "dans", "qui", "por", "muy", "хочу", "хочется", "хочеться", "хотим", "хочемо", "посоветуй*", "порадь*", "порекомендуй*", "подскажи*", "підкажи*", "покажи*", "найди*", "знайди*", "пожалуйста", "будь ласка", "хорош*", "гарн*", "интересн*", "цікав*", "какой-нибудь", "какой нибудь", "какой-то", "який-небудь", "якийсь", "очень", "дуже", "чтобы", "щоб", "можно", "можна", "сегодня", "сьогодні", "просто", "настроени*", "настрі*", "под настроение", "je veux", "j'ai envie de", "j'ai envie d'un", "quiero", "busco", "recomienda*", "recommande*", "s'il vous plait", "por favor"]
};

function normalizeForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’ʼ`]/g, "'")
    .replace(/(?<=\p{Script=Cyrillic})'(?=\p{Script=Cyrillic})/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest patterns first, so "сегодня вечером" wins over "вечер*"
const I18N_RULES = Object.entries(I18N_TERMS)
  .flatMap(([en, patterns]) => patterns.map(p => ({ en, source: normalizeForMatch(p) })))
  .sort((a, b) => b.source.length - a.source.length)
  .map(({ en, source }) => {
    const body = source
      .split(' ')
      .map(word => word.endsWith('*') ? `${escapeRegExp(word.slice(0, -1))}\\p{L}*` : escapeRegExp(word))
      .join("[\\s'-]+");
    return { en, re: new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'gu') };
  });

const DECADE_LABEL = d => (d === '00' ? '2000s' : d === '10' ? '2010s' : d === '20' ? '2020s' : `${d}s`);

// Returns { text, changed, leftover }:
//   text     — the query with known words replaced by English ones
//   changed  — whether anything was translated at all
//   leftover — a meaningful non-English word stayed untranslated (the AI should decide)
function translateQuery(query) {
  const original = normalizeForMatch(query);
  let text = original
    // "90-х", "1980-ые", "80-ті"
    .replace(/(?<![\p{L}\p{N}])(?:19|20)?(\d0)\s*-?\s*(?:х|ых|ые|е|их|тих|ті)(?![\p{L}\p{N}])/gu, (_, d) => ` ${DECADE_LABEL(d)} `)
    // "années 90", "años 80", "de los 90"
    .replace(/(?<![\p{L}\p{N}])(?:annees|anos|los)\s+(?:19|20)?(\d0)(?![\p{L}\p{N}])/gu, (_, d) => ` ${DECADE_LABEL(d)} `);

  // Replaced fragments are parked behind markers so later rules cannot re-translate them
  const parked = [];
  for (const { en, re } of I18N_RULES) {
    text = text.replace(re, () => {
      parked.push(en);
      return `\u0001${parked.length - 1}\u0001`;
    });
  }

  const leftover = /\p{Script=Cyrillic}{4,}/u.test(text);
  text = text
    .replace(/\u0001(\d+)\u0001/g, (_, i) => ` ${parked[Number(i)]} `)
    .replace(/\s+/g, ' ')
    .trim();

  return { text, changed: text !== original, leftover };
}

// Finds the best promptsDB entry for a query: { key, value, exact } or null
function lookupPrompt(query) {
  const q = query.toLowerCase().trim();

  // 1. Exact match
  if (promptsDB[q]) return { key: q, value: promptsDB[q], exact: true };

  const qWords = q.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
  const paddedQuery = ` ${qWords.join(' ')} `;
  const qWordSet = new Set(qWords);
  const keys = Object.keys(promptsDB);

  // 2. Query contains a known key as whole words — the most specific (longest) key wins,
  //    so "cozy rainy evening" matches "rainy evening", not the generic "evening"
  let bestKey = null;
  for (const key of keys) {
    const trimmedKey = key.trim();
    if (trimmedKey.length < 4) continue;
    // 4-letter keys: only mood words ("cozy", "dark"), not titles ("soul", "sing")
    if (trimmedKey.length === 4 && !promptsDB[key].genres) continue;
    if (!paddedQuery.includes(` ${trimmedKey} `)) continue;
    if (!bestKey || trimmedKey.length > bestKey.trim().length) bestKey = key;
  }

  // 3. All words of a multi-word key appear in query (any order) — most words wins
  let bestWordsKey = null;
  let bestWordCount = 0;
  for (const key of keys) {
    const kWords = key.trim().split(/\s+/);
    if (kWords.length < 2 || kWords.length <= bestWordCount) continue;
    if (kWords.every(w => qWordSet.has(w))) {
      bestWordsKey = key;
      bestWordCount = kWords.length;
    }
  }

  // A scattered match only beats a phrase match when it covers more of the query
  if (bestWordsKey && (!bestKey || bestWordCount > bestKey.trim().split(/\s+/).length)) {
    return { key: bestWordsKey, value: promptsDB[bestWordsKey], exact: false };
  }
  if (bestKey) return { key: bestKey, value: promptsDB[bestKey], exact: false };

  return null;
}

// ══════════════════════════════════════════════
// CONCEPT PARSER
// promptsDB knows fixed phrases; this part understands any combination of
// genre + mood + topic + decade + country + type ("funny zombie movie from the 80s"),
// which covers far more queries than a phrase list ever could.
// Phrases are separated by "|" and matched as whole words.
// ══════════════════════════════════════════════
const GENRE_WORDS = [
  [28, 'action|fight|fights|fighting|explosions|shootout|adrenaline|badass'],
  [12, 'adventure|adventures|adventurous|quest|expedition'],
  [16, 'animation|animated|cartoon|cartoons'],
  [35, 'comedy|comedies|comedic|funny|hilarious|humor|humour|humorous|laugh|laughs|laughing|goofy|silly|witty|sitcom|rom com|romcom'],
  [80, 'crime|criminal|criminals'],
  [99, 'documentary|documentaries|docu|docuseries'],
  [18, 'drama|dramas|dramatic'],
  [10751, 'family|kids|kid|children|child'],
  [14, 'fantasy'],
  [36, 'history|historical|historic|period piece|costume drama'],
  [27, 'horror|horrors|scary|creepy|spooky|terrifying|frightening'],
  [10402, 'music|musical|musicals'],
  [9648, 'mystery|mysteries|mysterious'],
  [10749, 'romance|romantic|love story|about love|rom com|romcom'],
  [878, 'sci fi|scifi|science fiction|futuristic'],
  [53, 'thriller|thrillers|suspense|suspenseful|tense'],
  [10752, 'war|military|wartime'],
  [37, 'western|westerns']
];

const MOOD_WORDS = [
  [[18], 'sad|cry|crying|want to cry|tearjerker|tear jerker|emotional|heartbreaking|melancholy|melancholic|depressing|moving|touching'],
  [[35, 10749], 'cozy|cosy|comfort|comforting|warm|girls night'],
  [[35, 18], 'feel good|feelgood|uplifting|heartwarming|wholesome|positive|happy|cheerful|optimistic'],
  [[35], 'chill|relax|relaxing|easy|light|something light|lighthearted|light hearted|calm|quiet|peaceful|fun|lazy|hangover|hungover'],
  [[53, 18], 'dark|gritty|bleak|disturbing|intense|grim'],
  [[878, 9648], 'mind bending|mindbending|mind blowing|mindblowing|trippy|mindfuck|confusing|thought provoking|smart|clever'],
  [[9648, 53], 'twist|twists|twisty|unpredictable|plot twist'],
  [[18, 36], 'inspiring|inspirational|motivational|motivating|motivation'],
  [[12, 28], 'epic|exciting|thrilling'],
  [[10749, 35], 'date|date night|girlfriend|boyfriend|wife|husband|couple|valentine|valentines'],
  [[10749, 18], 'breakup|break up|heartbroken|broken heart'],
  [[35, 28], 'with friends|friends|party|guys night|boys night'],
  [[10751, 35], 'with parents|parents|with family|grandparents|grandma|all ages'],
  [[16, 10751], 'with kids|for kids|toddlers']
];

// Mood recipes. A genre alone is too blunt: "cozy" as plain comedy + romance brings
// American Pie. A recipe adds TMDB's own mood tags (any of them), drops genres that
// break the mood and sorts by how many people rated the film - the well-loved ones first.
const HEAVY_GENRES = [28, 27, 53, 80, 10752, 878, 12];
const MOOD_PROFILES = {
  cozy: {
    genres_any: [35, 10749, 10751],
    keywords_any: [325784, 288816, 324713, 325832], // comforting, lighthearted, whimsical, joyful
    exclude_genres: [...HEAVY_GENRES, 16]
  },
  rainy: {
    genres_any: [35, 18, 10749],
    keywords_any: [325784, 164246, 319319, 278730, 225219, 288816], // comforting, nostalgic, sentimental, bittersweet, reflective, lighthearted
    exclude_genres: HEAVY_GENRES
  },
  feelgood: {
    keywords_any: [325824, 325782, 325832, 281585, 288816], // hopeful, cheerful, joyful, inspirational, lighthearted
    exclude_genres: [...HEAVY_GENRES, 16]
  },
  sad: {
    genres_any: [18],
    keywords_any: [319319, 4232, 156924, 9872, 278730], // sentimental, melancholy, tearjerker, grief, bittersweet
    exclude_genres: [27, 28, 53, 9648, 878]
  },
  date: {
    genres_any: [10749],
    keywords_any: [324429, 9673, 288816], // romantic, love, lighthearted
    exclude_genres: [27, 53]
  },
  inspiring: {
    genres_any: [18],
    keywords_any: [281585, 325824, 240], // inspirational, hopeful, underdog
    exclude_genres: [53, 80, 27, 9648]
  },
  mind: {
    genres_any: [878, 9648],
    keywords_any: [212737, 197582, 325775], // philosophical, mysterious, awestruck
    exclude_genres: [16, 10751, 28, 12]
  }
};

const MOOD_PROFILE_WORDS = [
  ['rainy', 'rainy|rain|rainy day|rainy evening|autumn evening'],
  ['cozy', 'cozy|cosy|comfort|comforting|warm|chill|relax|relaxing|calm|quiet|peaceful|light|something light|lighthearted|light hearted|lazy|winter evening'],
  ['feelgood', 'feel good|feelgood|uplifting|heartwarming|wholesome|positive|happy|cheerful|optimistic|after hard day'],
  ['sad', 'sad|cry|crying|want to cry|tearjerker|tear jerker|emotional|heartbreaking|melancholy|melancholic|moving|touching|breakup|break up|heartbroken|broken heart'],
  ['date', 'date|date night|girlfriend|boyfriend|wife|husband|couple|valentine|valentines|romantic|romantic evening|romantic night|rom com|romcom'],
  ['inspiring', 'inspiring|inspirational|motivational|motivating|motivation'],
  ['mind', 'mind bending|mindbending|mind blowing|mindblowing|trippy|mindfuck|thought provoking']
];

// TMDB keyword id → trigger phrases
const TOPIC_WORDS = [
  [12565, 'psychological thriller|psychological'],
  [12377, 'zombie|zombies|undead'], [3133, 'vampire|vampires'], [12564, 'werewolf|werewolves'],
  [162846, 'ghost|ghosts'], [3358, 'haunted house|haunted'], [10714, 'serial killer|serial killers|maniac'],
  [10051, 'heist|heists|robbery'], [15363, 'bank robbery'], [4379, 'time travel|time traveling|time travelling'],
  [10854, 'time loop|groundhog day'], [9951, 'alien|aliens|extraterrestrial'], [14909, 'alien invasion'],
  [14544, 'robot|robots|android|androids'], [310, 'artificial intelligence|ai'], [4565, 'dystopia|dystopian'],
  [4458, 'post apocalyptic|postapocalyptic'], [12332, 'apocalypse|apocalyptic'], [10150, 'end of the world'],
  [9715, 'superhero|superheroes'], [9672, 'based on true story|true story|true events|real story'],
  [818, 'based on book|based on a book|based on novel|book adaptation'], [5565, 'biography|biopic|biographical'],
  [207317, 'christmas|xmas|holiday'], [3335, 'halloween'], [13027, 'wedding|weddings|bride'],
  [6270, 'high school|highschool|school'], [3616, 'college|university|campus'], [296608, 'teen|teens|teenage|teenager|teenagers'],
  [7312, 'road trip|roadtrip|road movie'], [10683, 'coming of age'], [6054, 'friendship'],
  [9748, 'revenge|vengeance'], [378, 'prison|jail'], [10685, 'escape|prison break'], [10349, 'survival|survive'],
  [12616, 'dinosaur|dinosaurs'], [12554, 'dragon|dragons'], [2343, 'magic|magical'], [616, 'witch|witches'],
  [177912, 'wizard|wizards'], [12988, 'pirate|pirates'], [470, 'spy|spies|espionage|secret agent'],
  [782, 'assassin|assassins|hitman'], [10391, 'mafia|mob'], [3149, 'gangster|gangsters'],
  [779, 'martial arts|kung fu|karate'], [1462, 'samurai'], [10278, 'ninja|ninjas'], [12190, 'cyberpunk'],
  [336874, 'multiverse|parallel universe'], [1453, 'amnesia|memory loss'], [10410, 'conspiracy'],
  [33519, 'courtroom|trial'], [10909, 'lawyer|lawyers'], [703, 'detective|detectives'], [12570, 'whodunit|murder mystery'],
  [1930, 'kidnapping|kidnapped'], [1562, 'hostage|hostages'], [830, 'racing|car race|car racing|race cars'],
  [6075, 'sports|sport'], [209476, 'boxing|boxer'], [579, 'american football'], [13042, 'football|soccer'],
  [6496, 'basketball'], [1480, 'baseball'], [4048, 'musician|band|rock star'], [1691, 'dance|dancing|dancer'],
  [1918, 'cooking|food'], [18293, 'chef'], [15162, 'dog|dogs|puppy'], [977, 'cat|cats|kitten'], [2673, 'horse|horses'],
  [15097, 'shark|sharks'], [1299, 'monster|monsters'], [161791, 'kaiju|godzilla'], [12339, 'slasher'],
  [163053, 'found footage'], [2626, 'exorcism|possession'], [15001, 'demon|demons'], [6158, 'cult'],
  [1956, 'world war ii|world war 2|ww2|wwii|second world war'], [2957, 'vietnam war|vietnam'], [2106, 'cold war'],
  [5049, 'ancient rome|roman empire|gladiator'], [242, 'new york|nyc'], [90, 'paris'], [212, 'london'], [12369, 'tokyo'],
  [13088, 'summer'], [966, 'beach'], [2041, 'island'], [10787, 'jungle'], [18034, 'desert'], [270, 'ocean|sea'],
  [339, 'submarine'], [3800, 'airplane|plane'], [13008, 'train'], [188957, 'virus|outbreak'], [188973, 'pandemic'],
  [3205, 'fairy tale|fairytale'], [2035, 'mythology|myth'], [2036, 'greek mythology'], [158718, 'lgbt|lgbtq|gay|lesbian|queer'],
  [240119, 'father and son|father son'], [10508, 'teacher'], [13005, 'doctor|hospital|medical'], [736, 'journalist|journalism'],
  [13028, 'writer|author'], [2157, 'hacker|hackers|hacking'], [282, 'video game|video games|gaming'], [316, 'chess'],
  [395, 'gambling|poker'], [585, 'casino'], [14964, 'drugs|drug'], [6782, 'addiction'], [894, 'depression'], [9872, 'grief|loss'],
  [128, 'love triangle'], [3691, 'forbidden love'], [157303, 'first love'], [15160, 'divorce'], [1326, 'infidelity|cheating|affair'],
  [10121, 'stop motion'], [11800, 'mockumentary'], [8201, 'satire|satirical'], [9755, 'parody|spoof'],
  [10123, 'dark comedy|black comedy'], [167316, 'buddy cop'], [207268, 'neo noir'], [9807, 'film noir|noir'],
  [10028, 'steampunk'], [161176, 'space opera'], [9882, 'space|outer space'], [14626, 'astronaut|astronauts'],
  [240, 'underdog'], [7376, 'princess'], [9920, 'royal|royalty'], [6956, 'treasure|treasure hunt'],
  [1415, 'small town'], [6149, 'police|cop|cops'], [1812, 'fbi'], [6078, 'politics|political'], [13065, 'soldier|soldiers'],
  [14760, 'scientist|scientists'], [15016, 'twins'], [12392, 'best friend|best friends'], [6733, 'bullying|bully'],
  [5938, 'mermaid|mermaids'], [4563, 'virtual reality|vr'], [267848, 'talking animals|talking animal'], [210024, 'anime']
];

const LANGUAGE_WORDS = [
  ['ko', 'korean|south korean'], ['ko-tv', 'k drama|kdrama|k dramas|korean series'], ['ja', 'japanese'], ['fr', 'french'], ['es', 'spanish'],
  ['it', 'italian'], ['de', 'german'], ['hi', 'indian|bollywood|hindi'], ['zh', 'chinese'], ['uk', 'ukrainian'],
  ['tr', 'turkish'], ['pl', 'polish'], ['sv', 'swedish'], ['da', 'danish']
];

const TV_WORDS = 'series|tv show|tv shows|show|shows|tv|sitcom|miniseries|mini series|k drama|kdrama|k dramas';
const OLD_WORDS = 'classic|classics|old|vintage|retro|old school|oldschool';
const NEW_WORDS = 'new|recent|latest|modern|newest';

// Words that carry no meaning for the search
const STOP_WORDS = new Set(('a an the and or but of in on at to for from with without about like as is are was be it its this that these those ' +
  'i me my we our you your he she they them love enjoy something anything some any kind sort type good great best top nice awesome amazing cool ' +
  'movie movies film films flick flicks picture watch watching see seen show me find give need want wanna looking look search ' +
  'recommend recommendation recommendations suggest suggestion please really very so too just more most much many few little bit ' +
  'tonight today now evening night day weekend after before when while what which who where how can could should would will ' +
  'similar style vibe vibes mood feeling feel get got have has had do does did not no yes ok one two all every ever also').split(' '));

function compileConcepts(rows) {
  return rows
    .flatMap(([payload, phrases]) => phrases.split('|').map(phrase => ({ payload, words: phrase.split(' ') })))
    .sort((a, b) => b.words.length - a.words.length);
}

const GENRE_CONCEPTS = compileConcepts(GENRE_WORDS);
const MOOD_CONCEPTS = compileConcepts(MOOD_WORDS);
const MOOD_PROFILE_CONCEPTS = compileConcepts(MOOD_PROFILE_WORDS);
const TOPIC_CONCEPTS = compileConcepts(TOPIC_WORDS);
const TOPIC_LABELS = Object.fromEntries(TOPIC_WORDS.map(([id, phrases]) => [id, phrases.split('|')[0]]));
const LANGUAGE_CONCEPTS = compileConcepts(LANGUAGE_WORDS);
// "show me ..." is a request, not a TV show
const TV_CONCEPTS = compileConcepts([['tv', TV_WORDS], ['skip', 'show me']]);
const OLD_CONCEPTS = compileConcepts([['old', OLD_WORDS]]);
const NEW_CONCEPTS = compileConcepts([['new', NEW_WORDS]]);

// Calls onMatch(payload) for every phrase found; marks its words as used so that
// "new york" is not also read as "new", and "dark comedy" not also as "dark"
function matchConcepts(tokens, used, concepts, onMatch) {
  for (const { payload, words } of concepts) {
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (!words.every((word, j) => tokens[i + j] === word && !used[i + j])) continue;
      words.forEach((_, j) => { used[i + j] = true; });
      onMatch(payload);
    }
  }
}

function parseConcepts(text) {
  const tokens = text.toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const used = tokens.map(() => false);
  const parsed = { genres: [], moodGenres: [], keywords: [], tokens, used };
  const add = (list, value) => { if (!list.includes(value)) list.push(value); };

  // Decades and years: "90s", "1980s", "1994"
  tokens.forEach((token, i) => {
    const decade = token.match(/^(19|20)?(\d0)s$/);
    const year = token.match(/^(19[2-9]\d|20[0-2]\d)$/);
    if (decade) {
      const start = decade[1] ? Number(decade[1] + decade[2]) : Number(decade[2]) + (Number(decade[2]) < 30 ? 2000 : 1900);
      parsed.year_from = start;
      parsed.year_to = start + 9;
      used[i] = true;
    } else if (year) {
      parsed.year_from = parsed.year_to = Number(year[1]);
      used[i] = true;
    }
  });

  // Topics first: their phrases are the most specific ("dark comedy", "love triangle", "new york")
  matchConcepts(tokens, used, TOPIC_CONCEPTS, id => add(parsed.keywords, id));
  matchConcepts(tokens, used, LANGUAGE_CONCEPTS, code => {
    parsed.language = parsed.language || code.slice(0, 2);
    if (code.endsWith('-tv')) parsed.media_type = 'tv';
  });
  matchConcepts(tokens, used, TV_CONCEPTS, payload => { if (payload === 'tv') parsed.media_type = 'tv'; });
  // Mood recipe: matched on its own, the first (longest) phrase wins
  const profileUsed = tokens.map(() => false);
  matchConcepts(tokens, profileUsed, MOOD_PROFILE_CONCEPTS, name => { parsed.moodProfile = parsed.moodProfile || name; });
  matchConcepts(tokens, used, MOOD_CONCEPTS, genres => genres.forEach(g => add(parsed.moodGenres, g)));
  profileUsed.forEach((wasUsed, i) => { if (wasUsed) used[i] = true; });
  // Genres are matched on their own: "k drama" is still a drama, a "dark comedy" still a comedy
  for (const { payload, words } of GENRE_CONCEPTS) {
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (!words.every((word, j) => tokens[i + j] === word)) continue;
      words.forEach((_, j) => { used[i + j] = true; });
      add(parsed.genres, payload);
    }
  }

  if (!parsed.year_from) {
    matchConcepts(tokens, used, OLD_CONCEPTS, () => { parsed.year_to = 1989; });
    matchConcepts(tokens, used, NEW_CONCEPTS, () => { parsed.year_from = new Date().getFullYear() - 3; });
  }

  // Anime is animation, and a "dark comedy" is still a comedy
  if (parsed.keywords.includes(210024)) add(parsed.genres, 16);
  if (parsed.keywords.includes(10123)) add(parsed.genres, 35);

  return parsed;
}

// How much of the query was understood: { known, unknown } word counts
function countCoverage(parsed, extraKnownWords = []) {
  const extra = new Set(extraKnownWords);
  let known = 0;
  let unknown = 0;
  parsed.tokens.forEach((token, i) => {
    if (parsed.used[i] || extra.has(token)) known += 1;
    else if (token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token)) unknown += 1;
  });
  return { known, unknown };
}

// Builds TMDB parameters from parsed concepts, or null when nothing useful was found
function composeFromConcepts(parsed) {
  let genres = parsed.genres.slice(0, 3);
  if (!genres.length) {
    genres = parsed.moodGenres.slice(0, 2);
  } else if (genres.length === 1) {
    // "sad comedy" → comedy + drama
    const extra = parsed.moodGenres.find(g => !genres.includes(g));
    if (extra) genres.push(extra);
  }

  if (!genres.length && !parsed.keywords.length && !parsed.language && !parsed.year_from && !parsed.year_to) return null;
  return genres.length ? { genres } : {};
}

// Adds what the phrase database cannot express: topic, years, country, movie/series
function enrich(result, parsed) {
  if (!result || result.search_query) return result;
  const enriched = { ...result };
  if (!result.company_id && parsed.keywords.length && !enriched.keywords) {
    enriched.keywords = parsed.keywords.slice(0, 2);
    // names the page shows as "#zombie" so the visitor sees what was understood
    enriched.topics = enriched.keywords.map(id => TOPIC_LABELS[id]).filter(Boolean);
  }
  if (!enriched.year_from && !enriched.year_to) {
    if (parsed.year_from) enriched.year_from = parsed.year_from;
    if (parsed.year_to) enriched.year_to = parsed.year_to;
  }
  if (parsed.language) enriched.language = parsed.language;
  if (parsed.media_type) enriched.media_type = parsed.media_type;
  applyMoodProfile(enriched, parsed);
  return enriched;
}

// Turns a mood ("cozy", "rainy evening") into its recipe, see MOOD_PROFILES.
// A topic ("zombie") is more specific than a mood and keeps its own keyword search.
function applyMoodProfile(result, parsed) {
  const profile = MOOD_PROFILES[parsed.moodProfile];
  if (!profile || result.company_id || result.keywords) return;

  result.mood = parsed.moodProfile;
  result.keywords_any = profile.keywords_any;
  result.sort = 'votes';

  if (parsed.genres.length) {
    // "cozy mystery": the asked genre stays, the mood only filters
    result.genres = parsed.genres.slice(0, 3);
  } else if (profile.genres_any) {
    result.genres_any = profile.genres_any;
  }
  const kept = new Set([...(result.genres || []), ...(result.genres_any || [])]);
  result.exclude_genres = profile.exclude_genres.filter(g => !kept.has(g));
}

// ══════════════════════════════════════════════
// "LIKE <TITLE>"
// "movies like Inception", "фильмы как Начало", "схожі на Друзі", "films comme Amélie",
// "películas como Titanic": the client shows what people who liked that title also liked
// (TMDB recommendations), which beats any genre guess.
// ══════════════════════════════════════════════
const LIKE_MARKERS = [
  /(?:^|\s)(?:like|similar to|in the style of)\s+(.+)$/u,
  /(?:^|\s)(?:похож\p{L}*|схож\p{L}*|подобн\p{L}*)\s+на\s+(.+)$/u,
  /(?:^|\s)(?:фильм\p{L}*|кино|сериал\p{L}*|мульт\p{L}*|фільм\p{L}*|серіал\p{L}*|что-то|что то|щось)\s+(?:как|як|типа|в стиле|у стилі)\s+(.+)$/u,
  /(?:^|\s)(?:comme|du genre|dans le style de|similaires? [aà])\s+(.+)$/u,
  /(?:^|\s)(?:como|parecid\p{L}*\s+a|similares?\s+a|al estilo de)\s+(.+)$/u
];
// "like Interstellar but darker": the comparison ends where the extra wishes start
const LIKE_TAIL = /\s+(?:but|only|except|and|но|але|только|тільки|mais|pero|sauf|excepto)\s+.*$/u;

// { title, rest } or null. rest is the query without the comparison ("dark sci-fi").
function extractLikeTitle(query) {
  const text = String(query || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const marker of LIKE_MARKERS) {
    const match = text.match(marker);
    if (!match) continue;
    const title = match[1]
      .replace(LIKE_TAIL, '')
      .replace(/^(?:the\s+)?(?:movie|film|series|show|фильм|фільм|сериал|серіал)\s+/u, '')
      .replace(/^[\s"'«»“”„]+|[\s"'«»“”„.,!?]+$/gu, '');
    if (title.length < 2 || title.length > 60 || title.split(' ').length > 8) continue;

    // "like crying", "like a rainy day": a mood, not a title
    const probe = parseConcepts(translateQuery(title).text);
    const describesMood = probe.genres.length || probe.moodGenres.length || probe.moodProfile;
    if (describesMood && countCoverage(probe).unknown === 0) continue;

    return { title, rest: text.slice(0, match.index).trim() };
  }
  return null;
}

// ══════════════════════════════════════════════
// NEGATIONS
// "scary but not too gory", "no cartoons", "не слишком длинный": what the visitor does NOT want
// becomes a filter instead of being read as a wish ("not scary" used to give horror films)
// ══════════════════════════════════════════════
const NEGATION_TARGETS = [
  ['horror', 'scary|horror|horrors|frightening|creepy|terrifying|spooky', { genres: [27] }],
  ['gore', 'gory|gore|bloody|blood|splatter|graphic', { keywords: [10292, 344603, 367145] }],
  ['violence', 'violent|violence|brutal|cruel|cruelty', { genres: [10752], keywords: [10292, 262404, 367145] }],
  ['sad', 'sad|depressing|heavy|tragic|tearjerker|tearjerkers|crying|tears|drama', { keywords: [156924, 9872] }],
  ['romance', 'romantic|romance|love story|love stories|cheesy|mushy', { genres: [10749] }],
  ['animation', 'animated|animation|cartoon|cartoons|anime', { genres: [16] }],
  ['kids', 'kids|childish|children|for kids|for children', { genres: [10751] }],
  ['long', 'long|lengthy', { runtime: 120 }],
  // nothing to filter by, but still not a wish
  [null, 'boring|slow|stupid|dumb|predictable|cliche|cliched|cheap|bad', {}]
];
const NEGATION_RE = new RegExp(
  `(?:^|\\s)(?:not|no|without|non|nothing|never|less|dont want|don't want)[\\s-]+(?:(?:too|very|so|overly|that|much|any|a|lot|of|the|really|super)\\s+)*(${NEGATION_TARGETS.map(([, words]) => words).join('|')})(?=\\s|$)`,
  'gu'
);

// { text, avoid, genres, keywords, runtime, any }: text is the query without the negated phrases
function extractNegations(text) {
  const found = { avoid: [], genres: [], keywords: [], runtime: null };
  const stripped = text.replace(NEGATION_RE, (whole, word) => {
    const [label, , filter] = NEGATION_TARGETS.find(([, words]) => words.split('|').includes(word));
    if (label && !found.avoid.includes(label)) found.avoid.push(label);
    found.genres.push(...(filter.genres || []));
    found.keywords.push(...(filter.keywords || []));
    if (filter.runtime) found.runtime = filter.runtime;
    return ' ';
  }).replace(/\s+/g, ' ').trim();
  return { ...found, text: stripped, any: stripped !== text.trim() };
}

// The filters win over whatever the query or the AI suggested
function applyNegations(result, negations) {
  if (!negations?.any) return result;
  const out = { ...(result || {}) };
  const dropped = new Set(negations.genres);
  for (const key of ['genres', 'genres_any']) {
    if (!out[key]) continue;
    out[key] = out[key].filter(g => !dropped.has(g));
    if (!out[key].length) delete out[key];
  }
  if (negations.genres.length) out.exclude_genres = [...new Set([...(out.exclude_genres || []), ...negations.genres])];
  if (negations.keywords.length) out.exclude_keywords = [...new Set(negations.keywords)];
  if (negations.runtime) out.max_runtime = negations.runtime;
  if (negations.avoid.length) out.avoid = negations.avoid;
  return out;
}

// Best answer without the AI. confident = false means the AI should have a say first.
function resolveLocally(text) {
  const db = lookupPrompt(text);
  const parsed = parseConcepts(text);
  const composed = composeFromConcepts(parsed);

  const dbValue = db?.value;
  const dbIsEntity = Boolean(dbValue && (dbValue.search_query || dbValue.company_id));
  const dbKeyWords = db ? db.key.trim().split(/\s+/).length : 0;
  // A title search for the word "korean" or "anime" finds titles, not korean films or anime
  const weakSearch = Boolean(dbValue?.search_query && composed && (parsed.language || parsed.keywords.includes(210024)));
  const uncoveredGenre = parsed.genres.some(g => !(dbValue?.genres || []).includes(g));

  let base;
  if (db && !weakSearch && (db.exact || dbIsEntity)) {
    base = dbValue;
  } else if (db && !weakSearch && dbKeyWords >= 2 && !uncoveredGenre) {
    base = dbValue;
  } else if (composed && (composed.genres || parsed.keywords.length || parsed.language)) {
    base = composed;
  } else if (db && !weakSearch) {
    base = dbValue;
  } else {
    base = composed;
  }

  const result = enrich(base, parsed);
  const usedDb = Boolean(db) && base === dbValue;
  const coverage = countCoverage(parsed, usedDb ? db.key.toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u) : []);
  const known = coverage.known;
  const unknown = usedDb && db.exact ? 0 : coverage.unknown;

  return {
    result,
    parsed,
    confident: Boolean(result) && unknown <= known,
    // Half of the query is unknown words: it may well be a title ("The Dark Knight")
    maybeTitle: Boolean(result) && !result.search_query && unknown > 0 && unknown >= known
  };
}
