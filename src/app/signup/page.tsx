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
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: 520 }}>
                <div className="auth-header">
                    <h1>Create your Zenned account</h1>
                    <p>Sync across devices, plan with AI, and reclaim your focus.</p>
                </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <button
                        type="submit"
                        className="btn btn-primary w-full justify-center"
                    >
                        Create Account
                    </button>
                </form>
                <p className="form-footer">
                    Already have an account? <a href="/login">Log in</a>
                </p>
            </div>
        </div>
    );
}
