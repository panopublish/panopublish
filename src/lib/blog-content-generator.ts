export interface BlogSection {
  title: string;
  content: string;
  listItems?: string[];
}

export function getBlogSections(
  slug: string,
  heading: string,
  keyword: string,
  category: string,
  competitorName?: string
): BlogSection[] {
  const competitor = competitorName || "competitors";
  const kw = keyword.toLowerCase();

  // 1. CAMERA / HARDWARE GUIDES
  if (slug.includes("camera") || kw.includes("camera") || slug.includes("photography")) {
    return [
      {
        title: "Choosing the Right Hardware for 360° Capture",
        content: `Selecting the right camera is the foundation of any successful virtual tour project. In 2026, the 360-degree camera market is bifurcated into two primary workflows: dual 1-inch sensor cameras optimized for still image quality, and action-oriented cameras optimized for rapid video/blue-line recording.

For high-end architectural photography and virtual tours, the **Ricoh Theta Z1** remains a benchmark. Its large dual 1-inch back-illuminated CMOS sensors provide superior dynamic range, lower digital noise, and cleaner shadow details. Shooting in RAW/DNG format allows for massive exposure adjustments during post-processing.

> **Pro Tip:** When shooting indoors with high-contrast environments—like bright windows next to dark corridors—always capture bracketed exposures (typically 3 or 5 frames at 2EV steps) and merge them into HDR. This prevents blown-out highlights and preserves details in shadows.

Conversely, action-focused cameras like the **Insta360 X4** offer unparalleled efficiency for outdoor mapping and Google Street View "blue line" video path generation. The X4 records in 8K resolution, capturing sufficient detail for Google's processing engines while remaining rugged and highly portable. However, due to its smaller sensor size, it may produce noise in low-light conditions, making it best suited for bright, sunny outdoor environments.`,
        listItems: [
          "Ricoh Theta Z1: Best for premium indoor tours, real estate, and high-detail RAW/DNG still photography.",
          "Insta360 X4: Best for high-speed outdoor mapping, street-level video paths, and automated blue line creations.",
          "DSLR Rigs: Best for ultimate image resolution using panoramic heads, but requires tedious manual stitching.",
          "Sturdy Light Stand: Always prefer a carbon fiber light stand over a tripod to minimize the nadir footprint."
        ]
      },
      {
        title: "Setup, Spacing, and Node Alignment",
        content: `Once you have selected your hardware, understanding spatial spacing is critical to avoid broken tours. When capturing a walking path, position the camera node exactly at average human eye level (roughly 1.5 meters or 5 feet from the ground). This height consistency prevents visual jar as viewers transition from one point to another.

Walk in a direct line of sight between adjacent nodes, keeping the distance strictly between **3 to 5 meters (10 to 15 feet)**. This threshold is critical because Google Maps' automated blue line stitching engine relies on close proximity coordinates to connect neighboring spheres. 

If you space panoramas too far apart (e.g., 10 meters), the path links will break, and the Google Place card listing will display separate disconnected photos instead of a contiguous tour. Furthermore, you must verify compass heading yaw offsets manually to ensure that clicking an arrow pointing forward transitions the user logically to the next spatial coordinate.`,
        listItems: [
          "Set camera setting options to Multi-Bracketing mode for high-contrast scenes.",
          "Spacing threshold: Keep distance spans strictly between 3 to 5 meters (10 to 15 feet).",
          "Ensure direct line of sight between neighboring spheres to allow smooth transitions.",
          "Auditing EXIF metadata: Verify PoseHeadingDegrees (compass heading relative to true North)."
        ]
      },
      {
        title: "Post-Processing and Nadir Logo Disk Configurations",
        content: `After capturing the raw frames, the final step involves EXIF metadata auditing and nadir cleanup. Google Maps requires specific EXIF headers like \`GPano:UsePanoramaViewer=True\` to instruct client-side WebGL players to render the flat 2:1 JPEG in a spherical projection space.

For professional branding, agencies look to hide the camera tripod or stand at the bottom nadir pole. PanoPublish features a browser-based nadir editor that allows you to easily overlay a custom circular logo disk (512x512 pixels, transparent PNG) over the tripod area, completely eliminating the need for tedious manual cloning in Photoshop.

> **Key takeaway:** A clean nadir logo not only hides your gear but acts as a premium branding placement for your client, showing their business name, logo, or contact details directly within the 360° viewer.`
      }
    ];
  }

  // 2. PRICING / COST GUIDES
  if (slug.includes("cost") || slug.includes("price") || kw.includes("cost") || kw.includes("price")) {
    return [
      {
        title: "Virtual Tour & Google Street View Cost Breakdown",
        content: `Understanding the costs involved in publishing 360° virtual tours is essential to running a profitable photography business or agency. The total cost structure generally splits into camera hardware, editing software, and hosting/publishing platform fees.

While Google Maps allows users to upload imagery for free via API connections, professional moderation and path-linking require specialized hosting tools. Many US-based platforms charge heavy monthly subscriptions in USD, leading to high currency conversion fees and credit card markups for Indian creators.

> **Pricing Comparison:** While platforms like Matterport charge an add-on export fee of **$14.99 per Google Street View upload**, PanoPublish offers flat monthly INR billing starting at just ₹499, with zero export fees and unlimited Google Maps uploads under our flat pricing plans.`,
        listItems: [
          "Camera Hardware: Ranging from ₹35,000 (consumer action cams) to ₹95,000+ (professional dual 1-inch models).",
          "Stitching Software: Optional PTGui Pro licenses for DSLR shooters (one-time fee of approx ₹25,000).",
          "Hosting Platforms: Competitors charge $20 to $50/mo in USD, whereas PanoPublish charges ₹499 to ₹2,999 flat in INR.",
          "Payment Support: PanoPublish natively integrates Razorpay, allowing seamless payments via UPI, Net Banking, and local debit cards."
        ]
      },
      {
        title: "The Financial Case: Matterport/USD Platforms vs PanoPublish",
        content: `For active virtual tour agencies, pricing predictability is crucial. If you publish 20 tours per month for various clients, paying $14.99 per export on Matterport adds up to an extra **$299.80 (approx. ₹25,000) per month** just in upload fees!

PanoPublish completely eliminates these hidden charges. Our platform routes your high-resolution equirectangular assets directly to Google Maps via official API channels under a predictable flat monthly subscription. 

Moreover, USD subscriptions subject Indian creators to foreign exchange card fees (typically 2-3.5% markup) and complex taxation documentation. Local Indian billing processed via Razorpay provides clean GST invoices, making business accounting straightforward and saving thousands of rupees in transaction overheads.`
      },
      {
        title: "Return on Investment (ROI) for Local Businesses",
        content: `Local business listings with virtual tours receive up to **35% more click-throughs and profile views** on Google Maps. When local customers search for restaurants, schools, gyms, or hotels, Google's algorithm prioritizes complete profiles that showcase high-resolution interior layouts.

A virtual walkthrough acts as a powerful trust signal, increasing user dwell time and profile click rates. This engagement signals quality to search engines, helping the business rank higher in map search grids. 

For commercial real estate developers, virtual tours help close NRI transactions and leases remotely, saving days of physical travel and justifying the minimal cost of hosting and publishing.`
      }
    ];
  }

  // 3. COMPETITOR ALTERNATIVES & COMPARISONS
  if (slug.includes("alternative") || slug.includes("vs") || kw.includes("alternative") || kw.includes("vs")) {
    const capitalizedComp = competitor.charAt(0).toUpperCase() + competitor.slice(1);
    return [
      {
        title: `PanoPublish vs ${capitalizedComp}: Core Features Comparison`,
        content: `When searching for a reliable ${competitor} alternative, professional creators focus on three main metrics: ease of node editing, publishing speeds, and pricing transparency. 

Many traditional platforms like ${capitalizedComp} were designed for Western markets, requiring payments in US Dollars and featuring complex, slow interfaces. PanoPublish, on the other hand, is optimized for speed and localized support.

> **Feature Highlight:** Unlike ${capitalizedComp}, PanoPublish provides a dedicated **Level and Island organizer** to structure massive multi-room walkthroughs. This structures the tour bundle assets into separate logical floor levels, reducing initial load times and preventing low-spec mobile devices from crashing.`,
        listItems: [
          `Base Currency: PanoPublish uses flat INR pricing, whereas ${capitalizedComp} requires USD payments with high foreign exchange markups.`,
          `Street View Uploads: Unlimited under PanoPublish flat plans, compared to per-export fees on other platforms.`,
          "WebGL Viewer Performance: PanoPublish loads image tiles dynamically on demand, keeping peak GPU memory usage below 80MB.",
          "White-Label Options: Complete custom CNAME subdomain mapping (e.g. tours.youragency.com) to present a professional look to your clients."
        ]
      },
      {
        title: "Workflow and Client Management Comparison",
        content: `Managing client feedback is a major bottleneck for agency owners. With PanoPublish, you get access to shared reviewer workspaces. You can generate custom private links for clients to inspect alignment nodes, rotate compass headings, and approve nadir logo disk graphics before going live.

In comparison, older platforms like ${capitalizedComp} often lock multi-user access behind expensive enterprise plans. PanoPublish includes robust multi-client workspaces starting in our mid-tier plans, enabling freelancers and agency teams to collaborate seamlessly.

Furthermore, PanoPublish integrates with Cloudflare's Edge Network to serve pre-rendered HTML templates. This is critical for search engine crawler bots, as it ensures complete meta titles and structured ImageObject schemas are instantly readable, giving you a massive SEO advantage over platforms that rely solely on client-side React rendering.`
      },
      {
        title: `Why Indian Agencies Are Switching from ${capitalizedComp}`,
        content: `The shift from USD-based tools to PanoPublish is driven by cost savings and localized payments. Managing billing via Razorpay allows agency owners to pay via local credit cards, Net Banking, and UPI, without triggering compliance hurdles or dealing with card blocks.

By choosing a localized alternative, creators save up to 40% on subscription costs and eliminate forex translation fees, allowing them to offer competitive packages to local retail and commercial real estate clients across India.`
      }
    ];
  }

  // 4. INDUSTRY-SPECIFIC SOLUTIONS
  if (
    slug.includes("university") ||
    slug.includes("museum") ||
    slug.includes("construction") ||
    slug.includes("airbnb") ||
    slug.includes("estate") ||
    slug.includes("hotel") ||
    slug.includes("restaurant") ||
    slug.includes("business") ||
    kw.includes("university") ||
    kw.includes("estate") ||
    kw.includes("construction")
  ) {
    const industryName = slug.includes("university") ? "education and campuses" :
                         slug.includes("museum") ? "art and cultural archives" :
                         slug.includes("construction") ? "engineering and site monitoring" :
                         slug.includes("airbnb") ? "hospitality and vacation rentals" :
                         slug.includes("hotel") ? "hospitality and resorts" :
                         slug.includes("restaurant") ? "dining and retail spaces" :
                         slug.includes("estate") ? "commercial and residential real estate" : "local businesses";

    const capitalizedIndustry = industryName.charAt(0).toUpperCase() + industryName.slice(1);

    return [
      {
        title: `Optimizing Virtual Tours for ${capitalizedIndustry}`,
        content: `Deploying immersive walkthroughs for ${industryName} requires an understanding of scale and structure. Large properties—like college campuses, museums, construction projects, or hotel complexes—contain dozens of separate visual nodes that can easily overwhelm a standard viewer.

To maintain fast loading speeds, you must organize pages by layout level. PanoPublish features a custom **Level and Island organizer** which structures the tour by floor level, reducing peak mobile GPU memory usage below 80MB. This optimization prevents mobile browsers from crashing when loading high-resolution 16K equirectangular textures simultaneously.

> **Key Statistic:** Listings that feature complete virtual walkthroughs experience up to **twice the user engagement** and dwell time. For ${industryName}, this visual trust tag helps secure bookings, enrollments, or leases remotely without requiring immediate physical site visits.`,
        listItems: [
          "Multi-level layouts: Group scenes logically by building floors or layout zones.",
          "Mobile Optimization: Load image tiles dynamically to stay within the 80MB GPU memory limit.",
          "Branding Nadirs: Cover tripods using a custom transparent circular logo (512x512 pixels).",
          "Unbranded links: Generate MLS-compliant links that hide agent names and contact forms."
        ]
      },
      {
        title: "Client Collaboration and Interactive Hotspots",
        content: `For agencies mapping ${industryName}, streamlining client review is key. PanoPublish's collaborative workspace allows you to generate secure private links where stakeholders can inspect tour paths, configure custom link arrows, and test interactive hotspots.

Interactive hotspots let you embed media, textual descriptions, or external links directly into the 360° environment. This is particularly useful for highlighting key amenities on college tours, artifact details in museums, or construction phase logs on engineering sites.

For real estate listings, PanoPublish resolves MLS compliance issues by generating dual links for every project: a branded agency link containing lead capture forms, and an unbranded link that hides logos, maps, and agent details to comply with strict regional MLS guidelines.`
      },
      {
        title: "SEO and Pre-Rendering Advantages",
        content: `To ensure maximum search engine visibility, PanoPublish integrates with Cloudflare's Edge Network to serve pre-rendered HTML templates. Search engine crawler bots inspect pre-rendered source files to index text, heading structures, and semantic tags. 

If a page relies solely on client-side rendering, bots will see an empty HTML shell, reducing your site's local search rankings. Pre-rendering ensures that crawlers find complete title tags, meta descriptions, and structured ImageObject schemas, helping your listings rank higher in local search maps.`
      }
    ];
  }

  // 5. GENERAL GUIDES & SETUP TUTORIALS
  return [
    {
      title: "Understanding the Core 360° Workflow",
      content: `Creating high-quality virtual tours requires careful planning, spatial configuration, and proper hardware selection. The first step involves understanding the visual geometry of equirectangular coordinates. 

When mounting your 360° camera on a carbon fiber light stand, align the lens node exactly with average human eye level (roughly 1.5 meters or 5 feet from the ground). Keeping this height consistent across all rooms prevents a jarring visual transition when viewers navigate between nodes.

> **Pro Tip:** Position your camera nodes strictly between **3 to 5 meters (10 to 15 feet)** apart in a direct line of sight. This spacing threshold is critical because Google Maps' automated blue line stitching engine relies on close proximity coordinates to connect neighboring equirectangular spheres. Spacing them too far apart will break the path links.`,
      listItems: [
        "Position camera nodes 3 to 5 meters (10 to 15 feet) apart to satisfy Google Maps API proximity requirements.",
        "Ensure lens height is constant at 1.5 meters (human eye level) across all spheres.",
        "Use carbon fiber light stands with a small footprint to minimize bottom nadir shadows.",
        "Verify EXIF GPS and PoseHeadingDegrees metadata using PanoPublish's browser parser."
      ]
    },
    {
      title: "Step-by-Step Technical Setup Guidelines",
      content: `To get started on your walkthrough project, follow these technical setup steps:

1. **Mount & Shoot:** Set your camera to Multi-Bracketing mode. If you are shooting indoors with high-contrast light, capture 3 or 5 RAW frames at distinct exposures and merge them in Lightroom or PTGui Pro to preserve highlight details.
2. **Metadata Audit:** Ensure the flat equirectangular JPEG files are under 75MB for fast loading speeds. The PanoPublish browser editor automatically reads coordinates and yaw offsets to map nodes accurately.
3. **Compass Alignment:** Use PanoPublish's visual node editor compass dials to rotate panoramas so the forward direction matches true North. This prevents rotation jump when navigating room connections.
4. **Nadir Cleanup:** Upload a transparent circular logo disk (512x512px) to overlay and hide tripods or stand footprints.
5. **Publish:** Link your Google Place card listing and publish directly to Google Maps via official API endpoints under PanoPublish's flat monthly plan.`,
      listItems: [
        "Step 1: Capture bracketed exposures to handle high-contrast windows and corridors.",
        "Step 2: Check JPEG files are under 75MB to maintain global CDN delivery speeds.",
        "Step 3: Align compass headings manually using the yaw rotation dial in the node editor.",
        "Step 4: Hide tripods using transparent 512x512px PNG circular logo nadirs."
      ]
    },
    {
      title: "Optimizing WebGL Performance and Search Engine Indexing",
      content: `Serving massive 16K equirectangular textures can crash mobile browsers with limited GPU specifications. PanoPublish resolves this by loading image tiles dynamically on demand, keeping peak GPU memory usage below 80MB.

Additionally, to optimize SEO, PanoPublish serves pre-rendered HTML templates via Cloudflare's Edge Network. Pre-rendering ensures that Google crawler bots find complete title tags, meta descriptions, and structured ImageObject schemas, helping your listings rank higher on search engines than simple client-side React applications.`
    }
  ];
}

