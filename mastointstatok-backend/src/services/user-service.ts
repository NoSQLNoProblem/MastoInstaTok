import { type Profile } from 'passport';
import  client  from '../lib/mongo.js';
import { type User } from '../types.js';
import { createContext } from '../federation.js';
import { type Request } from 'express';
import {  Person} from '@fedify/fedify';
import { AddUser, FindUserByUri } from '../database/user-queries.js';
import * as crypto from 'crypto';

client.connect();
const db = client.db("app_db");
const usersCollection = db.collection('users');

export async function CreateUser(profile: Profile, baseUrl: string) {
  let user = await usersCollection.findOne<User>({ googleId: profile.id });
  if (user) return user;

  const username = `${profile.displayName.toLowerCase().replace(/\s+/g, '')}-${crypto.randomUUID().split("-")[0]}`;
  const actorId = getActorId(username, baseUrl);

  const avatarURL = (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : undefined;

  const userToInsert : User = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: null,
    bio: null,
    actorId: actorId,
    username,
    fullHandle: `@${username}@${baseUrl.split("//")[1]}`,
    avatarURL: avatarURL
  };

  return await AddUser(userToInsert)
}

export async function FindUserByUserHandle(userHandle: string, request: Request) {
  const ctx = createContext(request);
  console.log("Create context successfully");
  const actor = await LookupUser(userHandle, request);
  console.log("The actor is >>>>>>>>> ", actor)
  const actorId = actor?.id;
  const summary = actor?.summary
  if (!actorId) return null
  console.log("Made it here ");
  const user: User = {
    actorId: actorId.href,
    bio: summary as string,
    displayName: actor.name as string,
    fullHandle: userHandle,
  }
  return user;
}
export async function LookupUser(userHandle: string, request : Request) {
  console.log(userHandle);
  const ctx = createContext(request);
  if(await isLocalUser(request, userHandle)){
    console.log("this should not be here");
     const actor = await FindUserByUri(ctx.getActorUri(userHandle.split("@")[1]).href);
     if(!actor?.actorId || !actor.username ) return null;
     return new Person({
      id: new URL(actor?.actorId),
      preferredUsername: actor.username,
      name: actor.displayName,
      inbox: ctx.getInboxUri(actor.username),
      followers: ctx.getFollowersUri(actor.username),
      summary: actor.bio,
      following: ctx.getFollowingUri(actor.username),
    });
  }
  const actor = await ctx.lookupObject(userHandle) as Person;
  return actor;
}

export async function isLocalUser(request : Request, userHandle : string){
  const handleSplit = userHandle.split("@")
  return request.hostname == handleSplit[handleSplit.length - 1].split(":")[0];
}

const getActorId = (username: string, baseUrl: string) => `${baseUrl}/api/users/${username}`
