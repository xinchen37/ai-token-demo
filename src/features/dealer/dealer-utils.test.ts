import { describe, expect, it } from "vitest";
import { dealerSeedData } from "./seed-data";
import { buildRanking, buildTrendSeries, calculateDashboardMetrics, maskApiKey, rankByAmount } from "./dealer-utils";

describe("dealer-utils", () => {
  it("根据本地消费数据计算看板指标", () => {
    const metrics = calculateDashboardMetrics(dealerSeedData);

    expect(metrics.customerCount).toBe(3);
    expect(metrics.activeCustomerCount).toBe(2);
    expect(metrics.totalAmount).toBeGreaterThan(30000);
    expect(metrics.profit).toBeGreaterThan(0);
  });

  it("按模型消费金额生成排行榜", () => {
    const ranking = rankByAmount(dealerSeedData.consumptions, "modelName");

    expect(ranking[0].amount).toBeGreaterThanOrEqual(ranking[1].amount);
    expect(ranking.some((item) => item.name === "DeepSeek-R1")).toBe(true);
  });

  it("脱敏 API Key 时保留首尾信息", () => {
    expect(maskApiKey("sk-omni-xinghe-prod-9ab3c")).toBe("sk-omn***ab3c");
  });

  it("今天的趋势图按小时生成数据点", () => {
    const points = buildTrendSeries(dealerSeedData.consumptions, "amount", "today", new Date("2026-07-03T14:00:00+08:00"));

    expect(points).toHaveLength(15);
    expect(points[0].label).toBe("00:00");
    expect(points[14].label).toBe("14:00");
    expect(points.some((point) => point.value > 0)).toBe(true);
  });

  it("趋势图支持金额、Token 和调用次数三种指标", () => {
    const now = new Date("2026-07-03T14:00:00+08:00");
    const amountPoints = buildTrendSeries(dealerSeedData.consumptions, "amount", "last7", now);
    const tokenPoints = buildTrendSeries(dealerSeedData.consumptions, "tokens", "last7", now);
    const callPoints = buildTrendSeries(dealerSeedData.consumptions, "calls", "last7", now);

    expect(amountPoints).toHaveLength(7);
    expect(tokenPoints).toHaveLength(7);
    expect(callPoints).toHaveLength(7);
    expect(tokenPoints[0].value).not.toBe(amountPoints[0].value);
    expect(callPoints.every((point) => point.value >= 1)).toBe(true);
  });

  it("排行榜支持按销售人员聚合客户消耗", () => {
    const ranking = buildRanking(dealerSeedData, "sales");

    expect(ranking[0].name).toBe("林夕");
    expect(ranking[0].customerCount).toBe(1);
    expect(ranking[0].averageAmount).toBeGreaterThan(0);
  });
});
