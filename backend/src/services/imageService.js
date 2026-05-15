import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLES = {
  professional: 'clean professional business photography, well lit, high quality',
  vibrant:      'vibrant colorful eye-catching marketing graphic, bold',
  minimal:      'minimal modern design, lots of white space, clean aesthetic',
  warm:         'warm inviting cozy atmosphere, natural lighting, welcoming'
};

export async function generateImage(prompt, style = 'professional') {
  const enhanced = `${prompt}. ${STYLES[style] ?? STYLES.professional}. No text overlays. No watermarks.`;

  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt: enhanced,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  });

  return res.data[0].url;
}
