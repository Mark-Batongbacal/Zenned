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

async function getConnection() {
  return mysql.createConnection(getConnOptions());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userIdRaw = url.searchParams.get("userId");
  const userId = userIdRaw ? Number(userIdRaw) : null;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  let conn;
  try {
    conn = await getConnection();
    const tableName = `events_user_${userId}`;
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await conn.execute(
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         event_date DATE NOT NULL,
         start_time TIME DEFAULT NULL,
         end_time TIME DEFAULT NULL,
         completed TINYINT(1) NOT NULL DEFAULT 0,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
    await conn.execute(
      `ALTER TABLE \`${tableName}\` ADD COLUMN completed TINYINT(1) NOT NULL DEFAULT 0`,
    ).catch(() => {});

    const [rows]: any = await conn.execute(
      `SELECT id, title, event_date, start_time, end_time, completed FROM \`${tableName}\` ORDER BY event_date, start_time, id`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error(err);
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

  const { userId, id, start_time, end_time, completed } = body || {};
  const uid = userId ? Number(userId) : null;
  const eventId = id ? Number(id) : null;

  if (!uid || !eventId) {
    return NextResponse.json({ error: "userId and id required" }, { status: 400 });
  }

  const hasStart = start_time !== undefined;
  const hasEnd = end_time !== undefined;
  const hasCompleted = completed !== undefined;
  if (!hasStart && !hasEnd && !hasCompleted) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getConnOptions());
    const tableName = `events_user_${uid}`;
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (hasStart) {
      updates.push("start_time = ?");
      params.push(start_time ?? null);
    }
    if (hasEnd) {
      updates.push("end_time = ?");
      params.push(end_time ?? null);
    }
    if (hasCompleted) {
      updates.push("completed = ?");
      params.push(completed ? 1 : 0);
    }

    const [result]: any = await conn.execute(
      `UPDATE \`${tableName}\` SET ${updates.join(", ")} WHERE id = ?`,
      [...params, eventId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating event:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}


export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, title, date, startTime, endTime, completed } = body || {};
  const uid = userId ? Number(userId) : null;
  if (!uid || !title || !date) return NextResponse.json({ error: "userId, title, and date required" }, { status: 400 });

  let conn;
  try {
    conn = await getConnection();
    const tableName = `events_user_${uid}`;
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await conn.execute(
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         event_date DATE NOT NULL,
         start_time TIME DEFAULT NULL,
         end_time TIME DEFAULT NULL,
         completed TINYINT(1) NOT NULL DEFAULT 0,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
    await conn.execute(
      `ALTER TABLE \`${tableName}\` ADD COLUMN completed TINYINT(1) NOT NULL DEFAULT 0`,
    ).catch(() => {});

    const [result]: any = await conn.execute(
      `INSERT INTO \`${tableName}\` (title, event_date, start_time, end_time, completed) VALUES (?, ?, ?, ?, ?)`,
      [String(title).slice(0, 255), date, startTime ?? null, endTime ?? null, completed ? 1 : 0]
    );

    return NextResponse.json({ insertedId: result.insertId });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

export async function DELETE(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, id } = body || {};
  const uid = userId ? Number(userId) : null;
  const eventId = id ? Number(id) : null;

  if (!uid || !eventId) {
    return NextResponse.json({ error: "userId and id required" }, { status: 400 });
  }

  let conn;
  try {
    conn = await getConnection();
    const tableName = `events_user_${uid}`;
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const [result]: any = await conn.execute(
      `DELETE FROM \`${tableName}\` WHERE id = ?`,
      [eventId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Event not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting event:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
