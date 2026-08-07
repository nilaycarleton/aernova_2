import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Aernova",
  description: "How Aernova Inc. collects, uses, and protects personal information.",
};

const updated = "August 7, 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-xl font-semibold text-paper-ink">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-paper-ink">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-prose leading-7 text-paper-ink-body">{children}</p>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-12 text-paper-ink-body sm:px-6">
      <div className="mx-auto max-w-3xl">
        <article className="rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <p className="text-sm uppercase tracking-[0.14em] text-paper-ink-faint">
            Last updated {updated}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-paper-ink">Privacy Policy</h1>
          <P>
            This policy explains how <strong>Aernova Inc.</strong>, a corporation existing under
            the laws of Ontario, Canada (&ldquo;Aernova,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;),
            collects, uses, discloses, and protects personal information through the Aernova
            platform (the &ldquo;Service&rdquo;).
          </P>
          <P>
            <em>
              This is a draft prepared without review by a licensed lawyer. It is written to
              accurately describe what the Aernova software actually does today, but it has not
              been reviewed for legal sufficiency and should be before it is relied on to govern
              real customer relationships. See the note at the end of this document.
            </em>
          </P>

          <H2>Who this policy covers</H2>
          <P>
            Aernova is used by trades contractors (&ldquo;Contractors,&rdquo; &ldquo;you&rdquo;) to
            run their business — scheduling, quoting, invoicing, and, for roofing, aerial roof
            measurement. In the course of that, a Contractor enters information about their own
            customers — homeowners and property owners (&ldquo;Clients&rdquo;) — into the
            Service. This policy covers both:
          </P>
          <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-7 text-paper-ink-body">
            <li>
              Personal information Aernova collects directly from a Contractor to operate their
              account, and
            </li>
            <li>
              Personal information about a Contractor&rsquo;s Clients that the Contractor enters
              into the Service or that a Client submits directly (for example, through a public
              quote-request form).
            </li>
          </ul>
          <P>
            For the second category, the Contractor decides what information to collect and why —
            Aernova processes it on the Contractor&rsquo;s behalf, as a service provider, to make
            the software work. A Contractor is responsible for having their own lawful basis to
            collect and share their Client&rsquo;s information with us; this policy describes what
            Aernova itself does with it once it&rsquo;s in the Service.
          </P>

          <H2>Information we collect</H2>
          <H3>Contractor account &amp; company information</H3>
          <P>
            Name, email address, and profile details, via our authentication provider (Clerk).
            Company details you provide: business name, legal name, address, phone, licence
            number, business number, workers&rsquo; compensation number, and a logo, if uploaded.
          </P>
          <H3>Client information entered by a Contractor</H3>
          <P>
            Name, email, phone number, and property address, entered by the Contractor or
            submitted by the Client directly through a public request form. Photos of a property —
            drone imagery, inspection photos, before/after photos — uploaded by the Contractor or
            captured on-site.
          </P>
          <H3>Payment-related information</H3>
          <P>
            Aernova does not collect or store credit card or bank account numbers. When a
            Contractor connects payments (through Stripe Connect), Stripe collects and verifies
            that information directly — Aernova only stores whether the connection is active. When
            a homeowner pays an invoice online, that payment goes through Stripe directly; Aernova
            is not a party to the payment and never holds the funds. See &ldquo;Payments&rdquo; in
            our{" "}
            <Link href="/terms" className="underline hover:text-paper-ink">
              Terms of Service
            </Link>
            .
          </P>
          <H3>Technical &amp; usage information</H3>
          <P>
            If something breaks, error details (which may include parts of the data you were
            working with at the time) are sent to our error-monitoring provider (Sentry) so we can
            fix it. We do not use advertising trackers or sell browsing data — nothing in Aernova
            is built for that.
          </P>

          <H2>How we use it</H2>
          <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-7 text-paper-ink-body">
            <li>To operate the Service — jobs, scheduling, quotes, invoices, and reports.</li>
            <li>
              To generate roof measurements from drone photos, using a third-party photogrammetry
              processor.
            </li>
            <li>
              To send transactional email — a quote, an invoice, a reminder — through our email
              provider (Resend), and only when a Contractor chooses to send one.
            </li>
            <li>
              To power optional AI-assisted drafting (turning a photo or a rough note into a job
              or quote draft) using Anthropic&rsquo;s API. Every AI-drafted result is shown to the
              Contractor for review before it is saved or sent — nothing generated by AI reaches a
              Client without a person reading it first.
            </li>
            <li>To detect and fix errors, and to keep the Service secure.</li>
          </ul>

          <H2>Who we share it with</H2>
          <P>
            We share personal information with the following service providers, only as needed to
            provide the Service, and under agreements that restrict them from using it for
            anything else:
          </P>
          <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-7 text-paper-ink-body">
            <li>
              <strong>Clerk</strong> — authentication and account management.
            </li>
            <li>
              <strong>Stripe</strong> — payment processing and Contractor payout accounts (Stripe
              Connect).
            </li>
            <li>
              <strong>Resend</strong> — sending quote, invoice, and reminder emails on a
              Contractor&rsquo;s behalf.
            </li>
            <li>
              <strong>Anthropic</strong> — AI-assisted drafting features, when a Contractor uses
              them.
            </li>
            <li>
              <strong>Sentry</strong> — error monitoring.
            </li>
            <li>
              <strong>Our photogrammetry processing provider</strong> — turning uploaded drone
              photos into a 3D model and measurements.
            </li>
            <li>
              <strong>Our storage provider</strong> — hosting uploaded photos and documents.
            </li>
          </ul>
          <P>
            We do not sell personal information, and we do not share it with anyone for their own
            marketing purposes.
          </P>

          <H2>Where your information is processed</H2>
          <P>
            Some of the providers listed above process information outside Canada, including in
            the United States. Where that happens, we rely on that provider&rsquo;s own contractual
            and security commitments, and, for Quebec residents specifically, we carry out the
            assessment Quebec law requires before any personal information is sent outside the
            province — see &ldquo;Quebec residents&rdquo; below.
          </P>

          <H2>How long we keep it</H2>
          <P>
            We keep account and Client information for as long as a Contractor&rsquo;s account is
            active, and for a reasonable period after closure to meet legal, accounting, and
            dispute-resolution obligations. A Contractor can request deletion of their account and
            associated data at any time — see &ldquo;Your rights&rdquo; below.
          </P>

          <H2>Security</H2>
          <P>
            We use industry-standard safeguards — encryption in transit, access controls scoped to
            each company&rsquo;s own data, and monitoring for unauthorized access — to protect
            personal information. No system is completely secure, and we can&rsquo;t guarantee
            information will never be accessed, disclosed, or lost as a result of a breach of
            these safeguards.
          </P>

          <H2>Cookies &amp; similar technology</H2>
          <P>
            We use a session cookie to keep you signed in, and a small piece of local storage to
            remember your light/dark theme preference. We do not use advertising or
            cross-site tracking cookies.
          </P>

          <H2>Your rights</H2>
          <P>
            Subject to some exceptions, you can ask us to: tell you what personal information we
            hold about you, correct it, or delete it. A homeowner whose information was entered by
            a Contractor should generally start with that Contractor, since they control what was
            collected and why — but you can also contact us directly at{" "}
            <a href="mailto:privacy@aernova.ca" className="underline hover:text-paper-ink">
              privacy@aernova.ca
            </a>{" "}
            and we will help route the request.
          </P>

          <H2>Quebec residents</H2>
          <P>
            Quebec&rsquo;s <em>Act respecting the protection of personal information in the
            private sector</em>, as amended by Law 25, gives Quebec residents additional rights and
            imposes additional obligations on us:
          </P>
          <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-7 text-paper-ink-body">
            <li>
              We have designated a <strong>Privacy Officer</strong>, reachable at{" "}
              <a href="mailto:privacy@aernova.ca" className="underline hover:text-paper-ink">
                privacy@aernova.ca
              </a>
              , responsible for overseeing our compliance with Quebec privacy law.
            </li>
            <li>
              Before personal information about a Quebec resident is sent to a service provider
              outside Quebec, we assess whether that information will receive protection
              equivalent to Quebec law before doing so.
            </li>
            <li>
              If a breach creates a risk of serious injury to you, we will notify you and the
              Commission d&rsquo;accès à l&rsquo;information (CAI) as required by law.
            </li>
            <li>
              You have the right to request that we stop disseminating your personal information,
              or de-index it, in the circumstances Quebec law allows.
            </li>
            <li>
              You can file a complaint with the CAI if you believe we have not met these
              obligations.
            </li>
          </ul>
          <P>
            <em>
              A French-language version of this policy, and of our Terms of Service, is required
              for Quebec consumers under Quebec&rsquo;s Charter of the French Language and has not
              yet been prepared — see the note at the end of this document.
            </em>
          </P>

          <H2>Outside Quebec</H2>
          <P>
            For residents of the rest of Canada, our collection, use, and disclosure of personal
            information is governed by the federal{" "}
            <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA). You
            can file a complaint with the Office of the Privacy Commissioner of Canada if you
            believe we have not met our obligations under that Act.
          </P>

          <H2>Children</H2>
          <P>
            The Service is a business tool for trades contractors and is not directed at children.
            We do not knowingly collect personal information from children.
          </P>

          <H2>Changes to this policy</H2>
          <P>
            If we make a material change to how we handle personal information, we will update the
            date at the top of this page and, where appropriate, notify Contractors directly.
          </P>

          <H2>Contact us</H2>
          <P>
            Aernova Inc.
            <br />
            [Registered office address — Ontario, Canada]
            <br />
            <a href="mailto:privacy@aernova.ca" className="underline hover:text-paper-ink">
              privacy@aernova.ca
            </a>
          </P>

          <div className="mt-10 rounded-xl border border-paper-rule bg-paper-inset p-4">
            <p className="text-sm leading-6 text-paper-ink-muted">
              <strong className="text-paper-ink">Before this governs real customers:</strong> this
              draft has not been reviewed by a lawyer, the registered office address is a
              placeholder, and Quebec&rsquo;s Charter of the French Language requires a proper
              French translation of both this policy and the Terms of Service — that is a
              legal-translation task, not something to generate casually given it would become
              part of a binding contract of adhesion. A one-time paid legal review is strongly
              recommended before this is relied on with real customer data and real payments in
              play.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
