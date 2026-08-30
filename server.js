import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/mirror-api", async (req, res) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "Hello Gemini!" }]
      })
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
const reply = data.choices?.[0]?.message?.content || "No response from Gemini";
res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => console.log("Server running on port 8080"));
