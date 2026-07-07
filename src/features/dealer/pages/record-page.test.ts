import { describe, expect, it } from "vitest";
import { dealerSeedData } from "../seed-data";
import { getProductBillingLabel, getProductCardStats } from "./record-page";

describe("RecordPage product card display", () => {
  it("shows the standard chat package as pay-as-you-go with model-based pricing", () => {
    const product = dealerSeedData.products.find((item) => item.id === "prod-001");

    expect(product).toBeDefined();
    expect(getProductBillingLabel(product!.packageMode, product!.billingMode)).toBe("按量计费");
    expect(getProductCardStats(product!)[0]).toEqual({ label: "价格", value: "按大模型售价" });
  });

  it("shows the video package as a monthly package with monthly pricing", () => {
    const product = dealerSeedData.products.find((item) => item.id === "prod-002");

    expect(product).toBeDefined();
    expect(getProductBillingLabel(product!.packageMode, product!.billingMode)).toBe("套餐计费");
    expect(getProductCardStats(product!)[0]).toEqual({ label: "价格", value: "¥1,500.00 / 月" });
  });
});
