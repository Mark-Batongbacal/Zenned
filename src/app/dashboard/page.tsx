import React, { useState } from "react";

type Event = {
    id: number;
    title: string;
    date: string;
    time: string;
};

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !time) return;
        setEvents([
            ...events,
            { id: Date.now(), title, date, time }
        ]);
        setTitle("");
        setDate("");
        setTime("");
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white px-6 py-10">
            <div className="w-full max-w-2xl">
                <h1 className="text-4xl font-bold text-center mb-8 text-black">Scheduler Dashboard</h1>
                {/* Add Event Form */}
                <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add New Event</h2>
                    <form className="space-y-4" onSubmit={handleAddEvent}>
                        <input
                            type="text"
                            placeholder="Event Title"
                            className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                        <div className="flex gap-4">
                            <input
                                type="date"
                                className="block w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                            <input
                                type="time"
                                className="block w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-yellow-400 text-black py-2 rounded-md font-semibold shadow-lg hover:bg-yellow-500 transition"
                        >
                            Add Event
                        </button>
                    </form>
                </div>
                {/* Events List */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Scheduled Events</h2>
                    {events.length === 0 ? (
                        <p className="text-gray-500 text-center">No events scheduled.</p>
                    ) : (
                        <ul className="space-y-3">
                            {events.map(event => (
                                <li key={event.id} className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <span className="font-medium">{event.title}</span>
                                        <span className="ml-4 text-gray-600">{event.date} at {event.time}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}