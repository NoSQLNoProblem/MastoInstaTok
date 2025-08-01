import type { FollowObject } from "../types.js";
import client from "../lib/mongo.js"
import { type AcceptObject } from "../types.js";

const db = client.db("app_db");
const AcceptCollection = db.collection<AcceptObject>('accepts');
const followCollection = db.collection<FollowObject>('follows');

export async function insertAcceptRecord(accept: AcceptObject){
    AcceptCollection.insertOne(accept)
}

export async function getAcceptRecord(id : URL){
    return AcceptCollection.findOne({id})
}

export async function insertFollowRecord(follow : FollowObject){
    followCollection.insertOne(follow);
}

export async function getFollowRecord(id : URL){
    return followCollection.findOne({id})
}
