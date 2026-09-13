import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import { roleFromAuthResult } from "./authSession";
import type { AuthSession, Role } from "./authSession";

type Mode = "login" | "register";

type Props = {
  onAuthenticated: (auth: AuthSession) => void;
  onBack: () => void;
};

export default function AuthView({ onAuthenticated, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("customer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = username.trim();
    if (!user || !password) return;
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "register"
          ? await api.register(user, password, role)
          : await api.login(user, password);
      onAuthenticated({
        token: result.access_token,
        username: result.username,
        role: roleFromAuthResult(result.access_token, result.role),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>CampusBite</h1>
          <p className="lede">
            Students can register to track the current order and see history.
            Kitchen staff must log in. Guests can still order with only a name.
          </p>
        </div>
        <button type="button" className="ghost" onClick={onBack}>
          Continue as guest
        </button>
      </header>

      <section className="panel auth-panel">
        <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
        {error && (
          <div className="banner error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
        <form onSubmit={submit}>
          {mode === "register" && (
            <fieldset className="role-pick">
              <legend>Account type</legend>
              <label>
                <input
                  type="radio"
                  name="role"
                  checked={role === "customer"}
                  onChange={() => setRole("customer")}
                />
                Student
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  checked={role === "staff"}
                  onChange={() => setRole("staff")}
                />
                Kitchen staff
              </label>
            </fieldset>
          )}
          <label className="field">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder={role === "staff" ? "kitchen01" : "ana"}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "register" && (
            <label className="field">
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          )}
          <div className="row">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Need an account?" : "Have an account?"}
            </button>
            <button type="submit" disabled={busy || !username.trim() || !password}>
              {mode === "login" ? "Log in" : "Register"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
