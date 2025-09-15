// src/app/page.tsx
import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-100 to-white px-6">
      {/* Header / Hero */}
      <section className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-indigo-800 mb-4">
          Zenned
        </h1>
        <p className="text-lg text-indigo-600 mb-8">
          Your smart, cross-platform AI scheduler powered by GPT. Plan, prioritize, and stay productive anywhere.
        </p>
        <a
          href="#get-started"
          className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-indigo-700 transition"
        >
          Get Started
        </a>
      </section>

      {/* Features */}
      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-center">
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-indigo-800">AI-Powered</h3>
          <p className="text-indigo-600">Let GPT help you organize your tasks smarter and faster.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-indigo-800">Cross-Platform</h3>
          <p className="text-indigo-600">Use Zenned on web, desktop, and mobile seamlessly.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-indigo-800">Productivity Insights</h3>
          <p className="text-indigo-600">Track your progress and stay on top of deadlines efficiently.</p>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="get-started" className="mt-16 text-center">
        <p className="text-indigo-700 mb-4 font-medium">Ready to get Zenned?</p>
        <a
          href="/signup"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-indigo-700 transition"
        >
          Start Now
        </a>
      </section>
    </main>
  );
}
