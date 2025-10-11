// src/app/page.tsx
import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-yellow-200 via-yellow-100 to-white px-6">
      {/* Header / Hero */}
      <section className="text-center max-w-2xl">
        <h1 className="text-7xl font-extrabold text-black mb-4 ">
          Zenned
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Your smart, cross-platform AI scheduler powered by GPT. Plan, prioritize, and stay productive anywhere.
        </p>
        <a
          href="#get-started"
          className="inline-block bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-yellow-500 transition"
        >
          Get Started
        </a>
      </section>

      {/* Features */}
      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-center">
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-gray-900">AI-Powered</h3>
          <p className="text-gray-700">Let GPT help you organize your tasks smarter and faster.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-gray-900">Cross-Platform</h3>
          <p className="text-gray-700">Use Zenned on web, desktop, and mobile seamlessly.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2 text-gray-900">Productivity Insights</h3>
          <p className="text-gray-700">Track your progress and stay on top of deadlines efficiently.</p>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="get-started" className="mt-16 text-center">
        <p className="text-gray-900 mb-4 font-medium">Ready to get Zenned?</p>
        <a
          href="/login"
          className="bg-black text-yellow-50 px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-yellow-500 hover:text-black transition"
        >
          Start Now
        </a>
      </section>
    </main>
  );
}
