export const ai = {
  models: {
    generateContent: async ({ model, contents, config }: {
      model: string;
      contents: any;
      config?: any;
    }) => {
      let userMessage = '';
      if (typeof contents === 'string') {
        userMessage = contents;
      } else if (contents?.parts) {
        userMessage = contents.parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('\n');
      }

      const messages: any[] = [];
      if (config?.systemInstruction) {
        messages.push({ role: 'system', content: config.systemInstruction });
      }
      messages.push({ role: 'user', content: userMessage });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
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
        throw new Error(`Groq error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      return { text };
    }
  }
};