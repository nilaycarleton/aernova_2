import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ground p-6 outline-none">
      {/* Aernova identity as the first-viewport signal (Phase 6 §57). Plain
          text, matching the shell's own interim treatment
          (shell-chrome.tsx) — no logo image and no reconstructed serif
          wordmark, since no production-ready brand master exists yet (see
          docs/AERNOVA_DESIGN_REFERENCE.md §5.2). */}
      <p className="text-lg font-semibold text-ink-primary">Aernova</p>
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" appearance={clerkAppearance} />
    </main>
  );
}