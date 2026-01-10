import "dotenv/config";
import { defineConfig } from "prisma/config";

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Missing DIRECT_URL (preferred) or DATABASE_URL in backend/.env"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // You can keep engine if you want; it's not the source of the issue.
  engine: "classic",
  datasource: { url },
});
