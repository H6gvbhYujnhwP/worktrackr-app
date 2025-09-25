import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Pricing() {
  const nav = useNavigate();
  const [busyPlan, setBusyPlan] = useState(null);
  const [error, setError] = useState(null);

  // Map plan keys to Stripe Price IDs (from Vite env). Make sure these are set in Render:
  // VITE_STRIPE_PRICE_STARTER, VITE_STRIPE_PRICE_PRO, VITE_STRIPE_PRICE_ENTERPRISE
  const PRICE_IDS = {
    starter: import.meta.env?.VITE_STRIPE_PRICE_STARTER || "",
    pro: import.meta.env?.VITE_STRIPE_PRICE_PRO || "",
    enterprise: import.meta.env?.VITE_STRIPE_PRICE_ENTERPRISE || "",
  };

  const plans = [
    { key: "starter", name: "Starter", priceText: "£49 / month" },
    { key: "pro", name: "Pro", priceText: "£99 / month" },
    { key: "enterprise", name: "Enterprise", priceText: "£299 / month" },
  ];

  // ✅ New flow: user chooses plan -> we store the price_id -> go to /signup
  function choosePlan(planKey) {
    try {
      setError(null);
      const priceId = PRICE_IDS[planKey];
      if (!priceId) {
        setError("This plan isn't configured yet. Please contact support.");
        return;
      }
      localStorage.setItem("selectedPriceId", priceId);
      nav("/signup");
    } catch (e) {
      console.error("Choose plan error:", e);
      setError("Something went wrong. Please try again.");
    }
  }

  // 🧯 Legacy path retained: direct checkout via /api/billing/checkout
  // Keeping this to avoid losing functionality you already had.
  async function startCheckoutLegacy(planKey) {
    try {
      setError(null);
      setBusyPlan(planKey);

      const resp = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planKey, orgId: localStorage.getItem("orgId") }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed. Please try again.");
      }

      // Redirect to Stripe Checkout (legacy path)
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
      {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {plans.map((p) => (
          <div
            key={p.key}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20 }}
          >
            <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>{p.name}</h2>
            <p style={{ margin: "0 0 12px" }}>{p.priceText}</p>

            {/* Primary: New flow (recommended) */}
            <button
              onClick={() => choosePlan(p.key)}
              style={{
                padding: "10px 14px",
                width: "100%",
                borderRadius: 6,
                border: "none",
                background: "#111",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Start Free Trial
            </button>

            {/* Secondary: Legacy direct checkout (kept to not lose functionality) */}
            <button
              onClick={() => startCheckoutLegacy(p.key)}
              disabled={busyPlan === p.key}
              style={{
                padding: "8px 12px",
                width: "100%",
                borderRadius: 6,
                border: "1px solid #bbb",
                background: "#f7f7f7",
                color: "#333",
                fontWeight: 600,
                cursor: busyPlan === p.key ? "not-allowed" : "pointer",
                opacity: busyPlan === p.key ? 0.7 : 1,
              }}
              title="Use existing direct checkout flow"
            >
              {busyPlan === p.key ? "Preparing checkout…" : "Checkout now (legacy)"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
