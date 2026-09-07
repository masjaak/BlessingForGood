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
  betweenMessagesMs: 150000,
  poseExitMs: 160,
  poseEnterMs: 220,
  bubbleTransitionMs: 200,
} as const;

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
    message: "Kalau Admin telat bales, sabar ya. Mungkin lagi dinas ke nyuapin anaknya.",
  },
  {
    id: "sleeping",
    semanticPose: "tiduran dengan mata terpejam",
    asset: mascotAsset(sleepingAsset),
    message: "Ssstt jangan bilang ka Madin, aku mau tidur dulu!",
  },
] as const;
