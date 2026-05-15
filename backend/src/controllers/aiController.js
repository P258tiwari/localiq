import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  generateGBPSuggestions,
  regenerateSection   as aiRegenerateSection,
  generateKeywords    as aiGenerateKeywords,
  generateMonthlyPosts,
  generateReviewReply as aiGenerateReviewReply,
  recommendCategories as aiRecommendCategories,
  checkMissingDetails,
  generateImage,
  generatePostContent
} from '../services/aiService.js';
import { logActivity } from '../services/activityService.js';
import { createNotification } from '../services/notificationService.js';

// ─── POST /api/ai/generate-profile (pre-save — no client in DB yet) ──────────
export async function generateProfileFromData(req, res, next) {
  try {
    const {
      business_name, client_name, category, industry, phone, whatsapp,
      email, website, address, city, state, pincode, gbp_link, notes,
      services, products, usp, target_audience, target_areas, brand_tone,
      business_type, language_preference, monthly_objective, competitors,
      price_positioning, business_goals, local_seo_priority, additional_notes,
    } = req.body;

    if (!business_name?.trim()) return res.status(400).json({ error: 'business_name is required' });

    const clientData  = { business_name, client_name, category, industry, phone, whatsapp, email, website, address, city, state, pincode, gbp_link, notes };
    const seoDetails  = { services, products, usp, target_audience, target_areas, brand_tone, business_type, language_preference, monthly_objective, competitors, price_positioning, business_goals, local_seo_priority, additional_notes };

    const result = await generateGBPSuggestions(clientData, seoDetails);
    if (result.error) return res.status(422).json(result);

    logActivity(req.user.id, null, 'AI_PROFILE_PREVIEW', 'client', null, { business_name });
    res.json({ result });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/generate-profile/:client_id ────────────────────────────────
export async function generateProfile(req, res, next) {
  try {
    const { client_id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const selectedKwCount = db.prepare('SELECT COUNT(*) as c FROM keywords WHERE client_id = ? AND selected = 1').get(client_id).c;
    if (selectedKwCount === 0) {
      return res.status(422).json({
        error: 'No keywords selected',
        code: 'NO_KEYWORDS',
        message: 'Please generate and select keywords in the Keywords tab before generating an AI profile.',
      });
    }

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const result     = await generateGBPSuggestions(client, seoDetails);

    if (!result.error) {
      db.prepare("UPDATE clients SET gbp_description_ai = ?, gbp_ai_profile = ?, updated_at = datetime('now') WHERE id = ?")
        .run(result.suggested_description ?? null, JSON.stringify(result), client_id);
    }

    logActivity(req.user.id, client_id, 'AI_PROFILE_GENERATED', 'client', client_id, {
      business_name: client.business_name,
    });

    // Notify the assigned user (if different from requester) that AI profile is ready
    if (client.assigned_to && client.assigned_to !== req.user.id) {
      createNotification({
        user_id:   client.assigned_to,
        client_id,
        type:      'ai_ready',
        title:     `AI profile ready: ${client.business_name}`,
        message:   'GBP optimization suggestions have been generated. Review and apply them.',
      });
    }

    res.json({ result, client_id });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/regenerate-section/:client_id ──────────────────────────────
export async function regenerateProfileSection(req, res, next) {
  try {
    const { client_id } = req.params;
    const { section }   = req.body;

    const VALID = ['business_name','primary_category','secondary_categories','description','service_area','services_by_category'];
    if (!section || !VALID.includes(section)) {
      return res.status(400).json({ error: `Invalid section. Must be one of: ${VALID.join(', ')}` });
    }

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const selectedKwCount = db.prepare('SELECT COUNT(*) as c FROM keywords WHERE client_id = ? AND selected = 1').get(client_id).c;
    if (selectedKwCount === 0) {
      return res.status(422).json({ error: 'No keywords selected', code: 'NO_KEYWORDS' });
    }

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const result     = await aiRegenerateSection(client, seoDetails, section);

    if (result.error) return res.status(422).json(result);

    // Merge section result into the stored AI profile JSON
    const existing = client.gbp_ai_profile ? JSON.parse(client.gbp_ai_profile) : {};
    const merged   = { ...existing, ...result };
    db.prepare("UPDATE clients SET gbp_ai_profile = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(merged), client_id);

    res.json({ section, result });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/generate-posts/:client_id ──────────────────────────────────
export async function generatePosts(req, res, next) {
  try {
    const { client_id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const keywords   = db.prepare('SELECT keyword FROM keywords WHERE client_id = ?').all(client_id).map(r => r.keyword);

    const {
      target_month = new Date().getMonth() + 1,
      target_year  = new Date().getFullYear(),
      save_as_drafts = true
    } = req.body;

    const posts = await generateMonthlyPosts(client, seoDetails, keywords, parseInt(target_month), parseInt(target_year));

    let saved = [];
    if (save_as_drafts && Array.isArray(posts) && posts.length) {
      const insert = db.prepare(`
        INSERT INTO gbp_posts (id, client_id, post_type, title, content, call_to_action, scheduled_at, image_prompt, notes, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
      `);
      const insertAll = db.transaction(ps => ps.map(p => {
        const id = uuidv4();
        const scheduledAt = p.suggested_date && p.suggested_time
          ? `${p.suggested_date}T${p.suggested_time}:00`
          : null;
        const kwNotes = (p.keywords_used?.length || p.why_post)
          ? JSON.stringify({ keywords_used: p.keywords_used ?? [], why_post: p.why_post ?? '' })
          : null;
        insert.run(
          id, client_id,
          p.post_type || 'update',
          p.post_heading || p.post_title || null,
          p.post_description,
          p.cta_text || 'LEARN_MORE',
          scheduledAt,
          p.image_prompt || null,
          kwNotes,
          req.user.id
        );
        return db.prepare('SELECT * FROM gbp_posts WHERE id = ?').get(id);
      }));
      saved = insertAll(posts);
    }

    logActivity(req.user.id, client_id, 'AI_POSTS_GENERATED', 'post', null, {
      business_name: client.business_name,
      month:  target_month,
      year:   target_year,
      count:  Array.isArray(posts) ? posts.length : 0,
    });

    res.json({ posts, saved, count: Array.isArray(posts) ? posts.length : 0 });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/review-reply ───────────────────────────────────────────────
export async function generateReviewReply(req, res, next) {
  try {
    const { review_id, star_rating, review_text, tone, include_keyword, service_name } = req.body;
    let params, client;

    if (review_id) {
      const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review_id);
      if (!review) return res.status(404).json({ error: 'Review not found' });

      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(review.client_id);
      params = {
        star_rating:     review.rating,
        review_text:     review.review_text,
        tone:            tone || 'professional',
        include_keyword: include_keyword || '',
        business_name:   client?.business_name || '',
        service_name:    service_name || '',
        city:            client?.city || ''
      };

      const result = await aiGenerateReviewReply(params);

      // Save full_reply as ai_draft
      if (!result.error && result.full_reply) {
        db.prepare(`
          INSERT INTO review_replies (id, review_id, client_id, reply_text, ai_draft, status)
          VALUES (?, ?, ?, ?, ?, 'draft')
        `).run(uuidv4(), review_id, review.client_id, result.full_reply, result.full_reply);
      }

      return res.json({ result, review_id });
    }

    // Ad-hoc mode (no stored review)
    if (!star_rating) return res.status(400).json({ error: 'star_rating is required when review_id is not provided' });
    let bizName = req.body.business_name || '';
    let bizCity  = req.body.city || '';
    if (req.body.client_id) {
      const c = db.prepare('SELECT business_name, city FROM clients WHERE id = ?').get(req.body.client_id);
      if (c) { bizName = c.business_name; bizCity = c.city || ''; }
    }
    params = {
      star_rating: parseInt(star_rating),
      review_text: review_text || '',
      tone: tone || 'professional',
      include_keyword: include_keyword || '',
      business_name: bizName,
      service_name:  service_name || '',
      city:          bizCity,
    };
    const result = await aiGenerateReviewReply(params);
    if (result?.error) return res.status(422).json({ error: result.error });
    res.json({ result });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/generate-image ─────────────────────────────────────────────
export async function generateImageAI(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/generate-keywords/:client_id ───────────────────────────────
export async function generateKeywords(req, res, next) {
  try {
    const { client_id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const { save = true } = req.body;

    const keywords = await aiGenerateKeywords(client, seoDetails);
    if (keywords.error) return res.status(422).json(keywords);

    let saved = [];
    if (save && Array.isArray(keywords) && keywords.length) {
      const insert = db.prepare(
        'INSERT OR IGNORE INTO keywords (id, client_id, keyword, volume, difficulty) VALUES (?, ?, ?, ?, ?)'
      );
      const insertAll = db.transaction(kws => kws.map(k => {
        const id  = uuidv4();
        const vol = k.competition_level === 'high' ? 1000 : k.competition_level === 'medium' ? 500 : 100;
        insert.run(id, client_id, k.keyword, vol, k.competition_level || 'medium');
        return db.prepare('SELECT * FROM keywords WHERE id = ?').get(id);
      }).filter(Boolean));
      saved = insertAll(keywords);
    }

    res.json({ keywords, saved, count: Array.isArray(keywords) ? keywords.length : 0 });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/check-missing/:client_id ───────────────────────────────────
export async function checkMissing(req, res, next) {
  try {
    const { client_id } = req.params;
    const client     = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seoDetails = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const analysis   = await checkMissingDetails(client, seoDetails);
    res.json({ client_id, analysis });
  } catch (err) { next(err); }
}

// ─── POST /api/ai/recommend-categories/:client_id ────────────────────────────
export async function recommendCategoriesForClient(req, res, next) {
  try {
    const { client_id } = req.params;
    const client     = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const seoDetails   = db.prepare('SELECT * FROM client_seo WHERE client_id = ?').get(client_id);
    const allCats      = db.prepare('SELECT * FROM gbp_categories ORDER BY name').all();
    const recommendations = await aiRecommendCategories(client, seoDetails, allCats);
    res.json({ recommendations });
  } catch (err) { next(err); }
}
