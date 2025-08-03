import client  from '../lib/mongo.js'
import type { PostData, User } from '../types.js';

const db = client.db("app_db");
const postsCollection = db.collection('posts');

export async function Post(post: PostData) {
  return await postsCollection.insertOne(post);
}

export async function getPostByUrl(mediaUrl : string){
    return await postsCollection.findOne<PostData>( { mediaUrl } )
}

export async function getPostById(id : string){
    return await postsCollection.findOne<PostData>( { id } )
}

export async function getRecentPostsByUserHandle(userHandle : string, cursorTimestamp : number){
    return postsCollection.find<PostData>({userHandle, timestamp:{$lt:cursorTimestamp}}).limit(5).toArray()
}