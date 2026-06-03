import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { FileText, Award, AlertCircle, HelpCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — TourVista" },
      { name: "description", content: "Read TourVista's terms of service and usage conditions for our 360° virtual tour publishing platform." },
    ],
  }),
  component: TermsConditions,
});

function TermsConditions() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
              <p className="text-sm text-muted-foreground">Last Updated: June 3, 2026</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            Please read these Terms & Conditions ("Terms", "Terms of Service") carefully before using the TourVista platform operated by us.
          </p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-10 items-start">
          {/* Quick Links */}
          <aside className="sticky top-6 hidden md:block space-y-2 border-l pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Sections</p>
            <a href="#acceptance" className="block text-sm text-muted-foreground hover:text-foreground">1. Acceptance of Terms</a>
            <a href="#accounts" className="block text-sm text-muted-foreground hover:text-foreground">2. User Accounts</a>
            <a href="#billing" className="block text-sm text-muted-foreground hover:text-foreground">3. Billing & Payments</a>
            <a href="#content-license" className="block text-sm text-muted-foreground hover:text-foreground">4. User Uploaded Content</a>
            <a href="#google-integration" className="block text-sm text-primary font-medium hover:text-primary-glow">5. Google API Terms</a>
            <a href="#limitations" className="block text-sm text-muted-foreground hover:text-foreground">6. Limitations of Liability</a>
            <a href="#termination" className="block text-sm text-muted-foreground hover:text-foreground">7. Account Termination</a>
            <a href="#governing-law" className="block text-sm text-muted-foreground hover:text-foreground">8. Governing Law</a>
          </aside>

          {/* Legal Text */}
          <div className="prose prose-blue max-w-none space-y-8 text-foreground/90">
            <section id="acceptance" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using the TourVista platform, you agree to be bound by these Terms and all applicable laws and regulations. If you disagree with any part of these Terms, you do not have permission to access the service.
              </p>
            </section>

            <section id="accounts" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">2. User Accounts</h2>
              <p className="leading-relaxed mb-3">
                When you create an account with us, you represent and warrant that the information you provide is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account.
              </p>
              <p className="leading-relaxed text-sm">
                You are responsible for maintaining the confidentiality of your account credentials, including but not limited to your password. You agree to accept responsibility for any and all activities or actions that occur under your account.
              </p>
            </section>

            <section id="billing" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">3. Billing & Payments (Razorpay)</h2>
              <p className="leading-relaxed mb-3">
                TourVista offers both free trial periods and paid subscription plans. Paid plans are billed in Indian Rupees (INR) and are inclusive of relevant GST rates (tax invoices will be sent to your email).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mb-3">
                <li><strong>Payment Gateway:</strong> All financial transactions, subscriptions, and card/UPI charges are processed securely via <strong>Razorpay</strong>.</li>
                <li><strong>Renewals:</strong> Subscriptions are billed on a recurring monthly or annual basis depending on your plan. They automatically renew unless you cancel them via the Settings panel before your billing date.</li>
                <li><strong>Refunds:</strong> Payments are non-refundable except where explicitly required by consumer protection laws or decided in writing by our support team.</li>
              </ul>
            </section>

            <section id="content-license" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">4. User Uploaded Content & Media</h2>
              <p className="leading-relaxed mb-3">
                Our Service allows you to upload, link, store, and share 360-degree panorama images and related location/metadata ("Content"). You retain any and all of your rights to any Content you submit, post, or display on or through the Service.
              </p>
              <p className="leading-relaxed text-sm">
                By uploading Content, you grant TourVista a worldwide, non-exclusive, royalty-free license to host, store, transfer, display, and modify your images solely for the purpose of operating the services (such as applying nadir logo blurs, organizing nodes, and transferring data to Google's servers).
              </p>
            </section>

            <section id="google-integration" className="scroll-mt-6 p-5 rounded-xl border border-primary/20 bg-primary/5">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5" /> 5. Google API & Street View Integration
              </h2>
              <p className="leading-relaxed text-sm mb-3">
                TourVista utilizes the official Google Street View Publish API to upload your 360° panoramas directly to Google Maps on your behalf.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mb-3">
                <li><strong>Third-Party Compliance:</strong> By linking your Google account and using our publishing features, you agree to be bound by the <a href="https://www.google.com/intl/en/help/terms_maps/" target="_blank" rel="noreferrer" className="underline font-semibold text-primary">Google Maps/Google Earth Additional Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline font-semibold text-primary">Google Privacy Policy</a>.</li>
                <li><strong>Google Processing Queues:</strong> We do not control Google's moderation queues, image compression, search rankings, or approval timelines. Most tours are published within 24–48 hours, but we make no warranties regarding Google's approval or publishing performance.</li>
                <li><strong>Content Removal:</strong> If Google rejects or removes your panoramas due to violation of their imagery policies, TourVista is not responsible. You must ensure your images comply with Google's Maps User Contributed Content Policy.</li>
              </ul>
            </section>

            <section id="limitations" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">6. Limitations of Liability</h2>
              <p className="leading-relaxed text-sm">
                In no event shall TourVista, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use, or alteration of your transmissions or content.
              </p>
            </section>

            <section id="termination" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">7. Account Termination</h2>
              <p className="leading-relaxed">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section id="governing-law" className="scroll-mt-6 p-5 rounded-xl border border-muted bg-muted/20">
              <h2 className="text-xl font-bold mb-2">8. Governing Law</h2>
              <p className="text-sm leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be subject to the exclusive jurisdiction of courts located in India.
              </p>
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
