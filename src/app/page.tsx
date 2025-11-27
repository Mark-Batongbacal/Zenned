"use client";

import React from "react";
import Link from "next/link";
import {
  Bot,
  Cloud,
  Menu,
  RefreshCw,
  Rocket,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";

export default function Home() {
  const [navOpen, setNavOpen] = React.useState(false);

  const featureCards = [
    { title: "AI-Powered", description: "Let GPT help you organize your tasks smarter and faster.", icon: Bot },
    {
      title: "Cross-Platform",
      description: (
        <>
          Use <BrandMark variant="inline" /> on web, desktop, and mobile.
        </>
      ),
      icon: RefreshCw,
    },
    { title: "Productivity Insights", description: "Track your progress and stay on top of deadlines.", icon: TrendingUp },
  ];

  return (
    <div className="startup-page">
      <div className="honeycomb-bg" aria-hidden />

      <nav className="navbar">
        <div className="logo">
          <BrandMark className="logo-brand" iconSize={60} priority />
        </div>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(prev => !prev)}
        >
          <Menu size={20} />
        </button>

        <div className={`nav-links ${navOpen ? "nav-links-open" : ""}`} />
      </nav>

      <section className="hero">
        <p className="hero-pill">
          <Zap size={16} /> AI-Powered Hive for Your Day
        </p>

        <h1>Organize Your Work, Amplify Your Productivity.</h1>

        <p className="hero-subtitle">
          <BrandMark variant="inline" /> is your AI calendar and task hive powered by GPT – helping you plan, prioritize,
          and keep every commitment in perfect flow across web, desktop, and mobile.
        </p>

        <div className="cta-buttons">
          <Link href="/login" className="btn btn-primary">
            <Rocket size={18} /> Get Started
          </Link>
        </div>

        <div className="hero-highlights">
          <span>
            <Zap size={16} /> 2x faster planning
          </span>
          <span>
            <Cloud size={16} /> Syncs across devices
          </span>
          <span>
            <Shield size={16} /> Your data, protected
          </span>
        </div>

        <div id="features" className="features">
          {featureCards.map(card => (
            <article key={card.title} className="card">
              <div className="card-icon">
                <card.icon size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} <BrandMark variant="inline" />. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
