import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  generateProfile, generateProfileFromData, generatePosts, generateReviewReply,
  generateImageAI, generateKeywords, checkMissing,
  recommendCategoriesForClient, regenerateProfileSection
} from '../controllers/aiController.js';

const r = Router();
r.use(verifyToken);

r.post('/generate-profile',                       generateProfileFromData);
r.post('/generate-profile/:client_id',            generateProfile);
r.post('/regenerate-section/:client_id',          regenerateProfileSection);
r.post('/generate-posts/:client_id',    generatePosts);
r.post('/generate-keywords/:client_id', generateKeywords);
r.post('/check-missing/:client_id',     checkMissing);
r.post('/review-reply',                        generateReviewReply);
r.post('/generate-image',                      generateImageAI);
r.post('/recommend-categories/:client_id',     recommendCategoriesForClient);

export default r;
