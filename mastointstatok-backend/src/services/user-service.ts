import type { Profile } from 'passport';
import { client } from '../lib/mongo.js';
import { type UserDocument } from '../types/ActorTypes.ts';

client.connect();
const db = client.db("app_db");

export async function CreateUser(profile : Profile, baseUrl:string ) {
  const usersCollection = db.collection('users');
  let user = await usersCollection.findOne<UserDocument>({ googleId: profile.id });
  if (user) return user;

  const username = profile.displayName.toLowerCase().replace(/\s+/g, '');
  const actorId = GetActorId(username, baseUrl);

  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName,
    actorId: actorId,
    followers: []
  };

  return await usersCollection.insertOne(userToInsert);
}

export async function FindUser(profile : Profile)
{
   const usersCollection = db.collection<UserDocument>('users');
   let user = await usersCollection.findOne<UserDocument>({ googleId: profile.id });
   return user;
}

export async function FindUserByUri(actorId : string){
   const usersCollection = db.collection('users');
   return await usersCollection.findOne<UserDocument>({actorId})
}

export async function AddFollower(actorId : string, followerId : string){
  const usersCollection = db.collection<UserDocument>('users');
  await usersCollection.updateOne(
  { actorId }, // Replace with your identifier
  { $push: { followers: followerId } } // Add follower
);
}

const GetActorId = (username: string, baseUrl : string) => `${baseUrl}/users/${username}`


