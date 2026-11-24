export const DEFAULT_LOGO_URL = "https://indocsmedia.vercel.app/assets/logo.png";

export const PROJECT_CATEGORIES: Array<{ label: string; tagline: string; defaultPurpose: string }> = [
  {
    label: "Wedding Photography & Film",
    tagline: "WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION",
    defaultPurpose: "Wedding Shoot Package & Settlement",
  },
  {
    label: "Ad Shoot & Commercial Film",
    tagline: "COMMERCIAL AD FILMS, DIRECTION & CREATIVE PRODUCTION",
    defaultPurpose: "Commercial Ad Film Production",
  },
  {
    label: "YouTube & Podcast Shoot",
    tagline: "YOUTUBE, PODCAST & DIGITAL CONTENT PRODUCTION",
    defaultPurpose: "YouTube / Podcast Production Package",
  },
  {
    label: "Video Direction & Editing",
    tagline: "VIDEO DIRECTION, CINEMATIC EDITING & POST-PRODUCTION",
    defaultPurpose: "Video Direction & Post-Production Services",
  },
  {
    label: "Pre & Post Production",
    tagline: "SCRIPT TO SCREEN — PRE & POST PRODUCTION STUDIO",
    defaultPurpose: "End-to-End Pre & Post Production",
  },
  {
    label: "Brand & Social Media Content",
    tagline: "BRAND STORYTELLING & SOCIAL MEDIA CONTENT PRODUCTION",
    defaultPurpose: "Brand Content & Reels Production",
  },
  {
    label: "Corporate / Event Coverage",
    tagline: "CORPORATE EVENTS, PHOTOGRAPHY & FILM PRODUCTION",
    defaultPurpose: "Event Coverage & Production",
  },
  {
    label: "Other Creative Production",
    tagline: "AD SHOOTS, VIDEO DIRECTION & CREATIVE PRODUCTION",
    defaultPurpose: "Creative Media Production",
  },
];

export const RECEIPT_STAGES = [
  "Quotation",
  "Booking Confirmation",
  "Final Payment Receipt",
] as const;

export type ReceiptStage = (typeof RECEIPT_STAGES)[number];

export const DEFAULT_CASH_HOLDERS = [
  "Mithilesh Shende",
  "Devansh Rajput",
  "Anav",
  "Company Bank / UPI",
];
