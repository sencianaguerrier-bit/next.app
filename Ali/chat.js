// api/chat.js — Vercel Serverless Function
// Utilise Groq (gratuit) — clé API sécurisée côté serveur

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages invalides" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // 🔒 Variable Vercel
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Modèle gratuit et puissant
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: "Tu es NEXA, un assistant IA professionnel, concis et bienveillant. Réponds toujours en français sauf si l'utilisateur parle une autre langue. Sois direct et utile.",
          },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Erreur API" });
    }

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
}
