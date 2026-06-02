import { TopNav } from "@/components/TopNav";
import { Footer } from "@/screens/Landing";

const UPDATED = "2 June 2026";
const CONTACT = "support@claude-academy.app";

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <h1 className="text-4xl font-bold tracking-tightest md:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>
        <div className="prose mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Terms() {
  return (
    <Doc title="Terms of Service">
      <p>
        These Terms govern your use of Claude Certification Academy ("the Service"), an independent
        exam-preparation platform. The Service is <strong>not affiliated with, endorsed by, or sponsored
        by Anthropic</strong>. By creating an account or using the Service you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        We provide practice exams, analytics, and an AI study assistant aligned to the publicly known
        certification blueprint. Practice material is for preparation only and does not guarantee any exam
        result. We do not administer the official certification.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for activity under your account and for keeping your sign-in method secure. You
        must provide an email address you control. You may delete your account at any time, which removes
        your stored exam results and practice history.
      </p>

      <h2>3. Plans, billing, and refunds</h2>
      <ul>
        <li>Paid plans are billed in advance through our payment processor (Stripe). Prices are shown at checkout.</li>
        <li>You may cancel a subscription at any time; access continues until the end of the paid period.</li>
        <li>First purchases include a 7-day money-back guarantee. Contact {CONTACT} to request a refund.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to misuse the Service, including: reselling or redistributing question content,
        attempting to bypass usage limits or access controls, or using automated means to extract the
        question bank.</p>

      <h2>5. AI assistant</h2>
      <p>
        The AI study assistant generates explanations and practice questions. Output may contain errors and
        should be verified against authoritative sources. Messages you send to the assistant are processed by
        our model provider to generate a response (see the Privacy Policy).
      </p>

      <h2>6. Disclaimers &amp; liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by
        law, we are not liable for indirect or consequential damages, and our total liability is limited to
        the amount you paid in the 12 months preceding the claim.
      </p>

      <h2>7. Changes</h2>
      <p>We may update these Terms; material changes will be announced in-app. Continued use after changes
        take effect constitutes acceptance.</p>

      <h2>8. Contact</h2>
      <p>Questions about these Terms: {CONTACT}.</p>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <p>
        This policy explains what data Claude Certification Academy collects, why, and your rights over it.
        We collect the minimum needed to run the Service.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and display name (from email or OAuth provider).</li>
        <li><strong>Learning data:</strong> mock-exam results, per-topic scores, and practice answers you submit.</li>
        <li><strong>AI assistant data:</strong> messages you send to the study assistant, to produce a response.</li>
        <li><strong>Billing data:</strong> handled entirely by Stripe; we store only your plan status, never card details.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>To authenticate you, persist your progress across devices, compute analytics and readiness, enforce
        plan limits, and operate the AI assistant. We do <strong>not</strong> sell your personal data or use it
        for third-party advertising.</p>

      <h2>3. Processors</h2>
      <ul>
        <li><strong>Supabase</strong> — authentication and database (your data is row-level-security isolated to your account).</li>
        <li><strong>Anthropic</strong> — processes AI assistant messages to generate responses.</li>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li><strong>Sentry</strong> — error diagnostics (when enabled); we avoid sending personal data in error reports.</li>
      </ul>

      <h2>4. Storage in your browser</h2>
      <p>We store your sign-in session and a short-lived PKCE verifier in your browser's local storage so you
        stay signed in. These are not advertising cookies.</p>

      <h2>5. Your rights</h2>
      <ul>
        <li>Access and export your learning data.</li>
        <li>Delete your account and associated data at any time.</li>
        <li>Request correction of inaccurate account data.</li>
      </ul>
      <p>To exercise these rights, contact {CONTACT}.</p>

      <h2>6. Retention</h2>
      <p>We keep your data while your account is active. On deletion, learning data is removed; minimal billing
        records may be retained where required by law.</p>

      <h2>7. Contact</h2>
      <p>Privacy questions: {CONTACT}.</p>
    </Doc>
  );
}
