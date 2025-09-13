import React, { useState } from "react";

export default function Pricing() {
  const [busyPlan, setBusyPlan] = useState(null);
  const [error, setError] = useState(null);

  const plans = [
    { key: "starter", name: "Starter", priceText: "£49 / month" },
    { key: "pro", name: "Pro", priceText: "£99 / month" },
    { key: "enterprise", name: "Enterprise", priceText: "£299 / month" },
  ];

  async function startCheckout(plan) {
    try {
      setError(null);
      setBusyPlan(plan);

      const resp = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed. Please try again.");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      console.error("Checkout error:", e);
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Choose your plan</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {plans.map((p) => (
          <div key={p.key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20 }}>
            <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>{p.name}</h2>
            <p style={{ margin: "0 0 12px" }}>{p.priceText}</p>
            <button
              onClick={() => startCheckout(p.key)}
              disabled={busyPlan === p.key}
              style={{
                padding: "10px 14px",
                width: "100%",
                borderRadius: 6,
                border: "none",
                background: busyPlan === p.key ? "#999" : "#111",
                color: "#fff",
                fontWeight: "bold",
                cursor: busyPlan === p.key ? "not-allowed" : "pointer",
              }}
            >
              {busyPlan === p.key ? "Loading…" : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
