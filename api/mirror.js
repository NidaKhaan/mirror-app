export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, config } = req.body;

  let userMessage = '';
  if (typeof contents === 'string') {
    userMessage = contents;
  } else if (contents?.parts) {
    userMessage = contents.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('\n');
  }

  const messages = [];
  if (config?.systemInstruction) {
    messages.push({ role: 'system', content: config.systemInstruction });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}