// Loads .env.local then .env for command-line scripts (Next.js does this itself).
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
