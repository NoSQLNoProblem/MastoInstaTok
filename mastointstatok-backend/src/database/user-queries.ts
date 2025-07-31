import type { Profile } from 'passport';
import client  from '../lib/mongo.js'
import type { User } from '../types.js';

const db = client.db("app_db");
const usersCollection = db.collection('users');

export async function AddUser(user: User) {
  return await usersCollection.insertOne(user);
}

export async function UpdateUser(user: User) {
  await usersCollection.updateOne(
    { googleId: user.googleId },
    { $set: user }
  );
  return usersCollection.findOne<User>({ googleId: user.googleId })
}

export async function FindUser(profile: Profile) {
  return await usersCollection.findOne<User>({ googleId: profile.id });
}

export async function FindUserByDisplayName(displayName: string) {
  return await usersCollection.findOne<User>({ displayName })
}

export async function FindUserByUri(actorId: string) {
  return await usersCollection.findOne<User>({ actorId })
}

export async function FindUserByUsername(username: string) {
  return await usersCollection.findOne<User>({ username })
}