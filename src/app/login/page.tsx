"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error || "Login failed");
            return;
        }

        // Make sure userId exists in response
        if (!data.userId) {
            setError("Login failed: no userId returned");
            return;
        }

        // Store userId in localStorage
        localStorage.setItem("userId", data.userId);
        if (data.name) {
            localStorage.setItem("userName", data.name);
        }
        console.debug("Stored userId:", data.userId);

        setSuccess("Login successful!");

        // Redirect to dashboard and refresh to ensure dashboard reads latest userId
        router.push("/dashboard");
        router.refresh();

    } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
    }
};


    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-10 text-[var(--text)]">
            <div className="bg-[var(--surface)] w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                <div className="bg-gradient-to-b from-[var(--secondary)] to-[var(--accent)] p-10 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold shadow">
                                Z
                            </div>
                            <span className="text-xl font-bold text-[var(--text)]">Zenned</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                            Welcome back
                        </h2>
                        <p className="mt-3 text-[var(--text-light)]">
                            Jump into your schedule, pick up where you left off, and let AI keep you on track.
                        </p>
                    </div>
                    <div className="mt-10 text-sm text-[var(--text-light)]">
                        <p className="font-semibold text-[var(--text)]">Why people love Zenned</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Clean, calming UI</li>
                            <li>AI-powered schedule import</li>
                            <li>Drag to move and resize events</li>
                        </ul>
                    </div>
                </div>

                <div className="p-10">
                    <h1 className="text-3xl font-bold text-[var(--text)] mb-6">Log in</h1>
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-light)]">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] bg-white text-[var(--text)]"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-light)]">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] bg-white text-[var(--text)]"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {success && <p className="text-green-600 text-sm">{success}</p>}
                        <button
                            type="submit"
                            className="w-full bg-[var(--primary)] text-[var(--text)] py-3 rounded-lg font-semibold shadow-lg hover:bg-[var(--secondary)] transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            Login
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-[var(--text-light)]">
                        Don't have an account?{" "}
                        <a href="/signup" className="text-[var(--primary)] font-semibold hover:underline">Sign up</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
