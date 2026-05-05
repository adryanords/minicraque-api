export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageType } = req.body;
  const key = process.env.GEMINI_KEY;

  if (!key) return res.status(500).json({ error: 'Chave não configurada no servidor.' });
  if (!imageBase64) return res.status(400).json({ error: 'Imagem não recebida.' });

  const PROMPT = `Create a 3D collectible mini football figurine in the exact style of Brazilian "mini craques" / SoccerStarz plastic toys. Very large round head (40% of total height), tiny torso, short stubby legs, standing on a flat circular white base. Shiny hard plastic texture, vibrant football uniform, clean white studio background, realistic soft drop shadow. Maintain recognizable facial features of the person in the photo. Full body visible, friendly smile.`;

  try {
    // Passo 1: Gemini descreve a pessoa
    const vRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: imageType, data: imageBase64 } },
            { text: 'Describe this person briefly: skin tone, hair color and style, facial features, age. 2 sentences max, in English.' }
          ]
        }]
      })
    });

    let desc = 'a person with distinctive facial features';
    if (vRes.ok) {
      const vData = await vRes.json();
      desc = vData.candidates?.[0]?.content?.parts?.[0]?.text || desc;
    }

    // Passo 2: Gemini gera a imagem
    const iRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${PROMPT} The person has: ${desc}` }]
        }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      })
    });

    if (!iRes.ok) {
      const e = await iRes.json();
      throw new Error(e.error?.message || 'Erro Gemini Image ' + iRes.status);
    }

    const iData = await iRes.json();
    const parts = iData.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imgPart) throw new Error('Nenhuma imagem retornada pelo Gemini.');

    return res.status(200).json({
      imageUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
