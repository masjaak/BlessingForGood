const [greetingAsset, questionAsset, apologyAsset, sleepingAsset] = [
  "/brand/mascot/floating-blessy/Blessy 1.png",
  "/brand/mascot/floating-blessy/Blessy 2.png",
  "/brand/mascot/floating-blessy/Blessy 3.png",
  "/brand/mascot/floating-blessy/Blessy 4.png",
] as const;

const mascotAsset = (src: string) => ({
  src,
  width: 1254,
  height: 1254,
});

export const FLOATING_BLESSY_TIMING = {
  initialDelayMs: 1500,
  bubbleVisibleMs: 7000,
  bubbleTransitionMs: 200,
  poseExitMs: 160,
  poseEnterMs: 220,
  dragThresholdPx: 6,
} as const;

export const FLOATING_BLESSY_WHATSAPP_URL = "https://wa.me/6288973465977";
export const FLOATING_BLESSY_WHATSAPP_LABEL = "Chat Admin BFG lewat WhatsApp";
export const FLOATING_BLESSY_CTA = "Klik aku kalau mau ngobrol langsung ya";

export const FLOATING_BLESSY_POSES = [
  {
    id: "greeting",
    semanticPose: "menyapa",
    asset: mascotAsset(greetingAsset),
    message: "Hallo, Selamat datang di Website Official BFG! Namaku Blessy!",
  },
  {
    id: "question",
    semanticPose: "senyum imut dengan tanda tanya",
    asset: mascotAsset(questionAsset),
    message: "Hari ini mau FIX buku apa?",
  },
  {
    id: "apology",
    semanticPose: "meminta maaf",
    asset: mascotAsset(apologyAsset),
    message: "Kalau Admin telat bales, sabar ya. Mungkin lagi ada tugas penting: nyuapin anak dulu.",
  },
  {
    id: "sleeping",
    semanticPose: "tiduran dengan mata terpejam",
    asset: mascotAsset(sleepingAsset),
    message: "Ssstt jangan bilang ka Madin, aku mau tidur dulu!",
  },
] as const;

export type FloatingBlessyPoseId = (typeof FLOATING_BLESSY_POSES)[number]["id"];
