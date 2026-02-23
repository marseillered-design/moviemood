export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    const prompt = `You are a movie recommendation assistant. Convert the user request into TMDB search parameters.

Return ONLY valid JSON, no extra text, no markdown:
{
  "genres": [number],
  "year_from": number,
  "year_to": number,
  "search_query": "string"
}

Rules:
- ALWAYS return at least "genres" array with 1-3 genre IDs, unless it's a specific movie title
- "search_query" ONLY for specific existing movie/show titles — then omit genres
- For vague inputs ("anything", "idk", "something good") → {"genres": [18, 28]}
- For emotions: sad→drama, happy→comedy, scared→horror, pumped→action, romantic→romance
- For languages: "korean"→{"genres":[18],"search_query":"korean drama"}, "french"→{"genres":[18,10749]}
- For moods: "cozy evening"→comedy+romance, "can't sleep"→thriller, "date night"→romance+comedy

Year detection:
- "90s" → year_from:1990, year_to:1999
- "80s" → year_from:1980, year_to:1989
- "2000s" → year_from:2000, year_to:2009
- "classic" → year_from:1950, year_to:1985
- "recent"/"new" → year_from:2020, year_to:2025
- "old" → year_from:1960, year_to:1995

TMDB Genre IDs:
28=Action, 12=Adventure, 16=Animation, 35=Comedy,
80=Crime, 99=Documentary, 18=Drama, 10751=Family,
14=Fantasy, 36=History, 27=Horror, 10402=Music,
9648=Mystery, 10749=Romance, 878=Science Fiction,
53=Thriller, 10752=War, 37=Western

User request: "${query}"`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.status);
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    const data = await geminiResponse.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return res.status(200).json({ genres: [18, 28], fallback: true });
    }

    let parsed;
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.genres && !parsed.search_query) {
        parsed.genres = [18, 28];
      }
      if (parsed.genres && !Array.isArray(parsed.genres)) {
        parsed.genres = [18, 28];
      }
    } catch (e) {
      console.error("JSON parse error:", e, "Raw:", content);

      // Smart keyword fallback
      const q = query.toLowerCase();
      let fallbackGenres = [18];
      if (q.match(/horror|scary|fear|ghost|monster/)) fallbackGenres = [27, 53];
      else if (q.match(/action|fight|war|battle|hero/)) fallbackGenres = [28, 12];
      else if (q.match(/funny|comedy|laugh|humor/)) fallbackGenres = [35];
      else if (q.match(/romance|love|date|relationship/)) fallbackGenres = [10749, 35];
      else if (q.match(/sci.?fi|space|future|robot|alien/)) fallbackGenres = [878, 28];
      else if (q.match(/mystery|crime|detective|thriller/)) fallbackGenres = [9648, 53];
      else if (q.match(/family|kids|children|cartoon|anime/)) fallbackGenres = [16, 10751];
      else if (q.match(/document|real|true|history/)) fallbackGenres = [99, 36];

      return res.status(200).json({ genres: fallbackGenres, fallback: true });
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(200).json({ genres: [18, 28], fallback: true });
  }
}
