"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type EventItem = { id: number; title: string; event_date: string };

export default function DayLandingPage() {
    const params = useParams();
    const router = useRouter();
    const date = Array.isArray(params.date) ? params.date[0] : (params.date || "");
    const [events, setEvents] = useState<EventItem[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [userId, setUserId] = useState<number | null>(null);
    const normalizedDate = date;

    useEffect(() => {
        try {
            const uid = localStorage.getItem("userId");
            setUserId(uid ? Number(uid) : null);
        } catch {
            setUserId(null);
        }
    }, []);

    useEffect(() => {
        const fetchForDate = async () => {
            if (!userId) return;
            try {
                const res = await fetch(`/api/events?userId=${userId}`);
                if (!res.ok) return;
                const rows: EventItem[] = await res.json();
                const filtered = rows.filter(r => {
                    const d = (r.event_date || "").slice(0, 10);
                    return d === normalizedDate;
                });
                setEvents(filtered);
            } catch (e) {
                console.error(e);
            }
        };

        fetchForDate();
    }, [userId, normalizedDate]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const title = newTitle.trim();
        if (userId) {
            try {
                const res = await fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, title, date: normalizedDate }),
                });
                const data = await res.json();
                if (res.ok) {
                    const id = data.insertedId ?? Date.now();
                    setEvents(prev => [...prev, { id, title, event_date: normalizedDate }]);
                    setNewTitle("");
                } else {
                    console.error("Add failed", data);
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            // local fallback
            const id = Date.now();
            setEvents(prev => [...prev, { id, title, event_date: normalizedDate }]);
            setNewTitle("");
            // also persist to localStorage map used by dashboard
            try {
                const raw = localStorage.getItem("events");
                const map = raw ? JSON.parse(raw) : {};
                map[normalizedDate] = map[normalizedDate] ? [...map[normalizedDate], { id, title, date: normalizedDate }] : [{ id, title, date: normalizedDate }];
                localStorage.setItem("events", JSON.stringify(map));
            } catch {}
        }
    };

    return (
        <div className="min-h-screen flex items-start justify-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white p-8">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-black">Landing — {normalizedDate}</h1>
                    <div className="flex gap-2">
                        <Link href="/dashboard" className="px-3 py-1 bg-gray-100 rounded text-gray-800">Back</Link>
                        <button onClick={() => router.push(`/dashboard/day/${normalizedDate}`)} className="px-3 py-1 bg-yellow-400 rounded text-black">
                            Open Day Details
                        </button>
                    </div>
                </div>

                <p className="mb-4 text-sm text-gray-800">Quick summary for the selected day. Add an event below or open the full day view.</p>

                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Event name (no time required)"
                        className="flex-1 px-4 py-2 border rounded text-gray-900"
                    />
                    <button type="submit" className="px-4 py-2 bg-yellow-400 rounded text-black">Add</button>
                </form>

                <h2 className="text-lg font-semibold mb-2 text-gray-900">Events ({events.length})</h2>
                {events.length === 0 ? (
                    <p className="text-gray-700">No events for this day.</p>
                ) : (
                    <ul className="space-y-2">
                        {events.map(ev => (
                            <li key={ev.id} className="p-3 border rounded flex justify-between items-center">
                                <div className="text-gray-900">{ev.title}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}