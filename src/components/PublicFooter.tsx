import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/format";

export function PublicFooter() {
  const serviceLinks = [
    { name: "Google Street View Publishing", url: "/google-street-view-publishing" },
    { name: "360° Virtual Tour Platform", url: "/360-virtual-tour-publishing-platform" },
    { name: "Real Estate Virtual Tour Software", url: "/real-estate-virtual-tour-software" },
    { name: "Custom Nadir Branding", url: "/nadir-branding-street-view" },
    { name: "Multi-Client Workspace", url: "/virtual-tour-client-management-software" },
    { name: "Street View for Hotels", url: "/google-street-view-for-hotels-india" },
    { name: "Street View for Real Estate", url: "/virtual-tour-real-estate-india" },
    { name: "360 Photo Connection Builder", url: "/360-photo-connection-builder-online" },
  ];

  const comparisonLinks = [
    { name: "PanoPublish vs CloudPano", url: "/cloudpano-alternative" },
    { name: "PanoPublish vs Matterport", url: "/matterport-alternative" },
    { name: "PanoPublish vs TourBuilder", url: "/tourbuilder-alternative-india" },
    { name: "PanoPublish vs GoThru", url: "/gothru-alternative" },
    { name: "PanoPublish vs Panoee", url: "/panoee-alternative" },
  ];

  const cityLinks = [
    { name: "Mumbai Local SEO", url: "/google-street-view-publishing-mumbai" },
    { name: "Delhi 360 Tours", url: "/360-virtual-tour-software-delhi" },
    { name: "Bangalore Tour Publishing", url: "/street-view-tour-publishing-bangalore" },
    { name: "Ahmedabad 360 Publishing", url: "/360-tour-publishing-ahmedabad" },
    { name: "Hyderabad Google Maps Tours", url: "/google-maps-360-tour-hyderabad" },
    { name: "Chennai Virtual Tour Software", url: "/virtual-tour-publishing-software-chennai" },
    { name: "Pune Photographer Software", url: "/street-view-photographer-software-pune" },
    { name: "Jaipur 360 Photography", url: "/360-photography-publishing-jaipur" },
    { name: "Kolkata Street View Tours", url: "/google-street-view-tour-kolkata" },
    { name: "Surat Virtual Tour Software", url: "/virtual-tour-software-surat" },
  ];

  return (
    <footer className="border-t bg-card pt-16 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 border-b pb-12">
          {/* Brand block */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/">
              <Logo logoClassName="text-primary h-8 w-8" className="text-xl font-bold" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              India's dedicated Google Street View and 360° virtual tour publishing platform. Built for photographers, agencies, hotels, and real estate professionals.
            </p>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Made with ❤️ in India | © 2026 PanoPublish</div>
              <div className="text-xs text-muted-foreground">Support Email: contact@panopublish.com</div>
            </div>
            <div className="text-xs flex items-center gap-1.5 bg-whatsapp/10 text-whatsapp px-3 py-1.5 rounded-full font-bold w-fit">
              <svg className="h-4 w-4 fill-whatsapp shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.012 2c-5.506 0-9.97 4.463-9.97 9.97 0 1.954.563 3.778 1.533 5.326L2 22l4.863-1.277c1.492.812 3.197 1.277 5.013 1.277 5.506 0 9.97-4.462 9.97-9.97 0-5.506-4.464-9.97-9.97-9.97zm5.556 14.133c-.244.688-1.22 1.25-1.676 1.302-.38.043-.876.086-2.457-.544-2.022-.806-3.327-2.868-3.432-3.007-.105-.138-.857-1.14-.857-2.176 0-1.036.541-1.545.733-1.754.192-.209.418-.261.558-.261.14 0 .28 0 .401.006.126.006.297-.047.464.356.172.417.587 1.433.637 1.538.05.105.084.227.013.367-.07.14-.15.304-.253.424-.105.12-.22.268-.314.372-.105.115-.213.24-.092.449.122.209.544.897 1.164 1.448.799.71 1.472.93 1.68.102.209.116.33.105.452.122.122.017.525-.61.666-.818.14-.209.28-.174.47-.105.193.07 1.22.575 1.43.68.209.105.349.157.401.247.052.09.052.525-.192 1.213z" />
              </svg>
              <a
                href={waLink("Hi, I have a query regarding PanoPublish plans")}
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-[11px]"
              >
                WhatsApp Support: Mon-Sat, 10am-7pm IST
              </a>
            </div>

            {/* Social Media Links for E-E-A-T & SEO */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://www.instagram.com/panopublish"
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="PanoPublish Instagram Profile"
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://x.com/panopublish"
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="PanoPublish X Twitter Profile"
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@panopublish"
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="PanoPublish YouTube Channel"
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/panopublish/"
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="PanoPublish Facebook Page"
                className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-accent"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Services block */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Services
            </h4>
            <ul className="space-y-2 text-xs">
              {serviceLinks.map((link) => (
                <li key={link.url}>
                  <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Alternatives block */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Alternatives
            </h4>
            <ul className="space-y-2 text-xs">
              {comparisonLinks.map((link) => (
                <li key={link.url}>
                  <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cities block */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Cities
            </h4>
            <ul className="space-y-2 text-xs">
              {cityLinks.map((link) => (
                <li key={link.url}>
                  <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources block */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors font-semibold">
                  Blog Articles
                </Link>
              </li>
              <li>
                <Link to="/case-studies" className="text-muted-foreground hover:text-primary transition-colors font-semibold">
                  Case Studies
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="/authors/prashant-kumar" className="text-muted-foreground hover:text-primary transition-colors">
                  Meet the Author
                </a>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-muted-foreground hover:text-primary transition-colors">
                  Refund & Cancellation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Crawler helper text (accessible, screen reader only) */}
        <p className="sr-only">
          PanoPublish supports virtual tour creation and panorama uploader tools in Mumbai, Delhi, Bangalore, Ahmedabad, Pune, Hyderabad, Chennai, and other parts of India.
        </p>
      </div>
    </footer>
  );
}
