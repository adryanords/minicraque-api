export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageType, prompt } = req.body;
  const key = process.env.HIGGSFIELD_KEY;

  if (!key) return res.status(500).json({ error: 'Chave não configurada no servidor.' });
  if (!imageBase64) return res.status(400).json({ error: 'Imagem não recebida.' });

  try {
    const response = await fetch('https://cloud.higgsfield.ai/v1/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${key}`
      },
      body: JSON.stringify({
        model: 'nano-banana',
        prompt: prompt || 'Create a 3D collectible mini football figurine in the exact style of Brazilian mini craques toys. Very large round head, tiny torso, short stubby legs, white base, shiny plastic texture, vibrant football uniform, white background, drop shadow.',
        image: `data:${imageType};base64,${imageBase64}`,
        width: 1024,
        height: 1024
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Erro Higgsfield');

    const imageUrl = data.url || data.image_url || data.output;
    if (!imageUrl) throw new Error('Nenhuma imagem retornada.');

    return res.status(200).json({ imageUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
