import { describe, expect, it } from "vitest";
import { dealerSeedData } from "./seed-data";
import { buildRanking, buildTrendSeries, calculateConsumptionCost, calculateDashboardMetrics, maskApiKey, rankByAmount } from "./dealer-utils";

describe("dealer-utils", () => {
  it("根据本地消费数据计算看板指标", () => {
    const metrics = calculateDashboardMetrics(dealerSeedData);

    expect(metrics.customerCount).toBe(114);
    expect(metrics.activeCustomerCount).toBe(76);
    expect(metrics.totalAmount).toBeGreaterThan(160000);
    expect(metrics.totalAmount).toBeLessThan(180000);
    expect(metrics.requestCount).toBeGreaterThan(800000);
    expect(metrics.profit).toBeGreaterThan(0);
  });

  it("将旧本地小额概览数据自动调整到十万经营量级", () => {
    const metrics = calculateDashboardMetrics({
      ...dealerSeedData,
      consumptions: [
        { ...dealerSeedData.consumptions[0], inputTokens: 860000, outputTokens: 420000, amount: 10450.2 },
        { ...dealerSeedData.consumptions[1], inputTokens: 380000, outputTokens: 190000, amount: 7608.8 },
        { ...dealerSeedData.consumptions[2], inputTokens: 120000, outputTokens: 80000, amount: 18420 },
      ],
      bills: [{ ...dealerSeedData.bills[0], amount: 68420.5, status: "待结算" }],
    });

    expect(metrics.totalAmount).toBeCloseTo(168000, 0);
    expect(metrics.pendingSettlement).toBeCloseTo(75600, 0);
    expect(metrics.totalCost).toBeGreaterThan(100000);
    expect(metrics.profit).toBeGreaterThan(60000);
  });

  it("按模型消费金额生成排行榜", () => {
    const ranking = rankByAmount(dealerSeedData.consumptions, "modelName");

    expect(ranking[0].amount).toBeGreaterThanOrEqual(ranking[1].amount);
    expect(ranking.some((item) => item.name === "DeepSeek-R1")).toBe(true);
  });

  it("按模型成本率估算消费成本，避免历史 Token 数导致成本失真", () => {
    const cost = calculateConsumptionCost(
      {
        ...dealerSeedData.consumptions[0],
        inputTokens: 860000,
        outputTokens: 420000,
        amount: 36479,
      },
      dealerSeedData,
    );

    expect(cost).toBeGreaterThan(20000);
    expect(cost).toBeLessThan(22000);
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

  it("近30天金额趋势展示在十万以内的经营量级", () => {
    const points = buildTrendSeries(dealerSeedData.consumptions, "amount", "last30", new Date("2026-07-03T14:00:00+08:00"));
    const maxValue = Math.max(...points.map((point) => point.value));

    expect(maxValue).toBeGreaterThan(50000);
    expect(maxValue).toBeLessThan(100000);
  });

  it("排行榜支持按销售人员聚合客户消耗", () => {
    const ranking = buildRanking(dealerSeedData, "sales");

    expect(ranking[0].name).toBe("林夕");
    expect(ranking[0].customerCount).toBe(1);
    expect(ranking[0].averageAmount).toBeGreaterThan(0);
  });
});
