import passport, { type Profile } from 'passport';
import express from 'express';
import { FindUser, FindUserByDisplayName, FindUserByUsername, UpdateUser } from '../services/user-service.js';
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:user', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.params.user === "me") {
        console.log("made it here");
        const user = await FindUser(req.user as Profile)
        if (user == null) return res.status(404).json({ error: 'No user found' })
        return res.json(user);
    }
    const user = await FindUserByUsername(req.params.user);
    if (user == null) return res.status(404).json({ error: 'No user found for provided username.' })
    return res.json(user);
});

UserRouter.post('/platform/users/me', async (req, res)=>{
    if(!req.user) return res.status(401);
    const user = await FindUser(req.user as Profile)
    if(user == null) return res.status(401);
    const {displayName, bio} = req.body;
    if(!displayName|| !bio) return res.status(400).json( { error: "Required fields missing" })
    if(user.displayName != null) return res.status(400).json( { error: "Already registed with username"} )
    user.displayName =  displayName;
    user.bio = bio;
    return res.json(await UpdateUser(user));
})

UserRouter.post('/platform/users/:user/followers', async (req, res)=>{
    
})


