export default async function handler(req, res) {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const keyStart = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) : 'MISSING';
  
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello in one word' }] }],
          generationConfig: { maxOutputTokens: 50 }
        })
      }
    );
    const data = await geminiRes.json();
    return res.status(200).json({ hasKey, keyStart, status: geminiRes.status, geminiResponse: data });
  } catch(err) {
    return res.status(200).json({ hasKey, keyStart, error: err.message });
  }
}
