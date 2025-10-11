import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "120404",
      database: "zenned_db",
    });

    // Check if user already exists
    const [rows]: any = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (rows.length > 0) {
      await connection.end();
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, hashedPassword]
    );

    await connection.end();

    return NextResponse.json({ message: "User registered successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
