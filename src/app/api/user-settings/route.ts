import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

function getConnOptions() {
  const common: any = {
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "120404",
    database: process.env.DB_NAME || "zenned_db",
  };
  if (process.env.DB_SOCKET) {
    return { ...common, socketPath: process.env.DB_SOCKET };
  }
  return { ...common, host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306) };
}

async function ensureUsersTable(conn: mysql.Connection) {
  await conn
    .execute(
      `CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NULL,
        password_hash VARCHAR(255) NOT NULL,
        dark_mode TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    )
    .catch(() => {});
  await conn.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL", []).catch(() => {});
  await conn.execute("ALTER TABLE users ADD COLUMN dark_mode TINYINT(1) NOT NULL DEFAULT 0", []).catch(() => {});
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userIdRaw = url.searchParams.get("userId");
  const userId = userIdRaw ? Number(userIdRaw) : null;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  let conn;
  try {
    conn = await mysql.createConnection(getConnOptions());
    await ensureUsersTable(conn);
    const [rows]: any = await conn.execute("SELECT dark_mode FROM users WHERE id = ?", [userId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ darkMode: !!rows[0].dark_mode });
  } catch (err: any) {
    console.error("Failed to fetch user settings", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

export async function PATCH(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, darkMode } = body || {};
  const uid = userId ? Number(userId) : null;
  if (!uid || typeof darkMode !== "boolean") {
    return NextResponse.json({ error: "userId and darkMode required" }, { status: 400 });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getConnOptions());
    await ensureUsersTable(conn);
    const [result]: any = await conn.execute("UPDATE users SET dark_mode = ? WHERE id = ?", [darkMode ? 1 : 0, uid]);
    if (!result || result.affectedRows === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to update user settings", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
