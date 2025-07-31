import passport, { type Profile } from 'passport';
import express from 'express';
import { FindUserByUserHandle } from '../services/user-service.js';
import { FindUser, UpdateUser } from '../database/user-queries.js';
import { GetFollowers } from '../services/follow-service.js';
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
        const user = await FindUserByUserHandle(req.params.userHandle, req);
        if (user == null) return res.status(404).json({ error: 'No user found for provided username.' })
        return res.json(user);
    } catch {
        return res.status(500).json({ error: "An internal error occurred while getting retrieving the user." })
    }

});

UserRouter.post('/platform/users/me', async (req, res) => {
    try {
        const user = await FindUser(req.user as Profile)
        if (user == null) return res.status(401); // this would probably be made redundant once the auth middleware is turned on
        const { displayName, bio } = req.body;
        if (!displayName || !bio) return res.status(400).json({ error: "Required fields missing" })
        if (user.displayName != null) return res.status(400).json({ error: "Already registed with username" })
        user.displayName = displayName;
        user.bio = bio;
        return res.json(await UpdateUser(user));
    }
    catch {
        return res.status(500);
    }
})

UserRouter.get('/platform/users/:user/followers', async (req, res) => {
    try{
        if (!RegExp("@.+@.+").test(req.params.user)) {
            return res.status(400).json({ error: "Invalid user handle provided" })
        }
        return res.json(await GetFollowers(req, req.params.user as `@${string}@${string}`, req.query.next as string | undefined) ?? []);
    }catch{
        return res.status(500);
    }
})

UserRouter.get('/platform/users/:user/following', async (req, res) => {

})

UserRouter.post('/platform/users/:user/following', async (req, res) => {

})

