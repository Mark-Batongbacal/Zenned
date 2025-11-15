// src/app/page.tsx
import React from 'react';

export default function Home() {
  return (
    <main className="home-landing">
      <section className="hero">
        <span className="hero-pill">Plan smarter, feel calmer</span>
        <h1 className="hero-title">Zenned</h1>
        <p className="hero-subtitle">
          Your cross-platform AI scheduler powered by GPT. Capture ideas, balance your day, and
          keep every commitment without losing your calm.
        </p>
        <div className="hero-actions">
          <a href="/login" className="btn btn-primary">Get Started</a>
          <a href="/signup" className="btn btn-secondary">Create Account</a>
        </div>
      </section>

      <section className="feature-grid">
        {[
          {
            title: "AI-Powered",
            body: "Let GPT translate your notes and inbox into a prioritized day plan.",
          },
          {
            title: "Cross-Platform",
            body: "Use Zenned on web, desktop, and mobile with seamless sync.",
          },
          {
            title: "Productivity Insights",
            body: "Track habits, energy, and focus without spreadsheets.",
          },
        ].map((card) => (
          <article key={card.title} className="feature-card">
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="cta-strip">
        <div>
          <h4>Ready to get Zenned?</h4>
          <p>Tap into calmer planning and let AI carry the busy-work.</p>
        </div>
        <a href="/login" className="btn btn-primary">Start Now</a>
      </section>
    </main>
  );
}
