import express from 'express';
import { getPostById } from '../database/post-queries.js';

export const PostRouter = express.Router();


PostRouter.get(("/api/platform/posts/:postId"), async (req, res, next)=>{
    res.json(await getPostById(req.params.postId))
    next();
})