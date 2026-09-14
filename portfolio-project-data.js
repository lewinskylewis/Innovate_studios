/*
 * Innov8 Studios — local project data for the public Portfolio Project
 * page (Phase 1). Shaped to match the future Supabase
 * portfolio_projects/portfolio_blocks schema on purpose: each project is
 * { title, shortDescription, category, client, year, services[],
 * cover:{url,alt}, order, blocks:[{type, content, settings}] } so
 * portfolio-project.js can later be pointed at a real fetch() without any
 * change to how it renders. Do not read this object from anywhere except
 * that one file.
 */
(() => {
  // Root-relative (leading "/"): this data is consumed via JS (img.src =
  // url), which resolves against the current page URL, not the document
  // base - and this page is served at a rewritten nested URL
  // (/portfolio/:slug), so a plain relative path would 404.
  const IMG = "/assets/images/portfolio/";

  const SERVICES = {
    commercial: ["Cinematic 3D", "Art Direction", "Motion Design"],
    brand: ["Brand Strategy", "Visual Identity", "Brand Guidelines"],
    web: ["UI/UX Design", "Interaction Design", "Prototyping"]
  };

  function textBlock(heading, body, settings = {}) {
    return { type: "text", content: { heading, body: `<p>${body}</p>` }, settings: { align: "left", width: "narrow", ...settings } };
  }

  function fullWidthImage(url, alt, caption = "") {
    return { type: "full_width_image", content: { url, alt, caption }, settings: {} };
  }

  function image(url, alt, caption = "", settings = {}) {
    return { type: "image", content: { url, alt, caption }, settings: { width: "contained", align: "center", ...settings } };
  }

  function spacer(size = "md") {
    return { type: "spacer", content: {}, settings: { size } };
  }

  window.PORTFOLIO_PROJECTS = {
    "nike-kenya-own-the-ground": {
      title: "Nike Kenya — Own The Ground",
      shortDescription: "A Big Five campaign for Nike Kenya, turning five native animals into a study of athletic character.",
      category: "Marketing Commercials",
      client: "Nike",
      year: 2026,
      services: SERVICES.commercial,
      order: 1,
      cover: { url: `${IMG}nike-leadership.png`, alt: "Lions in Nike apparel, representing Leadership" },
      // Deliberately image-only, same full-bleed width from top to bottom,
      // nothing interspersed between them - the artwork already carries
      // its own typography and message, so no separate text/gallery
      // blocks are needed here.
      blocks: [
        fullWidthImage(`${IMG}nike-leadership.png`, "Lions in Nike apparel, representing Leadership"),
        fullWidthImage(`${IMG}nike-speed.png`, "Leopards in Nike apparel, representing Speed"),
        fullWidthImage(`${IMG}nike-strength.png`, "Rhinos in Nike apparel, representing Strength"),
        fullWidthImage(`${IMG}nike-endurance.png`, "Buffalo in Nike apparel, representing Endurance"),
        fullWidthImage(`${IMG}nike-purpose.png`, "Elephants in Nike apparel, representing Purpose"),
        fullWidthImage(`${IMG}nike-social-executions.png`, "Social campaign executions for Leadership, Strength and Endurance")
      ]
    },

    "stanbic-digital-card-campaign": {
      title: "Stanbic Digital Card Campaign",
      shortDescription: "A cinematic 3D campaign introducing Stanbic Bank's next-generation digital card to a new generation of customers.",
      category: "Marketing Commercials",
      client: "Stanbic Bank",
      year: 2026,
      services: SERVICES.commercial,
      order: 2,
      cover: { url: `${IMG}marketing-stanbic.webp`, alt: "Vektor digital card campaign" },
      blocks: [
        textBlock("Overview", "Stanbic Bank needed to launch a new digital card product in a category crowded with near-identical banking ads. The brief called for something customers would actually stop and watch."),
        fullWidthImage(`${IMG}showreel-digital.webp`, "Financial analytics digital interface"),
        textBlock("Approach", "We built the campaign around cinematic 3D product photography and motion &mdash; treating the card less like a financial product and more like a piece of design people would want to hold."),
        spacer("md"),
        image(`${IMG}marketing-stanbic.webp`, "Vektor digital card campaign key art", "Key art from the campaign's hero film.")
      ]
    },

    "grosvenor-residential-towers": {
      title: "Grosvenor Residential Towers",
      shortDescription: "Positioning a new luxury residential development through cinematic architectural storytelling.",
      category: "Marketing Commercials",
      client: "Grosvenor",
      year: 2026,
      services: SERVICES.commercial,
      order: 3,
      cover: { url: `${IMG}marketing-grosvenor.webp`, alt: "Grosvenor residential towers campaign" },
      blocks: [
        textBlock("Overview", "Grosvenor's residential towers needed a campaign that communicated scale and craftsmanship without leaning on generic real-estate cliches."),
        fullWidthImage(`${IMG}showreel-architecture.webp`, "Luxury residential pool and garden"),
        textBlock("Approach", "We paired sweeping 3D architectural visualization with quiet, considered pacing &mdash; letting the space itself carry the campaign rather than a hard sell."),
        spacer("md"),
        image(`${IMG}marketing-grosvenor.webp`, "Grosvenor residential towers key art", "The towers at golden hour, from the campaign's opening frame.")
      ]
    },

    "hyundai-electric-mobility": {
      title: "Hyundai Electric Mobility",
      shortDescription: "A commercial introducing Hyundai's electric mobility lineup to Kenyan drivers.",
      category: "Marketing Commercials",
      client: "Hyundai",
      year: 2025,
      services: SERVICES.commercial,
      order: 4,
      cover: { url: `${IMG}marketing-hyundai.webp`, alt: "Electric mobility campaign" },
      blocks: [
        textBlock("Overview", "Electric vehicles are still a new idea for most Kenyan buyers. The campaign had to make the shift feel exciting, not intimidating."),
        fullWidthImage(`${IMG}marketing-hyundai.webp`, "Electric mobility campaign hero frame"),
        textBlock("Approach", "We framed the vehicle as the hero of a confident, forward-looking narrative, backed by clean 3D product renders built for both broadcast and social."),
        spacer("lg")
      ]
    },

    "jetour-g700-campaign": {
      title: "Jetour G700 Campaign",
      shortDescription: "Launching the Jetour G700 with a commercial built for impact across broadcast and digital.",
      category: "Marketing Commercials",
      client: "Jetour",
      year: 2025,
      services: SERVICES.commercial,
      order: 5,
      cover: { url: `${IMG}marketing-jetour.webp`, alt: "Jetour G700 campaign" },
      blocks: [
        textBlock("Overview", "Jetour's G700 needed a launch campaign that could hold its own against long-established SUV brands in the same segment."),
        fullWidthImage(`${IMG}marketing-jetour.webp`, "Jetour G700 campaign hero frame"),
        textBlock("Approach", "We built a high-contrast, cinematic 3D commercial centred on the vehicle's design language, cut for both a 60-second broadcast spot and short-form social."),
        spacer("lg")
      ]
    },

    "virtuoso-connoisseur-co": {
      title: "Virtuoso Connoisseur Co.",
      shortDescription: "A brand identity for a connoisseur-focused spirits label, built to feel collected rather than manufactured.",
      category: "Brand Identity",
      client: "Virtuoso Connoisseur Co.",
      year: 2026,
      services: SERVICES.brand,
      order: 6,
      cover: { url: `${IMG}brand-virtuoso.webp`, alt: "Virtuoso Connoisseur Co. brand identity" },
      blocks: [
        textBlock("Overview", "Virtuoso Connoisseur Co. needed an identity that could sit comfortably next to decades-old heritage brands from day one."),
        fullWidthImage(`${IMG}brand-virtuoso.webp`, "Virtuoso Connoisseur Co. packaging and mark"),
        textBlock("Approach", "We developed a mark, palette and set of guidelines rooted in restraint &mdash; quiet typography, a confident wordmark, and packaging cues that reward a closer look."),
        spacer("md")
      ]
    },

    "vena-luxury-jewelry": {
      title: "Vena Luxury Jewelry",
      shortDescription: "Visual identity for a luxury jewelry house, designed to read as premium at every scale.",
      category: "Brand Identity",
      client: "Vena",
      year: 2025,
      services: SERVICES.brand,
      order: 7,
      cover: { url: `${IMG}brand-vena.webp`, alt: "Vena Luxury Jewelry brand identity" },
      blocks: [
        textBlock("Overview", "Vena needed an identity capable of stretching from a tiny hallmark stamp to a full storefront fascia without losing its character."),
        fullWidthImage(`${IMG}brand-vena.webp`, "Vena Luxury Jewelry identity system"),
        textBlock("Approach", "The mark leans on precise linework and generous negative space &mdash; the same qualities the jewelry itself is judged on."),
        spacer("md")
      ]
    },

    "sorena-greece": {
      title: "Sorena Greece",
      shortDescription: "Brand identity for a Greece-based hospitality concept, drawing on coastal materiality and warm minimalism.",
      category: "Brand Identity",
      client: "Sorena",
      year: 2025,
      services: SERVICES.brand,
      order: 8,
      cover: { url: `${IMG}brand-sorena.webp`, alt: "Sorena Greece brand identity" },
      blocks: [
        textBlock("Overview", "Sorena's identity needed to feel distinctly Mediterranean without falling back on the usual blue-and-white shorthand."),
        fullWidthImage(`${IMG}brand-sorena.webp`, "Sorena Greece identity system"),
        textBlock("Approach", "We built the system around warm neutrals, sun-worn texture, and a wordmark that feels carved rather than typed."),
        spacer("md")
      ]
    },

    "candle-space-premium": {
      title: "Candle Space Premium",
      shortDescription: "A premium identity system for a candle and home-fragrance label.",
      category: "Brand Identity",
      client: "Candle Space",
      year: 2026,
      services: SERVICES.brand,
      order: 9,
      cover: { url: `${IMG}brand-candle-space.webp`, alt: "Candle Space Premium brand identity" },
      blocks: [
        textBlock("Overview", "Candle Space needed packaging and brand marks that could compete on a shelf dominated by long-established fragrance houses."),
        fullWidthImage(`${IMG}brand-candle-space.webp`, "Candle Space Premium packaging"),
        textBlock("Approach", "We built a calm, tactile identity &mdash; soft type, restrained color, and a mark designed to feel just as at home on a label as it does embossed into wax."),
        spacer("md")
      ]
    },

    "jovana-brand-identity": {
      title: "Jovana Brand Identity",
      shortDescription: "A brand identity built for versatility across product, digital and print.",
      category: "Brand Identity",
      client: "Jovana",
      year: 2025,
      services: SERVICES.brand,
      order: 10,
      cover: { url: `${IMG}brand-jovana.webp`, alt: "Jovana brand identity" },
      blocks: [
        textBlock("Overview", "Jovana's brand needed a flexible system that could carry the same voice across very different touchpoints."),
        fullWidthImage(`${IMG}brand-jovana.webp`, "Jovana brand identity system"),
        textBlock("Approach", "We designed a modular identity system &mdash; a confident core mark paired with a supporting palette and type system built to flex without breaking character."),
        spacer("md")
      ]
    },

    "green-gold-floral-mark": {
      title: "Green & Gold Floral Mark",
      shortDescription: "An independent brand-mark study exploring organic form in a floral, gold-and-green palette.",
      category: "Brand Identity",
      client: "",
      year: 2026,
      services: SERVICES.brand,
      order: 11,
      cover: { url: `${IMG}brand-green.webp`, alt: "Green and gold floral brand mark" },
      blocks: [
        textBlock("Overview", "This mark started as an exploration of how far a floral motif could be pushed toward something structural and brand-ready."),
        textBlock("Approach", "We refined the form through successive passes &mdash; simplifying the botanical reference until it read clearly at both large and small scale."),
        spacer("md"),
        image(`${IMG}brand-green.webp`, "Green and gold floral brand mark"),
        image(`${IMG}brand-feathers.webp`, "Feather texture study")
      ]
    },

    "green-mobile-experience": {
      title: "Green Mobile Experience",
      shortDescription: "UI/UX design for a green-technology mobile app, built for clarity at a glance.",
      category: "Web Experiences",
      client: "",
      year: 2026,
      services: SERVICES.web,
      order: 12,
      cover: { url: `${IMG}web-green-app.webp`, alt: "Green mobile design experience" },
      blocks: [
        textBlock("Overview", "The product needed an interface that made a genuinely technical subject feel approachable on a phone screen."),
        fullWidthImage(`${IMG}web-green-app.webp`, "Green mobile app interface screens"),
        textBlock("Approach", "We prioritized a clear visual hierarchy and a restrained, confident color system, so the app's data-heavy screens never feel overwhelming."),
        spacer("md")
      ]
    },

    "purple-mobile-registration": {
      title: "Purple Mobile Registration",
      shortDescription: "A registration and onboarding flow designed to feel effortless from first open.",
      category: "Web Experiences",
      client: "",
      year: 2025,
      services: SERVICES.web,
      order: 13,
      cover: { url: `${IMG}web-purple-app.webp`, alt: "Purple mobile registration experience" },
      blocks: [
        textBlock("Overview", "First impressions matter most in the first sixty seconds of a mobile app. The registration flow had to earn trust immediately."),
        fullWidthImage(`${IMG}web-purple-app.webp`, "Purple mobile registration flow screens"),
        textBlock("Approach", "We designed a guided, low-friction onboarding sequence with a distinct visual identity &mdash; purposeful color, generous spacing, and clear next steps at every screen."),
        spacer("md")
      ]
    },

    "prysmtech-image-management": {
      title: "Prysmtech Image Management",
      shortDescription: "A mobile image-management experience designed for speed and clarity at scale.",
      category: "Web Experiences",
      client: "Prysmtech",
      year: 2026,
      services: SERVICES.web,
      order: 14,
      cover: { url: `${IMG}web-prysmtech.webp`, alt: "Prysmtech mobile image management experience" },
      blocks: [
        textBlock("Overview", "Prysmtech's users manage large volumes of images daily &mdash; the interface needed to keep that process fast and legible."),
        fullWidthImage(`${IMG}web-prysmtech.webp`, "Prysmtech mobile interface screens"),
        textBlock("Approach", "We built a system-first interface: clear grouping, confident typography, and an interaction model that scales from a handful of images to thousands."),
        spacer("md")
      ]
    }
  };
})();
