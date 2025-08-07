import express from 'express';
import { getPostById } from '../database/post-queries.js';

export const PostRouter = express.Router();
import redisClient from '../lib/redis.js';

PostRouter.get(("/platform/posts/:postId"), async (req, res, next)=>{

    const cacheKey = `userPosts:${req.params.postId}`;
    const cachedResponse = await redisClient.get(cacheKey);

    if (cachedResponse) {
        console.log('Sending cached response for posts');
        return res.json(JSON.parse(cachedResponse));
    }

    const post = await getPostById(req.params.postId)
    await redisClient.setEx(cacheKey, 15, JSON.stringify(post));

    res.json(post)
    next();
})