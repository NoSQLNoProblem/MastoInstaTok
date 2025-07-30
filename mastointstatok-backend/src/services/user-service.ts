import type { Profile } from 'passport';
import { client } from '../lib/mongo.js';
import { type Actor, type FollowerDocument, type UserDocument } from '../types.js';
import { ObjectId, type WithId } from 'mongodb';

client.connect();
const db = client.db("app_db");
const usersCollection = db.collection('users');
const followers = await db.collection<FollowerDocument>('followers');

export async function CreateUser(profile: Profile, baseUrl: string) {
  let user = await usersCollection.findOne<UserDocument>({ googleId: profile.id });
  if (user) return user;

  const username = `${profile.displayName.toLowerCase().replace(/\s+/g, '')}-${crypto.randomUUID().split("-")[0]}`;
  const actorId = getActorId(username, baseUrl);
  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: null,
    bio: null,
    actorId: actorId,
    followers: [] as Actor[],
    username
  };

  return await AddUser(userToInsert)
}

async function AddUser(user : UserDocument){
  return await usersCollection.insertOne(user);
}

export async function FindUser(profile: Profile) {
  return await usersCollection.findOne<UserDocument>({ googleId: profile.id });
}

export async function FindUserByDisplayName(displayName: string) {
  return await usersCollection.findOne<UserDocument>({ displayName })
}

export async function FindUserByUri(actorId: string) {
  return await usersCollection.findOne<UserDocument>({ actorId })
}

export async function UpdateUser(user: UserDocument) {
  await usersCollection.updateOne(
    { googleId: user.googleId },
    { $set: user }
  );
  return usersCollection.findOne<UserDocument>({googleId:user.googleId})
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
