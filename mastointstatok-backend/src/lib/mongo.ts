
import { Db, MongoClient, ObjectId} from 'mongodb'
const client = new MongoClient('mongodb://localhost:27017')
client.connect()
export default client

export const getMaxObjectId = () => new ObjectId("ffffffffffffffffffffffff");
