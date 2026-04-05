import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { Pool } from "pg";
import fs from "fs";

async function run() {
  const pool = new Pool({
    connectionString: process.env.PG_URL,
  });

  try {
    const sqlPath = path.join(__dirname, "..", "postgres", "update_v2.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Applying incremental schema from:", sqlPath);
    console.log("Using PG_URL:", process.env.PG_URL ? "Set" : "Not Set");
    
    await pool.query(sql);
    console.log("✅ Incremental schema applied successfully");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to apply schema:", err);
    await pool.end();
    process.exit(1);
  }
}

run();
