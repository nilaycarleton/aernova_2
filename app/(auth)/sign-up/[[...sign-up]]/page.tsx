import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground p-6 outline-none">
      {/* Same interim identity treatment as /sign-in — see the note there. */}
      <p className="mb-2 text-lg font-semibold text-ink-primary">Aernova</p>
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" appearance={clerkAppearance} />
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