"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  useDraggable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Trash2, CheckCircle2, Circle } from "lucide-react";

const MINUTES_IN_DAY = 24 * 60;
const SLOT_MINUTES = 15;
const TIMELINE_EVENT_OFFSET = 120;

const snapToSlot = (value: number) => Math.round(value / SLOT_MINUTES) * SLOT_MINUTES;

const timeToMinutes = (time?: string) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const clamped = Math.min(Math.max(minutes, 0), MINUTES_IN_DAY);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const clampAndSnapRange = (start: number, end: number) => {
  let nextStart = Math.max(0, Math.min(start, MINUTES_IN_DAY - SLOT_MINUTES));
  let nextEnd = Math.max(nextStart + SLOT_MINUTES, Math.min(end, MINUTES_IN_DAY));

  nextStart = snapToSlot(nextStart);
  nextEnd = snapToSlot(nextEnd);

  if (nextEnd > MINUTES_IN_DAY) {
    nextEnd = MINUTES_IN_DAY;
    nextStart = Math.min(nextStart, MINUTES_IN_DAY - SLOT_MINUTES);
  }

  return { start: nextStart, end: nextEnd };
};

type Event = {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  completed?: boolean;
};

export default function DayLandingPage() {
  const router = useRouter();
  const params = useParams();
  const date = params?.date as string;

  const [events, setEvents] = useState<Event[]>([]);
  const selectedDate = React.useMemo(() => {
    if (!date) return null;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [date]);
  const friendlyDate = React.useMemo(() => {
    if (!selectedDate) return { weekday: "", full: "" };
    return {
      weekday: selectedDate.toLocaleDateString(undefined, { weekday: "long" }),
      full: selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    };
  }, [selectedDate]);
  const [userId, setUserId] = useState<number | null>(() => {
    try {
      const uid = localStorage.getItem("userId");
      return uid ? Number(uid) : null;
    } catch {
      return null;
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0 } })
  );

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      if (!date) return;
      if (userId) {
        try {
          const res = await fetch(`/api/events?userId=${userId}`);
          if (!res.ok) {
            console.error("Failed to fetch events:", await res.text());
            return;
          }
          const allEvents: {
            id: number;
            title: string;
            event_date: string;
            start_time?: string;
            end_time?: string;
            completed?: boolean;
          }[] = await res.json();

          const filtered = allEvents
            .filter((e) => {
              const rawDate = e.event_date ?? (e as any)?.date ?? null;
              if (!rawDate) return false;
              return String(rawDate).slice(0, 10) === date;
            })
            .map((e) => {
              const rawDate = e.event_date ?? (e as any)?.date ?? "";
              return {
                id: e.id,
                title: e.title,
                date: String(rawDate).slice(0, 10),
                start_time: e.start_time,
                end_time: e.end_time,
                completed: e.completed,
              };
            });
          setEvents(filtered);
        } catch (err) {
          console.error("Error loading day events:", err);
        }
      } else {
        try {
          const raw = localStorage.getItem("events");
          if (raw) {
            const parsed = JSON.parse(raw);
            const list: Event[] = parsed?.[date] || [];
            setEvents(list);
          }
        } catch (err) {
          console.error("Failed to load local events", err);
        }
      }
    };

    loadEvents();
  }, [date, userId]);

  const toggleCompletion = (ev: Event) => {
    const updated = { ...ev, completed: !ev.completed };
    applyEventUpdate(updated, true, { completed: updated.completed });
  };

  const sortedEvents = React.useMemo(() => {
    return [...events].sort(
      (a, b) => timeToMinutes(a.start_time || "00:00") - timeToMinutes(b.start_time || "00:00")
    );
  }, [events]);
  const completedCount = events.filter((ev) => ev.completed).length;
  const nextEvent = sortedEvents.find((ev) => !ev.completed);
  const timelineNow = React.useMemo(() => {
    if (!selectedDate) return null;
    const today = new Date();
    if (today.toDateString() !== selectedDate.toDateString()) return null;
    return today.getHours() * 60 + today.getMinutes();
  }, [selectedDate]);
  const timelineNowLabel = React.useMemo(() => {
    if (timelineNow == null) return "";
    const hours = Math.floor(timelineNow / 60);
    const minutes = timelineNow % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }, [timelineNow]);

  const applyEventUpdate = (
    updatedEv: Event,
    persist = false,
    patchedFields?: Partial<Pick<Event, "start_time" | "end_time" | "completed">>
  ) => {
    setEvents((prev) => prev.map((e) => (e.id === updatedEv.id ? updatedEv : e)));

    if (!persist) return;

    if (userId) {
      const payload: any = { userId, id: updatedEv.id };
      const fields = patchedFields ?? {
        start_time: updatedEv.start_time,
        end_time: updatedEv.end_time,
        completed: updatedEv.completed,
      };
      if (fields.start_time !== undefined) payload.start_time = fields.start_time ?? null;
      if (fields.end_time !== undefined) payload.end_time = fields.end_time ?? null;
      if (fields.completed !== undefined) payload.completed = fields.completed ? 1 : 0;

      fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.error("Failed to persist event update", err));
    } else {
      try {
        const raw = localStorage.getItem("events");
        const map = raw ? JSON.parse(raw) : {};
        const key = updatedEv.date || date;
        if (!key) return;
        const existing: Event[] = map[key] || [];
        const found = existing.some((e: Event) => e.id === updatedEv.id);
        map[key] = found ? existing.map((e: Event) => (e.id === updatedEv.id ? updatedEv : e)) : [...existing, updatedEv];
        localStorage.setItem("events", JSON.stringify(map));
      } catch (err) {
        console.error("Failed to persist event to localStorage", err);
      }
    }
  };

  const deleteEvent = async (target: Event) => {
    const id = target.id;

    try {
      if (userId) {
        const res = await fetch("/api/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, id }),
        });
        if (!res.ok) {
          console.error("Failed to delete event:", await res.text());
          return;
        }
      } else {
        const raw = localStorage.getItem("events");
        if (raw) {
          const map = JSON.parse(raw);
          if (map[date]) {
            map[date] = map[date].filter((e: Event) => e.id !== id);
            localStorage.setItem("events", JSON.stringify(map));
          }
        }
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const ev = events.find((e) => e.id === Number(active.id));
    if (!ev || !ev.start_time || !ev.end_time) return;

    const startMinutes = timeToMinutes(ev.start_time);
    const endMinutes = timeToMinutes(ev.end_time);
    const height = endMinutes - startMinutes;

    const updatedEv = (() => {
      const { start, end } = clampAndSnapRange(startMinutes + delta.y, startMinutes + delta.y + height);
      return { ...ev, start_time: minutesToTime(start), end_time: minutesToTime(end) };
    })();

    applyEventUpdate(updatedEv, true, { start_time: updatedEv.start_time, end_time: updatedEv.end_time });
  };


  return (
    <div className="day-page">
      <div className="day-honeycomb" aria-hidden />
      <div className="day-content">
        <section className="day-card day-hero">
          <div className="day-hero__text">
            <p className="day-pill">Day Planner</p>
            <h1>
              {friendlyDate.weekday ? `${friendlyDate.weekday}, ` : ""}
              {friendlyDate.full || date || "Today"}
            </h1>
            <p>
              {events.length > 0
                ? `You have ${events.length} ${events.length === 1 ? "commitment" : "commitments"} scheduled today.`
                : "No events yet. Head back to the dashboard to schedule your first task."}
            </p>
          </div>
          <div className="day-hero__actions">
            <button className="zen-btn zen-btn--secondary" onClick={() => router.push("/dashboard")}>
              Back to Calendar
            </button>
            <button className="zen-btn zen-btn--primary" onClick={() => router.push("/dashboard?view=day")}>
              Open Dashboard
            </button>
          </div>
          <div className="day-stats">
            {[
              { label: "Total Events", value: events.length },
              { label: "Completed", value: completedCount },
              { label: "Remaining", value: Math.max(events.length - completedCount, 0) },
              { label: "Next", value: nextEvent ? nextEvent.title : "No upcoming" },
            ].map((stat) => (
              <article key={stat.label} className="day-stat">
                <p>{stat.label}</p>
                <h3>{stat.value || stat.value === 0 ? stat.value : "—"}</h3>
              </article>
            ))}
          </div>
        </section>

        <div className="day-main-grid">
          <section className="day-card day-timeline">
            <header>
              <div>
                <p className="day-pill day-pill--soft">Visual Timeline</p>
                <h2>Drag to plan your day</h2>
              </div>
              <div className="day-chip">
                {timelineNow != null ? `Current time · ${timelineNowLabel}` : "Plan ahead"}
              </div>
            </header>

            <div className="day-timeline__canvas">
              {[...Array(24)].map((_, hour) => (
                <div key={hour} className="day-hour-row" style={{ top: `${hour * 60}px` }}>
                  {hour}:00
                </div>
              ))}

              {[...Array(24 * 4)].map((_, i) => (
                <div key={`dot-${i}`} className="day-quarter-row" style={{ top: `${i * 15}px` }} />
              ))}

              {timelineNow != null && (
                <div className="day-now-indicator" style={{ top: `${timelineNow}px` }}>
                  <span>Now</span>
                </div>
              )}

              <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                {events.map((ev) => {
                  if (!ev.start_time || !ev.end_time) return null;
                  const [startH, startM] = ev.start_time.split(":").map(Number);
                  const [endH, endM] = ev.end_time.split(":").map(Number);
                  const top = startH * 60 + startM;
                  const height = endH * 60 + endM - top;
                  return (
                    <DraggableEvent
                      key={ev.id}
                      ev={ev}
                      top={top}
                      height={height}
                      events={events}
                      updateEvent={applyEventUpdate}
                      onToggleComplete={toggleCompletion}
                      onDelete={deleteEvent}
                    />
                  );
                })}
              </DndContext>
            </div>
          </section>

          <aside className="day-card day-checklist">
            <header>
              <div>
                <p className="day-pill day-pill--soft">Today&apos;s focus</p>
                <h3>Event checklist</h3>
              </div>
              <span className="day-chip">
                {completedCount}/{events.length || 0} done
              </span>
            </header>

            <div className="day-checklist__body">
              {sortedEvents.length === 0 && (
                <p className="day-empty-state">
                  No events scheduled. Jump back to the dashboard to add your first.
                </p>
              )}

              {sortedEvents.map((eventItem) => (
                <article
                  key={eventItem.id}
                  className={`day-checklist__item ${eventItem.completed ? "day-checklist__item--done" : ""}`}
                >
                  <div>
                    <h4>{eventItem.title}</h4>
                    <span>
                      {eventItem.start_time || "--:--"} - {eventItem.end_time || "--:--"}
                    </span>
                  </div>
                  <div className="day-checklist__actions">
                    <button className="zen-btn zen-btn--muted" onClick={() => toggleCompletion(eventItem)}>
                      {eventItem.completed ? "Undo" : "Complete"}
                    </button>
                    <button className="zen-btn zen-btn--ghost" onClick={() => deleteEvent(eventItem)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Draggable Event component
type DraggableEventProps = {
  ev: Event;
  top: number;
  height: number;
  events: Event[];
  updateEvent: (updatedEv: Event, persist?: boolean, fields?: Partial<Pick<Event, "start_time" | "end_time" | "completed">>) => void;
  onToggleComplete: (ev: Event) => void;
  onDelete: (ev: Event) => void;
};

function DraggableEvent({
  ev,
  top,
  height,
  events,
  updateEvent,
  onToggleComplete,
  onDelete
}: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ev.id.toString(),
  });

  // Determine limits for clamping
  const calendarTop = 0;
  const calendarBottom = 1440;

  // Find nearest event above and below
  const otherEvents = events.filter((e) => e.id !== ev.id);

  let minY = calendarTop; // cannot go above calendar
  let maxY = calendarBottom - height; // cannot go below calendar

  for (const other of otherEvents) {
    if (!other.start_time || !other.end_time) continue;
    const [oStartH, oStartM] = other.start_time.split(":").map(Number);
    const [oEndH, oEndM] = other.end_time.split(":").map(Number);
    const oTop = oStartH * 60 + oStartM;
    const oBottom = oEndH * 60 + oEndM;

    if (oBottom <= top) minY = Math.max(minY, oBottom); // closest event above
    if (oTop >= top + height) maxY = Math.min(maxY, oTop - height); // closest event below
  }

  

  // Clamp transform
  const currentTop = top + (transform?.y ?? 0);
  let clampedY = transform?.y ?? 0;
  if (currentTop < minY) clampedY = minY - top;
  if (currentTop > maxY) clampedY = maxY - top;

  const handleResizeStart = (direction: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragStartY = e.clientY;
    const initialStart = top;
    const initialEnd = top + height;
    let latest: Event | null = null;

    const handleMove = (pe: PointerEvent) => {
      const delta = pe.clientY - dragStartY;
      const tentativeStart = direction === "start" ? initialStart + delta : initialStart;
      const tentativeEnd = direction === "end" ? initialEnd + delta : initialEnd;
      const { start, end } = clampAndSnapRange(tentativeStart, tentativeEnd);
      latest = { ...ev, start_time: minutesToTime(start), end_time: minutesToTime(end) };
      updateEvent(latest);
    };

    const finish = (pe: PointerEvent) => {
      handleMove(pe);
      if (latest) updateEvent(latest, true, { start_time: latest.start_time, end_time: latest.end_time });
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const isDone = !!ev.completed;

  const style: React.CSSProperties = {
    position: "absolute",
    top: top,
    height: height,
    left: TIMELINE_EVENT_OFFSET,
    right: 16,
    zIndex: isDragging ? 50 : 31,
    transform: `translate3d(0, ${Math.round(clampedY / 15) * 15}px, 0)`,
    opacity: isDone ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`day-event ${isDone ? "day-event--done" : ""} ${isDragging ? "day-event--dragging" : ""}`}
      style={style}
    >
      <div className="day-event__handle day-event__handle--top" onPointerDown={handleResizeStart("start")} />
      <div className="day-event__handle day-event__handle--bottom" onPointerDown={handleResizeStart("end")} />

      <div className="day-event__body">
        <button
          onClick={() => onToggleComplete(ev)}
          className="day-event__toggle"
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
        >
          {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
        <div className="day-event__details">
          <span className="day-event__title">{ev.title}</span>
          <span className="day-event__time">
            {ev.start_time} - {ev.end_time}
          </span>
        </div>
        <button
          onClick={() => onDelete(ev)}
          className="day-event__delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
