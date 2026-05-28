import { Database } from 'arangojs'
import 'dotenv/config'

export const db = new Database({ 
  url: process.env.ARANGO_URL || '', 
  databaseName: process.env.ARANGO_DB_NAME || '', 
})
