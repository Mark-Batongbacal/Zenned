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

  const [startH, startM] = ev.start_time.split(":").map(Number);
  const [endH, endM] = ev.end_time.split(":").map(Number);

  const top = startH * 60 + startM;
  const height = endH * 60 + endM - top;

  // New top with delta
  let newTop = top + delta.y;

  // ✅ Clamp newTop so it cannot go outside timeline
  if (newTop < 0) newTop = 0;
  if (newTop + height > 1440) newTop = 1440 - height;

  // Snap to 15-min increments
  newTop = Math.round(newTop / 15) * 15;

  const newStartH = Math.floor(newTop / 60);
  const newStartM = newTop % 60;
  const newEndH = Math.floor((newTop + height) / 60);
  const newEndM = (newTop + height) % 60;

  const updatedEv = {
    ...ev,
    start_time: `${String(newStartH).padStart(2, "0")}:${String(newStartM).padStart(2, "0")}`,
    end_time: `${String(newEndH).padStart(2, "0")}:${String(newEndM).padStart(2, "0")}`,
  };

  setEvents((prev) => prev.map((e) => (e.id === ev.id ? updatedEv : e)));

  if (userId) {
    fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, id: ev.id, start_time: updatedEv.start_time, end_time: updatedEv.end_time }),
    }).catch(console.error);
  } else {
    const raw = localStorage.getItem("events");
    if (raw) {
      const map = JSON.parse(raw);
      if (map[date]) {
        map[date] = map[date].map((e: Event) => (e.id === ev.id ? updatedEv : e));
        localStorage.setItem("events", JSON.stringify(map));
      }
    }
  }
};


  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-yellow-100 via-yellow-50 to-white px-6 py-10 text-gray-900">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Events for {date}</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-800 text-white rounded"
          >
            Back to Calendar
          </button>
        </div>

        <div className="relative bg-white border shadow-md rounded-lg h-[1440px]">
          {/* Hour labels */}
          {[...Array(24)].map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 h-[60px] text-xs px-2 z-30 pointer-events-none"
              style={{
                top: `${hour * 60}px`,
                borderLeft: "2px solid",
                borderRight: "2px solid",
                 borderTop: hour === 0 ? "0.5px solid" : "none",
                borderBottom: "0.5px solid",
              }}
            >
              {hour}:00
            </div>
          ))}

          {/* 15-minute dotted lines */}
          {[...Array(24 * 4)].map((_, i) => (
            <div
              key={`dot-${i}`}
              className="absolute left-0 right-0 border-t border-dotted border-gray-300 z-0 pointer-events-none"
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
              return <DraggableEvent 
              key={ev.id} 
              ev={ev} 
              top={top} 
              height={height} 
              events={events}  
              setEventToDelete={setEventToDelete} 
              setConfirmOpen={setConfirmOpen} 
              updateEvent={(updatedEv) => {
              setEvents(prev => prev.map(e => e.id === updatedEv.id ? updatedEv : e));
              }}
              />;
            },)}

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
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 z-100"
                >
                  Delete
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
  updateEvent: (updatedEv: Event) => void;
};

function DraggableEvent({
  ev,
  top,
  height,
  events,
  setEventToDelete,
  setConfirmOpen,
  updateEvent
}: DraggableEventProps & { events: Event[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ev.id.toString(),
  });

  // Determine limits for clamping
  const calendarTop = 0;
  const calendarBottom = 1440;

  // Find nearest event above and below
  const evIndex = events.findIndex((e) => e.id === ev.id);
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
      {/* Full-height background under the grid lines */}
      <div className="absolute inset-0 bg-[#FDFD96] opacity-70 rounded" />

      {/* Middle box containing text + button, above grid lines */}
      <div className="relative z-40 flex justify-between items-center px-2 py-1 bg-[#FDFD96] rounded shadow">
        <span className="font-semibold truncate">{ev.title}</span>
        <span className="text-xs ml-2 flex-shrink-0">
          {ev.start_time} - {ev.end_time}
        </span>
        <button
          onClick={() => {
            setEventToDelete(ev);
            setConfirmOpen(true);
          }}
          className="ml-2 px-2 py-0.5 bg-pink-200 text-black text-xs rounded hover:bg-red-600 flex-shrink-0"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
