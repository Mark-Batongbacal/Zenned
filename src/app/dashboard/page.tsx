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
    ChevronDown,
    Plus,
    Sparkles
} from "lucide-react";

type Event = {
    id: number;
    title: string;
    date: string;
    time?: string;
    start_time?: string;
    end_time?: string;
    completed?: boolean;
};

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

    // load persisted user details once we're on the client
    const [userId, setUserId] = useState<number | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    const cacheKeyForUser = useCallback((uid?: number | null) => {
        return uid ? `events_cache_${uid}` : "events_local";
    }, []);

    const persistEvents = useCallback(
        (map: Record<string, Event[]>, uid?: number | null) => {
            if (typeof window === "undefined") return;
            try {
                const key = cacheKeyForUser(typeof uid === "number" ? uid : userId);
                localStorage.setItem(key, JSON.stringify(map));
                if (!uid) {
                    localStorage.setItem("events", JSON.stringify(map));
                }
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
            console.error("Failed to read user info from storage", err);
            setUserId(null);
            setUserName(null);
        }
    }, []);

    useEffect(() => {
        try {
            const key = cacheKeyForUser(userId);
            let raw: string | null = null;
            if (key) raw = localStorage.getItem(key);
            if (!raw && !userId) {
                raw = localStorage.getItem("events");
            }
            if (raw) {
                const parsed = JSON.parse(raw);
                setEventsMap(normalizeEventMap(parsed));
            }
        } catch (err) {
            console.error("Failed to hydrate events cache", err);
        }
    }, [userId, cacheKeyForUser]);

    const normalizeDate = (d: any) => {
        if (!d) return "";
        if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d).slice(0,10);
        return dt.toISOString().slice(0,10);
    };
    const normalizeCompleted = (val: any) => val === true || val === 1 || val === "1";

    const castEvent = (raw: any, fallbackDate?: string): Event => {
        const date = normalizeDate(raw?.date ?? raw?.event_date ?? fallbackDate);
        const formatTime = (t?: string | null) => (t ? String(t).slice(0,5) : undefined);
        return {
            id: Number(raw?.id ?? Date.now()),
            title: String(raw?.title ?? ""),
            date,
            start_time: formatTime(raw?.start_time),
            end_time: formatTime(raw?.end_time),
            completed: normalizeCompleted(raw?.completed),
        };
    };

    const normalizeEventMap = (data: any): Record<string, Event[]> => {
        const normalized: Record<string, Event[]> = {};
        if (!data || typeof data !== "object") return normalized;
        Object.entries(data).forEach(([key, value]) => {
            if (!Array.isArray(value)) return;
            const list = value
                .map((item) => castEvent(item, key))
                .filter((ev) => !!ev.date);
            if (list.length) normalized[key] = list;
        });
        return normalized;
    };

    // fetch events from backend (per-user table) if userId present,
    // otherwise fall back to localStorage as before
    const fetchEvents = useCallback(async (uid?: number | null) => {
        // prefer explicit uid, fallback to state
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

        // fallback to localStorage
        try {
            const raw = localStorage.getItem("events");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed) setEventsMap(normalizeEventMap(parsed));
            }
        } catch (e) {
            console.error("Invalid local events JSON", e);
        }
    }, [userId, persistEvents]);

    // fetch when user or route changes back to dashboard
    useEffect(() => {
        if (pathname === "/dashboard") {
            fetchEvents(userId);
        }
    }, [pathname, userId, fetchEvents]);

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

    const shiftWeek = (direction: -1 | 1) => {
        const anchor = selectedOrToday();
        const base = new Date(anchor);
        base.setDate(base.getDate() + direction * 7);
        const newDate = base.toISOString().slice(0, 10);
        setSelectedDate(newDate);
        setCurrentMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    };

    const prevPeriod = () => {
        if (viewMode === "Week") {
            shiftWeek(-1);
        } else {
            setCurrentMonth(new Date(year, month - 1, 1));
            setSelectedDate(null);
        }
    };
    const nextPeriod = () => {
        if (viewMode === "Week") {
            shiftWeek(1);
        } else {
            setCurrentMonth(new Date(year, month + 1, 1));
            setSelectedDate(null);
        }
    };

    // Parse AI response into events and add them
    const dayNameToIndex: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
    const nextDateForWeekday = (weekday: number) => {
        const base = new Date();
        const diff = (weekday + 7 - base.getDay()) % 7;
        const d = new Date(base);
        d.setDate(base.getDate() + diff);
        return d.toISOString().slice(0,10);
    };

    const selectedOrToday = () => selectedDate ?? new Date().toISOString().slice(0, 10);

    const handleViewModeChange = (mode: "Day" | "Week" | "Month") => {
        if (mode === "Day") {
            const target = selectedOrToday();
            router.push(`/dashboard/day/${target}/landing`);
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
                const dateKey =
                    dateHint ??
                    Object.keys(prev).find(key => prev[key].some(ev => ev.id === eventId));
                if (!dateKey) return prev;
                const copy = { ...(prev || {}) };
                copy[dateKey] = copy[dateKey].map(ev =>
                    ev.id === eventId ? { ...ev, completed: nextCompleted } : ev
                );
                persistEvents(copy, userId);
                return copy;
            });
            if (userId) {
                fetch("/api/events", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, id: eventId, completed: nextCompleted }),
                }).catch(err => console.error("Failed to toggle completion", err));
            }
        },
        [persistEvents, userId]
    );

    const parseAiPlanToEvents = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: { date: string, title: string, start_time: string, end_time: string }[] = [];

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

            // Match "Title (HH:MM-HH:MM)"
            const match = seg.match(/(.+?)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
            if (!match) continue;

            const [, title, start_time, end_time] = match;
            parsed.push({
                date: dateStr,
                title: title.trim(),
                start_time,
                end_time
            });
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
                });
            } else {
                const ev: Event = {
                    id: Date.now(),
                    title: payload.title,
                    date: payload.date,
                    start_time: payload.startTime ?? undefined,
                    end_time: payload.endTime ?? undefined,
                    completed: false,
                };
                addEventToState(payload.date, ev);
            }
            closeAddModal();
        } catch (err) {
            console.error("Failed to save event", err);
            setAddEventError("Something went wrong. Please try again.");
        }
    };

    const importAiPlan = async () => {
        if (!aiPrompt.trim()) return false;
        try {
            const res = await fetch("/api/ai-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
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
                            body: JSON.stringify({ 
                                userId, 
                                title: it.title, 
                                date: it.date,
                                startTime: it.start_time,
                                endTime: it.end_time
                            }),
                        });
                        const jr = await r.json().catch(() => ({}));
                        const newId = jr.insertedId ?? Date.now();
                        addEventToState(it.date, { 
                            id: newId, 
                            title: it.title, 
                            date: it.date,
                            start_time: it.start_time,
                            end_time: it.end_time,
                            completed: false,
                        });
                    } catch (err) {
                        console.error("failed to POST event", err);
                    }
                
                    } else {
                    const ev: Event = { 
                        id: Date.now(), 
                        title: it.title, 
                        date: it.date,
                        start_time: it.start_time,
                        end_time: it.end_time,
                        completed: false,
                    };
                    addEventToState(it.date, ev);
                }
            }
            closeAiModal();
            return true;
        } catch (err) {
            console.error("importAiPlan unexpected error:", err);
            return false;
        } finally {
        }
    };
    // --- end new code ---

    const navItems = [
        { label: "Calendar", icon: CalendarIcon, active: true },
        { label: "Tasks", icon: ListChecks },
        { label: "Notes", icon: FileText },
        { label: "Events", icon: LayoutList },
        { label: "Settings", icon: Settings },
    ];

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
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
            <div className="flex min-h-screen">
                <aside className="w-72 bg-[var(--accent)] border-r border-[rgba(255,179,0,0.3)] flex flex-col justify-between py-8 px-6">
                    <div>
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-3 mb-8 transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold shadow">
                                Z
                            </div>
                            <span className="text-xl font-bold text-[var(--text)]">Zenned</span>
                        </button>
                        <div className="relative">
                            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-3" />
                            <input
                                placeholder="Search events..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 border border-[rgba(255,179,0,0.4)] placeholder-[var(--text-light)] focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none"
                            />
                        </div>
                        <nav className="mt-8 space-y-2">
                            {navItems.map(({ label, icon: Icon, active }) => (
                                <button
                                    key={label}
                                    className={`flex items-center w-full gap-3 px-3 py-3 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 ${
                                        active ? "bg-[var(--primary)] text-[var(--text)] font-semibold shadow-sm" : "text-[var(--text-light)] hover:bg-[var(--accent)]"
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="pt-6 border-t border-[rgba(255,179,0,0.3)] flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[var(--primary)] text-white font-bold flex items-center justify-center">
                            {userName ? userName.slice(0, 2).toUpperCase() : "YOU"}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-[var(--text)]">{userName || "Welcome back"}</div>
                            <div className="text-xs text-[var(--text-light)]">Zen mode on</div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 p-6 flex gap-6">
                    <section className="flex-1 bg-white rounded-2xl shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                    <button
                                    onClick={prevPeriod}
                                    className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-gray-800 hover:bg-yellow-200 transition-transform duration-200 hover:-translate-y-0.5"
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {viewMode === "Week" && weekLabel ? weekLabel : monthLabel}
                                </h2>
                                <button
                                    onClick={nextPeriod}
                                    className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-gray-800 hover:bg-yellow-200 transition-transform duration-200 hover:-translate-y-0.5"
                                    aria-label="Next month"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {(["Day", "Week", "Month"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => handleViewModeChange(mode)}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 ${
                                            viewMode === mode
                                                ? "bg-yellow-400 text-gray-900 shadow-sm"
                                                : "bg-yellow-100 text-gray-700 hover:bg-yellow-200"
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAiPrompt("");
                                        setAiModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-gray-900 rounded-lg font-semibold hover:bg-yellow-200 transition-transform duration-200 hover:-translate-y-0.5"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Import AI
                                </button>
                                <button
                                    type="button"
                                    onClick={openAddModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold shadow hover:bg-yellow-500 transition-transform duration-200 hover:-translate-y-0.5"
                                >
                                    <Plus className="h-4 w-4" /> Add Event
                                </button>
                            </div>
                        </div>

                        {viewMode === "Month" && (
                        <div className="mt-6">
                            <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-700">
                                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                                    <div key={d} className="py-2">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {cells.map((day, idx) => {
                                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                    const dateStr = day ? formatDateString(day) : "";
                                    const hasEvents = day ? !!(eventsMap[dateStr] && eventsMap[dateStr].length) : false;

                                    if (!day) {
                                        return <div key={idx} className="min-h-[110px] rounded-xl bg-transparent" />;
                                    }

                                    const isSelected = selectedDate === dateStr;

                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => handleDayClick(day)}
                                            aria-label={`Select ${dateStr}`}
                                            className={`min-h-[110px] p-3 rounded-xl text-left border transition bg-[#fdfaf3] hover:shadow-sm transform transition-transform duration-200 hover:-translate-y-0.5 ${
                                                isSelected ? "border-yellow-400 ring-2 ring-yellow-300 bg-yellow-50" : "border-yellow-100"
                                            } ${isToday ? "ring-2 ring-yellow-200" : ""}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <span className="text-lg font-semibold text-gray-900">{day}</span>
                                                {hasEvents && <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 mt-1" />}
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                {hasEvents && eventsMap[dateStr]?.slice(0, 2).map((ev, idx) => (
                                                    <div
                                                        key={`${dateStr}-${ev.id}-${idx}`}
                                                        className={`text-xs bg-white rounded-md px-2 py-1 border border-yellow-100 truncate ${
                                                            ev.completed ? "line-through text-gray-400" : "text-gray-800"
                                                        }`}
                                                    >
                                                        {ev.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        )}
                        {viewMode === "Month" && (
                            <p className="mt-8 text-sm text-gray-700">
                                Select a day once to focus it. Click again to open its timeline page, or use “Add Event” / “Import AI” for quick scheduling.
                            </p>
                        )}
                        {viewMode === "Week" && (
                            <div className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                                    {weekDates.map(dateStr => {
                                        const eventsForDay = eventsMap[dateStr] || [];
                                        const dateObj = new Date(dateStr);
                                        const label = dateObj.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
                                        return (
                                            <button
                                                key={dateStr}
                                                type="button"
                                                onClick={() => router.push(`/dashboard/day/${dateStr}/landing`)}
                                                className="bg-[#fdfaf3] rounded-xl border border-yellow-100 p-3 text-left hover:shadow transition"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-900">{label}</span>
                                                    {eventsForDay.length > 0 && <span className="text-xs text-yellow-600">{eventsForDay.length}</span>}
                                                </div>
                                                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                                    {eventsForDay.map(ev => (
                                                        <div
                                                            key={ev.id}
                                                            className={`text-xs px-2 py-1 rounded border ${
                                                                ev.completed
                                                                    ? "bg-white border-gray-200 line-through text-gray-400"
                                                                    : "bg-white border-yellow-100 text-gray-800"
                                                            }`}
                                                        >
                                                            {ev.start_time ? `${ev.start_time} ` : ""}{ev.title}
                                                        </div>
                                                    ))}
                                                    {eventsForDay.length === 0 && (
                                                        <p className="text-xs text-gray-500">No events</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="w-80 bg-white rounded-2xl shadow-md p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                            <button className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-gray-800 transition-transform duration-200 hover:-translate-y-0.5">
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-auto">
                            {upcomingEvents.length === 0 && (
                                <p className="text-sm text-gray-600">No events yet. Add one to get started!</p>
                            )}
                            {upcomingEvents.map(({ dateStr, event }) => {
                                const isDone = event.completed;
                                return (
                                    <div
                                        key={event.id}
                                        className={`w-full text-left border border-yellow-100 rounded-xl p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus-within:outline-none ${
                                            isDone ? "bg-white opacity-70" : "bg-[#fff7e6]"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/dashboard/day/${dateStr}/landing`)}
                                            className="w-full text-left"
                                        >
                                            <div className="text-xs font-semibold text-yellow-700 flex items-center justify-between gap-2">
                                                <span>
                                                    {formatUpcomingDate(dateStr)}{" "}
                                                    {event.start_time ? `• ${event.start_time}` : ""}
                                                </span>
                                                {isDone && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">
                                                        Done
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`mt-1 text-sm font-semibold truncate ${isDone ? "line-through text-gray-500" : "text-gray-900"}`}>
                                                {event.title}
                                            </div>
                                        </button>
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="inline-flex items-center px-2 py-1 text-[11px] rounded-full bg-white border border-yellow-200 text-yellow-800">
                                                {viewMode}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleEventCompletion(event.id, dateStr, event.completed)}
                                                className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                                                    isDone
                                                        ? "border-green-400 text-green-700 bg-green-50"
                                                        : "border-yellow-300 text-yellow-700 bg-yellow-50"
                                                }`}
                                            >
                                                {isDone ? "Undo" : "Mark done"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                </main>
            </div>
        </div>
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 py-6 z-50" onClick={closeAddModal}>
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                            <CalendarIcon className="h-5 w-5 text-yellow-500" />
                            Add Event
                        </div>
                        <button onClick={closeAddModal} className="text-gray-500 hover:text-gray-700">
                            ×
                        </button>
                    </div>
                    <form className="space-y-4" onSubmit={handleSaveEvent}>
                        <div>
                            <label className="text-sm font-semibold text-gray-800">Event Title</label>
                            <input
                                type="text"
                                className="mt-1 w-full px-4 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                placeholder="Enter title"
                                value={newEventData.title}
                                onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-800">Date</label>
                                <input
                                    type="date"
                                    className="mt-1 w-full px-4 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    value={newEventData.date}
                                    onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-800">Start Time</label>
                                <input
                                    type="time"
                                    className="mt-1 w-full px-4 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    value={newEventData.startTime}
                                    onChange={(e) => setNewEventData(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-800">End Time</label>
                                <input
                                    type="time"
                                    className="mt-1 w-full px-4 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    value={newEventData.endTime}
                                    onChange={(e) => setNewEventData(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-800">Category</label>
                                <div className="mt-1 relative">
                                    <select
                                        className="block w-full appearance-none bg-white px-4 py-2.5 border border-[rgba(74,52,38,0.15)] rounded-lg focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none text-[var(--text)]"
                                        value={newEventData.category}
                                        onChange={(e) => setNewEventData(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        <option>Work</option>
                                        <option>Personal</option>
                                        <option>Meeting</option>
                                        <option>Health</option>
                                        <option>Social</option>
                                        <option>School</option>
                                        <option>Occasion</option>
                                    </select>
                                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--text-light)]">v</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-800">Description</label>
                            <textarea
                                className="mt-1 w-full px-4 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                rows={3}
                                placeholder="Add any notes"
                                value={newEventData.description}
                                onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        {addEventError && <p className="text-sm text-red-500">{addEventError}</p>}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="px-4 py-2 rounded-full bg-yellow-100 text-gray-800 font-semibold hover:bg-yellow-200 transition-transform duration-200 hover:-translate-y-0.5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 rounded-full bg-yellow-400 text-gray-900 font-semibold shadow hover:bg-yellow-500 transition-transform duration-200 hover:-translate-y-0.5"
                            >
                                Save Event
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {isAiModalOpen && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 py-6 z-50" onClick={closeAiModal}>
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">Import Events with AI</h3>
                        <button onClick={closeAiModal} className="text-gray-500 hover:text-gray-700">
                            ×
                        </button>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">Describe the events you want to add</p>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            await importAiPlan();
                        }}
                        className="space-y-4"
                    >
                        <textarea
                            className="w-full px-4 py-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none min-h-[140px]"
                            placeholder="e.g., Meeting with marketing team next Tuesday at 2 PM"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            required
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeAiModal}
                                className="px-4 py-2 rounded-full bg-yellow-100 text-gray-800 font-semibold hover:bg-yellow-200 transition-transform duration-200 hover:-translate-y-0.5"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!aiPrompt.trim()}
                                className="px-5 py-2 rounded-full bg-yellow-400 text-gray-900 font-semibold shadow hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0"
                            >
                                Process
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
}
