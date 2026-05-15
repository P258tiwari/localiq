import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getPosts, getPost, createPost, updatePost, deletePost,
  generateContent, generatePostImage
} from '../controllers/postController.js';

const r = Router();
r.use(verifyToken);

// AI generation (before /:id to avoid param conflict)
r.post('/generate/content', generateContent);
r.post('/generate/image',   generatePostImage);

r.get('/',       getPosts);
r.post('/',      createPost);
r.get('/:id',    getPost);
r.put('/:id',    updatePost);
r.delete('/:id', deletePost);

export default r;
