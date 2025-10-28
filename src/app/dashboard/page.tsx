"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Event = {
    id: number;
    title: string;
    date: string;
    time?: string;
};

export default function DashboardPage() {
    const router = useRouter();
    const today = new Date();

    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [quickText, setQuickText] = useState("");
    const [eventsMap, setEventsMap] = useState<Record<string, Event[]>>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // load userId from localStorage synchronously (client component)
    const [userId, setUserId] = useState<number | null>(() => {
        try {
            const uid = localStorage.getItem("userId");
            return uid ? Number(uid) : null;
        } catch {
            return null;
        }
    });

    const normalizeDate = (d: any) => {
        if (!d) return "";
        if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d).slice(0,10);
        return dt.toISOString().slice(0,10);
    };

    // fetch events from backend (per-user table) if userId present,
    // otherwise fall back to localStorage as before
    const fetchEvents = async (uid?: number | null) => {
        // prefer explicit uid, fallback to state
        const effectiveUid = uid ?? userId;
        if (effectiveUid) {
            try {
                const res = await fetch(`/api/events?userId=${effectiveUid}`);
                if (!res.ok) {
                    console.error("Failed to fetch events", await res.text());
                    return;
                }
                const rows: { id: number; title: string; event_date: string }[] = await res.json();
                const map: Record<string, Event[]> = {};
                for (const r of rows) {
                    const d = normalizeDate(r.event_date);
                    if (!d) continue;
                    map[d] = map[d] || [];
                    map[d].push({ id: r.id, title: r.title, date: d });
                }
                // merge with existing eventsMap so local-only events are preserved
                setEventsMap(prev => {
                    const merged = { ...(prev || {}) };
                    for (const k of Object.keys(map)) {
                        merged[k] = merged[k] ? [...merged[k], ...map[k]] : map[k];
                    }
                    return merged;
                });
                return;
            } catch (e) {
                console.error("Error fetching events", e);
            }
        }

        // fallback to localStorage
        try {
            const raw = localStorage.getItem("events");
            if (raw) {
                const parsed = JSON.parse(raw);
                setEventsMap(parsed || {});
            }
        } catch (e) {
            console.error("Invalid local events JSON", e);
        }
    };

    // fetch on mount and when userId changes
    useEffect(() => {
        fetchEvents(userId);
    }, [userId]);

    // persist to localStorage only if no userId (server-backed events are authoritative)
    useEffect(() => {
        if (!userId) localStorage.setItem("events", JSON.stringify(eventsMap));
    }, [eventsMap, userId]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthLabel = useMemo(() => {
        return currentMonth.toLocaleString(undefined, { month: "long", year: "numeric" });
    }, [currentMonth]);

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 Sun .. 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = useMemo(() => {
        const arr: (number | null)[] = [];
        for (let i = 0; i < firstDayIndex; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [firstDayIndex, daysInMonth]);

    function formatDateString(d: number) {
        const dd = String(d).padStart(2, "0");
        const mm = String(month + 1).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    }

    const handleDayClick = (day: number | null) => {
        if (!day) return;
        const dateStr = formatDateString(day);
        if (selectedDate === dateStr) {
            // navigate to landing page for that date first
            router.push(`/dashboard/day/${dateStr}/landing`);
        } else {
            setSelectedDate(dateStr);
        }
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };
    const nextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    // add to selectedDate if present, otherwise today.
    // when userId exists, POST to /api/events and update eventsMap with returned insertedId
    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickText.trim()) return;

        const dateStr = selectedDate ?? new Date().toISOString().slice(0, 10); // selected date or today
        const title = quickText.trim();

        if (userId) {
            try {
                const res = await fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, title, date: dateStr }),
                });
                const data = await res.json();
                if (!res.ok) {
                    console.error("Add event failed:", data);
                } else {
                    const newId = data.insertedId ?? Date.now();
                    // insert into eventsMap immediately
                    setEventsMap(prev => {
                        const copy = { ...(prev || {}) };
                        copy[dateStr] = copy[dateStr] ? [...copy[dateStr], { id: newId, title, date: dateStr }] : [{ id: newId, title, date: dateStr }];
                        return copy;
                    });
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            const ev: Event = { id: Date.now(), title, date: dateStr };
            setEventsMap(prev => {
                const copy = { ...(prev || {}) };
                copy[dateStr] = copy[dateStr] ? [...copy[dateStr], ev] : [ev];
                return copy;
            });
        }

        setQuickText("");
    };

    // --- new: send quickText to AI route, parse output into events and add them ---
    const dayNameToIndex: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
    const nextDateForWeekday = (weekday: number) => {
        const base = new Date();
        const diff = (weekday + 7 - base.getDay()) % 7;
        const d = new Date(base);
        d.setDate(base.getDate() + diff);
        return d.toISOString().slice(0,10);
    };

    const parseAiPlanToEvents = (text: string) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsed: { date: string, title: string }[] = [];

        for (const line of lines) {
            const parts = line.split("/");
            if (parts.length < 2) continue;
            const dayLabel = parts[0].slice(0,3);
            const weekday = dayNameToIndex[dayLabel];
            if (weekday === undefined) continue;
            const dateStr = nextDateForWeekday(weekday);

            for (let i = 1; i < parts.length; i++) {
                let seg = parts[i].trim();
                if (!seg) continue;
                seg = seg.replace(/\s*\d{1,2}:\d{2}\s*(am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(am|pm)?/i, "").trim();
                seg = seg.replace(/\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/, "").trim();
                if (!seg) continue;
                parsed.push({ date: dateStr, title: seg });
            }
        }

        return parsed;
    };

    const importAiPlan = async () => {
        if (!quickText.trim()) return;
        try {
            const res = await fetch("/api/ai-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: quickText.trim() }),
            });

            // parse response body (try JSON first, fall back to raw text)
            let payload: any;
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
                payload = await res.json().catch(() => null);
            } else {
                const raw = await res.text().catch(() => null);
                try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
            }

            if (!res.ok) {
                console.error("AI schedule failed:", { status: res.status, body: payload });
                return;
            }

            // normalize various shapes: { text }, { providerBody }, plain string, or nested raw
            const aiText: string =
                typeof payload === "string" ? payload :
                (payload && (payload.text || payload.details || payload.providerBody || payload.raw)) ?
                    (payload.text || payload.details || payload.providerBody || payload.raw) : "";

            if (!aiText || !aiText.trim()) {
                console.error("AI schedule returned empty text:", { payload });
                return;
            }

            const items = parseAiPlanToEvents(aiText);

            

            for (const it of items) {
                if (userId) {
                    try {
                        const r = await fetch("/api/events", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, title: it.title, date: it.date }),
                        });
                        const jr = await r.json().catch(() => ({}));
                        const newId = jr.insertedId ?? Date.now();
                        setEventsMap(prev => {
                            const copy = { ...(prev || {}) };
                            copy[it.date] = copy[it.date] ? [...copy[it.date], { id: newId, title: it.title, date: it.date }] : [{ id: newId, title: it.title, date: it.date }];
                            return copy;
                        });
                    } catch (err) {
                        console.error("failed to POST event", err);
                    }
                } else {
                    const ev: Event = { id: Date.now(), title: it.title, date: it.date };
                    setEventsMap(prev => {
                        const copy = { ...(prev || {}) };
                        copy[it.date] = copy[it.date] ? [...copy[it.date], ev] : [ev];
                        return copy;
                    });
                }
            }
        } catch (err) {
            console.error("importAiPlan unexpected error:", err);
        } finally {
            setQuickText("");
        }
    };
    // --- end new code ---

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white px-6 py-10 text-gray-900">
            <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-4xl font-bold text-black">Calendar</h1>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="px-3 py-1 bg-white rounded shadow text-black">Prev</button>
                        <button onClick={nextMonth} className="px-3 py-1 bg-white rounded shadow text-black">Next</button>
                    </div>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold text-gray-800">{monthLabel}</h2>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center">
                        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                            <div key={d} className="font-medium text-sm text-gray-800">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 mt-2">
                        {cells.map((day, idx) => {
                            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                            const dateStr = day ? formatDateString(day) : "";
                            const hasEvents = day ? !!(eventsMap[dateStr] && eventsMap[dateStr].length) : false;

                            if (!day) {
                                return <div key={idx} className="min-h-[80px] p-2 rounded border-transparent bg-transparent" />;
                            }

                            const isSelected = selectedDate === dateStr;

                            return (
                                <button
                                    type="button"
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    aria-label={`Select ${dateStr}`}
                                    className={`min-h-[80px] p-3 rounded border bg-white text-left hover:shadow-sm focus:shadow-md relative flex flex-col justify-start transition-colors
                                        ${isToday ? "ring-2 ring-yellow-300" : ""} ${isSelected ? "ring-4 ring-yellow-500 bg-yellow-50" : ""}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-lg font-semibold text-black">{day}</span>
                                        {hasEvents && <span className="h-2 w-2 rounded-full bg-yellow-500 mt-1" />}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-700 truncate">
                                        {hasEvents && eventsMap[dateStr] && eventsMap[dateStr][0] && eventsMap[dateStr][0].title}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleQuickAdd} className="mt-6 flex gap-2">
                        <input
                            value={quickText}
                            onChange={e => setQuickText(e.target.value)}
                            placeholder={selectedDate ? `Add event to ${selectedDate}` : "Quick add event to today"}
                            className="flex-1 px-4 py-2 border rounded text-gray-900 placeholder-gray-500"
                        />
                        <button type="submit" className="px-4 py-2 bg-yellow-400 rounded text-black">Add</button>
                        <button type="button" onClick={importAiPlan} className="px-4 py-2 bg-gray-800 text-white rounded">Import AI</button>
                    </form>

                    <p className="mt-3 text-sm text-gray-700">Select a day (click once) then add an event to that day. Click the selected day again to open its page.</p>
                </div>
            </div>
        </div>
    );
}