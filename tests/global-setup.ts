import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Fresh schema for every run on a dedicated *test* Postgres database (never touches your dev data).
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5433/shelfie_test";
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Refusing to reset "${url}": the test database name must contain "test".`);
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  await db.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await db.$executeRawUnsafe("CREATE SCHEMA public");
  await db.$disconnect();
  execSync("npx prisma migrate deploy", { stdio: "ignore", env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
}
