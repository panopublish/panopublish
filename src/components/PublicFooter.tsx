import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/format";

export function PublicFooter() {
  const serviceLinks = [
    { name: "Google Street View Publishing", url: "/google-street-view-publishing" },
    { name: "360° Virtual Tour Platform", url: "/360-virtual-tour-publishing-platform" },
    { name: "Custom Nadir Branding", url: "/nadir-branding-street-view" },
    { name: "Multi-Client Workspace", url: "/virtual-tour-client-management-software" },
    { name: "Street View for Hotels", url: "/google-street-view-for-hotels-india" },
    { name: "Street View for Real Estate", url: "/virtual-tour-real-estate-india" },
    { name: "Street View for Restaurants", url: "/google-street-view-restaurant-india" },
    { name: "360 Photo Connection Builder", url: "/360-photo-connection-builder-online" },
  ];

  const comparisonLinks = [
    { name: "PanoPublish vs TourBuilder", url: "/tourbuilder-alternative-india" },
    { name: "PanoPublish vs GoThru", url: "/gothru-alternative" },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 border-b pb-12">
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
              <div className="text-xs text-muted-foreground">Support Email: hello@panopublish.com</div>
            </div>
            <div className="text-xs flex items-center gap-1.5 bg-whatsapp/10 text-whatsapp px-3 py-1.5 rounded-full font-bold w-fit">
              <MessageCircle className="h-4 w-4 fill-whatsapp text-white" />
              <a
                href={waLink("Hi, I have a query regarding PanoPublish plans")}
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-[11px]"
              >
                WhatsApp Support: Mon-Sat, 10am-7pm IST
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
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms & Conditions
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
