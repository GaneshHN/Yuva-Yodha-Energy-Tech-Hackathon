"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Factory, Leaf, LockKeyhole, Mail, ShieldCheck, Zap } from "lucide-react";
import { apiRequest } from "@/lib/api";

type AuthScreenProps = { onAuthenticated: () => void };

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    try {
      if (mode === "register") {
        await apiRequest<unknown>("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, email, password }),
        });
        setNotice("Account created. Signing you in…");
        await apiRequest<unknown>("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "login", email, password }),
        });
      } else {
        await apiRequest<unknown>("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, email, password }),
        });
      }
      onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't sign you in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="EnerPilot overview">
        <div className="brand-lockup">
          <span className="brand-mark"><Zap aria-hidden="true" /></span>
          <span>EnerPilot</span>
        </div>
        <div className="story-copy">
          <span className="eyebrow"><span className="live-dot" /> INDUSTRIAL ENERGY INTELLIGENCE</span>
          <h1>Make every<br /><span>kilowatt count.</span></h1>
          <p>See how your factory uses energy. Find the opportunities hiding in your production data.</p>
        </div>
        <div className="story-stats" aria-label="Platform capabilities">
          <div><Factory aria-hidden="true" /><span>Factory-wide<br />visibility</span></div>
          <div><Leaf aria-hidden="true" /><span>Efficiency<br />that adds up</span></div>
          <div><ShieldCheck aria-hidden="true" /><span>Your data,<br />kept secure</span></div>
        </div>
        <div className="energy-orbit orbit-one" />
        <div className="energy-orbit orbit-two" />
        <div className="story-grid" aria-hidden="true" />
        <div className="story-foot"><span>ENERPILOT / OPERATIONS</span><span>01 — CONTROL ROOM</span></div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="mobile-brand brand-lockup">
          <span className="brand-mark"><Zap aria-hidden="true" /></span><span>EnerPilot</span>
        </div>
        <div className="auth-card">
          <span className="eyebrow muted-eyebrow">YOUR OPERATIONS WORKSPACE</span>
          <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-subtitle">{mode === "login" ? "Sign in to view your factory performance." : "Get started with your energy operations dashboard."}</p>

          <div className="auth-switch" role="group" aria-label="Choose account action">
            <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
            <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <div className="auth-input-wrap"><Mail aria-hidden="true" /><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></div>
            <div className="password-label"><label htmlFor="password">Password</label>{mode === "register" && <span>12 characters minimum</span>}</div>
            <div className="auth-input-wrap"><LockKeyhole aria-hidden="true" /><input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : 1} maxLength={128} required placeholder="Enter your password" /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="form-notice" role="status">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={pending}>
              <span>{pending ? "Connecting…" : mode === "login" ? "Sign in to EnerPilot" : "Create account"}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
          <p className="auth-security"><ShieldCheck aria-hidden="true" /> Secure, private access to your factory data</p>
        </div>
        <p className="auth-copyright">© {new Date().getFullYear()} EnerPilot Energy Systems</p>
      </section>
    </main>
  );
}
