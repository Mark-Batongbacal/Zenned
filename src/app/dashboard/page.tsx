"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Calendar as CalendarIcon,
    LayoutList,
    FileText,
    ListChecks,
    Settings,
    Search,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Plus
} from "lucide-react";

type Event = {
    id: number;
    title: string;
    date: string;
    time?: string;
    start_time?: string;
    end_time?: string;
    completed?: boolean;
    category?: string;
};

const dayNameToIndex: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

export default function DashboardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const today = new Date();

    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [aiPrompt, setAiPrompt] = useState("");
    const [eventsMap, setEventsMap] = useState<Record<string, Event[]>>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Month");
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isAiModalOpen, setAiModalOpen] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [addEventError, setAddEventError] = useState("");
    const [newEventData, setNewEventData] = useState<{
        title: string;
        date: string;
        startTime: string;
        endTime: string;
        category: string;
        description: string;
    }>({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        category: "Work",
        description: "",
    });

    const [userId, setUserId] = useState<number | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    const cacheKeyForUser = useCallback((uid?: number | null) => (uid ? `events_cache_${uid}` : "events_local"), []);

    const persistEvents = useCallback(
        (map: Record<string, Event[]>, uid?: number | null) => {
            if (typeof window === "undefined") return;
            try {
                const key = cacheKeyForUser(typeof uid === "number" ? uid : userId);
                localStorage.setItem(key, JSON.stringify(map));
                if (!uid) localStorage.setItem("events", JSON.stringify(map));
            } catch (err) {
                console.error("Failed to persist events cache", err);
            }
        },
        [cacheKeyForUser, userId]
    );

    useEffect(() => {
        try {
            const storedId = localStorage.getItem("userId");
            setUserId(storedId ? Number(storedId) : null);
            const storedName = localStorage.getItem("userName");
            setUserName(storedName ? String(storedName) : null);
        } catch (err) {
            console.error("Failed to read user info", err);
            setUserId(null);
            setUserName(null);
        }
    }, []);

    const normalizeDate = (d: any) => {
        if (!d) return "";
        if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d).slice(0, 10);
        return dt.toISOString().slice(0, 10);
    };

    const normalizeCompleted = (val: any) => val === true || val === 1 || val === "1";
    const normalizeCategoryClass = (val?: string) => (val || "work").toLowerCase().replace(/[^a-z]/g, "");

    const castEvent = (raw: any, fallbackDate?: string): Event => {
        const date = normalizeDate(raw?.date ?? raw?.event_date ?? fallbackDate);
        const formatTime = (t?: string | null) => (t ? String(t).slice(0, 5) : undefined);
        return {
            id: Number(raw?.id ?? Date.now()),
            title: String(raw?.title ?? ""),
            date,
            start_time: formatTime(raw?.start_time),
            end_time: formatTime(raw?.end_time),
            completed: normalizeCompleted(raw?.completed),
            category: raw?.category,
        };
    };

    const normalizeEventMap = (data: any): Record<string, Event[]> => {
        const normalized: Record<string, Event[]> = {};
        if (!data || typeof data !== "object") return normalized;
        Object.entries(data).forEach(([key, value]) => {
            if (!Array.isArray(value)) return;
            const list = value.map(item => castEvent(item, key)).filter(ev => !!ev.date);
            if (list.length) normalized[key] = list;
        });
        return normalized;
    };

    useEffect(() => {
        try {
            const key = cacheKeyForUser(userId);
            let raw: string | null = null;
            if (key) raw = localStorage.getItem(key);
            if (!raw && !userId) raw = localStorage.getItem("events");
            if (raw) setEventsMap(normalizeEventMap(JSON.parse(raw)));
        } catch (err) {
            console.error("Failed to hydrate events cache", err);
        }
    }, [userId, cacheKeyForUser]);

    const fetchEvents = useCallback(async (uid?: number | null) => {
        const effectiveUid = typeof uid === "number" ? uid : userId;
        if (effectiveUid) {
            try {
                const res = await fetch(`/api/events?userId=${effectiveUid}`);
                if (!res.ok) {
                    console.error("Failed to fetch events", await res.text());
                    return;
                }
                const rows: any[] = await res.json();
                const map: Record<string, Event[]> = {};
                for (const r of rows) {
                    const ev = castEvent(r);
                    if (!ev.date) continue;
                    map[ev.date] = map[ev.date] ? [...map[ev.date], ev] : [ev];
                }
                persistEvents(map, effectiveUid);
                setEventsMap(map);
                return;
            } catch (e) {
                console.error("Error fetching events", e);
            }
        }
        try {
            const raw = localStorage.getItem("events");
            if (raw) setEventsMap(normalizeEventMap(JSON.parse(raw)));
        } catch (e) {
            console.error("Invalid local events JSON", e);
        }
    }, [userId, persistEvents]);

    useEffect(() => {
        if (pathname === "/dashboard") fetchEvents(userId);
    }, [pathname, userId, fetchEvents]);

    useEffect(() => {
        if (!userId) localStorage.setItem("events", JSON.stringify(eventsMap));
    }, [eventsMap, userId]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthLabel = useMemo(() => currentMonth.toLocaleString(undefined, { month: "long", year: "numeric" }), [currentMonth]);
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = useMemo(() => {
        const arr: (number | null)[] = [];
        for (let i = 0; i < firstDayIndex; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [firstDayIndex, daysInMonth]);

    const formatDateString = (d: number) => {
        const dd = String(d).padStart(2, "0");
        const mm = String(month + 1).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    };

    const selectedOrToday = () => selectedDate ?? new Date().toISOString().slice(0, 10);

    const handleDayClick = (day: number | null) => {
        if (!day) return;
        const dateStr = formatDateString(day);
        if (selectedDate === dateStr) {
            router.push(`/dashboard/day/${dateStr}/landing`);
        } else {
            setSelectedDate(dateStr);
        }
    };

    const shiftWeek = (direction: -1 | 1) => {
        const anchor = selectedOrToday();
        const base = new Date(anchor);
        base.setDate(base.getDate() + direction * 7);
        const newDate = base.toISOString().slice(0, 10);
        setSelectedDate(newDate);
        setCurrentMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    };

    const prevPeriod = () => {
        if (viewMode === "Week") shiftWeek(-1);
        else {
            setCurrentMonth(new Date(year, month - 1, 1));
            setSelectedDate(null);
        }
    };
    const nextPeriod = () => {
        if (viewMode === "Week") shiftWeek(1);
        else {
            setCurrentMonth(new Date(year, month + 1, 1));
            setSelectedDate(null);
        }
    };

    const handleViewModeChange = (mode: "Day" | "Week" | "Month") => {
        if (mode === "Day") {
            router.push(`/dashboard/day/${selectedOrToday()}/landing`);
            return;
        }
        setViewMode(mode);
        if (mode === "Week") {
            const current = selectedOrToday();
            const base = new Date(current);
            const diff = base.getDay();
            const start = new Date(base);
            start.setDate(base.getDate() - diff);
            setSelectedDate(start.toISOString().slice(0, 10));
        }
    };

    const addEventToState = useCallback(
        (dateStr: string, event: Event) => {
            setEventsMap(prev => {
                const copy = { ...(prev || {}) };
                const normalizedEvent = { ...event, completed: normalizeCompleted(event.completed) };
                copy[dateStr] = copy[dateStr] ? [...copy[dateStr], normalizedEvent] : [normalizedEvent];
                persistEvents(copy, userId);
                return copy;
            });
        },
        [persistEvents, userId]
    );

    const toggleEventCompletion = useCallback(
        (eventId: number, dateHint?: string, currentCompleted?: boolean) => {
            const nextCompleted = !currentCompleted;
            setEventsMap(prev => {
                const dateKey = dateHint ?? Object.keys(prev).find(key => prev[key].some(ev => ev.id === eventId));
                if (!dateKey) return prev;
                const copy = { ...(prev || {}) };
                copy[dateKey] = copy[dateKey].map(ev => (ev.id === eventId ? { ...ev, completed: nextCompleted } : ev));
                persistEvents(copy, userId);
                return copy;
            });
            if (userId) {
                fetch("/api/events", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, id: eventId, completed: nextCompleted })
                }).catch(err => console.error("Failed to toggle completion", err));
            }
        },
        [persistEvents, userId]
    );

    const nextDateForWeekday = (weekday: number) => {
        const base = new Date();
        const diff = (weekday + 7 - base.getDay()) % 7;
        const d = new Date(base);
        d.setDate(base.getDate() + diff);
        return d.toISOString().slice(0, 10);
    };

    const getMinutes = (ev: Event) => {
        const raw = ev.start_time || ev.time;
        if (!raw) return Number.MAX_SAFE_INTEGER;
        const [h, m] = raw.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
        return h * 60 + m;
    };

    const sortEventsForDisplay = (events: Event[]) => {
        return [...events].sort((a, b) => getMinutes(a) - getMinutes(b));
    };

    const parseAiPlanToEvents = (text: string) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsed: { date: string; title: string; start_time: string; end_time: string }[] = [];
        for (const line of lines) {
            const parts = line.split("/");
            if (parts.length < 2) continue;
            const dayLabel = parts[0].slice(0, 3);
            const weekday = dayNameToIndex[dayLabel];
            if (weekday === undefined) continue;
            const dateStr = nextDateForWeekday(weekday);
            for (let i = 1; i < parts.length; i++) {
                const seg = parts[i].trim();
                if (!seg) continue;
                const match = seg.match(/(.+?)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
                if (!match) continue;
                const [, title, start_time, end_time] = match;
                parsed.push({ date: dateStr, title: title.trim(), start_time, end_time });
            }
        }
        return parsed;
    };

    const closeAddModal = () => setAddModalOpen(false);
    const closeAiModal = () => {
        setAiModalOpen(false);
        setAiPrompt("");
    };

    const openAddModal = () => {
        setAddEventError("");
        setNewEventData({
            title: "",
            date: selectedOrToday(),
            startTime: "",
            endTime: "",
            category: "Work",
            description: "",
        });
        setAddModalOpen(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddEventError("");
        if (!newEventData.title.trim() || !newEventData.date) {
            setAddEventError("Title and date are required.");
            return;
        }

        const payload = {
            title: newEventData.title.trim(),
            date: newEventData.date,
            startTime: newEventData.startTime || null,
            endTime: newEventData.endTime || null,
            category: newEventData.category,
            description: newEventData.description,
        };

        try {
            if (userId) {
                const res = await fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, ...payload }),
                });
                const data = await res.json();
                if (!res.ok) {
                    setAddEventError(data.error || "Failed to add event");
                    return;
                }
                const newId = data.insertedId ?? Date.now();
                addEventToState(payload.date, {
                    id: newId,
                    title: payload.title,
                    date: payload.date,
                    start_time: payload.startTime ?? undefined,
                    end_time: payload.endTime ?? undefined,
                    completed: false,
                    category: payload.category,
                });
            } else {
                addEventToState(payload.date, {
                    id: Date.now(),
                    title: payload.title,
                    date: payload.date,
                    start_time: payload.startTime ?? undefined,
                    end_time: payload.endTime ?? undefined,
                    completed: false,
                    category: payload.category,
                });
            }
            closeAddModal();
        } catch (err) {
            console.error("Failed to save event", err);
            setAddEventError("Something went wrong. Please try again.");
        }
    };

    const importAiPlan = async () => {
        if (!aiPrompt.trim()) return false;
        setAiProcessing(true);
        try {
            const res = await fetch("/api/ai-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
            });
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
                return false;
            }
            const aiText: string =
                typeof payload === "string" ? payload :
                (payload && (payload.text || payload.details || payload.providerBody || payload.raw)) ?
                    (payload.text || payload.details || payload.providerBody || payload.raw) : "";
            if (!aiText || !aiText.trim()) {
                console.error("AI schedule returned empty text:", { payload });
                return false;
            }
            const items = parseAiPlanToEvents(aiText);
            for (const it of items) {
                if (userId) {
                    try {
                        const r = await fetch("/api/events", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, title: it.title, date: it.date, startTime: it.start_time, endTime: it.end_time })
                        });
                        const jr = await r.json().catch(() => ({}));
                        const newId = jr.insertedId ?? Date.now();
                        addEventToState(it.date, { id: newId, title: it.title, date: it.date, start_time: it.start_time, end_time: it.end_time, completed: false });
                    } catch (err) {
                        console.error("failed to POST event", err);
                    }
                } else {
                    addEventToState(it.date, { id: Date.now(), title: it.title, date: it.date, start_time: it.start_time, end_time: it.end_time, completed: false });
                }
            }
            closeAiModal();
            return true;
        } catch (err) {
            console.error("importAiPlan unexpected error:", err);
            return false;
        } finally {
            setAiProcessing(false);
        }
    };

    const upcomingEvents = useMemo(() => {
        const list: { dateStr: string; event: Event; dateObj: Date }[] = [];
        Object.entries(eventsMap || {}).forEach(([d, evs]) => {
            evs.forEach((ev) => {
                const dateObj = new Date(`${d}T${ev.start_time || "12:00"}:00`);
                if (!Number.isNaN(dateObj.getTime())) list.push({ dateStr: d, event: ev, dateObj });
            });
        });
        return list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).slice(0, 6);
    }, [eventsMap]);

    const formatUpcomingDate = (d: string) => {
        const dateObj = new Date(d);
        if (Number.isNaN(dateObj.getTime())) return d;
        return dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    const weekDates = useMemo(() => {
        if (viewMode !== "Week") return [];
        const anchor = selectedDate ?? selectedOrToday();
        const start = new Date(anchor);
        const diff = start.getDay();
        start.setDate(start.getDate() - diff);
        return Array.from({ length: 7 }).map((_, idx) => {
            const d = new Date(start);
            d.setDate(start.getDate() + idx);
            return d.toISOString().slice(0, 10);
        });
    }, [viewMode, selectedDate]);

    const weekLabel = useMemo(() => {
        if (viewMode !== "Week" || weekDates.length === 0) return "";
        const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
        const start = formatter.format(new Date(weekDates[0]));
        const end = formatter.format(new Date(weekDates[6]));
        return `${start} – ${end}`;
    }, [viewMode, weekDates]);

    return (
        <>
        <div className="body-index">
            <div className="app-container">
                <aside className="sidebar">
                    <button
                        onClick={() => router.push("/")}
                        className="logo hover-lift"
                        type="button"
                    >
                        <div className="logo-icon">
                            <CalendarIcon size={18} />
                        </div>
                        <h1>Zenned</h1>
                    </button>

                    <div className="search-container">
                        <div className="search-box">
                            <Search size={16} className="text-[var(--text-light)] mr-3" />
                            <input className="search-input" placeholder="Search events..." />
                        </div>
                    </div>

                    <ul className="nav-links">
                        <li>
                            <button className="active" type="button">
                                <CalendarIcon size={18} /> <span>Calendar</span>
                            </button>
                        </li>
                        <li>
                            <button type="button">
                                <ListChecks size={18} /> <span>Tasks</span>
                            </button>
                        </li>
                        <li>
                            <button type="button">
                                <FileText size={18} /> <span>Notes</span>
                            </button>
                        </li>
                        <li>
                            <button type="button">
                                <LayoutList size={18} /> <span>Events</span>
                            </button>
                        </li>
                        <li>
                            <button type="button">
                                <Settings size={18} /> <span>Settings</span>
                            </button>
                        </li>
                    </ul>

                    <div className="user-section">
                        <div className="user-profile">
                            <div className="user-avatar">{userName ? userName.slice(0, 2).toUpperCase() : "YOU"}</div>
                            <div className="user-info">
                                <h3>{userName || "Welcome back"}</h3>
                                <p>Zen mode on</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="main-content">
                    <div className="calendar-container">
                        <div className="calendar-controls">
                            <div className="month-nav">
                                <button className="nav-btn hover-lift" onClick={prevPeriod}>
                                    <ChevronLeft size={18} />
                                </button>
                                <h3>{viewMode === "Week" && weekLabel ? weekLabel : monthLabel}</h3>
                                <button className="nav-btn hover-lift" onClick={nextPeriod}>
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="view-controls">
                                {(["Day","Week","Month"] as const).map(mode => (
                                    <span
                                        key={mode}
                                        className={`view-option hover-lift ${(viewMode === mode && mode !== "Day") ? "active" : ""}`}
                                        onClick={() => handleViewModeChange(mode)}
                                    >
                                        {mode}
                                    </span>
                                ))}
                            </div>

                            <div className="calendar-actions">
                                <button
                                    className="btn btn-primary hover-lift"
                                    onClick={() => setAiModalOpen(true)}
                                    disabled={aiProcessing}
                                >
                                    <Sparkles size={16} /> {aiProcessing ? "Processing..." : "Import AI"}
                                </button>
                                <button className="btn btn-secondary hover-lift" onClick={openAddModal}>
                                    <Plus size={16} /> Add Event
                                </button>
                            </div>
                        </div>

                        <div className="calendar-layout">
                            <div className="calendar-main">
                                {viewMode === "Month" && (
                                    <>
                                        <div className="calendar">
                                            <div className="calendar-header">
                                                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                                                    <div key={d}>{d}</div>
                                                ))}
                                            </div>
                                            <div className="calendar-grid">
                                                {cells.map((day, idx) => {
                                                if (!day) return <div key={idx} className="calendar-day other-month" />;
                                                const dateStr = formatDateString(day);
                                                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                                const eventsForDay = sortEventsForDisplay(eventsMap[dateStr] || []);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`calendar-day ${isToday ? "today" : ""}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => handleDayClick(day)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleDayClick(day)}
                                                        >
                                                            <div className="day-header">
                                                                <span className="day-number">{day}</span>
                                                                {eventsForDay.length > 0 && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
                                                            </div>
                                                            <div className="events-container">
                                                                {eventsForDay.map(ev => (
                                                                    <div
                                                                        key={ev.id}
                                                                        className={`event category-${normalizeCategoryClass(ev.category)} ${ev.completed ? "line-through opacity-60" : ""}`}
                                                                    >
                                                                        {ev.title}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <p className="mt-8 text-sm text-gray-700">
                                            Select a day once to focus it. Click again to open its timeline page, or use “Add Event” / “Import AI” for quick scheduling.
                                        </p>
                                    </>
                                )}

                                {viewMode === "Week" && (
                                    <div className="mt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                                            {weekDates.map(dateStr => {
                                                const eventsForDay = sortEventsForDisplay(eventsMap[dateStr] || []);
                                                const label = new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
                                                return (
                                                    <button
                                                        key={dateStr}
                                                        type="button"
                                                        onClick={() => router.push(`/dashboard/day/${dateStr}/landing`)}
                                                        className="bg-[#fdfaf3] rounded-xl border border-yellow-100 p-3 text-left hover:shadow transition hover-lift"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-gray-900">{label}</span>
                                                            {eventsForDay.length > 0 && <span className="text-xs text-yellow-600">{eventsForDay.length}</span>}
                                                        </div>
                                                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                                            {eventsForDay.map(ev => (
                                                                <div
                                                                    key={ev.id}
                                                                    className={`text-xs px-2 py-1 rounded border ${ev.completed ? "bg-white border-gray-200 line-through text-gray-400" : "bg-white border-yellow-100 text-gray-800"}`}
                                                                >
                                                                    {ev.title}
                                                                </div>
                                                            ))}
                                                            {eventsForDay.length === 0 && <p className="text-xs text-gray-500">No events</p>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <aside className="upcoming-events-panel">
                                <div className="upcoming-events-header">
                                    <h3>Upcoming Events</h3>
                                </div>
                                <div className="upcoming-events-content">
                                    {upcomingEvents.length === 0 && <p className="text-sm text-gray-600">No events yet. Add one to get started!</p>}
                                    {upcomingEvents.map(({ dateStr, event }) => {
                                        const isDone = event.completed;
                                        return (
                                            <div
                                                key={event.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => router.push(`/dashboard/day/${dateStr}/landing`)}
                                                onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/day/${dateStr}/landing`)}
                                                className={`upcoming-event cursor-pointer ${isDone ? "opacity-60" : ""}`}
                                            >
                                                <div className="event-time">
                                                    {formatUpcomingDate(dateStr)} {event.start_time ? `• ${event.start_time}` : ""}
                                                </div>
                                                <div className={`event-title ${isDone ? "line-through text-gray-500" : ""}`}>{event.title}</div>
                                                <div className={`event-category category-${normalizeCategoryClass(event.category)}`}>
                                                    {event.category || "Work"}
                                                </div>
                                                <div className="mt-3 flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleEventCompletion(event.id, dateStr, event.completed);
                                                        }}
                                                    >
                                                        {isDone ? "Undo" : "Mark done"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>

        {isAddModalOpen && (
            <div className="modal show" onClick={(e) => e.currentTarget === e.target && closeAddModal()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Add Event</h2>
                        <button className="close-btn" onClick={closeAddModal}>×</button>
                    </div>
                    <form onSubmit={handleSaveEvent}>
                        <div className="form-group">
                            <label>Event Title</label>
                            <input
                                className="form-control"
                                type="text"
                                value={newEventData.title}
                                onChange={e => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    className="form-control"
                                    type="date"
                                    value={newEventData.date}
                                    onChange={e => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Time</label>
                                <input
                                    className="form-control"
                                    type="time"
                                    value={newEventData.startTime}
                                    onChange={e => setNewEventData(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>End Time</label>
                                <input
                                    className="form-control"
                                    type="time"
                                    value={newEventData.endTime}
                                    onChange={e => setNewEventData(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <div className="mt-1 relative">
                                    <select
                                        className="form-control"
                                        value={newEventData.category}
                                        onChange={e => setNewEventData(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        <option>Work</option>
                                        <option>Personal</option>
                                        <option>Meeting</option>
                                        <option>Health</option>
                                        <option>Social</option>
                                        <option>School</option>
                                        <option>Occasion</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                value={newEventData.description}
                                onChange={e => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        {addEventError && <p className="text-sm text-red-500">{addEventError}</p>}
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Event</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {isAiModalOpen && (
            <div className="modal show" onClick={(e) => e.currentTarget === e.target && closeAiModal()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Import Events with AI</h2>
                        <button className="close-btn" onClick={closeAiModal}>×</button>
                    </div>
                    <div className="form-group">
                        <label>Describe the events you want to add</label>
                        <textarea
                            className="form-control"
                            rows={6}
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeAiModal}>Cancel</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={importAiPlan}
                            disabled={aiProcessing}
                        >
                            {aiProcessing ? "Processing..." : "Process"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
