import { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle, isLocalUser, LookupUser } from '../services/user-service.js';
import { FindUser, UpdateUser } from '../database/user-queries.js';
import { GetOrderedCollectionPage } from '../services/follow-service.js';
import { createContext, sendFollow, sendUnfollow } from '../federation.js';
import { AddFollower, AddFollowing, RemoveFollower, RemoveFollowing } from '../database/follow-queries.js';
import type { User } from '../types.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { nodeInfoToJson } from '@fedify/fedify';
import { getFollowRecordByActors } from '../database/object-queries.js';
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
                email: user.email
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
            if(!followObject) throw new NotFoundError();
            await sendUnfollow(ctx, user.actorId, recipient, followObject);
            res.status(204).json({ "message": "Successfully deleted the user" });
            next()
        }
    } catch (e) {
        next(e);
    }
})

