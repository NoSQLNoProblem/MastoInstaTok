
import { Db, MongoClient} from 'mongodb'
import { apex } from '../routes/activity-pub-routes'
const client = new MongoClient('mongodb://localhost:27017')
export let db : Db;

client.connect()
  .then(() => {
    apex.store.db = client.db('apex_db')
    db = client.db('app_db')
    return apex.store.setup()
  })