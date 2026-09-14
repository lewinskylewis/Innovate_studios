/*
 * Innov8 Studios — option lists, copy, and validation messages for the
 * /consultation form. This is the single source of truth: every string
 * here must stay byte-identical to the case/check values inside
 * supabase/migrations/20260907000005_submit_consultation_rpc.sql. If you
 * change an option here, update that migration (and re-apply it) too.
 */
(() => {
  window.CONSULTATION_DATA = {
    SUPABASE_URL: "https://jdpiwgksxdbgfqzdqjec.supabase.co",
    SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcGl3Z2tzeGRiZ2ZxemRxamVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjk3NTMsImV4cCI6MjEwMzc0NTc1M30.kzio2cb8x5VfI9UnJwxrOn9t7v2Ev6nf8De9rRDJLYU",

    ROLE_OPTIONS: [
      "Founder / Owner",
      "Director / Executive",
      "Marketing",
      "Brand / Creative",
      "Product",
      "Communications",
      "Other"
    ],

    PREFERRED_CONTACT_OPTIONS: ["Email", "WhatsApp", "Phone", "Either"],
    PREFERRED_CONTACT_LABELS: { Email: "Email", WhatsApp: "WhatsApp", Phone: "Phone", Either: "Either is fine" },

    SERVICE_OPTIONS: [
      { value: "Brand & Identity", description: "Brand identity, visual systems, campaigns and brand direction." },
      { value: "Social & Content", description: "Social media design, campaigns, content systems and creative direction." },
      { value: "3D & CGI", description: "3D visualization, CGI, product renders and photorealistic commercial work." },
      { value: "Motion & Film", description: "Motion graphics, commercials, animation and visual storytelling." },
      { value: "Digital Experiences", description: "Websites, UX/UI, digital products and interactive experiences." },
      { value: "Marketing", description: "Creative campaigns, performance creative, SEO and digital marketing." },
      { value: "Something else", description: "" }
    ],

    SUBSERVICE_OPTIONS: {
      "Brand & Identity": ["New brand", "Rebrand", "Visual identity", "Brand guidelines", "Campaign identity", "Packaging", "Other"],
      "Social & Content": [
        "Social media design", "Content system", "Campaign creative", "Motion graphics",
        "Short-form video", "3D content", "Creative direction", "Ongoing retainer"
      ],
      "3D & CGI": [
        "Product visualization", "CGI commercial", "Architectural visualization",
        "3D animation", "Product renders", "Environment / world building", "Other"
      ],
      "Digital Experiences": [
        "Marketing website", "E-commerce", "Web application", "UX/UI", "Landing page", "Website redesign", "Other"
      ]
    },

    PROJECT_STAGE_OPTIONS: [
      "Just an idea", "Planning", "Already in progress", "We need to fix something", "Ready to start", "Not sure yet"
    ],

    EXISTING_ASSET_OPTIONS: [
      "Brand identity", "Website", "Photography", "Video", "3D assets", "Brand guidelines", "Existing campaign", "None yet"
    ],

    AUDIENCE_OPTIONS: [
      "Consumers", "Businesses", "Investors", "Professionals", "Property buyers",
      "Property renters", "Patients / clients", "Customers", "Internal teams", "Other"
    ],

    INDUSTRY_OPTIONS: [
      "Finance", "Insurance", "Real Estate", "Healthcare", "Technology", "Retail / E-commerce",
      "Hospitality", "Professional Services", "Media / Entertainment", "Education", "Manufacturing", "Other"
    ],

    TIMELINE_OPTIONS: [
      "As soon as possible", "Within 2 weeks", "Within 1 month", "1-3 months", "3+ months", "We're exploring for now"
    ],

    BUDGET_OPTIONS: ["Under KES 100K", "KES 100K-250K", "KES 250K-500K", "KES 500K-1M", "KES 1M+", "Not sure yet"],

    ENGAGEMENT_OPTIONS: ["One-off project", "Ongoing creative partnership", "Monthly retainer", "Not sure yet"],

    FINAL_CONTACT_PREFERENCE_OPTIONS: [
      "I'd like a consultation call", "Email is fine", "WhatsApp works best", "I'm just exploring"
    ],

    ERROR_MESSAGES: {
      required: "This field is required.",
      fullName: "Please enter your full name.",
      email: "Please enter a valid email address.",
      company: "Please enter your company or brand name.",
      website: "Please enter a valid website address.",
      whatsappNumber: "Please enter a valid WhatsApp number.",
      phoneNumber: "Please enter a valid phone number.",
      services: "Please select at least one service.",
      objective: "Please tell us a little more about what you're trying to achieve (at least 30 characters).",
      textareaTooLong: "That description is a little long — please keep it under 2000 characters.",
      timeline: "Please select a timeline.",
      budget: "Please select a level of investment.",
      engagementType: "Please select how you'd like to work with us.",
      consent: "Please confirm you agree to be contacted about this consultation."
    },

    ACCEPTED_FILE_TYPES: {
      "application/pdf": ".pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "application/zip": ".zip",
      "application/x-zip-compressed": ".zip"
    },
    MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024
  };
})();
