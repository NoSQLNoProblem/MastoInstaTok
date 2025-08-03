import type { Attachment, CreateObject, FollowObject, NoteObject, UndoObject } from "../types.js";
import client from "../lib/mongo.js"
import { type AcceptObject } from "../types.js";
import { Follow } from "@fedify/fedify";

const db = client.db("app_db");
const AcceptCollection = db.collection<AcceptObject>('accepts');
const followCollection = db.collection<FollowObject>('follows');
const undoCollection = db.collection<UndoObject>('undos')
const noteCollection = db.collection<NoteObject>('notes')
const attachmentCollection = db.collection<Attachment>('attachments')
const createCollection = db.collection<CreateObject>('creates')

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

export async function insertUndoRecord(undo: UndoObject){
    undoCollection.insertOne(undo)
}

export async function getUndoRecord(id : URL){
    return undoCollection.findOne({id})
}

export async function getFollowRecordByActors(actor : string, recipient : string){
    return followCollection.findOne<FollowObject>({id: actor, object : recipient});
}

export async function insertNoteRecord(note : NoteObject){
    noteCollection.insertOne(note)
}

export async function getNoteRecord(id : URL){
    return noteCollection.findOne<NoteObject>({id})
}

export async function insertAttachmentRecord(attachment : Attachment){
    attachmentCollection.insertOne(attachment)
}

export async function getAttachmentRecord(id : URL){
    return noteCollection.findOne<NoteObject>({id})
}

export async function insertCreateRecord(create : CreateObject){
    createCollection.insertOne(create)
}

export async function getCreateRecord(id : URL){
    return createCollection.findOne<CreateObject>({id})
}
