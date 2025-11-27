"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";

const settingsStorageKey = "zenned_dashboard_settings";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }
      if (!data.userId) {
        setLoginError("Login failed: no userId returned");
        return;
      }
      localStorage.setItem("userId", data.userId);
      if (data.name) localStorage.setItem("userName", data.name);
      try {
        const stored = localStorage.getItem(settingsStorageKey);
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          settingsStorageKey,
          JSON.stringify({ ...parsed, darkMode: !!data.darkMode })
        );
      } catch (storageErr) {
        console.error("Failed to sync settings", storageErr);
      }

      setLoginSuccess("Login successful!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoginError("Something went wrong. Please try again.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");

    if (signupData.password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (signupData.password !== signupData.confirm) {
      setSignupError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error || "Signup failed.");
        return;
      }
      setSignupSuccess("Account created! You can log in now.");
      setSignupData({ name: "", email: "", password: "", confirm: "" });
      setActiveTab("login");
    } catch (err) {
      console.error(err);
      setSignupError("Something went wrong. Please try again.");
    }
  };

  const title = activeTab === "login" ? "Welcome back" : "Create an account";
  const subtitle: React.ReactNode =
    activeTab === "login"
      ? "Sign in to view your calendar and keep everything in flow."
      : (
        <>
          Start your journey — create an account to begin organizing with <BrandMark variant="inline" />.
        </>
      );

  return (
    <div className="auth-container auth-split">
      <div className="auth-card-split">
        <aside className="auth-visual">
          <div className="auth-visual-inner">
            <div className="auth-visual-logo">
              <BrandMark className="auth-visual-logo-mark" iconSize={52} />
            </div>
            <span className="auth-visual-badge">Plan your day in flow.</span>
            <h2 className="auth-visual-title">Keep calm and organized.</h2>
            <p className="auth-visual-text">
              Keep your classes, work, and personal events in one calm, focused space.
            </p>
            <ul className="auth-visual-bullets">
              <li>Smart calendar and task views</li>
              <li>Color-coded events and reminders</li>
              <li>Gentle, distraction-free design</li>
            </ul>
            <p className="auth-visual-footer">
              Stay on top of every deadline, without the chaos.
            </p>
          </div>
          <div className="auth-orb orb-a" />
          <div className="auth-orb orb-b" />
          <div className="auth-orb orb-c" />
        </aside>

        <section className="auth-form-panel">
          <div className="auth-card-inner">
            <div className="auth-header">
              <h1 id="authTitle">{title}</h1>
              <p id="authSubtitle">{subtitle}</p>
            </div>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("login")}
                data-tab="login"
              >
                Login
              </button>
              <button
                className={`auth-tab ${activeTab === "signup" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("signup")}
                data-tab="signup"
              >
                Sign Up
              </button>
            </div>

            <form id="loginForm" className={`auth-form ${activeTab === "login" ? "active" : ""}`} onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="loginEmail">Email Address</label>
                <input
                  type="email"
                  id="loginEmail"
                  className="form-control"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  type="password"
                  id="loginPassword"
                  className="form-control"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {loginError && <p className="auth-error">{loginError}</p>}
              {loginSuccess && <p className="auth-success">{loginSuccess}</p>}
              <button type="submit" className="btn btn-primary auth-btn-full">
                Login
              </button>
              <div className="form-footer">
                <a href="#" aria-disabled>
                  Forgot password?
                </a>
              </div>
            </form>

            <form
              id="signupForm"
              className={`auth-form ${activeTab === "signup" ? "active" : ""}`}
              onSubmit={handleSignup}
            >
              <div className="form-group">
                <label htmlFor="signupName">Name</label>
                <input
                  type="text"
                  id="signupName"
                  className="form-control"
                  placeholder="Enter your full name"
                  required
                  value={signupData.name}
                  onChange={e => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="signupEmail">Email</label>
                <input
                  type="email"
                  id="signupEmail"
                  className="form-control"
                  placeholder="you@example.com"
                  required
                  value={signupData.email}
                  onChange={e => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="signupPassword">Password</label>
                <input
                  type="password"
                  id="signupPassword"
                  className="form-control"
                  placeholder="Create a password"
                  required
                  value={signupData.password}
                  onChange={e => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="signupConfirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="signupConfirmPassword"
                  className="form-control"
                  placeholder="Confirm your password"
                  required
                  value={signupData.confirm}
                  onChange={e => setSignupData(prev => ({ ...prev, confirm: e.target.value }))}
                />
              </div>
              {signupError && <p className="auth-error">{signupError}</p>}
              {signupSuccess && <p className="auth-success">{signupSuccess}</p>}
              <button type="submit" className="btn btn-primary auth-btn-full">
                Sign Up
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
