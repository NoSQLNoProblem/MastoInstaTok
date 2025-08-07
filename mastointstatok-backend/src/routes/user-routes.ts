import { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle, isLocalUser, LookupUser } from '../services/user-service.js';
import { FindUser, FindUserByUri, UpdateUser } from '../database/user-queries.js';
import { getHandleFromUri, GetOrderedCollectionPage } from '../services/follow-service.js';
import { createContext, sendFollow, sendNoteToExternalFollowers, sendUnfollow } from '../federation.js';
import { AddFollower, AddFollowing, getAllUsersFollowersByUserId, getAllUsersFollowingByUserId, getInternalUsersFollowersByUserId, isFollowing, RemoveFollower, RemoveFollowing } from '../database/follow-queries.js';
import type { FileType, Follower, PostData, User } from '../types.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { nodeInfoToJson, Person } from '@fedify/fedify';
import { getFollowRecordByActors } from '../database/object-queries.js';
import { uploadToS3 } from '../lib/s3.js';
import { countPostsByUserHandle, getRecentPostsByUserHandle, Post } from '../database/post-queries.js';
import crypto from 'crypto'
import redisClient from '../lib/redis.js';
import { getLogger } from '@logtape/logtape';
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:userHandle', async (req, res, next) => {
    try {
        let user;
        let userResponse;
        if (req.params.userHandle === "me") {
            user = await FindUser(req.user as Profile)
            if (user == null) throw new NotFoundError();

            userResponse = {
                actorId: user.actorId,
                bio: user.bio,
                displayName: user.displayName,
                fullHandle: user.fullHandle,
                email: user.email,
                avatarURL: user.avatarURL
            };
        }
        else {
            if (!RegExp("@.+@.+").test(req.params.userHandle)) {
                throw new ValidationError()
            }
            user = await FindUserByUserHandle(req.params.userHandle, req);
            if (user == null) throw new NotFoundError();
            userResponse = user;
        }
        const cacheKey = `userProfile:${user.fullHandle}`;
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
            getLogger().debug('Sending cached response for user search',JSON.parse(cachedResponse));
            return res.json(JSON.parse(cachedResponse));
        }
        await redisClient.setEx(cacheKey, 20, JSON.stringify(userResponse));
        res.json(userResponse);
        next();

    } catch (e) {
        next(e);
    }
});

UserRouter.post('/platform/users/me', async (req, res, next) => {
    try {
        const user = await FindUser(req.user as Profile) as User
        const { displayName, bio } = req.body;
        if (!displayName || !bio) throw new ValidationError()
        if (user.displayName != null) throw new ConflictError();
        user.displayName = displayName;
        user.bio = bio;
        await redisClient.del(`userProfile:${user.fullHandle}`);

        res.json(await UpdateUser(user));
        next()
    }
    catch (e) {
        next(e)
    }
})

UserRouter.put('/platform/users/me', async (req, res, next) => {
    try {
        const user = await FindUser(req.user as Profile) as User
        const { displayName, bio } = req.body;
        if (!displayName || !bio) throw new ValidationError()
        user.displayName = displayName;
        user.bio = bio;
        // Need to invalidate the cache for me and the user's specific handle. We will get the wrong display name and bio otherwise.
        await redisClient.del(`userProfile:${user.fullHandle}`);
        res.json(await UpdateUser(user));
    }
    catch (e) {
        next(e)
    }
})

UserRouter.get('/platform/users/:user/followers', async (req, res, next) => {
    try {
        if (!RegExp("@.+@.+").test(req.params.user)) {
            throw new ValidationError();
        }

        const cacheKey = `followers:${req.params.user}`;
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
            getLogger().debug('Sending cached response for get followers',JSON.parse(cachedResponse));
            return res.json(JSON.parse(cachedResponse));
        }

        const user = await LookupUser(req.params.user, req)
        if (!user || !user.followersId) throw new NotFoundError();

        const followers = await GetOrderedCollectionPage(req, user, user.followersId.href, req.query.next as string | undefined) ?? []

        let newItems : any[] = [];
        if ('items' in followers) {
            for (let i=0; i<=followers.items.length; i++){
                if (followers.items[i]){
                    newItems.push({...followers.items[i], avatarURL: (await FindUserByUserHandle(followers!.items[i]!.fullHandle, req))?.avatarURL});
                }
            }
        }
        const response = {...followers, items: newItems};

        await redisClient.setEx(cacheKey, 20, JSON.stringify(response));
        res.json(followers);
        next();
    } catch (e) {
        next(e);
    }
})

