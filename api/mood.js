export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      console.log("No query provided");
      return res.status(400).json({ error: "No query provided" });
    }
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a movie mood assistant.
Convert any user request into TMDB search parameters.
Return ONLY valid JSON with no extra text.

Output format:
{
  "genres": [number],       // 1-3 TMDB genre IDs (optional)
  "year_from": number,      // start year (optional)
  "year_to": number,        // end year (optional)
  "search_query": "string"  // only if user mentions a specific movie title
}

Year detection examples:
- "90s horrors" → year_from: 1990, year_to: 1999
- "80s action" → year_from: 1980, year_to: 1989
- "movies from 2000s" → year_from: 2000, year_to: 2009
- "2010-2015 thrillers" → year_from: 2010, year_to: 2015
- "classic films" → year_from: 1950, year_to: 1979
- "recent horror" → year_from: 2015, year_to: 2024
- "old comedies" → year_from: 1960, year_to: 1990
- "new releases" → year_from: 2023, year_to: 2024

TMDB Genre IDs:
28=Action, 12=Adventure, 16=Animation, 35=Comedy,
80=Crime, 99=Documentary, 18=Drama, 10751=Family,
14=Fantasy, 36=History, 27=Horror, 10402=Music,
9648=Mystery, 10749=Romance, 878=Science Fiction,
53=Thriller, 10752=War, 37=Western

If user mentions a specific movie title, return only:
{"search_query": "exact movie title"}`,
            },
            { role: "user", content: query },
          ],
          temperature: 0.3,
        }),
      }
    );
    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "Invalid AI response" });
    }
    let parsed;
    try {
      // Strip any markdown code blocks if AI wraps in ```json
      const clean = content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
    return res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
