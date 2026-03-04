import { lookupPrompt } from './promptsDB.js';

export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    // ══════════════════════════════════════════════
    // STEP 1: Check local database first (instant, free)
    // ══════════════════════════════════════════════
    const dbResult = lookupPrompt(query);
    if (dbResult) {
      console.log(`[DB HIT] "${query}" → ${JSON.stringify(dbResult)}`);
      return res.status(200).json(dbResult);
    }

    console.log(`[DB MISS] "${query}" → calling Gemini`);

    // ══════════════════════════════════════════════
    // STEP 2: Fallback to Gemini AI
    // ══════════════════════════════════════════════
    const prompt = `You are an expert movie recommendation assistant. Convert ANY user request into TMDB search parameters.

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
- company_id for studios/brands (pixar, marvel, dc, ghibli, a24...)
- search_query for directors, actors, franchises, national cinemas
- genres for moods, emotions, situations, descriptors
- Add year_from/year_to when time period is mentioned

EXAMPLES:
"something like inception" → {"genres": [9648, 878]}
"cozy sunday" → {"genres": [35, 10749]}
"what should i watch tonight" → {"genres": [35, 28]}
"zombie apocalypse" → {"genres": [27, 878]}
"revenge story" → {"genres": [28, 53]}
"found footage" → {"genres": [27]}
"period romance" → {"genres": [10749, 36]}
"cyberpunk action" → {"genres": [878, 28]}
"medical drama" → {"genres": [18]}
"prison escape" → {"genres": [18, 28]}

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
  if (q.includes('pixar')) return { company_id: 3 };
  if (q.includes('ghibli') || q.includes('miyazaki')) return { company_id: 10342 };
  if (q.includes('dreamworks')) return { company_id: 521 };
  if (q.includes('a24')) return { company_id: 41077 };
  if (q.includes('blumhouse')) return { company_id: 3172 };
  if (q.includes('marvel') || q.includes('mcu')) return { company_id: 420 };
  if (q.includes('batman') || q.includes('superman') || q.includes('dc movie')) return { company_id: 9993 };
  if (q.includes('disney')) return { company_id: 2 };
  if (q.includes('nolan')) return { search_query: 'christopher nolan' };
  if (q.includes('tarantino')) return { search_query: 'quentin tarantino' };
  if (q.includes('kubrick')) return { search_query: 'stanley kubrick' };
  if (q.includes('spielberg')) return { search_query: 'steven spielberg' };
  if (q.includes('korean') || q.includes('k-drama')) return { search_query: 'korean' };
  if (q.includes('bollywood')) return { search_query: 'bollywood' };
  if (q.includes('japanese') || q.includes('anime')) return { search_query: 'japanese' };
  if (q.match(/horror|scary|ghost|monster|creepy/)) return { genres: [27, 53] };
  if (q.match(/action|fight|battle|adrenaline/)) return { genres: [28, 12] };
  if (q.match(/funny|comedy|laugh|humor/)) return { genres: [35] };
  if (q.match(/romance|love|romantic/)) return { genres: [10749, 35] };
  if (q.match(/sci.?fi|space|future|robot|alien/)) return { genres: [878, 28] };
  if (q.match(/mystery|crime|detective|thriller/)) return { genres: [9648, 53] };
  if (q.match(/family|kids|children|cartoon/)) return { genres: [16, 10751] };
  if (q.match(/sad|cry|emotional|drama/)) return { genres: [18] };
  if (q.match(/fantasy|magic|dragon/)) return { genres: [14, 12] };
  if (q.match(/war|military|soldier/)) return { genres: [10752, 28] };
  if (q.match(/cozy|chill|relax|calm/)) return { genres: [35, 10749] };
  return { genres: [18, 28] };
}
