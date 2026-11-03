import aetherArt from "@/assets/aether.jpg";
import abyssArt from "@/assets/abyss.jpg";
import neoverseArt from "@/assets/neoverse.jpg";
import mythoraArt from "@/assets/mythora.jpg";
import nexdriveArt from "@/assets/nexdrive.jpg";

/**
 * CENTRAL WORLD REGISTRY
 * ----------------------
 * This is the ONLY place in the code base that knows destination URLs.
 * URLs come from environment variables (see .env.example). No URL is ever
 * invented: when a variable is missing / invalid the world is "coming-soon"
 * and the Enter World action is disabled everywhere in the UI.
 */

export const WORLD_IDS = ["aether", "abyss", "neoverse", "mythora", "nexdrive"] as const;
export type WorldId = (typeof WORLD_IDS)[number];
export type Availability = "available" | "coming-soon" | "unavailable";

export interface WorldFeature {
  label: string;
  detail: string;
}

export interface WorldConfig {
  id: WorldId;
  index: number;
  name: string;
  tagline: string;
  category: string;
  description: string;
  /** Short line shown on hover */
  teaser: string;
  highlights: string[];
  features: WorldFeature[];
  colors: { primary: string; secondary: string; accent: string };
  /** resolved & validated destination, or null */
  url: string | null;
  status: Availability;
  statusNote: string;
  artwork: string;
  portal: {
    /** 0 circle · 1 oval · 2 rounded-rect · 3 arch · 4 hex */
    shape: number;
    /** shader pattern id */
    pattern: number;
  };
  /** dimensional transition shader id */
  transition: number;
  transitionName: string;
  storyTitle: string;
  storyText: string;
}

type RawEnv = Record<string, string | undefined>;
const env = import.meta.env as unknown as RawEnv;

const RAW_URLS: Record<WorldId, string | undefined> = {
  aether: env.VITE_AETHER_URL,
  abyss: env.VITE_ABYSS_URL,
  neoverse: env.VITE_NEOVERSE_URL,
  mythora: env.VITE_MYTHORA_URL,
  nexdrive: env.VITE_NEXDRIVE_URL,
};

const RAW_STATUS: Record<WorldId, string | undefined> = {
  aether: env.VITE_AETHER_STATUS,
  abyss: env.VITE_ABYSS_STATUS,
  neoverse: env.VITE_NEOVERSE_STATUS,
  mythora: env.VITE_MYTHORA_STATUS,
  nexdrive: env.VITE_NEXDRIVE_STATUS,
};

const PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|invalid|test)$|placeholder|your-|yourdomain|xxxx/i;

/** Returns a normalised URL or null when missing / malformed / obviously a placeholder. */
export function validateWorldUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(u.protocol === "http:" && isLocal && import.meta.env.DEV)) return null;
    if (PLACEHOLDER_HOST.test(u.hostname)) return null;
    if (!u.hostname.includes(".") && !isLocal) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function resolveAvailability(id: WorldId): { url: string | null; status: Availability; note: string } {
  const url = validateWorldUrl(RAW_URLS[id]);
  if (RAW_STATUS[id]?.trim().toLowerCase() === "unavailable") {
    return { url, status: "unavailable", note: "This world is temporarily offline." };
  }
  if (!url) {
    const had = !!RAW_URLS[id]?.trim();
    return {
      url: null,
      status: "coming-soon",
      note: had
        ? "The configured destination is not a valid public URL, so entry is disabled."
        : "No verified deployment URL is configured yet. This world is opening soon.",
    };
  }
  return { url, status: "available", note: "Independent website — opens in this tab." };
}

type WorldStatic = Omit<WorldConfig, "url" | "status" | "statusNote">;