UserRouter.get('/platform/users/:user/following', async (req, res, next) => {
    try {
        if (!RegExp("@.+@.+").test(req.params.user)) {
            throw new ValidationError();
        }

        const cacheKey = `following:${req.params.user}`
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
            getLogger().debug('Sending cached response for get following',JSON.parse(cachedResponse));
            return res.json(JSON.parse(cachedResponse));
        }

        const user = await LookupUser(req.params.user, req)
        if (!user || !user.followingId) throw new NotFoundError();

        const following = await GetOrderedCollectionPage(req, user, user.followingId.href, req.query.next as string | undefined, true) ?? []

        let newItems : any[] = [];
        if ('items' in following) {
            for (let i=0; i<=following.items.length; i++){
                if (following.items[i]){
                    newItems.push({...following.items[i], avatarURL: (await FindUserByUserHandle(following!.items[i]!.fullHandle, req))?.avatarURL});
                }
            }
        }
        const response = {...following, items: newItems};

        await redisClient.setEx(cacheKey, 20, JSON.stringify(response));

        res.json(response);
    } catch (e) {
        next(e)
    }
})

UserRouter.post('/platform/users/me/follows/:followHandle', async (req, res, next) => {
    try {
        if (!RegExp("@.+@.+").test(req.params.followHandle)) {
            throw new ValidationError();
        }
        const user = await FindUser(req.user as Profile)
        if (!user) throw new NotFoundError();
        const ctx = createContext(req);
        const recipient = await LookupUser(req.params.followHandle, req);
        if (!recipient || !recipient.id || !recipient.inboxId) throw new NotFoundError();
        if (!(await AddFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user.username ?? "").href))) {
            throw new ConflictError();
        }
        if (!(await AddFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))) {
            throw new ConflictError();
        }
        await Promise.all([
            redisClient.del(`following:${user.fullHandle}`),
            redisClient.del(`followers:${req.params.followHandle}`),
            redisClient.del(`feed:${user.fullHandle}`)
        ]);

        if (await isLocalUser(req, req.params.followHandle)) {
            // No federated action needed for local follows
        } else {
            await sendFollow(ctx, user.actorId, recipient);
        }
        
        res.status(202).json({ message: "Successfully followed!" });
        next();

    } catch (e) {
        next(e)
    }
});

UserRouter.delete('/platform/users/me/follows/:followHandle', async (req, res, next) => {
    try {
        if (!RegExp("@.+@.+").test(req.params.followHandle)) {
            throw new ValidationError();
        }
        const user = await FindUser(req.user as Profile)
        if (!user) throw new NotFoundError();
        const ctx = createContext(req);
        const recipient = await LookupUser(req.params.followHandle, req);
        if (!recipient || !recipient.id || !recipient.inboxId) throw new ValidationError();

        const followObject = await getFollowRecordByActors(user.actorId, recipient.id.href);

        if (!(await RemoveFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user?.username ?? "").href))) {
            throw new ConflictError();
        }
        if (!(await RemoveFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))) {
            throw new ConflictError();
        }

        // Invalidate relevant caches precisely and safely
        await Promise.all([
            redisClient.del(`following:${user.fullHandle}`),
            redisClient.del(`followers:${req.params.followHandle}`),
            redisClient.del(`feed:${user.fullHandle}`) // Invalidate the single feed key
        ]);

        if (await isLocalUser(req, req.params.followHandle)) {
            // No federated action needed
        } else {
            if (!followObject) throw new NotFoundError();
            await sendUnfollow(ctx, user.actorId, recipient, followObject);
        }
        
        res.status(204).json({ "message": "Successfully unfollowed the user" });
        next()

    } catch (e) {
        next(e);
    }
});

UserRouter.post("/platform/users/me/posts", async (req, res, next) => {
    try {
        const mimeType = req.body.fileType;
        const acceptableFiletypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/x-m4v"]
        if (!acceptableFiletypes.includes(mimeType)) {
            throw new ValidationError();
        }
        const fileData = req.body.data;
        const caption = req.body.caption;
        const user = await FindUser(req.user as Profile) as User; // This assertion is valid because we have passed the authentication middleware
        const mediaURL = await uploadToS3(fileData, mimeType, `bbd-grad-project-mastoinstatok-bucket`, crypto.randomUUID())
        // Create the Post Object
        const post: PostData = {
            id: crypto.randomUUID(),
            caption,
            fileType: mimeType,
            mediaType: mimeType.startsWith("video/") ? "video" : "image",
            likedBy: [],
            userHandle: user.fullHandle,
            mediaURL,
            timestamp: Date.now(),
        }
        // save the post data to the db
        await Post(post)
        await Promise.all([
            redisClient.del(`postCount:${user.fullHandle}`),
            redisClient.del(`myPosts:${user.fullHandle}`), 
            redisClient.del(`feed:${user.fullHandle}`)
        ]);

        // get the internal and the external followers
        const followers = await getAllUsersFollowersByUserId(user.actorId);
        let externalFollowers: Person[] = []
        for (const follower of followers) {
            if (!follower?.followerId) continue;
            if (!isLocalUser(req, getHandleFromUri(follower?.followerId))) {
                const user = await LookupUser(getHandleFromUri(follower.followerId), req);
                if (!user) continue;
                externalFollowers.push(user);
            }
        }
        if (externalFollowers.length !== 0) {
            await sendNoteToExternalFollowers(createContext(req), user.actorId, externalFollowers, caption, mediaURL, mimeType == "mp4" ? "video" : "image");
        }
        res.status(202).json({ message: "Successfully created post" })
        next();
    } catch (e) {
        next(e)
    }
})


