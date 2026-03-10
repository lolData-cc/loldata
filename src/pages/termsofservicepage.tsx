export default function TermsOfServicePage() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4">
      {/* Header tag */}
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-jade/40 mb-6">
        :: LEGAL :: TERMS_OF_SERVICE ::
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-mechano text-2xl text-flash/90 flex items-center gap-3">
          <span className="text-jade/50 text-sm">◈</span>
          Terms of Service
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
        Please read these Terms of Service ("Terms") carefully before using loldata.cc. By
        accessing or using our website and services, you agree to be bound by these Terms. If you
        do not agree, you may not use the service.
      </p>

      <div className="space-y-10">
        <LegalSection n={1} title="Acceptance of Terms">
          <p>
            By creating an account or using loldata.cc, you confirm that you have read, understood,
            and agree to these Terms of Service and our Privacy Policy. We reserve the right to
            update these Terms at any time. Continued use of the service after changes are posted
            constitutes acceptance of the revised Terms.
          </p>
        </LegalSection>

        <LegalSection n={2} title="Description of Service">
          <p>
            loldata.cc is a League of Legends analytics platform that provides match history
            analysis, champion statistics, performance tracking, live game detection, leaderboards,
            and other data-driven features. The service retrieves publicly available game data
            through the official Riot Games API.
          </p>
        </LegalSection>

        <LegalSection n={3} title="User Accounts">
          <p>
            To access certain features, you must sign in using Riot Sign-On (RSO) through our
            authentication provider (Supabase). You are responsible for maintaining the security of
            your account and for all activities that occur under your account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and current information during registration.</li>
            <li>Not share your account credentials with third parties.</li>
            <li>Notify us immediately of any unauthorized use of your account.</li>
          </ul>
        </LegalSection>

        <LegalSection n={4} title="Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Attempt to gain unauthorized access to any part of the service, other accounts, or computer systems.</li>
            <li>Interfere with or disrupt the service or servers connected to the service.</li>
            <li>Use automated tools (bots, scrapers, crawlers) to access the service without our express written permission.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the service.</li>
            <li>Resell, redistribute, or commercially exploit the service or its data without authorization.</li>
          </ul>
        </LegalSection>

        <LegalSection n={5} title="Intellectual Property">
          <p>
            loldata.cc is not affiliated with or endorsed by Riot Games, Inc. League of Legends,
            Teamfight Tactics, and Riot Games are trademarks or registered trademarks of Riot
            Games, Inc. All game assets, champion images, item icons, and related content are the
            property of Riot Games, Inc. and are used in compliance with the Riot Games API Terms
            of Service.
          </p>
          <p>
            The loldata.cc website design, branding, original code, and user interface are the
            intellectual property of loldata.cc. You may not copy, modify, or distribute our
            proprietary content without express written permission.
          </p>
        </LegalSection>

        <LegalSection n={6} title="Subscriptions & Payments">
          <p>
            loldata.cc offers optional premium subscription plans. Payments are processed securely
            through Stripe. By subscribing, you agree to:
          </p>
          <ul>
            <li>Pay the applicable subscription fees as listed at the time of purchase.</li>
            <li>Recurring billing until you cancel your subscription.</li>
            <li>Cancellation takes effect at the end of the current billing period.</li>
          </ul>
          <p>
            We reserve the right to modify pricing with reasonable notice. Refund requests are
            handled on a case-by-case basis.
          </p>
        </LegalSection>

        <LegalSection n={7} title="Disclaimer of Warranties">
          <p>
            The service is provided "as is" and "as available" without warranties of any kind,
            whether express or implied. We do not warrant that the service will be uninterrupted,
            error-free, or free of harmful components. Game data accuracy depends on the Riot Games
            API and may be subject to delays or inaccuracies beyond our control.
          </p>
        </LegalSection>

        <LegalSection n={8} title="Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, loldata.cc and its operators shall
            not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of data, profits, or goodwill, arising from your use
            of or inability to use the service.
          </p>
        </LegalSection>

        <LegalSection n={9} title="Third-Party Services">
          <p>
            The service integrates with third-party platforms including Riot Games, Discord,
            Supabase, and Stripe. Your use of these third-party services is governed by their
            respective terms and privacy policies. We are not responsible for the practices or
            content of any third-party services.
          </p>
        </LegalSection>

        <LegalSection n={10} title="Termination">
          <p>
            We may suspend or terminate your access to the service at our sole discretion, without
            prior notice, for conduct that we believe violates these Terms or is harmful to other
            users, us, or third parties. Upon termination, your right to use the service ceases
            immediately. You may also delete your account at any time through your profile settings.
          </p>
        </LegalSection>

        <LegalSection n={11} title="Changes to Terms">
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated through the website or our Discord server. Your continued use of loldata.cc
            after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </LegalSection>

        <LegalSection n={12} title="Contact Us">
          <p>
            If you have questions about these Terms of Service, please reach out through our{" "}
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
