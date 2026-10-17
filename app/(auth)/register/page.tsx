"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { ErrorAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";

const MIN_PASSWORD_LENGTH = 8;
const FALLBACK_ERROR = "Something went wrong while creating your workspace. Please try again.";

const schema = z
  .object({
    full_name: z.string().trim().min(1, "Full name is required."),
    organization_name: z.string().trim().min(1, "Organization name is required."),
    email: z.string().trim().min(1, "Work email is required.").email("Enter a valid email address."),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirm_password: z.string().min(1, "Confirm your password."),
    terms: z.boolean().refine((accepted) => accepted, "You must accept the Terms and Privacy Policy."),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

type FormValues = z.infer<typeof schema>;
type FieldName = Exclude<keyof FormValues, "terms">;

/**
 * Turn whatever the API layer throws into a message a person can read.
 * The old `err instanceof Error` check dropped every non-Error rejection (plain objects, FastAPI
 * `{ detail: ... }` bodies) and showed the generic fallback instead of the real reason.
 */
function getErrorMessage(err: unknown): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const record = err as { message?: unknown; detail?: unknown; response?: { data?: { detail?: unknown } } };
    const detail = record.detail ?? record.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof (item as { msg?: unknown }).msg === "string" ? (item as { msg: string }).msg : ""))
        .filter(Boolean);
      if (messages.length) return messages.join(" ");
    }
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return FALLBACK_ERROR;
}

function PasswordToggle({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? "Hide" : "Show"} ${label}`}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-deepblue focus-visible:outline focus-visible:outline-2 focus-visible:outline-skybrand"
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  form,
  toggle,
  describedBy,
}: {
  name: FieldName;
  label: string;
  type?: string;
  autoComplete: string;
  form: UseFormReturn<FormValues>;
  toggle?: React.ReactNode;
  describedBy?: string;
}) {
  const error = form.formState.errors[name]?.message;
  const errorId = `${name}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={[describedBy, error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          className={toggle ? "pr-12" : undefined}
          {...form.register(name)}
        />
        {toggle}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    shouldFocusError: true, // focuses the first invalid field; the old extra setFocus() handler was redundant
    defaultValues: { full_name: "", organization_name: "", email: "", password: "", confirm_password: "", terms: false },
  });
  const { isSubmitting } = form.formState;

  // The alert sits at the TOP of the form but the submit button is at the BOTTOM. Without this, a server
  // error appeared off-screen (especially on phones) and the button looked like it did nothing.
  useEffect(() => {
    if (!error) return;
    alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    alertRef.current?.focus();
  }, [error]);

  async function onSubmit(values: FormValues) {
    if (inFlight.current) return; // blocks double submits (e.g. pressing Enter again while pending)
    inFlight.current = true;
    setError("");
    try {
      await register({
        full_name: values.full_name,
        email: values.email.toLowerCase(),
        password: values.password,
        organization_name: values.organization_name,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      inFlight.current = false;
    }
  }

  const termsError = form.formState.errors.terms;

  return (
    <AuthCard
      mode="register"
      title="Create your workspace"
      description="Start your Free Forever reconciliation workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-deepblue hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5" aria-busy={isSubmitting}>
        {error && (
          <div ref={alertRef} tabIndex={-1} className="outline-none">
            <ErrorAlert message={error} />
          </div>
        )}
        <Field name="full_name" label="Full name" autoComplete="name" form={form} />
        <Field name="organization_name" label="Organization name" autoComplete="organization" form={form} />
        <Field name="email" label="Work email" type="email" autoComplete="email" form={form} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Field
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              form={form}
              describedBy="password-help"
              toggle={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} label="password" />}
            />
            <p id="password-help" className="mt-2 text-xs text-slate-500">
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
          <Field
            name="confirm_password"
            label="Confirm password"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            form={form}
            toggle={
              <PasswordToggle
                shown={showConfirmation}
                onToggle={() => setShowConfirmation((v) => !v)}
                label="password confirmation"
              />
            }
          />
        </div>
        <div>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-skybrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-skybrand"
              aria-invalid={Boolean(termsError)}
              aria-describedby={termsError ? "terms-error" : undefined}
              {...form.register("terms")}
            />
            <span>
              I agree to the{" "}
              <Link className="font-bold text-deepblue underline" href="/terms">
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link className="font-bold text-deepblue underline" href="/privacy">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {termsError && (
            <p id="terms-error" role="alert" className="mt-2 text-xs font-medium text-red-700">
              {termsError.message}
            </p>
          )}
        </div>
        <Button type="submit" variant="sky" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating your workspace..." : "Create Free Workspace"}
        </Button>
        {/* Screen-reader announcement lives here, not on the button itself. */}
        <p className="sr-only" role="status" aria-live="polite">
          {isSubmitting ? "Creating your workspace" : ""}
        </p>
      </form>
    </AuthCard>
  );
}