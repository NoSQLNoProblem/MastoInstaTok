import type { Profile } from 'passport';
import { client } from '../../lib/mongo.js';
import { type FollowerDocument, type UserDocument } from '../../types.js';
import { Follow } from '@fedify/fedify';
import { ObjectId, type WithId } from 'mongodb';

client.connect();
const db = client.db("app_db");
const usersCollection = db.collection('users');
const followers = await db.collection<FollowerDocument>('followers');

export async function CreateUser(profile: Profile, baseUrl: string) {
  let user = await usersCollection.findOne<UserDocument>({ googleId: profile.id });
  if (user) return user;

  const username = profile.displayName.toLowerCase().replace(/\s+/g, '');
  const actorId = getActorId(username, baseUrl);

  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: username,
    actorId: actorId,
    followers: []
  };

  return await usersCollection.insertOne(userToInsert);
}

export async function FindUser(profile: Profile) {
  const usersCollection = db.collection<UserDocument>('users');
  let user = await usersCollection.findOne<UserDocument>({ googleId: profile.id });
  return user;
}

export async function FindUserByUri(actorId: string) {
  return await usersCollection.findOne<UserDocument>({ actorId })
}

export async function AddFollower(actorId: string, followerId: string, followerInbox: string) {
  const followerToInsert: FollowerDocument = {
    uri: followerId,
    inboxUri: followerInbox,
    actorId: actorId
  }
  return await usersCollection.insertOne(followerToInsert);
}

export async function getFollowersByUserId(actorId: string, options: { cursor: string, limit: 10 }) {
  const { cursor, limit } = options
  const lastFollower = (await followers.find({ actorId }).sort({ _id: -1 }).limit(1).toArray())[0];
  let users: WithId<FollowerDocument>[];
  if (cursor == "\"") {
    users = await followers.find({ actorId }).sort({ _id: 1 }).limit(limit).toArray();
  }
  else {
    users = await followers.find({ actorId, _id: { $gt: new ObjectId(cursor) } }).limit(limit).toArray()
  }
  return {
    users,
    nextCursor: users[users.length - 1]?._id.toHexString(),
    last: users[users.length - 1]?._id === lastFollower?._id
  }
}

const getActorId = (username: string, baseUrl: string) => `${baseUrl}/api/users/${username}`
