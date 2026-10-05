import { Analyzer } from "@/components/app/Analyzer";
import { PageHeader } from "@/components/app/signals";
import { Banner } from "@/components/app/Status";
import { getBusiness } from "@/lib/server/context";
import { env } from "@/lib/server/env";

export const metadata = { title: "Analyze a message — FollowUpOS" };

export default async function AppAnalyzePage() {
  const business = (await getBusiness())!;
  return (
    <>
      <PageHeader
        title="Analyze a message."
        subtitle="Paste any customer message — from WhatsApp, Instagram, a call note — and FollowUpOS reads it the same way it reads your inbox."
      />
      {!env.isConfigured.gemini() && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="warn" title="AI isn’t configured on this server">
            Add GEMINI_API_KEY to enable analysis.
          </Banner>
        </div>
      )}
      <Analyzer scope="account" defaults={{ businessType: business.business_type, language: business.language }} />
      <p className="ui-hint" style={{ marginTop: 16 }}>
        Uses your business facts from Settings. Drafts only quote what’s written there.
      </p>
    </>
  );
}