export function getBlogImage(slug: string, keyword: string): string {
  const kw = keyword.toLowerCase();
  const s = slug.toLowerCase();

  // 1. Camera / Gear
  if (s.includes("camera") || kw.includes("camera") || s.includes("gear") || s.includes("tripod") || s.includes("theta") || s.includes("insta360") || s.includes("gopro")) {
    return "/blog-camera.png";
  }

  // 2. Cost / Pricing
  if (s.includes("cost") || s.includes("price") || s.includes("pricing") || s.includes("fees") || kw.includes("cost") || kw.includes("price")) {
    return "/blog-cost.png";
  }

  // 3. Trusted Photographer / Google Trusted / Blue lines
  if (s.includes("trusted") || s.includes("blue-line") || s.includes("program") || kw.includes("trusted") || s.includes("google-maps-360")) {
    return "/blog-trusted.png";
  }

  // 4. Alternatives / Comparisons
  if (s.includes("alternative") || s.includes("vs") || kw.includes("alternative") || kw.includes("vs")) {
    return "/blog-vs.png";
  }

  // 5. Publishing / Embedding / How-To
  if (s.includes("publish") || s.includes("embed") || s.includes("overlay") || s.includes("stitching") || s.includes("exif") || s.includes("metadata") || s.includes("errors") || s.includes("nadir-blur")) {
    return "/blog-publish.png";
  }

  // 6. Real Estate / Airbnb / Hotel
  if (s.includes("estate") || s.includes("airbnb") || s.includes("hotel") || s.includes("brokers") || s.includes("residential") || s.includes("showroom")) {
    return "/blog-real-estate.png";
  }

  // 7. University / College / Museum / Construction / Schools
  if (s.includes("university") || s.includes("museum") || s.includes("construction") || s.includes("schools") || s.includes("venue") || s.includes("college") || s.includes("campus")) {
    return "/blog-university.png";
  }

  // 8. Software / Virtual Tour editor / Hotspots / Floorplan / 3D Dollhouse
  if (s.includes("software") || s.includes("hotspots") || s.includes("floor-plan") || s.includes("dollhouse") || s.includes("builder") || s.includes("panorama") || s.includes("virtual-tour") || s.includes("tour-builder")) {
    return "/blog-software.png";
  }

  // 9. Business / Start-Up / Agency
  if (s.includes("business") || s.includes("start") || s.includes("agency") || s.includes("agencies") || s.includes("marketing") || s.includes("seo") || s.includes("roi")) {
    return "/blog-business.png";
  }

  // Default fallback
  return "/blog-publish.png";
}

