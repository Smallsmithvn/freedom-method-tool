export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, q1, q2, q3, q4, q5, q6, q7 } = req.body;
  const name = firstName || 'you';

  const prompt = `You are Donna Smith Lees, creator of The Freedom Method — a belief-based transformation methodology. You speak with warmth, directness and deep intuition.

${name} has completed your Alignment Discovery tool. Their answers:

1. Area of life feeling most stuck: ${q1 || 'not specified'}
2. What they most want to create or feel: ${q2 || 'not specified'}
3. What they have already tried: ${q3 || 'not specified'}
4. Where they feel it in their body: ${q4 || 'not specified'}
5. How long they have carried this: ${q5 || 'a few years'}
6. The benefit of NOT having what they want: ${q6 || 'not specified'}
7. The benefit of NOT taking action: ${q7 || 'not specified'}

Build your entire insight around their specific answers. Mirror their language. Make them feel truly seen.

You must respond with ONLY a JSON object. Do not use markdown. Do not use backticks. Do not add any text before or after the JSON. The response must start with { and end with }.

The JSON must have these exact keys:
- greeting: one sentence using the name ${name} referencing something specific from their answers
- reflection: 3-4 sentences referencing their specific goal and what they have tried. Show you truly heard them.
- belief: the core belief running this pattern starting with "The belief quietly running your life ${name} is..."
- body_wisdom: 2 sentences connecting their body location to what they are carrying emotionally
- sabotage: 2-3 sentences naming the self-sabotage pattern revealed by why they benefit from staying stuck. Be direct but compassionate.
- shift: 2-3 sentences painting a vivid picture of life when this belief shifts specific to their goal
- belief_tags: an array of exactly 3 short first-person limiting belief statements of 6-8 words each drawn from their specific answers`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${JSON.stringify(geminiData)}`);
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch(e) {}

    if (!parsed) {
      try {
        const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        parsed = JSON.parse(stripped);
      } catch(e) {}
    }

    if (!parsed) {
      try {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          parsed = JSON.parse(rawText.slice(start, end + 1));
        }
      } catch(e) {}
    }

    if (!parsed) {
      throw new Error('Could not parse JSON from: ' + rawText.substring(0, 300));
    }

    const tags = (parsed.belief_tags || []).map(t => `<span class="pill">${t}</span>`).join('');
    const mailSubject = encodeURIComponent(`Discovery Call — ${name}`);
    const mailBody = encodeURIComponent(`Hi Donna,\n\nI just completed your Alignment Discovery and I'd love to find out more about working with you.\n\nMy name is ${name} and you can reach me at this email.\n\nLooking forward to speaking with you.`);

    const html = `
      <div class="qlabel" style="padding-top:0.5rem">Your Alignment Discovery</div>
      <div class="qtext" style="margin-bottom:1.5rem">${parsed.greeting || `Here is what I see for you, ${name}`}</div>
      <div class="rcard">
        <div class="rlabel">What I truly heard</div>
        <div class="rtext">${parsed.reflection}</div>
      </div>
      <div class="rcard">
        <div class="rlabel">The belief running beneath this</div>
        <div class="rtext">${parsed.belief}</div>
        <div class="divider"></div>
        <div style="font-size:13px;color:#888;margin-bottom:8px">The inner thoughts that might sound familiar…</div>
        ${tags}
      </div>
      <div class="rcard">
        <div class="rlabel">What your body is telling you</div>
        <div class="rtext">${parsed.body_wisdom}</div>
      </div>
      <div class="sabotage-card">
        <div class="rlabel">The pattern keeping you here</div>
        <div class="rtext">${parsed.sabotage}</div>
      </div>
      <div class="shift-card">
        <div class="rlabel">What becomes possible</div>
        <div class="rtext">${parsed.shift}</div>
      </div>
      <div class="cta">
        <div class="ctah">This is exactly where <em>The Freedom Method</em> begins.</div>
        <div class="ctas">What you've just uncovered isn't something a strategy or a to-do list can fix. It's belief-level work — and it's the most important work you'll ever do. A discovery call with Donna is the first step. It's a conversation, not a sales pitch.</div>
        <a class="ctabtn" href="mailto:donna@donnasmithlees.co.uk?subject=${mailSubject}&body=${mailBody}">✉ Email Donna to book a call</a>
      </div>`;

    return res.status(200).json({ html });

  } catch (err) {
    console.error('Insight generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
