import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Fresh throwaway SQLite file for every test run (never touches dev.db).
export default function setup() {
  for (const f of ["test.db", "test.db-journal"]) fs.rmSync(path.resolve("prisma", f), { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
