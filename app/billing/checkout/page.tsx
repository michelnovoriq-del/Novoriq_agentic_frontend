"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

type PaidPlan = "professional" | "firm" | "enterprise";

function isPaidPlan(value: string | null): value is PaidPlan {
  return (
    value === "professional" ||
    value === "firm" ||
    value === "enterprise"
  );
}

export default function BillingCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream text-ink">
          <PublicHeader />
          <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
            <p role="status">Preparing secure checkout…</p>
          </main>
          <PublicFooter />
        </div>
      }
    >
      <BillingCheckoutContent />
    </Suspense>
  );
}

function BillingCheckoutContent() {
  const params = useSearchParams();
  const requestedPlan = params.get("plan");
  const plan = isPaidPlan(requestedPlan) ? requestedPlan : null;

  const started = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = useCallback(async () => {
    if (!plan) {
      setError("Select a valid paid plan from the pricing page.");
      return;
    }

    started.current = true;
    setLoading(true);
    setError("");

    try {
      const { purchase_url } = await api.createWhopCheckout(plan);

      let checkoutUrl: URL;

      try {
        checkoutUrl = new URL(purchase_url);
      } catch {
        throw new Error("Whop returned an invalid checkout link.");
      }

      const hostname = checkoutUrl.hostname.toLowerCase();
      const isWhopHost =
        hostname === "whop.com" || hostname.endsWith(".whop.com");

      if (checkoutUrl.protocol !== "https:" || !isWhopHost) {
        throw new Error("Whop returned an invalid checkout link.");
      }

      window.location.assign(checkoutUrl.toString());
    } catch (err) {
      started.current = false;
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    if (!plan) {
      setError("Select a valid paid plan from the pricing page.");
      return;
    }

    if (!started.current) {
      void startCheckout();
    }
  }, [plan, startCheckout]);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <PublicHeader />

      <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[.18em] text-deepblue">
          Secure checkout
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Redirecting to Whop
        </h1>

        <p className="mt-4 text-slate-600">
          Your payment will be processed securely by Whop. After payment,
          you will return to Novoriq to check your subscription status.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            <p>{error}</p>

            <Button
              className="mt-4"
              variant="sky"
              disabled={loading || !plan}
              onClick={() => void startCheckout()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Try checkout again
            </Button>
          </div>
        ) : (
          <div
            role="status"
            className="mt-6 flex items-center gap-3 rounded-xl bg-white p-5 shadow-soft"
          >
            <Loader2 className="h-5 w-5 animate-spin text-deepblue" />
            <span>Preparing your secure Whop checkout…</span>
          </div>
        )}

        <p className="mt-6 text-sm text-slate-600">
          Need to choose another plan?{" "}
          <Link className="font-bold text-deepblue underline" href="/pricing">
            Back to pricing
          </Link>
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
