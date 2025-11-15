"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Signup failed");
            } else {
                // store userId returned by API so dashboard/events can use it
                if (data.userId) {
                    localStorage.setItem("userId", String(data.userId));
                }
                if (data.name) {
                    localStorage.setItem("userName", String(data.name));
                } else if (name) {
                    localStorage.setItem("userName", name);
                }
                setSuccess("Signup successful!");
                setName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                // redirect to dashboard
                router.push("/dashboard");
            }
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
                        <h2 className="text-3xl font-extrabold text-[var(--text)] leading-tight">
                            Create your account
                        </h2>
                        <p className="mt-3 text-[var(--text-light)]">
                            Plan smarter, stay on top of your calendar, and sync tasks across devices.
                        </p>
                    </div>
                    <div className="mt-10 text-sm text-[var(--text-light)]">
                        <p className="font-semibold text-[var(--text)]">What you get</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>AI-powered scheduling</li>
                            <li>Quick add & drag to resize events</li>
                            <li>Clean, focused dashboard</li>
                        </ul>
                    </div>
                </div>

                <div className="p-10">
                    <h1 className="text-3xl font-bold mb-6 text-[var(--text)]">Sign up</h1>
                    <form className="space-y-4" onSubmit={handleSignup}>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-light)]">Full Name</label>
                            <input
                                type="text"
                                placeholder="Taylor Swift"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none bg-white text-[var(--text)]"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-light)]">Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none bg-white text-[var(--text)]"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-light)]">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none bg-white text-[var(--text)]"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-light)]">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="mt-1 block w-full px-4 py-3 border border-[rgba(74,52,38,0.15)] rounded-lg focus:ring-2 focus:ring-[var(--secondary)] focus:outline-none bg-white text-[var(--text)]"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {success && <p className="text-green-600 text-sm">{success}</p>}
                        <button
                            type="submit"
                            className="w-full bg-[var(--primary)] text-[var(--text)] py-3 rounded-lg font-semibold shadow-lg hover:bg-[var(--secondary)] transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            Create Account
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-[var(--text-light)]">
                        Already have an account?{" "}
                        <a href="/login" className="text-[var(--primary)] font-semibold hover:underline">Log in</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
