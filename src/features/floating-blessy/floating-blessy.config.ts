import { assetReferences } from "@/config/assets";

const [greetingAsset, questionAsset, apologyAsset, sleepingAsset] = assetReferences.mascot.expectedPaths;

const mascotAsset = (src: string) => ({
  src,
  width: 5000,
  height: 5000,
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
