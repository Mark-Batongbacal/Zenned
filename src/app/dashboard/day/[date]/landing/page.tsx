"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Event = {
  id: number;
  title: string;
  date: string;
  time?: string;
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

  // Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

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
          const allEvents: { id: number; title: string; event_date: string }[] =
            await res.json();
          const filtered = allEvents
            .filter((e) => e.event_date.slice(0, 10) === date)
            .map((e) => ({
              id: e.id,
              title: e.title,
              date: e.event_date.slice(0, 10),
            }));
          setEvents(filtered);
        } catch (err) {
          console.error("Error loading day events:", err);
        }
      } else {
        try {
          const raw = localStorage.getItem("events");
          if (raw) {
            const map = JSON.parse(raw) as Record<string, Event[]>;
            setEvents(map[date] || []);
          }
        } catch (err) {
          console.error("Error loading local events:", err);
        }
      }
    };

    loadEvents();
  }, [date, userId]);

  // Delete function
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

        <div className="bg-white shadow-md rounded-lg p-6">
          {events.length === 0 ? (
            <p className="text-gray-600 text-center">No events for this day.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li
                  key={`${ev.id}-${ev.title}-${ev.date}`}
                  className="p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition flex justify-between items-center"
                >
                  <div>
                    <span className="text-lg font-semibold text-gray-900">
                      {ev.title}
                    </span>
                    {ev.time && (
                      <span className="ml-2 text-sm text-gray-600">
                        {ev.time}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setEventToDelete(ev);
                      setConfirmOpen(true);
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 🔔 Delete confirmation modal */}
      {confirmOpen && eventToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-96 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              Delete Event
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-black">
                "{eventToDelete.title}"
              </span>
              ?
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
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
