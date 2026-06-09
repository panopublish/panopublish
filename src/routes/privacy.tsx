import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Shield, Lock, Eye, FileText, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TourVista" },
      { name: "description", content: "Read TourVista's privacy policy. Learn how we handle your personal data, Google Account connections, and panorama uploads securely." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Privacy Policy"
        description="Read TourVista's privacy policy. Learn how we handle your personal data, Google Account connections, and panorama uploads securely."
        breadcrumbs={[
          { name: "Home", url: "https://app.vista360digital.com/" },
          { name: "Privacy Policy", url: "https://app.vista360digital.com/privacy" }
        ]}
      />
      {/* Navigation */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 max-w-6xl">
          <Link to="/">
            <Logo logoClassName="text-primary h-8 w-8" className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm">Start Free Trial</Button></Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last Updated: June 3, 2026</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            At TourVista, we take your privacy and the security of your data seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our SaaS application.
          </p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-10 items-start">
          {/* Quick Links */}
          <aside className="sticky top-6 hidden md:block space-y-2 border-l pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Sections</p>
            <a href="#introduction" className="block text-sm text-muted-foreground hover:text-foreground">1. Introduction</a>
            <a href="#collect" className="block text-sm text-muted-foreground hover:text-foreground">2. Data We Collect</a>
            <a href="#google-api" className="block text-sm text-primary font-medium hover:text-primary-glow">3. Google API Data</a>
            <a href="#use" className="block text-sm text-muted-foreground hover:text-foreground">4. How We Use Data</a>
            <a href="#security" className="block text-sm text-muted-foreground hover:text-foreground">5. Data Security</a>
            <a href="#retention" className="block text-sm text-muted-foreground hover:text-foreground">6. Data Retention</a>
            <a href="#rights" className="block text-sm text-muted-foreground hover:text-foreground">7. Your Rights</a>
            <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">8. Contact Us</a>
          </aside>

          {/* Legal Text */}
          <div className="prose prose-blue max-w-none space-y-8 text-foreground/90">
            <section id="introduction" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">1. Introduction</h2>
              <p className="leading-relaxed">
                TourVista ("we," "our," or "us") provides a subscription-based software-as-a-service (SaaS) platform built to help businesses, digital marketing agencies, and photographers upload, organize, and publish 360-degree virtual tours directly to Google Street View via Google APIs. By registering for or using our services, you consent to the practices described in this Privacy Policy.
              </p>
            </section>

            <section id="collect" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">2. Information We Collect</h2>
              <p className="mb-3 leading-relaxed">
                We collect information to provide better services to our users. This includes:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li><strong>Account Credentials:</strong> Full name, email address, password, company name, and phone number when you register.</li>
                <li><strong>Billing Data:</strong> Transaction records and subscriber statuses processed securely via our payment gateway partner, Razorpay. We do not store credit card numbers or UPI PINs on our servers.</li>
                <li><strong>Uploaded Assets:</strong> 360-degree panorama images (.jpg, .jpeg), including embedded EXIF metadata (geographic location, camera make/model, orientation coordinates).</li>
                <li><strong>Authentication Tokens:</strong> OAuth tokens provided by Google when you explicitly link your Google Account to authorize publishing.</li>
              </ul>
            </section>

            <section id="google-api" className="scroll-mt-6 p-5 rounded-xl border border-primary/20 bg-primary/5">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5" /> 3. Google API Services User Data Policy
              </h2>
              <p className="leading-relaxed text-sm mb-3">
                TourVista's use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="underline font-semibold text-primary hover:text-primary-glow">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
              <p className="leading-relaxed text-sm mb-3 font-semibold">
                Specifically, our application requests access to the following scope:
              </p>
              <code className="block bg-card border rounded p-2 text-xs font-mono mb-4 text-primary break-all">
                https://www.googleapis.com/auth/streetviewpublish
              </code>
              <p className="leading-relaxed text-sm mb-3">
                <strong>How we use Google user data:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>We use Google OAuth credentials solely to upload and publish your 360° photo spheres to Google Street View on your behalf.</li>
                <li>We fetch and display your Google account email on your settings and publishing panels to confirm which account is currently connected.</li>
                <li>We do <strong>not</strong> share, sell, or transfer your Google OAuth tokens or profile details to third-party advertising platforms, data brokers, or any third party unless required to do so by law.</li>
                <li>You can disconnect your Google account and revoke access at any time through the <strong>Settings</strong> page inside TourVista, or directly through your Google account security panel.</li>
              </ul>
            </section>

            <section id="use" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">4. How We Use Your Information</h2>
              <p className="mb-3 leading-relaxed">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>To operate, maintain, and provide the features and functionality of the TourVista SaaS platform.</li>
                <li>To manage your active subscription plans and process GST invoicing.</li>
                <li>To connect photo nodes, construct virtual island paths, and publish scenes to Google Maps.</li>
                <li>To send transaction alerts, invoice receipts, and system notifications.</li>
                <li>To provide technical and customer support via our dedicated WhatsApp channel.</li>
              </ul>
            </section>

            <section id="security" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">5. Data Security</h2>
              <p className="leading-relaxed">
                We implement industry-standard administrative, physical, and technical safeguards to secure your personal data. All communications between the browser, server, and Supabase database are encrypted using TLS/SSL. Sensitive API keys and third-party tokens are stored using isolated, encrypted environment configuration vaults.
              </p>
            </section>

            <section id="retention" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">6. Data Retention</h2>
              <p className="leading-relaxed">
                We retain your account profile and uploaded photos for as long as your subscription is active, or as needed to provide you services. If you close your account or request data deletion, we will purge your uploaded assets and account tokens from our primary servers and databases within thirty (30) days, except where retention is legally required.
              </p>
            </section>

            <section id="rights" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">7. Your Rights</h2>
              <p className="leading-relaxed">
                Depending on your location, you have rights to inspect the personal data we hold, correct inaccuracies, request temporary restrictions on processing, or delete your information. To exercise these rights, please contact our support team.
              </p>
            </section>

            <section id="contact" className="scroll-mt-6 p-5 rounded-xl border border-muted bg-muted/20">
              <h2 className="text-xl font-bold mb-2">8. Contact Us</h2>
              <p className="text-sm leading-relaxed mb-3">
                If you have any questions, feedback, or concerns regarding this Privacy Policy or how your Google data is processed, please contact us:
              </p>
              <ul className="list-none space-y-1 text-sm">
                <li>📧 Email: <span className="font-semibold text-primary">contact@vista360digital.com</span></li>
                <li>💬 Support: Available on our official WhatsApp Support line.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-card mt-12">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground space-y-2 max-w-6xl">
          <div>Made with ❤️ in India  |  © 2026 TourVista</div>
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="hover:text-foreground underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground underline">Terms & Conditions</Link>
            <Link to="/" className="hover:text-foreground underline">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
