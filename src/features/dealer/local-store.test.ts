import { beforeEach, describe, expect, it } from "vitest";
import { dealerSeedData } from "./seed-data";
import { loadDealerData } from "./local-store";
import type { DealerData } from "./types";

const storageKey = "omni-ai-dealer-data-v1";

describe("local-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("updates built-in products from the latest seed while preserving custom products", () => {
    const legacyData: DealerData = {
      ...dealerSeedData,
      products: [
        {
          ...dealerSeedData.products[0],
          name: "旧版通用套餐",
          inputPrice: 999,
          tokenLimitM: "1000",
          monthlyTokenM: "1000",
          monthlyFee: 19800,
        },
        {
          ...dealerSeedData.products[0],
          id: "prod-custom",
          name: "客户自建套餐",
          inputPrice: 321,
        },
      ],
    };

    window.localStorage.setItem(storageKey, JSON.stringify(legacyData));

    const data = loadDealerData();
    const builtInProduct = data.products.find((product) => product.id === dealerSeedData.products[0].id);
    const customProduct = data.products.find((product) => product.id === "prod-custom");

    expect(builtInProduct).toMatchObject({
      name: dealerSeedData.products[0].name,
      inputPrice: dealerSeedData.products[0].inputPrice,
      tokenLimitM: dealerSeedData.products[0].tokenLimitM,
      monthlyTokenM: dealerSeedData.products[0].monthlyTokenM,
      monthlyFee: dealerSeedData.products[0].monthlyFee,
    });
    expect(customProduct).toMatchObject({
      name: "客户自建套餐",
      inputPrice: 321,
    });
  });
});
