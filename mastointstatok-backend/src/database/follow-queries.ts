import type { Follower } from "../types.js";
import client from "../lib/mongo.js"
import { ObjectId, type WithId } from "mongodb";

const db = client.db("app_db");
const followersCollection = db.collection<Follower>('followers');

export async function AddFollower(actorId: string, followerId: string, followerInbox: string) {
  const followerToInsert: Follower = {
    uri: followerId,
    inboxUri: followerInbox,
    actorId: actorId
  }
  return await followersCollection.insertOne(followerToInsert);
}

export async function getInternalUsersFollowersByUserId(actorId: string, options: { cursor: string, limit: 10 }) {
  const { cursor, limit } = options
  const lastFollower = (await followersCollection.find({ actorId }).sort({ _id: -1 }).limit(1).toArray())[0];
  let users: WithId<Follower>[];
  if (cursor == Number.MAX_SAFE_INTEGER.toString()) {
    users = await followersCollection.find({ actorId }).sort({ _id: -1 }).limit(limit).toArray();
  }
  else {
    users = await followersCollection.find({ actorId, _id: { $lt: new ObjectId(cursor) } }).sort({ _id: -1 }).limit(limit).toArray()
  }
  return {
    users,
    nextCursor: users[users.length - 1]?._id.toHexString(),
    last: users[users.length - 1]?._id === lastFollower?._id
  }
}