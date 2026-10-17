
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { api, type BillingStatus } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";

const MAX_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 10_000;

export default function BillingReturnPage() {
  const { refreshAccount } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await api.getBillingStatus();
      setStatus(next);
      setAttempts((n) => n + 1);

      if (next.plan_code !== "free") {
        await refreshAccount();
      }
    } catch {
      setError(
        "Could not retrieve your billing status. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [refreshAccount]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (
      !status ||
      status.plan_code !== "free" ||
      attempts >= MAX_ATTEMPTS
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void check();
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [status, attempts, check]);

  const active = Boolean(status && status.plan_code !== "free");
  const stillChecking = !active && attempts < MAX_ATTEMPTS;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-cream px-5 py-16">
        <Card className="mx-auto max-w-xl p-8">
          <h1 className="text-3xl font-black">
            {active
              ? `Your ${status!.plan_name} plan is active.`
              : "Payment submitted"}
          </h1>

          <p className="mt-4 text-slate-600">
            {error
              ? error
              : active
                ? "Your Novoriq access has refreshed."
                : status?.pending_whop_link
                  ? "Your membership is awaiting account linking. We will check again shortly. If it remains unresolved, verify your account email or contact support."
                  : stillChecking
                    ? "Novoriq is checking for confirmation from Whop. This can take a short time."
                    : "We have not confirmed paid access yet. If you completed payment, verify your account email or contact support."}
          </p>

          {status?.message && (
            <p className="mt-3 text-sm text-slate-500">
              {status.message}
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            {active ? (
              <Button asChild variant="sky">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button
                onClick={() => void check()}
                variant="sky"
                disabled={loading}
              >
                {loading ? "Checking..." : "Check my access"}
              </Button>
            )}

            <Button asChild variant="outline">
              <Link href="/support">Contact support</Link>
            </Button>
          </div>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
