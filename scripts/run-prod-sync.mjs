import dotenv from "dotenv";
dotenv.config({ path: ".env.prod.local" }); // prod creds into process.env FIRST
await import("./sync-google-places.mjs");    // its dotenv.config won't override existing keys
