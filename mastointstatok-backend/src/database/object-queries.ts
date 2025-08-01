import type { Follower, Following, FollowObject } from "../types.js";
import client from "../lib/mongo.js"
import type { Accept } from "@fedify/fedify";
import { type AcceptObject } from "../types.js";

const db = client.db("app_db");
const AcceptCollection = db.collection<AcceptObject>('accepts');
const followingCollection = db.collection<FollowObject>('follows');

export async function insertAcceptRecord(accept: AcceptObject){
    AcceptCollection.insertOne(accept)
}

export async function getAcceptRecord(id : URL){
    return AcceptCollection.findOne({id})
}
