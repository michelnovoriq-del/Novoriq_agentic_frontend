"use client";

import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

const planIds = {
  professional: process.env.NEXT_PUBLIC_WHOP_PROFESSIONAL_PLAN_ID ?? "",
  firm: process.env.NEXT_PUBLIC_WHOP_FIRM_PLAN_ID ?? "",
  enterprise: process.env.NEXT_PUBLIC_WHOP_ENTERPRISE_PLAN_ID ?? "",
} as const;

type PaidPlan = keyof typeof planIds;

function isPaidPlan(value: string | null): value is PaidPlan {
  return value === "professional" || value === "firm" || value === "enterprise";
}

export default function BillingCheckoutPage() {
  const params = useSearchParams();
  const plan = params.get("plan");
  const email = params.get("email") ?? "";
  const planId = isPaidPlan(plan) ? planIds[plan] : "";

  // Whop's loader discovers the checkout element. Recreate the element only
  // from our fixed plan allow-list; query parameters never select arbitrary IDs.
  const checkout = useMemo(() => ({ planId, email }), [planId, email]);
  useEffect(() => {
    if (typeof window !== "undefined" && planId) {
      window.dispatchEvent(new Event("whop-checkout-ready"));
    }
  }, [planId]);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[.18em] text-deepblue">Secure checkout</p>
        <h1 className="mt-3 text-4xl font-black">Complete your Novoriq upgrade</h1>
        {!checkout.planId ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            This plan is not ready for checkout. Return to pricing or contact support.
            <p className="mt-4"><Link className="font-bold underline" href="/pricing">Back to pricing</Link></p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-slate-600">Payment is securely processed by Whop. We pre-filled your Novoriq account email so the membership can be linked automatically.</p>
            <Script src="https://js.whop.com/static/checkout/loader.js" strategy="afterInteractive" />
            <div
              className="mt-8 min-h-64 rounded-2xl bg-white p-2 shadow-soft"
              data-whop-checkout-plan-id={checkout.planId}
              data-whop-checkout-prefill-email={checkout.email}
            />
            <p className="mt-5 text-sm text-slate-600">After payment, return to <Link className="font-bold text-deepblue underline" href="/billing/return">billing status</Link>. Access activates after Whop confirms your membership.</p>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
