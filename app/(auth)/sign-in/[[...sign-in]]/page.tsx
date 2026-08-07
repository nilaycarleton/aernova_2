import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-ground p-6 outline-none">
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}