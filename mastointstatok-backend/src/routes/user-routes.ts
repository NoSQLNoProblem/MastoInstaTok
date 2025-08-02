import { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle, isLocalUser, LookupUser } from '../services/user-service.js';
import { FindUser, UpdateUser } from '../database/user-queries.js';
import { GetOrderedCollectionPage } from '../services/follow-service.js';
import { createContext, sendFollow } from '../federation.js';
import { AddFollower, AddFollowing } from '../database/follow-queries.js';
import type { User } from '../types.js';
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:userHandle', async (req, res) => {
    try {
        if (req.params.userHandle === "me") {
            const user = await FindUser(req.user as Profile)
            if (user == null) return res.status(404).json({ error: 'No user found' })
            return res.json({
                actorId: user.actorId,
                bio: user.bio,
                displayName: user.displayName,
                fullHandle: user.fullHandle,
                email: user.email
            });
        }

        if (!RegExp("@.+@.+").test(req.params.userHandle)) {
        return res.status(400).json({ error: "Invalid user handle provided" })
        }
        
        const user = await FindUserByUserHandle(req.params.userHandle, req);
        console.log("THE USER IS >>>>>>>>>>>>>", user)
        if (user == null) return res.status(404).json({ error: 'No user found for provided username.' })
        return res.json(user);
    } catch {
        return res.status(500).json({ error: "An internal error occurred while retrieving the user." })
    }
});

UserRouter.post('/platform/users/me', async (req, res) => {
    try {
        const user = await FindUser(req.user as Profile) as User
        const { displayName, bio } = req.body;
        if (!displayName || !bio) return res.status(400).json({ error: "Required fields missing" })
        if (user.displayName != null) return res.status(400).json({ error: "Already registed with username" })
        user.displayName = displayName;
        user.bio = bio;
        return res.json(await UpdateUser(user));
    }
    catch {
        return res.status(500).json( { error: "Could not find yourself" } );
    }
})

UserRouter.get('/platform/users/:user/followers', async (req, res) => {
    try{
        if (!RegExp("@.+@.+").test(req.params.user)) {
            return res.status(400).json({ error: "Invalid user handle provided" })
        }
        const user = await LookupUser(req.params.user, req)
        if(!user || !user.followersId) return res.status(404).json( { error: "Failed to find user" } );
        return res.json(await GetOrderedCollectionPage(req, user, user.followersId.href, req.query.next as string | undefined) ?? []);
    }catch{
        return res.status(500).json( { error: "Error getting followers" } );
    }
})

UserRouter.get('/platform/users/:user/following', async (req, res) => {
    try{
        if (!RegExp("@.+@.+").test(req.params.user)) {
            return res.status(400).json({ error: "Invalid user handle provided" })
        }
        const user = await  LookupUser(req.params.user, req)
        if(!user || !user.followingId) return res.status(404).json({ error: "Could not find user" });
        return res.json(await GetOrderedCollectionPage(req, user, user.followingId.href, req.query.next as string | undefined) ?? []);
    }catch{
        return res.status(500).json( { error: "something diabolical happened" } );
    }
})

UserRouter.post('/platform/users/me/follows/:followHandle', async (req, res) => {
    try{
        if (!RegExp("@.+@.+").test(req.params.followHandle)) {
            return res.status(400).json({ error: "Invalid user handle provided" })
        }
        const user = await FindUser(req.user as Profile)
        if(!user) return res.status(400).json({ error: "The signed in user could not be resolved." });
        const ctx = createContext(req);
        const recipient = await LookupUser(req.params.followHandle, req);
        if(!recipient || !recipient.id || !recipient.inboxId) return res.status(400).json("Cannot follow someone who doesn't exist moron");
        if(await isLocalUser(req, req.params.followHandle)){
            if(!(await AddFollower(recipient.id.href, user.actorId, ctx.getInboxUri(user.actorId).href ))){
                return res.status(409).json( { error : "Already following" } )
            }
            if(!(await AddFollowing(user.actorId, recipient.id.href, recipient.inboxId.href))){
                return res.status(409).json( { error : "Already following" } )
            }
            return res.status(202).json({"message" : "Successfully created the user"});
        }
        await sendFollow(ctx, user.actorId, recipient);
        return res.status(202);
    }catch{
        return res.status(500);
    }
})

