import type { Follower, Following } from "../types.js";
import client from "../lib/mongo.js"
import { ObjectId, type WithId } from "mongodb";

const db = client.db("app_db");
const followersCollection = db.collection<Follower>('followers');
const followingCollection = db.collection<Following>('following');

export async function AddFollower(actorId: string, followerId: string, followerInbox: string) {
    const followerToInsert: Follower = {
        uri: followerId, 
        inboxUri: followerInbox,
        actorId: actorId
    }
    if(await followersCollection.findOne(followerToInsert)){
        return false;
    }
    await followersCollection.insertOne(followerToInsert);
    return true;
}

export async function RemoveFollower(actorId: string, followerId: string, followerInbox: string) {
    const followerToInsert: Follower = {
        uri: followerId,
        inboxUri: followerInbox,
        actorId: actorId
    }
    if(!followersCollection.findOne(followerToInsert)){
        return false;
    }
    await followersCollection.deleteOne(followerToInsert);
    return true;
}

export async function AddFollowing(actorId: string, followingId: string, inboxUri: string) {
    const followingToInsert: Following = {
        followerId: actorId,
        followeeId: followingId,
        inboxUri: inboxUri
    }
    if(await followingCollection.findOne(followingToInsert)){
        return false;
    }
    followingCollection.insertOne(followingToInsert);
    return true;
}

export async function RemoveFollowing(actorId: string, followingId: string, inboxUri: string) {
    const followingToInsert: Following = {
        followerId: actorId,
        followeeId: followingId,
        inboxUri: inboxUri
    }
    if(!await followingCollection.findOne(followingToInsert)){
        return false;
    }
    followingCollection.deleteOne(followingToInsert);
    return true;
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
        last: users[users.length - 1]?._id === lastFollower?._id,
        totalItems : await followersCollection.countDocuments()
    }
}

export async function getInternalUsersFollowingByUserId(actorId: string, options: { cursor: string, limit: 10 }) {
    const { cursor, limit } = options
    const lastFollowing = (await followingCollection.find({ followerId : actorId }).sort({ _id: -1 }).limit(1).toArray())[0];
    let users: WithId<Following>[];
    if (cursor == Number.MAX_SAFE_INTEGER.toString()) {
        users = await followingCollection.find({ followerId : actorId }).sort({ _id: -1 }).limit(limit).toArray();
    }
    else {
        users = await followingCollection.find({ followerId : actorId, _id: { $lt: new ObjectId(cursor) } }).sort({ _id: -1 }).limit(limit).toArray()
    }
    return {
        users,
        nextCursor: users[users.length - 1]?._id.toHexString(),
        last: users[users.length - 1]?._id === lastFollowing?._id
    }
}

export function getAllUsersFollowersByUserId(actorId: string) {
    return followersCollection.find({actorId}).toArray()
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const followRelationship = await followingCollection.findOne({
    followerId: followerId, 
    followeeId: followeeId, 
  });
  return !!followRelationship; 
}