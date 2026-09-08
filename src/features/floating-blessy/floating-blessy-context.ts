import { resolveSiteNavigationContext, type SiteNavigationContext } from "@/components/customer-navigation";
import { FLOATING_BLESSY_POSES, type FloatingBlessyPoseId } from "./floating-blessy.config";

export type FloatingBlessySemanticContext =
  "welcome" | "book-discovery" | "help" | "community" | "operational" | "account";

export type FloatingBlessyBubbleAlign = "center" | "left";

type FloatingBlessyContextConfig = {
  semanticContext: FloatingBlessySemanticContext;
  poseId: FloatingBlessyPoseId;
  message?: string;
  bubbleAlign: FloatingBlessyBubbleAlign;
};

export const FLOATING_BLESSY_CONTEXTS = {
  home: { semanticContext: "welcome", poseId: "greeting", bubbleAlign: "center" },
  "ready-stock": {
    semanticContext: "book-discovery",
    poseId: "question",
    message: "Mau cari buku yang bisa langsung dibawa pulang? Cek Ready Stock yuk!",
    bubbleAlign: "center",
  },
  community: {
    semanticContext: "community",
    poseId: "greeting",
    message: "Mau kenalan lebih dekat sama Blessfriends? Yuk lihat komunitasnya!",
    bubbleAlign: "center",
  },
  "how-to-order": {
    semanticContext: "help",
    poseId: "apology",
    message: "Masih bingung cara mesannya? Sini, aku bantu tunjukin alurnya ya!",
    bubbleAlign: "left",
  },
  catalog: { semanticContext: "book-discovery", poseId: "question", bubbleAlign: "center" },
  join: {
    semanticContext: "community",
    poseId: "greeting",
    message: "Mau gabung jadi bagian dari Blessfriends? Yuk, sini!",
    bubbleAlign: "center",
  },
  orders: { semanticContext: "operational", poseId: "apology", bubbleAlign: "left" },
  invoices: { semanticContext: "operational", poseId: "apology", bubbleAlign: "left" },
  account: { semanticContext: "account", poseId: "sleeping", bubbleAlign: "center" },
} as const satisfies Record<SiteNavigationContext, FloatingBlessyContextConfig>;

export type FloatingBlessyNavigation = {
  navigationContext: SiteNavigationContext;
  semanticContext: FloatingBlessySemanticContext;
  poseId: FloatingBlessyPoseId;
  message: string;
  bubbleAlign: FloatingBlessyBubbleAlign;
  isFallback: boolean;
};

export function resolveFloatingBlessyNavigation(pathname: string): FloatingBlessyNavigation {
  const resolvedContext = resolveSiteNavigationContext(pathname);
  const navigationContext = resolvedContext || "home";
  const context: FloatingBlessyContextConfig = FLOATING_BLESSY_CONTEXTS[navigationContext];
  const pose = findFloatingBlessyPose(context.poseId);

  return {
    navigationContext,
    semanticContext: context.semanticContext,
    poseId: context.poseId,
    message: context.message || pose.message,
    bubbleAlign: context.bubbleAlign,
    isFallback: resolvedContext === null,
  };
}

export function findFloatingBlessyPose(poseId: FloatingBlessyPoseId) {
  return FLOATING_BLESSY_POSES.find((pose) => pose.id === poseId) || FLOATING_BLESSY_POSES[0];
}
