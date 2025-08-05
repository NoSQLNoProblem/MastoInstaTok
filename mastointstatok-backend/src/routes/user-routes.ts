import { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle, isLocalUser, LookupUser } from '../services/user-service.js';
import { FindUser, UpdateUser } from '../database/user-queries.js';
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
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:userHandle', async (req, res, next) => {
    try {
        if (req.params.userHandle === "me") {
            const user = await FindUser(req.user as Profile)
            if (user == null) throw new NotFoundError();
            return res.json({
                actorId: user.actorId,
                bio: user.bio,
                displayName: user.displayName,
                fullHandle: user.fullHandle,
                email: user.email,
                avatarURL: user.avatarURL
            });
        }

        if (!RegExp("@.+@.+").test(req.params.userHandle)) {
            throw new ValidationError()
        }

        const user = await FindUserByUserHandle(req.params.userHandle, req);
        if (user == null) throw new NotFoundError();
        res.json(user);
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
        res.json(await UpdateUser(user));
        next()
    }
    catch (e) {
        next(e)
    }
})

UserRouter.put('/platform/users/me', async (req, res, next) => {
    try {
        console.log(req.user);

        const user = await FindUser(req.user as Profile) as User
        const { displayName, bio } = req.body;
        if (!displayName || !bio) throw new ValidationError()
        user.displayName = displayName;
        user.bio = bio;
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
        console.log("Made it out alive")
        const user = await LookupUser(req.params.user, req)
        if (!user || !user.followersId) throw new NotFoundError();
        res.json(await GetOrderedCollectionPage(req, user, user.followersId.href, req.query.next as string | undefined) ?? []);
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
        const user = await LookupUser(req.params.user, req)
        if (!user || !user.followingId) throw new NotFoundError();
        res.json(await GetOrderedCollectionPage(req, user, user.followingId.href, req.query.next as string | undefined, true) ?? []);
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
        if (!(await AddFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user.actorId).href))) {
            throw new ConflictError();
        }
        if (!(await AddFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))) {
            throw new ConflictError();
        }
        if (await isLocalUser(req, req.params.followHandle)) {
            res.status(202).json({ message: "Successfully followed!" });
            next();
        } else {
            await sendFollow(ctx, user.actorId, recipient);
            res.status(202).json({ message: "Successfully followed!" });
            next();
        }
    } catch (e) {
        next(e)
    }
})

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

        if (!(await RemoveFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user.actorId).href))) {
            throw new ConflictError();
        }
        if (!(await RemoveFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))) {
            throw new ConflictError();
        }

        if (await isLocalUser(req, req.params.followHandle)) {
            res.status(204).json({ "message": "Successfully deleted the user" });
            next()
        }
        else {
            // Get the follower object corresponding to the sender and recipient
            if (!followObject) throw new NotFoundError();
            await sendUnfollow(ctx, user.actorId, recipient, followObject);
            res.status(204).json({ "message": "Successfully deleted the user" });
            next()
        }
    } catch (e) {
        next(e);
    }
})

UserRouter.post("/platform/users/me/posts", async (req, res, next) => {
    try {
        console.log("getting the request")
        const mimeType = req.body.fileType;
        console.log(mimeType)
        if (mimeType !== "image/png" && mimeType !== "image/jpeg" && mimeType !== "video/mp4") {
            throw new ValidationError();
        }
        const fileData = req.body.data;
        const caption = req.body.caption;
        const user = await FindUser(req.user as Profile) as User; // This assertion is valid because we have passed the authentication middleware
        console.log("Found the user at least");
        const mediaURL = await uploadToS3(fileData, mimeType, `bbd-grad-project-mastoinstatok-bucket`, crypto.randomUUID())
        console.log("media url is", mediaURL)
        // Create the Post Object
        const post: PostData = {
            id: crypto.randomUUID(),
            caption,
            fileType: mimeType,
            isLiked: false,
            mediaType: mimeType == "video/mp4" ? "video" : "image",
            likes: 0,
            userHandle: user.fullHandle,
            mediaURL,
            timestamp: Date.now(),
        }
        // save the post data to the db
        await Post(post)

        // get the internal and the external followers
        const followers = await getAllUsersFollowersByUserId(user.actorId);
        let externalFollowers: Person[] = []
        for (const follower of followers) {
            if (!follower?.followerId) continue;
            if (!isLocalUser(req, getHandleFromUri(follower?.followerId))) {
                console.log("looking up external user with handle" , getHandleFromUri(follower.followerId))
                const user = await LookupUser(getHandleFromUri(follower.followerId), req);
                console.log("We found the evil outsider :(", user);
                if (!user) continue;
                externalFollowers.push(user);
            }
        }
        if (externalFollowers.length !== 0) {
            await sendNoteToExternalFollowers(createContext(req), user.actorId, externalFollowers, fileData, mediaURL, mimeType == "mp4" ? "video" : "image");
        }
        res.status(202).json({ message: "Successfully created post" })
        next();
    } catch (e) {
        next(e)
    }
})


UserRouter.get("/platform/users/me/feed", async (req, res, next) => {
    const user = await FindUser(req.user as Profile) as User;
    const followers = await getAllUsersFollowingByUserId(user.actorId);
    const cursor = !req.query.cursor ? Number.MAX_SAFE_INTEGER : parseInt(req.query.cursor as string)
    let feed: PostData[] = []
    const oldestPosts: number[] = []
    for (const follower of followers) {
        if (!follower?.followerId) continue;
        const posts = await getRecentPostsByUserHandle(getHandleFromUri(follower.followeeId), cursor);
        feed = feed.concat(posts);
        oldestPosts.push(getOldestPost(posts)?.timestamp ?? Number.MIN_SAFE_INTEGER);
    }

    feed.sort((a, b) => {
        return b.timestamp - a.timestamp
    })

    // Getting the new cursor is a fucked up problem that I don't want to think about
    // for now the only solution I can come up with that guarantees posts are not lost is to take the maxmin of the grouped posts
    const newCursor = oldestPosts.length !== 0 ? oldestPosts.reduce((prev, curr) => curr > prev ? curr : prev) : -1
    res.json({
        posts: feed,
        nextCursor: (feed.length > 0) ? newCursor : -1
    })
})

UserRouter.get("/platform/users/me/posts", async (req, res, next) => {
    console.log("here");
    try {
        const user = await FindUser(req.user as Profile) as User;
        const cursor = !req.query.cursor ? Number.MAX_SAFE_INTEGER : parseInt(req.query.cursor as string);
        const posts = await getRecentPostsByUserHandle(user.fullHandle, cursor);
        const sortedPosts = posts.slice().sort((a, b) => b.timestamp - a.timestamp);
        const nextCursor = sortedPosts.length > 0
            ? sortedPosts[sortedPosts.length - 1].timestamp
            : undefined;
        res.json({
            posts: sortedPosts,
            nextCursor: (sortedPosts.length > 0) ? nextCursor : -1
        });
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
        const postCount = await countPostsByUserHandle(user.fullHandle);
        return res.json({ count: postCount });
    } catch (e) {
        next(e);
    }
});
