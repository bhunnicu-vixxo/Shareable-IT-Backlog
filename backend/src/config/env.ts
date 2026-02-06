import dotenv from 'dotenv'

// IMPORTANT (Node ESM):
// Many modules read `process.env` at import time. If `dotenv.config()` runs later (e.g., in `server.ts`
// after other imports), those modules will see missing/incorrect values. Importing this module ensures
// `.env` is loaded as early as possible.
dotenv.config()

