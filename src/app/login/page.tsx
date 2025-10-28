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
            } else {
                // store userId from login response
                if (data.userId) {
                    console.debug("Storing userId:", data.userId);
                }
                setSuccess("Login successful!");
                console.debug("Storing userId:", data.userId);
                // redirect to dashboard
                router.push("/dashboard");
            }
        } catch (err) {
            console.error(err);
            setError("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white px-6">
            <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-6 text-black">Login to Zenned</h1>
                <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 bg-gray-100"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 bg-gray-100"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                    <button
                        type="submit"
                        className="w-full bg-yellow-400 text-black py-2 rounded-md font-semibold shadow-lg hover:bg-yellow-500 transition"
                    >
                        Login
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-700">
                    Don't have an account? <a href="/signup" className="text-yellow-500 hover:underline">Sign up</a>
                </p>
            </div>
        </div>
    );
}