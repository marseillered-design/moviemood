export default async function handler(req, res) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "No query provided" });
    }

    const aiResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `
You are an advanced AI Movie Discovery Engine.

Return ONLY valid JSON. No explanations.

JSON structure:

{
  "mode": "filter" | "similar",
  "reference_title": null,
  "type": "movie",
  "primary_genres": [],
  "secondary_genres": [],
  "exclude_genres": [],
  "year_from": null,
  "year_to": null,
  "vote_average_gte": null,
  "vote_count_gte": 1000,
  "original_language": null,
  "sort_by": "popularity.desc"
}

Rules:

1. Use max 3 primary genres.
2. Use secondary genres only if clearly relevant.
3. If user says "like X" → mode "similar" and set reference_title.
4. If user says "high rated" → vote_average_gte 7.5.
5. If user says "masterpiece" → vote_average_gte 8.5.
6. If user says "not too scary" → exclude_genres [27].
7. If user says "90s" → year_from 1990, year_to 1999.
8. If user says "anime" → original_language "ja".
9. If rating filter is applied → sort_by "vote_average.desc".
10. Always include vote_count_gte 1000 unless user asks for indie.
11. Default mode is "filter".
12. Default type is "movie".

Genre IDs:
28 Action
12 Adventure
16 Animation
35 Comedy
80 Crime
99 Documentary
18 Drama
10751 Family
14 Fantasy
36 History
27 Horror
10402 Music
9648 Mystery
10749 Romance
878 Science Fiction
53 Thriller
10752 War
37 Western
              `,
            },
            {
              role: "user",
              content: query,
            },
          ],
        }),
      }
    );

    const data = await aiResponse.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "Invalid AI response" });
    }

    // 🔥 Clean potential extra text around JSON
    content = content.trim();
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    content = content.substring(firstBrace, lastBrace + 1);

    const parsed = JSON.parse(content);

    // 🔒 Safety defaults
    if (!parsed.mode) parsed.mode = "filter";
    if (!parsed.type) parsed.type = "movie";
    if (!parsed.vote_count_gte) parsed.vote_count_gte = 1000;
    if (!parsed.primary_genres) parsed.primary_genres = [];
    if (!parsed.secondary_genres) parsed.secondary_genres = [];
    if (!parsed.exclude_genres) parsed.exclude_genres = [];
    if (!parsed.sort_by) parsed.sort_by = "popularity.desc";

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("AI ENGINE ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
}