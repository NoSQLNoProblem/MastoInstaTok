import type { KvKey, KvStore } from "@fedify/fedify";
import client from '../lib/mongo.js'

await client.connect();
const collection =  client.db("fedify").collection("fedify_kv");

export class MongoKvStore implements KvStore {
  
  async get<T=unknown>(key: KvKey): Promise<T | undefined> {
    const item = await collection.findOne({ key });
    console.log(item?.value);
    return item?.value
  }

  async set(key: KvKey, value: unknown): Promise<void> {
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
