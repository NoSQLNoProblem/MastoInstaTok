// mongo-kv.ts
// mongo-kv.ts
import type { KvKey, KvStore } from "@fedify/fedify";
import { MongoClient, Db, Collection } from "mongodb";
import {client} from '../lib/mongo.js'

type KVItem = {
  key: string;
  value: string;
};
await client.connect();
const collection =  client.db("fedify").collection("fedify_kv");

export class MongoKvStore implements KvStore {
  
  async get<T=unknown>(key: KvKey): Promise<T | undefined> {
    const item = await collection.findOne({ key });
    return item?.value ? JSON.parse(item.value) : undefined;
  }

  async set(key: KvKey, value: string): Promise<void> {
    await collection.updateOne(
      { key },
      { $set: { value } },
      { upsert: true }
    );
  }

  async delete(key: KvKey): Promise<void> {
    await collection.deleteOne({ key });
  }
}
