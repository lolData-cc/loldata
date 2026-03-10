export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4">
      {/* Header tag */}
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-jade/40 mb-6">
        :: LEGAL :: PRIVACY_POLICY ::
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-mechano text-2xl text-flash/90 flex items-center gap-3">
          <span className="text-jade/50 text-sm">◈</span>
          Privacy Policy
        </h1>
        <span className="font-mono text-[10px] text-flash/25 tracking-[0.15em] whitespace-nowrap mt-2">
          Last updated: March 2026
        </span>
      </div>

      {/* Title separator */}
      <div
        className="w-48 h-px mb-10"
        style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.4), transparent)" }}
      />

      {/* Intro */}
      <p className="text-sm text-flash/50 leading-relaxed mb-10 font-jetbrains">
        This Privacy Policy describes how loldata.cc ("we", "us", or "our") collects, uses, and
        protects your information when you use our website and services. By using loldata.cc, you
        agree to the collection and use of information in accordance with this policy.
      </p>

      <div className="space-y-10">
        <LegalSection n={1} title="Information We Collect">
          <p>We collect the following types of information:</p>
          <ul>
            <li>
              <strong className="text-flash/60">Riot Account Data:</strong> When you sign in via
              Riot Sign-On (RSO), we receive your Riot ID (game name and tagline), PUUID, and
              region. We use the Riot Games API to retrieve your match history, champion mastery,
              ranked statistics, and live game status.
            </li>
            <li>
              <strong className="text-flash/60">Authentication Data:</strong> We use Supabase for
              authentication. Your account session tokens are stored securely and managed by
              Supabase infrastructure.
            </li>
            <li>
              <strong className="text-flash/60">Discord Account Data:</strong> If you choose to
              link your Discord account, we store your Discord user ID and username for profile
              integration purposes.
            </li>
            <li>
              <strong className="text-flash/60">Usage Data:</strong> We may collect anonymous
              analytics data such as pages visited and features used to improve the service.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n={2} title="How We Use Your Information">
          <p>Your information is used to:</p>
          <ul>
            <li>Display your League of Legends match history, champion statistics, and performance analytics.</li>
            <li>Provide personalized features such as live game detection and post-match analysis.</li>
            <li>Link your Riot account to your loldata.cc profile for a unified experience.</li>
            <li>Process subscription payments through Stripe for premium features.</li>
            <li>Improve and maintain the quality of our service.</li>
          </ul>
        </LegalSection>

        <LegalSection n={3} title="Third-Party Services">
          <p>We integrate with the following third-party services:</p>
          <ul>
            <li>
              <strong className="text-flash/60">Riot Games API:</strong> To retrieve game data.
              Subject to the{" "}
              <a href="https://developer.riotgames.com/policies/general" target="_blank" rel="noopener noreferrer" className="text-jade/60 hover:text-jade transition-colors underline underline-offset-2">
                Riot Games API Terms
              </a>.
            </li>
            <li>
              <strong className="text-flash/60">Supabase:</strong> For user authentication and
              database storage.
            </li>
            <li>
              <strong className="text-flash/60">Stripe:</strong> For processing subscription
              payments. We do not store your payment card details — Stripe handles all payment data
              securely.
            </li>
            <li>
              <strong className="text-flash/60">Discord:</strong> For optional account linking. We
              only access your public Discord profile information.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n={4} title="Data Storage & Security">
          <p>
            Your data is stored on secure servers managed by Supabase. We implement
            industry-standard security measures to protect your information from unauthorized
            access, alteration, or destruction. However, no method of transmission over the
            internet or electronic storage is 100% secure, and we cannot guarantee absolute
            security.
          </p>
        </LegalSection>

        <LegalSection n={5} title="Your Rights">
          <p>You have the right to:</p>
          <ul>
            <li>
              <strong className="text-flash/60">Access:</strong> View the personal data we hold
              about you through your dashboard.
            </li>
            <li>
              <strong className="text-flash/60">Unlink:</strong> Disconnect your Riot account or
              Discord account at any time from your profile settings.
            </li>
            <li>
              <strong className="text-flash/60">Delete:</strong> Request complete deletion of your
              account and associated data by contacting us.
            </li>
            <li>
              <strong className="text-flash/60">Opt out:</strong> You may stop using the service
              at any time. Unlinking your Riot account will stop all data retrieval.
            </li>
          </ul>
        </LegalSection>

        <LegalSection n={6} title="Cookies & Local Storage">
          <p>
            We use browser local storage and session storage to maintain your authentication
            session, store user preferences (such as UI settings and theme choices), and prevent
            duplicate notifications. We do not use third-party tracking cookies. Anonymous analytics
            may be collected via Google Analytics.
          </p>
        </LegalSection>

        <LegalSection n={7} title="Children's Privacy">
          <p>
            loldata.cc is not intended for use by anyone under the age of 13. We do not knowingly
            collect personal information from children under 13. If you believe a child has provided
            us with personal data, please contact us and we will promptly delete it. Users must
            comply with the Riot Games Terms of Service age requirements.
          </p>
        </LegalSection>

        <LegalSection n={8} title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated "Last updated" date. Your continued use of loldata.cc after any
            changes constitutes acceptance of the revised policy.
          </p>
        </LegalSection>

        <LegalSection n={9} title="Contact Us">
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            you can reach us through our{" "}
            <a href="https://discord.gg/SNjKYbdXzG" target="_blank" rel="noopener noreferrer" className="text-jade/60 hover:text-jade transition-colors underline underline-offset-2">
              Discord server
            </a>.
          </p>
        </LegalSection>
      </div>

      {/* Bottom separator */}
      <div
        className="w-full h-px mt-14"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,146,0.15), transparent)" }}
      />
    </div>
  )
}

/* ── Shared section component ── */
function LegalSection({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-mechano text-base text-flash/70 flex items-center gap-2 mb-1">
        <span className="text-jade/30 font-mono text-xs">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div
        className="w-20 h-px mb-4"
        style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.25), transparent)" }}
      />
      <div className="text-sm text-flash/50 leading-relaxed font-jetbrains space-y-3 [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:mt-2 [&_li]:pl-4 [&_li]:relative [&_li]:before:content-['◆'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-jade/20 [&_li]:before:text-[6px] [&_li]:before:top-[7px]">
        {children}
      </div>
    </section>
  )
}
