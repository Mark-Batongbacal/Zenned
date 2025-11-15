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
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: 520 }}>
                <div className="auth-header">
                    <h1>Zenned</h1>
                    <p>Welcome back! Sign in to stay on top of your day.</p>
                </div>
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
                        className="btn btn-primary w-full justify-center"
                    >
                        Sign In
                    </button>
                </form>
                <p className="form-footer">
                    New here? <a href="/signup">Create an account</a>
                </p>
            </div>
        </div>
    );
}
