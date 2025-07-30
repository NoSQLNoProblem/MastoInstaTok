import passport, { type Profile } from 'passport';
import express from 'express';
import { FindUser, FindUserByDisplayName, UpdateUser } from '../services/user-service.js';
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:user', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.params.user === "me") {
        const user = res.json(await FindUser(req.user as Profile))
        if (user == null) return res.status(404).json({ error: 'No user found' })
    }
    const user = await FindUserByDisplayName(req.params.user);
    if (user == null) return res.status(404).json({ error: 'No user found for provided username.' })
    return res.json(user);
});

UserRouter.post('/platform/users/me', async (req, res)=>{
    if(!req.user) return res.status(401);
    const user = await FindUser(req.user as Profile)
    if(user == null) return res.status(401);
    const {username, bio} = req.body;
    if(!username || !bio) return res.status(400).json( { error: "Required fields missing" })
    user.displayName =  username;
    user.bio = bio;
    return res.json(await UpdateUser(user));
})