const STATIC: WorldStatic[] = [
  {
    id: "aether",
    index: 0,
    name: "AETHER",
    tagline: "Beyond the Universe.",
    category: "Space Exploration",
    description: "Explore galaxies, planets, and the mysteries of deep space.",
    teaser: "Galaxies, planets and the silence between stars.",
    highlights: ["Spiral galaxies", "Ringed planets", "A living black hole", "Deep-space nebulae"],
    features: [
      { label: "Galaxy atlas", detail: "Drift between star systems and map the unknown." },
      { label: "Planetary flybys", detail: "Skim the rings and storms of alien worlds." },
      { label: "Event horizon", detail: "Approach a black hole and watch light bend." },
    ],
    colors: { primary: "#4f6bff", secondary: "#9a4dff", accent: "#b9c8ff" },
    artwork: aetherArt,
    portal: { shape: 0, pattern: 0 },
    transition: 0,
    transitionName: "Cosmic tunnel",
    storyTitle: "Beyond Space",
    storyText: "Past the last star, the dark begins to glow. AETHER is the universe, unfolded.",
  },
  {
    id: "abyss",
    index: 1,
    name: "ABYSS",
    tagline: "Into the Living Ocean.",
    category: "Underwater Exploration",
    description: "Discover an enormous underwater ecosystem filled with marine life.",
    teaser: "An ocean that breathes, glows and watches back.",
    highlights: ["Migrating whales", "Bioluminescent jellyfish", "Coral cathedrals", "Trenches of the deep"],
    features: [
      { label: "Ocean depths", detail: "Descend from sunlit shallows into the midnight zone." },
      { label: "Living ecosystem", detail: "Pods, reefs and swarms that react to your presence." },
      { label: "Bioluminescence", detail: "Light made by the creatures themselves." },
    ],
    colors: { primary: "#12a6c9", secondary: "#0a3d8f", accent: "#7dfbe0" },
    artwork: abyssArt,
    portal: { shape: 1, pattern: 1 },
    transition: 1,
    transitionName: "Water distortion",
    storyTitle: "Beneath the Ocean",
    storyText: "Sink through the surface. Down here, the ocean is the one that is alive.",
  },
  {
    id: "neoverse",
    index: 2,
    name: "NEOVERSE",
    tagline: "The City That Never Sleeps.",
    category: "Futuristic City",
    description: "Explore a living futuristic city with five distinct districts.",
    teaser: "Neon canyons, flying traffic, five districts awake.",
    highlights: ["Neon skyscrapers", "Flying vehicles", "Holographic streets", "Five districts"],
    features: [
      { label: "Five districts", detail: "From the glowing core to the rain-soaked underlevels." },
      { label: "Sky traffic", detail: "Lanes of vehicles weave between the towers." },
      { label: "Holo-streets", detail: "Signage, ads and data that respond to you." },
    ],
    colors: { primary: "#2f9bff", secondary: "#b44dff", accent: "#7ff1ff" },
    artwork: neoverseArt,
    portal: { shape: 2, pattern: 2 },
    transition: 2,
    transitionName: "Digital grid",
    storyTitle: "Into the Future",
    storyText: "Rain, neon and a billion lights. The city never sleeps — and neither will you.",
  },
  {
    id: "mythora",
    index: 3,
    name: "MYTHORA",
    tagline: "Worlds Beyond Reality.",
    category: "Fantasy Universe",
    description: "Enter five magical fantasy worlds filled with mythical creatures.",
    teaser: "Floating castles, ancient runes and dragons on the wind.",
    highlights: ["Floating castles", "Enchanted forests", "Dragons", "Five magical realms"],
    features: [
      { label: "Five realms", detail: "Each realm has its own magic, myths and creatures." },
      { label: "Mythical creatures", detail: "Dragons, spirits and guardians of old." },
      { label: "Ancient runes", detail: "Decode symbols that awaken the landscape." },
    ],
    colors: { primary: "#ffc247", secondary: "#8a3dff", accent: "#ffe9a8" },
    artwork: mythoraArt,
    portal: { shape: 3, pattern: 3 },
    transition: 3,
    transitionName: "Magical energy wave",
    storyTitle: "Beyond Imagination",
    storyText: "Step through the arch and the old stories are no longer stories.",
  },
  {
    id: "nexdrive",
    index: 4,
    name: "NEXDRIVE",
    tagline: "The Future of Mobility.",
    category: "Futuristic Automotive",
    description: "Discover futuristic vehicles, interactive showrooms, and driving experiences.",
    teaser: "Hypercars, showrooms and roads built for speed.",
    highlights: ["Luxury hypercars", "Futuristic vehicles", "Premium showrooms", "High-speed circuits"],
    features: [
      { label: "Interactive showrooms", detail: "Inspect every curve, finish and detail." },
      { label: "Next-gen vehicles", detail: "Electric, autonomous and unapologetically fast." },
      { label: "Driving experiences", detail: "High-speed environments built for the machine." },
    ],
    colors: { primary: "#39b6ff", secondary: "#c9d3e0", accent: "#e8f6ff" },
    artwork: nexdriveArt,
    portal: { shape: 4, pattern: 4 },
    transition: 4,
    transitionName: "Hyper-speed rings",
    storyTitle: "The Future Moves Here",
    storyText: "Silence, then acceleration. Mobility, rebuilt from the first principle.",
  },
];

export const WORLDS: WorldConfig[] = STATIC.map((w) => {
  const a = resolveAvailability(w.id);
  return { ...w, url: a.url, status: a.status, statusNote: a.note };
});

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, WorldConfig>;

export const STATUS_LABEL: Record<Availability, string> = {
  available: "Available",
  "coming-soon": "Coming Soon",
  unavailable: "Unavailable",
};

export function canEnter(w: WorldConfig): boolean {
  return w.status === "available" && !!w.url;
}
