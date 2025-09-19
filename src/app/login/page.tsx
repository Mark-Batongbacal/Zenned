import React from "react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white px-6">
            <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-6 text-black">Login to Zenned</h1>
                <form className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                        />
                    </div>
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