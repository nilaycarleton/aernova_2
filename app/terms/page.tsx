import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Aernova",
  description: "The terms governing use of the Aernova platform.",
};

const updated = "August 7, 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-xl font-semibold text-paper-ink">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-prose leading-7 text-paper-ink-body">{children}</p>;
}

export default function TermsOfServicePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-paper px-4 py-12 text-paper-ink-body outline-none sm:px-6">
      <div className="mx-auto max-w-3xl">
        <article className="rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <p className="text-sm uppercase tracking-[0.14em] text-paper-ink-faint">
            Last updated {updated}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-paper-ink">Terms of Service</h1>
          <P>
            These terms are an agreement between <strong>Aernova Inc.</strong>, a corporation
            existing under the laws of Ontario, Canada (&ldquo;Aernova,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;), and the trades contractor or company creating an account
            (&ldquo;you,&rdquo; the &ldquo;Contractor&rdquo;) to use the Aernova platform (the
            &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to
            these terms.
          </P>
          <P>
            <em>
              This is a draft prepared without review by a licensed lawyer — see the note at the
              end of this document before relying on it for a real launch.
            </em>
          </P>

          <H2>What Aernova is</H2>
          <P>
            Aernova is a platform for running a trades business: tracking jobs, scheduling visits,
            building and sending quotes, raising invoices, and — for roofing — turning drone
            photos into an estimated 3D model and roof measurements. It is a tool you use to run
            your business; it does not run your business for you, and it does not review or
            approve your quotes, invoices, or communications with your own clients before you send
            them, except where a feature explicitly says otherwise.
          </P>

          <H2>Your account</H2>
          <P>
            You must provide accurate information when creating an account and keep it current.
            You are responsible for everything that happens under your account, including actions
            taken by anyone you invite to your company&rsquo;s workspace. Tell us right away at{" "}
            <a href="mailto:support@aernova.ca" className="underline hover:text-paper-ink">
              support@aernova.ca
            </a>{" "}
            if you believe your account has been accessed without authorization.
          </P>

          <H2>Your clients&rsquo; information</H2>
          <P>
            You will enter information about your own customers — names, contact details,
            property addresses, photos — into the Service. You are responsible for having a lawful
            basis to collect and share that information with us, and for your own compliance with
            privacy law in how you run your business. We process it on your behalf to provide the
            Service; see our{" "}
            <Link href="/privacy" className="underline hover:text-paper-ink">
              Privacy Policy
            </Link>{" "}
            for how we handle it.
          </P>

          <H2>Fees</H2>
          <P>
            As of the date above, Aernova does not charge a subscription fee to use the core
            Service. We may introduce paid plans or paid add-ons in the future; if we do, we will
            tell you what they cost and you will not be charged unless you affirmatively choose to
            upgrade.
          </P>

          <H2>Payments between you and your clients</H2>
          <P>
            If you connect a Stripe account, your clients can pay an invoice online by card.
            <strong> Aernova is not a party to that payment.</strong> Funds go directly from your
            client to your own Stripe account — Aernova never holds, controls, or has access to
            that money, and is not the merchant of record for it. Stripe&rsquo;s own terms govern
            the payment processing itself; disputes about a specific charge or payout are between
            you, your client, and Stripe.
          </P>

          <H2>Measurements and AI-generated content are estimates</H2>
          <P>
            Roof measurements produced from drone photos are estimates derived from a photogrammetric
            reconstruction, not a certified survey. Content drafted by AI features — a job
            description, a scope of work, a follow-up message — is a starting point for you to
            review, edit, and approve, not a finished document. You are responsible for checking
            any measurement or AI-drafted content before relying on it for a bid, a contract, or
            anything you send to a client. Aernova does not guarantee the accuracy of a
            measurement or the correctness of AI-generated content.
          </P>

          <H2>Acceptable use</H2>
          <P>You agree not to:</P>
          <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-7 text-paper-ink-body">
            <li>Use the Service for anything illegal, fraudulent, or harassing.</li>
            <li>
              Try to access another company&rsquo;s data, or probe, scan, or test the Service for
              vulnerabilities without our written permission.
            </li>
            <li>
              Reverse-engineer, decompile, or attempt to extract the source code of the Service,
              except where the law gives you the right to do so despite this restriction.
            </li>
            <li>
              Use the AI features to generate content that is illegal, deceptive, or that
              impersonates a real person or business other than your own.
            </li>
            <li>Resell or white-label the Service without our written permission.</li>
          </ul>

          <H2>Ownership</H2>
          <P>
            We own the Aernova software and platform. You own the content you put into it — your
            job records, photos, client information, and the quotes and invoices you create. You
            grant us a limited license to host, process, and display that content solely to
            provide the Service to you.
          </P>

          <H2>Third-party services</H2>
          <P>
            The Service relies on third-party providers to work — for authentication, payments,
            email delivery, AI-assisted drafting, error monitoring, drone-photo processing, and
            file storage. Our use of them is described in our{" "}
            <Link href="/privacy" className="underline hover:text-paper-ink">
              Privacy Policy
            </Link>
            . If one of them has an outage, part of the Service may be unavailable until it&rsquo;s
            resolved.
          </P>

          <H2>Suspension and termination</H2>
          <P>
            You can stop using the Service and close your account at any time. We may suspend or
            terminate an account that violates these terms, or that we reasonably believe poses a
            security risk to the Service or to other companies&rsquo; data. Where practical, we
            will give you notice and a chance to export your data first.
          </P>

          <H2>&ldquo;As is,&rdquo; and limitation of liability</H2>
          <P>
            The Service is provided &ldquo;as is,&rdquo; without warranties of any kind, express or
            implied, except where the law does not allow us to exclude them. To the maximum extent
            the law allows, Aernova is not liable for indirect, incidental, or consequential
            damages, or for lost profits or lost data, arising from your use of the Service. Our
            total liability to you for any claim arising from these terms or the Service is
            limited to the amount you paid us, if any, in the twelve months before the claim
            arose.
          </P>
          <P>
            Nothing in this section limits liability that cannot be limited under the law of
            Ontario or of any province where you are located, including for gross negligence or
            wilful misconduct.
          </P>

          <H2>Indemnification</H2>
          <P>
            You agree to defend and indemnify Aernova against claims arising from your misuse of
            the Service, your violation of these terms, or the information you submit about your
            clients, except to the extent the claim arises from our own breach of these terms.
          </P>

          <H2>Changes to these terms</H2>
          <P>
            We may update these terms from time to time. If we make a material change, we will
            update the date at the top of this page and, where appropriate, notify you directly.
            Continuing to use the Service after a change takes effect means you accept it.
          </P>

          <H2>Governing law</H2>
          <P>
            These terms are governed by the laws of the Province of Ontario and the federal laws
            of Canada applicable in Ontario, without regard to conflict-of-law principles. Any
            dispute will be resolved in the courts of Ontario, except where a mandatory consumer-
            protection law gives you the right to a different forum.
          </P>

          <H2>Contact us</H2>
          <P>
            Aernova Inc.
            <br />
            [Registered office address — Ontario, Canada]
            <br />
            <a href="mailto:support@aernova.ca" className="underline hover:text-paper-ink">
              support@aernova.ca
            </a>
          </P>

          <div className="mt-10 rounded-xl border border-paper-rule bg-paper-inset p-4">
            <p className="text-sm leading-6 text-paper-ink-muted">
              <strong className="text-paper-ink">Before this governs real customers:</strong> this
              draft has not been reviewed by a lawyer, the registered office address is a
              placeholder, and Quebec&rsquo;s Charter of the French Language requires a proper
              French translation of these terms and of the Privacy Policy before they can be used
              as a contract of adhesion with Quebec consumers — that is a legal-translation task,
              not something to generate casually. A one-time paid legal review is strongly
              recommended before this is relied on with real customer data and real payments in
              play.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
