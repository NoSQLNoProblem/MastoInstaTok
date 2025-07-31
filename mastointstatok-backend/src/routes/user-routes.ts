import passport, { type Profile } from 'passport';
import express from 'express';
import { FindUser, FindUserByDisplayName, FindUserByUserHandle, FindUserByUsername, UpdateUser } from '../services/user-service.js';
export const UserRouter = express.Router();

UserRouter.get('/platform/users/:userHandle', async (req, res) => {
    if (req.params.userHandle === "me") {
        console.log("made it here");
        const user = await FindUser(req.user as Profile)
        if (user == null) return res.status(404).json({ error: 'No user found' })
        return res.json({
            actorId : user.actorId,
            bio : user.bio,
            displayName: user.displayName,
            fullHandle : user.fullHandle,
            email : user.email
        });
    }
    const user = await FindUserByUserHandle(req.params.userHandle, req);
    if (user == null) return res.status(404).json({ error: 'No user found for provided username.' })
    return res.json(user);
});

UserRouter.post('/platform/users/me', async (req, res)=>{
    const user = await FindUser(req.user as Profile)
    if(user == null) return res.status(401); // this would probably be made redundant once the auth middleware is on
    const {displayName, bio} = req.body;
    if(!displayName|| !bio) return res.status(400).json( { error: "Required fields missing" })
    if(user.displayName != null) return res.status(400).json( { error: "Already registed with username"} )
    user.displayName =  displayName;
    user.bio = bio;
    return res.json(await UpdateUser(user));
})

UserRouter.post('/platform/users/:user/followers', async (req, res)=>{
    
})


