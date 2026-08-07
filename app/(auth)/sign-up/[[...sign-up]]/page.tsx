import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground p-6">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
      <p className="max-w-xs text-center text-xs text-ink-muted">
        By creating an account, you agree to Aernova&rsquo;s{" "}
        <Link href="/terms" className="underline hover:text-ink-secondary">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-ink-secondary">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}