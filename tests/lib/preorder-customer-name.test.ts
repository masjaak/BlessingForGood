import { describe, expect, it } from "vitest";
import { resolvePreorderCustomerName } from "@/lib/preorder-customer-name";

describe("preorder customer name precedence", () => {
  it("uses the BFG display name before Clerk identity fields", () => {
    expect(
      resolvePreorderCustomerName({
        bfgDisplayName: " MULIA KAH ",
        clerkFullName: "Mulia Raya",
        clerkUsername: "muliaraya",
      }),
    ).toBe("MULIA KAH");
  });

  it("falls back to Clerk full name when BFG display name is blank", () => {
    expect(
      resolvePreorderCustomerName({
        bfgDisplayName: "   ",
        clerkFullName: "Mulia Raya",
        clerkUsername: "muliaraya",
      }),
    ).toBe("Mulia Raya");
  });

  it("falls back to Clerk username when names are unavailable", () => {
    expect(
      resolvePreorderCustomerName({
        bfgDisplayName: "",
        clerkFullName: "",
        clerkUsername: "muliaraya",
      }),
    ).toBe("muliaraya");
  });

  it("leaves the field empty when every source is empty", () => {
    expect(resolvePreorderCustomerName({ bfgDisplayName: " ", clerkFullName: null, clerkUsername: undefined })).toBe(
      "",
    );
  });
});
