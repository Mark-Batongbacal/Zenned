import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

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

export async function POST(req: Request) {
  let connection;
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    connection = await mysql.createConnection(getConnOptions());

    // Ensure table and name column exist (safe if already present)
    await connection
      .execute(
        `CREATE TABLE IF NOT EXISTS users (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      )
      .catch(() => {});
    await connection.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL", []).catch(() => {});

    const [rows]: any = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (Array.isArray(rows) && rows.length > 0) {
      await connection.end();
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanName = name ? String(name).slice(0, 255) : null;
    const [insertResult]: any = await connection.execute(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
      [email, cleanName, hashedPassword]
    );
    const userId = insertResult && insertResult.insertId;
    if (!userId) {
      await connection.end();
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const tableName = `events_user_${Number(userId)}`;
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         event_date DATE NOT NULL,
         start_time TIME NULL,
         end_time TIME NULL,
         completed TINYINT(1) NOT NULL DEFAULT 0,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
    await connection.execute(
      `ALTER TABLE \`${tableName}\` ADD COLUMN completed TINYINT(1) NOT NULL DEFAULT 0`
    ).catch(() => {});

    await connection.end();
    return NextResponse.json({ message: "User registered successfully", userId, name: cleanName });
  } catch (error: any) {
    console.error(error);
    if (connection) await connection.end().catch(() => {});
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
