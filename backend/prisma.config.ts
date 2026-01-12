import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!url) throw new Error("Missing DATABASE_URL or DIRECT_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  engine: "classic",
  datasource: { url },
});
