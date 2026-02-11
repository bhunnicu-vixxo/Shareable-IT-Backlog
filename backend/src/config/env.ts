import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// IMPORTANT (Node ESM):
// Many modules read `process.env` at import time. If `dotenv.config()` runs later (e.g., in `server.ts`
// after other imports), those modules will see missing/incorrect values. Importing this module ensures
// `.env` is loaded as early as possible.
// Load root .env first (shared vars when running via npm -w backend), then backend/.env for overrides
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env')
dotenv.config({ path: rootEnv })
dotenv.config() // backend/.env

