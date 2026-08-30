export const ai = {
  models: {
    generateContent: async ({ model, contents, config }: {
      model: string;
      contents: any;
      config?: any;
    }) => {
      const response = await fetch('/api/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, config }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error: ${response.status} — ${err}`);
      }

      const data = await response.json();
      return { text: data.text };
    }
  }
};