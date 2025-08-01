import type { Profile } from 'passport';
import  client  from '../lib/mongo.js';
import { type Follower, type User } from '../types.js';
import { ObjectId, type WithId } from 'mongodb';
import { createContext } from '../federation.js';
import { type Request } from 'express';
import { Link, OrderedCollection, OrderedCollectionPage, Person, type Actor } from '@fedify/fedify';
import { AddUser } from '../database/user-queries.js';
import * as crypto from 'crypto';

client.connect();
const db = client.db("app_db");
const usersCollection = db.collection('users');
const followersCollection = db.collection<Follower>('followers');

export async function CreateUser(profile: Profile, baseUrl: string) {
  let user = await usersCollection.findOne<User>({ googleId: profile.id });
  if (user) return user;

  const username = `${profile.displayName.toLowerCase().replace(/\s+/g, '')}-${crypto.randomUUID().split("-")[0]}`;
  const actorId = getActorId(username, baseUrl);
  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: null,
    bio: null,
    actorId: actorId,
    username,
    fullHandle: `@${username}@${baseUrl.split("//")[1]}`
  };

  return await AddUser(userToInsert)
}

export async function FindUserByUserHandle(userHandle: string, request: Request) {
  const ctx = createContext(request);
  const actor = await ctx.lookupObject(userHandle);
  const actorId = actor?.id;
  const summary = actor?.summary
  if (!actorId) return null
  const user: User = {
    actorId: actorId.href,
    bio: summary as string,
    displayName: actor.name as string,
    fullHandle: userHandle,
  }
  return user;
}



const getActorId = (username: string, baseUrl: string) => `${baseUrl}/api/users/${username}`
