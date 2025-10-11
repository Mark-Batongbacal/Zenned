"use client";
import React, { useState } from "react";

export default function SignupPage() {
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
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Signup failed");
            } else {
                setSuccess("Signup successful!");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 text-center text-black">Sign Up</h1>
                <form className="space-y-4" onSubmit={handleSignup}>
                    <input
                        type="email"
                        placeholder="Email"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <button
                        type="submit"
                        className="w-full bg-yellow-400 text-black py-2 rounded-md font-semibold shadow-lg hover:bg-yellow-500 transition"
                    >
                        Sign Up
                    </button>
                </form>
                <p className="mt-4 text-center text-gray-600">
                    Already have an account? <a href="/login" className="text-yellow-600 hover:underline">Log in</a>
                </p>
            </div>
        </div>
    );
}