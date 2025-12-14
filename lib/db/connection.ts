import { config } from "dotenv"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

config()

type DatabaseSchema = typeof schema

function createDatabase(): PostgresJsDatabase<DatabaseSchema> | null {
  if (!process.env.POSTGRES_URL) {
    return null
  }

  console.log("🗄️  Using PostgreSQL database")
  const client = postgres(process.env.POSTGRES_URL)
  return drizzle(client, { schema })
}

const db = createDatabase()

export default db
