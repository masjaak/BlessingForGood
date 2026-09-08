import { resolveCustomerNavContext, type CustomerNavContext } from "@/components/customer-navigation";
import { FLOATING_BLESSY_POSES, type FloatingBlessyPoseId } from "./floating-blessy.config";

export const FLOATING_BLESSY_CONTEXTS = {
  home: { poseId: "greeting" },
  catalog: { poseId: "question" },
  orders: { poseId: "apology" },
  invoices: { poseId: "apology" },
  account: { poseId: "sleeping" },
} as const satisfies Record<CustomerNavContext, { poseId: FloatingBlessyPoseId }>;

export type FloatingBlessyNavigation = {
  navigationContext: CustomerNavContext;
  poseId: FloatingBlessyPoseId;
};

export function resolveFloatingBlessyNavigation(pathname: string): FloatingBlessyNavigation {
  const navigationContext = resolveCustomerNavContext(pathname);
  return { navigationContext, poseId: FLOATING_BLESSY_CONTEXTS[navigationContext].poseId };
}

export function findFloatingBlessyPose(poseId: FloatingBlessyPoseId) {
  return FLOATING_BLESSY_POSES.find((pose) => pose.id === poseId) || FLOATING_BLESSY_POSES[0];
}
