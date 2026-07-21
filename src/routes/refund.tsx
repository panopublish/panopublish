import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — PanoPublish" },
      {
        name: "description",
        content:
          "Review PanoPublish's Refund & Cancellation Policy. Learn about our 7-day free trial, cancellation steps, and refund request conditions.",
      },
    ],
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
      <SEO
        title="Refund & Cancellation Policy"
        description="Review PanoPublish's Refund & Cancellation Policy. Learn about our 7-day free trial, cancellation steps, and refund request conditions."
        breadcrumbs={[
          { name: "Home", url: "https://app.panopublish.com/" },
          { name: "Refund Policy", url: "https://app.panopublish.com/refund" },
        ]}
      />
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Refund & Cancellation Policy</h1>
              <p className="text-sm text-muted-foreground">Last Updated: July 21, 2026</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            Thank you for choosing PanoPublish. We strive to provide the best virtual tour publishing service. Please read our policy regarding refunds and subscription cancellations.
          </p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-10 items-start">
          {/* Quick Links */}
          <aside className="sticky top-6 hidden md:block space-y-2 border-l pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Sections
            </p>
            <a href="#trial" className="block text-sm text-muted-foreground hover:text-foreground">
              1. 7-Day Free Trial
            </a>
            <a href="#cancellation" className="block text-sm text-muted-foreground hover:text-foreground">
              2. Subscription Cancellation
            </a>
            <a href="#refunds" className="block text-sm text-muted-foreground hover:text-foreground">
              3. Refund Conditions
            </a>
            <a href="#processing" className="block text-sm text-muted-foreground hover:text-foreground">
              4. Refund Processing
            </a>
            <a href="#contact" className="block text-sm text-primary font-medium hover:text-primary-glow">
              5. Get Help
            </a>
          </aside>

          {/* Detailed Content */}
          <div className="space-y-8 leading-relaxed text-sm md:text-base">
            <section id="trial" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">1. 7-Day Free Trial</h2>
              <p className="text-muted-foreground">
                We offer a 7-day free trial for all our subscription plans (Basic, Pro, and Agency) so you can evaluate our platform's publishing tools, nadir editors, and auto-linking features before making a payment.
              </p>
              <p className="text-muted-foreground mt-2">
                During this trial period, no charges will be applied to your account. You can cancel your trial at any time from your Account Settings with a single click without any obligation.
              </p>
            </section>

            <section id="cancellation" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">2. Subscription Cancellation</h2>
              <p className="text-muted-foreground">
                You may cancel your active PanoPublish subscription at any time. To cancel:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>Log in to your account.</li>
                <li>Go to <strong>Settings</strong> and navigate to the <strong>Billing</strong> tab.</li>
                <li>Click on the <strong>Cancel Subscription</strong> button under active plan details.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Upon cancellation, your subscription will remain active until the end of your current pre-paid billing cycle, and you will not be billed again.
              </p>
            </section>

            <section id="refunds" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">3. Refund Conditions</h2>
              <p className="text-muted-foreground">
                Since we offer a fully functional 7-day free trial, refunds are generally not provided for partially used billing periods or once a billing cycle has processed.
              </p>
              <p className="text-muted-foreground mt-2">
                However, exceptions may be made under the following circumstances:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>
                  <strong>Technical Failures:</strong> If a persistent technical issue on our platform completely prevents you from using the service, and our support team cannot resolve it within 7 business days of your request.
                </li>
                <li>
                  <strong>Accidental Renewal:</strong> If you intended to cancel but were charged due to a system lag, provided you request a refund within 48 hours of the renewal transaction.
                </li>
              </ul>
            </section>

            <section id="processing" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">4. Refund Processing</h2>
              <p className="text-muted-foreground">
                Approved refund requests will be processed back to the original payment method used during checkout (via our payment partner Razorpay).
              </p>
              <p className="text-muted-foreground mt-2">
                Refunds typically take <strong>5 to 7 business days</strong> to reflect in your bank account, credit card statement, or UPI account, depending on your financial institution.
              </p>
            </section>

            <section id="contact" className="scroll-mt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-3">5. Contact Support for Refunds</h2>
              <p className="text-muted-foreground">
                If you believe you qualify for a refund, or if you need assistance with cancelling your plan, please contact our support desk:
              </p>
              <ul className="list-none mt-2 space-y-1 text-muted-foreground font-semibold">
                <li>📧 Email: contact@panopublish.com</li>
                <li>💬 WhatsApp: Mon-Sat, 10 AM to 7 PM IST</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
