import { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle, isLocalUser, LookupUser } from '../services/user-service.js';
import { FindUser, UpdateUser } from '../database/user-queries.js';
import { getHandleFromUri, GetOrderedCollectionPage } from '../services/follow-service.js';
import { createContext, sendFollow, sendNoteToExternalFollowers, sendUnfollow } from '../federation.js';
import { AddFollower, AddFollowing, getAllUsersFollowersByUserId, getInternalUsersFollowersByUserId, RemoveFollower, RemoveFollowing } from '../database/follow-queries.js';
import type { FileType, Follower, PostData, User } from '../types.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { nodeInfoToJson, Person } from '@fedify/fedify';
import { getFollowRecordByActors } from '../database/object-queries.js';
import { uploadToS3 } from '../lib/s3.js';
import { getRecentPostsByUserHandle, Post } from '../database/post-queries.js';
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

UserRouter.get('/platform/users/:user/followers', async (req, res, next) => {
    try {
        if (!RegExp("@.+@.+").test(req.params.user)) {
            throw new ValidationError();
        }
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
        res.json(await GetOrderedCollectionPage(req, user, user.followingId.href, req.query.next as string | undefined) ?? []);
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
        if (await isLocalUser(req, req.params.followHandle)) {
            if (!(await AddFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user.actorId).href))) {
                throw new ConflictError();
            }
            if (!(await AddFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))) {
                throw new ConflictError();
            }
            res.status(202).json({ "message": "Successfully created the user" });
            next();
        } else {
            await sendFollow(ctx, user.actorId, recipient);
            res.status(202);
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

UserRouter.post("/platform/users/:userHandle/posts", async (req, res, next) => {
    try {
        const mimeType = req.body.fileType;
        if (mimeType !== "image/png" && mimeType !== "image/jpeg" && mimeType !== "video/mp4") {
            throw new ValidationError();
        }
        const fileData = req.body.data;
        const caption = req.body.caption;
        const user = await FindUser(req.user as Profile) as User; // This assertion is valid because we have passed the authentication middleware
        const mediaURL = await uploadToS3(fileData, mimeType, `bbd-grad-project-mastoinstatok-bucket`,  crypto.randomUUID())
        console.log("media url is", mediaURL)
        // Create the Post Object
        const post : PostData = {
            id : crypto.randomUUID(),
            caption,
            fileType: mimeType,
            isLiked : false,
            mediaType : mimeType == "mp4" ? "video" : "image",
            likes : 0,
            userHandle : user.fullHandle,
            mediaURL,
            timestamp : Date.now(),
        }
        // save the post data to the db
        await Post(post)

        // get the internal and the external followers
        const followers = await getAllUsersFollowersByUserId(user.actorId);
        let externalFollowers : Person[] = []
        for(const follower of followers){
            if (!follower?.actorId) continue;
            if(await isLocalUser(req, getHandleFromUri(follower?.actorId))){
                // Do nothing since we will fetch the posts of local followers from the db withut concern of what has
                // been posted
                continue;
            }else{
                const user = await LookupUser(getHandleFromUri(follower.uri), req);
                if (!user) continue;
                externalFollowers.push(user);
            }
        }
        if(externalFollowers.length !== 0 ){
            await sendNoteToExternalFollowers(createContext(req), user.actorId, externalFollowers, fileData, mediaURL, mimeType == "mp4" ? "video" : "image");
        }
        res.status(202).json({message : "Successfully created post"})
        next();
    }catch(e){
        next(e)
    }
})


UserRouter.get("/platform/users/me/feed", async (req, res, next)=>{
   const user = await FindUser(req.user as Profile) as User; 
   const followers = await getAllUsersFollowersByUserId(user.actorId);
   console.log("made it here")
   const cursor = !req.query.cursor ? Number.MAX_SAFE_INTEGER : parseInt(req.query.cursor as string)
   let feed : PostData[] = []
   const oldestPosts : number[] = []
   for(const follower of followers){
        if(!follower?.uri) continue;
        console.log(cursor);
        const posts = await getRecentPostsByUserHandle(getHandleFromUri(follower.uri), cursor);
        feed = feed.concat(posts);
        oldestPosts.push(getOldestPost(posts)?.timestamp ?? Number.MIN_SAFE_INTEGER);
   }

   feed.toSorted((a, b)=>{
      return a.timestamp - b.timestamp
   })

   // Getting the new cursor is a fucked up problem that I don't want to think about
   // for now the only solution I can come up with that guarantees posts are not lost is to take the maxmin of the grouped posts
   const newCursor = oldestPosts.length > 0
  ? oldestPosts.reduce((prev, curr) => curr > prev ? curr : prev)
  : undefined;
   res.json({
        posts: feed,
        nextCursor: (feed.length > 0) ? newCursor : undefined  
   })
})

function getOldestPost(posts : PostData[]){
    if(posts.length == 0) return null;
    let currMin= posts[0];
    for(const post of posts){
        if(post.timestamp < currMin.timestamp){
            currMin = post;
        }
    }
    return currMin;
}

