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
import { Trash2 } from "lucide-react";

const MINUTES_IN_DAY = 24 * 60;
const SLOT_MINUTES = 15;

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
};

export default function DayLandingPage() {
  const router = useRouter();
  const params = useParams();
  const date = params?.date as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [userId, setUserId] = useState<number | null>(() => {
    try {
      const uid = localStorage.getItem("userId");
      return uid ? Number(uid) : null;
    } catch {
      return null;
    }
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

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
          }[] = await res.json();

          const filtered = allEvents
            .filter((e) => e.event_date.slice(0, 10) === date)
            .map((e) => ({
              id: e.id,
              title: e.title,
              date: e.event_date.slice(0, 10),
              start_time: e.start_time,
              end_time: e.end_time,
            }));
          setEvents(filtered);
        } catch (err) {
          console.error("Error loading day events:", err);
        }
      } 
    };

    loadEvents();
  }, [date, userId]);

  const applyEventUpdate = (updatedEv: Event, persist = false) => {
    setEvents((prev) => prev.map((e) => (e.id === updatedEv.id ? updatedEv : e)));

    if (!persist) return;

    if (userId) {
      fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          id: updatedEv.id,
          start_time: updatedEv.start_time,
          end_time: updatedEv.end_time,
        }),
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

  // Delete
  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      if (userId) {
        const res = await fetch("/api/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, id: eventToDelete.id }),
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
            map[date] = map[date].filter((e: Event) => e.id !== eventToDelete.id);
            localStorage.setItem("events", JSON.stringify(map));
          }
        }
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setConfirmOpen(false);
      setEventToDelete(null);
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

    applyEventUpdate(updatedEv, true);
  };


  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-[var(--background)] to-[var(--accent)] px-6 py-10 text-[var(--text)]">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-[var(--text-light)]">Daily Timeline</p>
            <h1 className="text-3xl font-bold">Events for {date}</h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2 rounded-full bg-[var(--primary)] text-[var(--text)] font-semibold shadow transition-transform duration-200 hover:-translate-y-0.5"
          >
            Back to Calendar
          </button>
        </div>

        <div className="relative bg-[var(--surface)] border border-[rgba(255,179,0,0.35)] shadow-xl rounded-3xl h-[1440px] overflow-hidden">
          {/* Hour labels */}
          {[...Array(24)].map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 h-[60px] text-xs px-4 z-30 pointer-events-none flex items-start text-[var(--text-light)]"
              style={{
                top: `${hour * 60}px`,
                borderLeft: "1px solid rgba(0,0,0,0.05)",
                borderRight: "1px solid rgba(0,0,0,0.05)",
                borderTop: hour === 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {hour}:00
            </div>
          ))}

          {/* 15-minute dotted lines */}
          {[...Array(24 * 4)].map((_, i) => (
            <div
              key={`dot-${i}`}
              className="absolute left-0 right-0 border-t border-dotted border-[rgba(0,0,0,0.08)] z-0 pointer-events-none"
              style={{ top: `${i * 15}px` }}
            />
          ))}

          <DndContext
            sensors={sensors}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
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
                  setEventToDelete={setEventToDelete}
                  setConfirmOpen={setConfirmOpen}
                  updateEvent={applyEventUpdate}
                />
              );
            })}

          </DndContext>

        </div>

        {/* Delete modal */}
        {confirmOpen && eventToDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg w-96 p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-3 text-gray-900">Delete Event</h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-black">"{eventToDelete.title}"</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--text)] font-semibold hover:bg-[var(--secondary)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 z-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
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
  setEventToDelete: React.Dispatch<React.SetStateAction<Event | null>>;
  setConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  updateEvent: (updatedEv: Event, persist?: boolean) => void;
};

function DraggableEvent({
  ev,
  top,
  height,
  events,
  setEventToDelete,
  setConfirmOpen,
  updateEvent
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
      if (latest) updateEvent(latest, true);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const style: React.CSSProperties = {
    position: "absolute",
    top: top,
    height: height,
    left: 60,
    right: 2,
    zIndex: isDragging ? 50 : 31,
    transform: `translate3d(0, ${Math.round(clampedY / 15) * 15}px, 0)`,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="relative rounded shadow cursor-grab overflow-visible"
      style={style}
    >
      {/* Resize handles */}
      <div
        className="absolute left-2 right-2 top-0 h-2 z-50 cursor-n-resize"
        onPointerDown={handleResizeStart("start")}
      >
        <div className="w-full h-full rounded bg-[var(--secondary)]" />
      </div>
      <div
        className="absolute left-2 right-2 bottom-0 h-2 z-50 cursor-s-resize"
        onPointerDown={handleResizeStart("end")}
      >
        <div className="w-full h-full rounded bg-[var(--secondary)]" />
      </div>

      {/* Full-height background under the grid lines */}
      <div className="absolute inset-0 bg-[var(--accent)] opacity-90 rounded border border-[rgba(74,52,38,0.08)]" />

      {/* Middle box containing text + button, above grid lines */}
      <div className="relative z-40 flex justify-between items-center px-2 py-1 bg-[var(--surface)] rounded shadow-sm border border-[rgba(74,52,38,0.08)]">
        <span className="font-semibold truncate text-[var(--text)]">{ev.title}</span>
        <span className="text-xs ml-2 flex-shrink-0 text-[var(--text-light)]">
          {ev.start_time} - {ev.end_time}
        </span>
        <button
          onClick={() => {
            setEventToDelete(ev);
            setConfirmOpen(true);
          }}
          className="ml-2 px-2 py-0.5 bg-[var(--primary)] text-black text-xs rounded hover:bg-red-500 flex-shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
