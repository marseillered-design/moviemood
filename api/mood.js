export default async function handler(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
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
Convert any user request into TMDB genre IDs.
Return ONLY valid JSON: {"genres": [number, number]}
Pick 1-3 most relevant genres.

If user mentions a specific movie title, return:
{"search_query": "exact movie title"}

TMDB Genre IDs:
28=Action, 12=Adventure, 16=Animation, 35=Comedy,
80=Crime, 99=Documentary, 18=Drama, 10751=Family,
14=Fantasy, 36=History, 27=Horror, 10402=Music,
9648=Mystery, 10749=Romance, 878=Science Fiction,
53=Thriller, 10752=War, 37=Western`,
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
      parsed = JSON.parse(content);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
    return res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}