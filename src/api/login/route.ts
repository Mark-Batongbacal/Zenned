import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "120404",
    database: "zenned_db",
  });

  const [rows]: any = await connection.execute(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  await connection.end();

  if (rows.length === 0)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid)
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });

  return NextResponse.json({ message: "Login successful" });
}
