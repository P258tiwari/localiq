import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import db from '../db/index.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL   = 'claude-sonnet-4-20250514';

const JSON_SYSTEM = [
  'You are a Google Business Profile optimization expert for Indian local businesses.',
  'You must return ONLY valid JSON — no markdown, no code blocks, no explanations, no trailing commas.',
  'Your entire response must be directly parseable by JSON.parse().',
  'Never wrap output in ```json or ``` blocks.',
].join(' ');

async function ask(userPrompt, maxTokens, label = '') {
  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: JSON_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }]
  });
  const { input_tokens, output_tokens } = response.usage;
  console.log(`[AI:${label}] ${input_tokens} in / ${output_tokens} out tokens`);
  return response.content[0].text.trim();
}

function safeParseJSON(text, label) {
  const tries = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()),
    () => { const m = text.match(/\[[\s\S]*\]/); if (m) return JSON.parse(m[0]); throw new Error(); },
    () => { const m = text.match(/\{[\s\S]*\}/s); if (m) return JSON.parse(m[0]); throw new Error(); },
  ];
  for (const fn of tries) {
    try { const r = fn(); if (r !== null && r !== undefined) return r; } catch {}
  }
  console.error(`[AI:${label}] JSON parse failed. Raw (first 400 chars):`, text.slice(0, 400));
  return { error: 'JSON parse failed', function: label, raw_preview: text.slice(0, 300) };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function v(val, fallback = 'Not provided') {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function buildClientBlock(client, seoDetails, keywords) {
  return `
BUSINESS DETAILS:
- Business Name      : ${v(client.business_name)}
- City               : ${v(client.city)}
- State              : ${v(client.state)}
- Address            : ${v(client.address)}
- Phone              : ${v(client.phone)}
- WhatsApp           : ${v(client.whatsapp)}
- Website            : ${v(client.website)}
- Category           : ${v(client.category)}
- Industry           : ${v(client.industry)}
- GBP Link           : ${v(client.gbp_link)}
- Notes              : ${v(client.notes)}

SEO / STRATEGY DETAILS:
- Business Type      : ${v(seoDetails?.business_type)}
- Services Offered   : ${v(seoDetails?.services)}
- Products           : ${v(seoDetails?.products)}
- USP                : ${v(seoDetails?.usp)}
- Target Audience    : ${v(seoDetails?.target_audience)}
- Target Areas       : ${v(seoDetails?.target_areas)}
- Competitors        : ${v(seoDetails?.competitors)}
- Price Positioning  : ${v(seoDetails?.price_positioning)}
- Brand Tone         : ${v(seoDetails?.brand_tone)}
- Business Goals     : ${v(seoDetails?.business_goals)}
- Monthly Objective  : ${v(seoDetails?.monthly_objective)}
- Local SEO Priority : ${v(seoDetails?.local_seo_priority)}
- Language           : ${v(seoDetails?.language_preference, 'English')}
- Additional Notes   : ${v(seoDetails?.additional_notes)}

SELECTED KEYWORDS: ${keywords.length ? keywords.join(', ') : 'None yet'}`.trim();
}

// ─── Function 1 ─────────────────────────────────────────────────────────────

export async function generateGBPSuggestions(client, seoDetails) {
  const kws = client?.id
    ? db.prepare('SELECT keyword FROM keywords WHERE client_id = ? AND selected = 1').all(client.id).map(r => r.keyword)
    : [];

  const context = buildClientBlock(client, seoDetails, kws);
  const lang    = v(seoDetails?.language_preference, 'English');

  const prompt = `
Based on the business details below, generate exactly what this business should put on their Google Business Profile.
The team will manually copy-paste your suggestions into Google.
Be specific, practical, and locally relevant.
Do NOT mention "Google" anywhere in the content itself.
Write for the customer, not for SEO robots.
The suggested_description MUST be exactly 700-750 characters long — count carefully.
All text should match the brand tone: ${lang} language preferred where instructed.

${context}

Return this EXACT JSON structure (all fields required, use empty arrays [] for missing data):
{
  "suggested_business_name": "Exact SEO-optimised name to display on Google listing (include city/service if appropriate)",
  "suggested_category_primary": "Single most relevant GBP primary category",
  "suggested_categories_secondary": ["At least 6, up to 9 additional relevant GBP secondary categories"],
  "suggested_description": "Exactly 700-750 characters. Use top keywords naturally. Mention city and core services. Written warmly for customers. Ends with a soft call-to-action. No bullet points. Single flowing paragraph.",
  "suggested_short_description": "Under 250 characters. Punchy tagline-style bio. Mentions what they do and where.",
  "suggested_phone": "Which number to show on listing — WhatsApp if available, else primary phone",
  "suggested_website": "URL to display on listing",
  "suggested_service_area": ["5-10 specific nearby localities, areas, or cities within 15km this business serves — derive from address and city"],
  "suggested_attributes": ["GBP attributes to tick ON — e.g. Accepts UPI, Women-led, Wheelchair accessible, Free parking, Home delivery, Air-conditioned, Walk-ins welcome"],
  "suggested_services_by_category": [
    {
      "category": "Primary category name (same as suggested_category_primary)",
      "is_primary": true,
      "services": [
        { "name": "Service name", "description": "Max 250 chars — clear, benefit-focused, keyword-rich, locally relevant" }
      ]
    },
    {
      "category": "Secondary category name (from suggested_categories_secondary)",
      "is_primary": false,
      "services": [
        { "name": "Service name", "description": "Max 250 chars — clear, benefit-focused, keyword-rich" }
      ]
    }
  ],
  "suggested_products": [
    { "name": "Product name", "price_range": "₹X – ₹Y or 'Contact for pricing'", "description": "Max 300 chars" }
  ],
  "suggested_faq": [
    { "question": "Common customer question", "answer": "Max 200 chars, direct and helpful" }
  ],
  "missing_details": ["Specific information that would improve these suggestions if provided"],
  "optimization_score": 0,
  "action_plan": ["5-8 specific, numbered actions to take on Google Business Profile right now"],
  "copy_checklist": [
    {
      "step": 1,
      "field_on_google": "Exact navigation path in Google Business dashboard (e.g. Edit profile → Business name)",
      "content_to_paste": "The exact text to paste into that field",
      "done": false
    }
  ]
}

IMPORTANT: suggested_services_by_category must include an entry for the primary category AND ALL suggested secondary categories (every single one listed in suggested_categories_secondary). Each category must have 3-6 services. Services must be specific to that category type, keyword-rich, and relevant to the business location.`.trim();

  try {
    const text   = await ask(prompt, 8192, 'generateGBPSuggestions');
    const result = safeParseJSON(text, 'generateGBPSuggestions');
    return result;
  } catch (err) {
    console.error('[AI:generateGBPSuggestions] Error:', err.message);
    return { error: err.message, function: 'generateGBPSuggestions' };
  }
}

// ─── regenerateSection ───────────────────────────────────────────────────────

export async function regenerateSection(client, seoDetails, section) {
  const kws = client?.id
    ? db.prepare('SELECT keyword FROM keywords WHERE client_id = ? AND selected = 1').all(client.id).map(r => r.keyword)
    : [];

  const context = buildClientBlock(client, seoDetails, kws);
  const lang    = v(seoDetails?.language_preference, 'English');

  const prompts = {
    business_name: `Generate the optimal SEO Business Name for Google Business Profile for this business.
${context}
Return JSON: { "suggested_business_name": "Exact SEO-optimised name — include city or key service if it helps discoverability" }`,

    primary_category: `Suggest the single best GBP primary category for this business.
${context}
Return JSON: { "suggested_category_primary": "Single most relevant GBP primary category string" }`,

    secondary_categories: `Suggest at least 6 (up to 9) GBP secondary categories for this business. Be specific and varied.
${context}
Return JSON: { "suggested_categories_secondary": ["category1", "category2", "category3", "category4", "category5", "category6"] }`,

    description: `Write a GBP Business Description for this business. It MUST be exactly 700-750 characters — count carefully.
Use selected keywords naturally. Mention city and core services. Write warmly for customers. End with a soft CTA. Single paragraph, no bullet points. Language: ${lang}.
${context}
Return JSON: { "suggested_description": "Exactly 700-750 character description here" }`,

    service_area: `Based on the business address and city, list 5-10 specific nearby localities, areas, or cities (within ~15 km) that this business serves or should target.
${context}
Return JSON: { "suggested_service_area": ["locality1", "locality2", "locality3"] }`,

    services_by_category: `Generate a complete services list for this business, organised by ALL its categories.
Each category needs 3-6 services with a name and max-250-char benefit-focused keyword-rich description. Language: ${lang}.
Include the primary category AND EVERY secondary category — do not skip any.
${context}
Return JSON:
{
  "suggested_services_by_category": [
    { "category": "Primary category name", "is_primary": true, "services": [{ "name": "...", "description": "..." }] },
    { "category": "Secondary category 1", "is_primary": false, "services": [{ "name": "...", "description": "..." }] },
    { "category": "Secondary category 2", "is_primary": false, "services": [{ "name": "...", "description": "..." }] }
  ]
}`,
  };

  const prompt = prompts[section];
  if (!prompt) return { error: `Unknown section: ${section}` };

  try {
    const tokens = section === 'services_by_category' ? 6144 : 2048;
    const text   = await ask(prompt.trim(), tokens, `regen:${section}`);
    const result = safeParseJSON(text, `regen:${section}`);
    return result;
  } catch (err) {
    console.error(`[AI:regen:${section}] Error:`, err.message);
    return { error: err.message };
  }
}

// ─── Function 2 ─────────────────────────────────────────────────────────────

export async function generateKeywords(client, seoDetails) {
  const context = buildClientBlock(client, seoDetails, []);
  const lang    = v(seoDetails?.language_preference, 'English');

  const prompt = `
Generate a comprehensive keyword list for this local Indian business for Google Business Profile optimization.
Include Hindi/Hinglish variants where language_preference includes Hindi.
Language preference: ${lang}

${context}

Return a JSON array of EXACTLY 50 keyword objects. No more, no less.

[
  {
    "keyword": "exact keyword phrase",
    "intent": "service|product|location|near_me|emergency|branded|informational",
    "search_type": "short-tail|long-tail|question|local-modifier",
    "priority": "high|medium|low",
    "gbp_use": "description|service|post|review_reply|faq",
    "local_modifier": "city name or area appended (e.g. 'in Jaipur') or empty string",
    "competition_level": "low|medium|high",
    "ai_reason": "One sentence: why this keyword matters for this specific business"
  }
]

Distribution guide: 15 high-priority, 20 medium, 15 low. Mix of service, location, near_me, and informational intents.`.trim();

  try {
    const text   = await ask(prompt, 16000, 'generateKeywords');
    const result = safeParseJSON(text, 'generateKeywords');
    return Array.isArray(result) ? result : { error: 'Expected array', raw: result };
  } catch (err) {
    console.error('[AI:generateKeywords] Error:', err.message);
    return { error: err.message, function: 'generateKeywords' };
  }
}

// ─── Function 3 ─────────────────────────────────────────────────────────────

export async function generateMonthlyPosts(client, seoDetails, selectedKeywords = [], targetMonth, targetYear) {
  const monthName  = new Date(targetYear, targetMonth - 1, 1).toLocaleString('en-IN', { month: 'long' });
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const kwList     = selectedKeywords.length
    ? selectedKeywords.map(k => (typeof k === 'string' ? k : k.keyword)).join(', ')
    : 'Use relevant service keywords from business details';

  const context = buildClientBlock(client, seoDetails, selectedKeywords);

  const prompt = `
Generate a complete monthly GBP post calendar for ${monthName} ${targetYear}.
Create exactly 10 posts spread across the month (not all on the same day).
Posts should be educational, promotional, and engagement-driving — not spammy.
Each post must naturally include 1-2 of the selected keywords.
Image prompts must be photorealistic, professional, 1200x900, Indian business setting where relevant, NO text or typography anywhere in the image.

Target Month: ${monthName} ${targetYear} (has ${daysInMonth} days)
Selected Keywords: ${kwList}

${context}

Return a JSON array of EXACTLY 10 post objects:
[
  {
    "post_title": "Internal title for team reference (not published)",
    "post_heading": "Headline shown on post — max 10 words, attention-grabbing",
    "post_description": "1000-1500 chars. Write in 3-4 short paragraphs. Paragraph 1: hook/problem statement. Paragraph 2: solution and what the business offers. Paragraph 3: key benefits with locally relevant detail and 2-3 keywords used naturally. Paragraph 4: clear CTA. Each paragraph separated by a blank line. Write like a knowledgeable local business expert. Must be between 1000 and 1500 characters — count carefully.",
    "why_post": "One sentence explaining WHY this post should be published now and what business goal it serves.",
    "cta_text": "LEARN_MORE|BOOK|ORDER|CALL|SIGN_UP|BUY",
    "keywords_used": ["keyword1", "keyword2"],
    "target_service": "Which service or product this post promotes",
    "target_area": "Which city or area this targets",
    "image_prompt": "Detailed DALL-E prompt: photorealistic, professional, 1200x900, [business context], Indian setting, no text, no typography, no words anywhere in the image",
    "post_type": "update",
    "suggested_date": "${targetYear}-${String(targetMonth).padStart(2,'0')}-DD",
    "suggested_time": "HH:MM"
  }
]

CRITICAL: post_description must be 1000-1500 characters with 3-4 paragraphs separated by blank lines. Spread dates evenly: roughly every 3 days. All posts must be type "update". Suggested time should match business category (e.g. restaurants: 11:00, services: 09:30, retail: 18:00).`.trim();

  try {
    const text   = await ask(prompt, 8192, 'generateMonthlyPosts');
    const result = safeParseJSON(text, 'generateMonthlyPosts');
    return Array.isArray(result) ? result : { error: 'Expected array', raw: result };
  } catch (err) {
    console.error('[AI:generateMonthlyPosts] Error:', err.message);
    return { error: err.message, function: 'generateMonthlyPosts' };
  }
}

// ─── Function 4 ─────────────────────────────────────────────────────────────

export async function generateReviewReply(params) {
  const {
    star_rating, review_text, tone = 'professional',
    include_keyword = '', business_name, service_name = '', city = ''
  } = params;

  const sentiment = star_rating >= 4 ? 'positive' : star_rating <= 2 ? 'negative' : 'neutral';
  const keywordNote = include_keyword
    ? `Naturally include this keyword once if it fits: "${include_keyword}"`
    : 'No specific keyword required.';

  const prompt = `
Write a Google Business Profile review reply for this ${star_rating}-star review.

Business: ${v(business_name)}
Service/Product mentioned: ${v(service_name, 'General')}
City: ${v(city)}
Star Rating: ${star_rating}/5 (${sentiment})
Review text: "${v(review_text, '(No text, just a star rating)')}"
Preferred Tone: ${tone}
${keywordNote}

Rules:
- Do NOT use placeholder text like [Name], [Manager], [Phone number]
- Do NOT mention the star rating number in the reply
- Negative/neutral: acknowledge, apologise professionally, invite offline resolution
- Positive: genuine gratitude, reinforce the positive aspect, invite return
- Always end with a warm closing invitation

Return EXACTLY this JSON structure (4 versions, no extras):
{
  "full_reply": "130-160 word reply, complete and warm, best version",
  "short_reply": "Under 100 characters, casual acknowledgement",
  "professional_version": "Formal corporate tone, 80-100 words",
  "warm_version": "Friendly neighbourhood business tone, 80-100 words"
}`.trim();

  try {
    const text   = await ask(prompt, 1200, 'generateReviewReply');
    const result = safeParseJSON(text, 'generateReviewReply');
    return result;
  } catch (err) {
    console.error('[AI:generateReviewReply] Error:', err.message);
    return { error: err.message, function: 'generateReviewReply' };
  }
}

// ─── Function 5 ─────────────────────────────────────────────────────────────

export async function recommendCategories(client, seoDetails, availableCategories) {
  const catList = availableCategories.map(c => `${c.name} (${c.industry})`).join('\n');

  const prompt = `
Recommend the most relevant GBP categories from the list below for this business.
Return ONLY the top 5, ordered by relevance (most relevant first).

Business: ${v(client.business_name)}
Current Category: ${v(client.category, 'None set')}
Industry: ${v(client.industry, 'Not specified')}
Services: ${v(seoDetails?.services)}
Business Type: ${v(seoDetails?.business_type)}
Notes: ${v(client.notes)}

AVAILABLE CATEGORIES (use exact names from this list only):
${catList}

Return EXACTLY this JSON array (top 5 only):
[
  {
    "category_name": "Exact category name from the list above",
    "confidence_score": 95,
    "reason": "One sentence: why this category fits this specific business"
  }
]`.trim();

  try {
    const text   = await ask(prompt, 800, 'recommendCategories');
    const result = safeParseJSON(text, 'recommendCategories');
    return Array.isArray(result) ? result.slice(0, 5) : { error: 'Expected array', raw: result };
  } catch (err) {
    console.error('[AI:recommendCategories] Error:', err.message);
    return { error: err.message, function: 'recommendCategories' };
  }
}

// ─── Function 6 ─────────────────────────────────────────────────────────────

export async function checkMissingDetails(client, seoDetails) {
  const checks = {
    business_name:         !!client?.business_name,
    phone:                 !!client?.phone,
    whatsapp:              !!client?.whatsapp,
    email:                 !!client?.email,
    website:               !!client?.website,
    address:               !!client?.address,
    city:                  !!client?.city,
    state:                 !!client?.state,
    category:              !!client?.category,
    gbp_link:              !!client?.gbp_link,
    opening_hours:         !!(client?.opening_hours && client.opening_hours !== '{}'),
    gbp_description_ai:    !!client?.gbp_description_ai,
    gbp_description_current: !!client?.gbp_description_current,
    maps_rating:           !!client?.maps_rating,
    business_type:         !!seoDetails?.business_type,
    services:              !!seoDetails?.services,
    usp:                   !!seoDetails?.usp,
    target_audience:       !!seoDetails?.target_audience,
    target_areas:          !!seoDetails?.target_areas,
    brand_tone:            !!seoDetails?.brand_tone,
    monthly_objective:     !!seoDetails?.monthly_objective,
    language_preference:   !!seoDetails?.language_preference,
  };

  const filled  = Object.values(checks).filter(Boolean).length;
  const total   = Object.keys(checks).length;
  const rawScore = Math.round((filled / total) * 100);

  const missingFields = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);

  const prompt = `
Analyze this Google Business Profile client data completeness and return actionable feedback.

Business: ${v(client?.business_name)}
Filled fields (${filled}/${total}): ${Object.entries(checks).filter(([,v]) => v).map(([k]) => k).join(', ')}
Missing fields (${missingFields.length}): ${missingFields.join(', ')}
Raw completion score: ${rawScore}%

Additional context:
- Services described: ${v(seoDetails?.services)}
- Business type: ${v(seoDetails?.business_type)}
- Target areas: ${v(seoDetails?.target_areas)}
- Monthly objective: ${v(seoDetails?.monthly_objective)}

Return EXACTLY this JSON:
{
  "completion_score": ${rawScore},
  "missing_critical": ["Fields that block core GBP functionality — phone, category, address etc"],
  "missing_recommended": ["Fields that improve ranking but are not blocking — USP, target_areas etc"],
  "improvement_tips": ["3-5 specific, actionable tips for this business based on what is missing"]
}`.trim();

  try {
    const text   = await ask(prompt, 1000, 'checkMissingDetails');
    const result = safeParseJSON(text, 'checkMissingDetails');
    if (!result.error) result.completion_score = rawScore;
    return result;
  } catch (err) {
    console.error('[AI:checkMissingDetails] Error:', err.message);
    return { error: err.message, function: 'checkMissingDetails' };
  }
}

// ─── Legacy / compatibility exports ─────────────────────────────────────────

export async function generatePostContent({ client, post_type, topic, tone }) {
  const prompt = `Write a single GMB post for "${v(client.business_name)}" in ${v(client.city, 'India')}.
Post type: ${post_type} | Topic: ${topic} | Tone: ${tone || 'professional'}
Return JSON: {"title":"under 10 words","content":"under 150 words, no hashtags","call_to_action":"LEARN_MORE"}`;

  try {
    const text = await ask(prompt, 500, 'generatePostContent');
    return safeParseJSON(text, 'generatePostContent');
  } catch (err) {
    return { error: err.message };
  }
}

export async function generateImage(prompt) {
  const r = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Professional business photo, photorealistic: ${prompt}. No text, no typography, no words anywhere in the image.`,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });
  const img = r.data[0];
  if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
  return img.url;
}
