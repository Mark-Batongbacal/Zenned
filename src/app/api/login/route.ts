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
  const { email, password } = await req.json();

  const connection = await mysql.createConnection(getConnOptions());

  // Ensure optional name column exists so SELECT does not fail on older DBs
  await connection
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
  await connection.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL", []).catch(() => {});
  await connection.execute("ALTER TABLE users ADD COLUMN dark_mode TINYINT(1) NOT NULL DEFAULT 0", []).catch(() => {});

  const [rows]: any = await connection.execute(
    "SELECT id, email, name, password_hash, dark_mode FROM users WHERE email = ?",
    [email]
  );

  await connection.end();

  if (rows.length === 0)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid)
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  
  return NextResponse.json({
    userId: user.id,
    name: user.name,
    darkMode: !!user.dark_mode,
    message: "Login successful"
  });
}