UserRouter.get("/platform/users/me/feed", async (req, res, next) => {
    const user = await FindUser(req.user as Profile) as User;
    const isFirstPage = !req.query.cursor;
    console.log("Is this the first page?",isFirstPage,"\n=====================");
    const cacheKey = `feed:${user.fullHandle}`;
    
    if (isFirstPage) {
        const cachedResponse = await redisClient.get(cacheKey);
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }
    }
    const followees = await getAllUsersFollowingByUserId(user.actorId);
    const cursor = !req.query.cursor ? Number.MAX_SAFE_INTEGER : parseInt(req.query.cursor as string)

    let feed: PostData[] = []
    const oldestPosts: number[] = []
    
        for (const follower of followees) {
            if (!follower?.followerId) continue;

            const handle = getHandleFromUri(follower.followeeId);
            const posts = await getRecentPostsByUserHandle(handle, cursor);
            const postUser = posts?.length > 0 ? await FindUserByUserHandle(posts[0].userHandle, req): null;
            const isInternalUser = await isLocalUser(req, handle);

            const postsWithInternalFlag = posts.map(post => ({
                ...post,
                isInternalUser,
                avatar: postUser?.avatarURL
            }));
            
            feed = feed.concat(postsWithInternalFlag);
            oldestPosts.push(getOldestPost(posts)?.timestamp ?? Number.MIN_SAFE_INTEGER);
        }

    feed.sort((a, b) => {
        return b.timestamp - a.timestamp
    })

    const newCursor = oldestPosts.length !== 0 ? oldestPosts.reduce((prev, curr) => curr > prev ? curr : prev) : -1
    const response = {
        posts: feed,
        nextCursor: (feed.length > 0) ? newCursor : -1,
    };
    if (isFirstPage){
        await redisClient.setEx(cacheKey, 10, JSON.stringify(response));
    }
    res.json(response)
})

UserRouter.get("/platform/users/me/posts", async (req, res, next) => {
    try {
        const user = await FindUser(req.user as Profile) as User;
        const isFirstPage = !req.query.cursor;
        const cacheKey = `myPosts:${user.fullHandle}`;
        
        if (isFirstPage){
            const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
            return res.json(JSON.parse(cachedResponse));
        }
        }
        
        const cursor = !req.query.cursor ? Number.MAX_SAFE_INTEGER : parseInt(req.query.cursor as string);
        const posts = await getRecentPostsByUserHandle(user.fullHandle, cursor);
        const sortedPosts = posts.slice().sort((a, b) => b.timestamp - a.timestamp);
        const nextCursor = sortedPosts.length > 0
            ? sortedPosts[sortedPosts.length - 1].timestamp
            : undefined;
        const response = {
            posts: sortedPosts,
            nextCursor: sortedPosts.length > 0 ? nextCursor : -1,
        };

        if(isFirstPage) {
            await redisClient.setEx(cacheKey, 15, JSON.stringify(response));
        }

        res.json(response);
    } catch (e) {
        next(e);
    }
});

function getOldestPost(posts: PostData[]) {
    if (posts.length == 0) return null;
    let currMin = posts[0];
    for (const post of posts) {
        if (post.timestamp < currMin.timestamp) {
            currMin = post;
        }
    }
    return currMin;
}

UserRouter.get('/platform/users/me/follows/:userHandle', async (req, res, next) => {
    try {
        if (!req.user) throw new ValidationError("Authentication required.");
        if (!RegExp("@.+@.+").test(req.params.userHandle)) {
            throw new ValidationError("Invalid user handle provided");
        }

        const currentUser = await FindUser(req.user as Profile);
        if (!currentUser) throw new NotFoundError("Current user not found.");

        const targetUser = await LookupUser(req.params.userHandle, req);
        if (!targetUser || !targetUser.id) throw new NotFoundError("Target user not found.");

        const userFollowsTarget = await isFollowing(currentUser.actorId, targetUser.id.href);
        const targetFollowsUser = await isFollowing(targetUser.id.href, currentUser.actorId);

        res.json({
            userFollowing: {
                follower: currentUser.actorId,
                followee: targetUser.id.href,
                follows: userFollowsTarget
            },
            userFollowedBy: {
                follower: targetUser.id.href,
                followee: currentUser.actorId,
                follows: targetFollowsUser
            }
        });
        next();

    } catch (e) {
        next(e);
    }
});

UserRouter.get('/platform/users/me/posts/count', async (req, res, next) => {
    try {
        const user = await FindUser(req.user as Profile);
        if (!user) throw new NotFoundError("Current user not found.");
        const cacheKey = `postCount:${user.fullHandle}`
        const cachedResponse = await redisClient.get(cacheKey);

        if (cachedResponse) {
            return res.json(JSON.parse(cachedResponse));
        }

        const postCount = await countPostsByUserHandle(user.fullHandle);
        const response = { count: postCount }
        await redisClient.setEx(cacheKey, 10, JSON.stringify(response));
        return res.json(response);
    } catch (e) {
        next(e);
    }
});
