import { describe, it, expect } from "vitest";
import {
  DEFAULT_INPUT,
  calcMaintenance,
  distributeAssets,
  validateInput,
  type SettlementInput,
} from "../src/lib/settlement";

const base = (over: Partial<SettlementInput>): SettlementInput => ({
  ...DEFAULT_INPUT,
  ...over,
});

describe("calcMaintenance", () => {
  it("25% benchmark with no recipient income", () => {
    const r = calcMaintenance(
      base({ payerIncome: 100000, recipientIncome: 0, ruleId: "benchmark-25" }),
    );
    expect(r.monthly).toBe(25000);
    expect(r.annual).toBe(300000);
  });

  it("caps the benchmark when incomes are close", () => {
    const r = calcMaintenance(
      base({ payerIncome: 100000, recipientIncome: 80000, ruleId: "benchmark-25" }),
    );
    expect(r.monthly).toBe(10000);
  });

  it("returns 0 when the recipient earns more", () => {
    const r = calcMaintenance(
      base({ payerIncome: 50000, recipientIncome: 90000, ruleId: "equalisation" }),
    );
    expect(r.monthly).toBe(0);
  });

  it("equalisation is half the income gap", () => {
    const r = calcMaintenance(
      base({ payerIncome: 100000, recipientIncome: 40000, ruleId: "equalisation" }),
    );
    expect(r.monthly).toBe(30000);
  });

  it("needs-based is needs minus own income, capped at 50% of payer income", () => {
    const a = calcMaintenance(
      base({ payerIncome: 100000, recipientIncome: 20000, recipientNeeds: 50000, ruleId: "needs-based" }),
    );
    expect(a.monthly).toBe(30000);
    const b = calcMaintenance(
      base({ payerIncome: 40000, recipientIncome: 0, recipientNeeds: 90000, ruleId: "needs-based" }),
    );
    expect(b.monthly).toBe(20000);
  });
});

describe("distributeAssets", () => {
  it("splits the net estate by the payer share", () => {
    const d = distributeAssets(
      base({ propertyValue: 1000000, savings: 200000, investments: 0, otherAssets: 0, debts: 200000, payerSharePercent: 60 }),
    );
    expect(d.netEstate).toBe(1000000);
    expect(d.payerShare).toBe(600000);
    expect(d.recipientShare).toBe(400000);
  });
});

describe("validateInput", () => {
  it("accepts the default input", () => {
    expect(validateInput(DEFAULT_INPUT).ok).toBe(true);
  });

  it("rejects negative income with a clear message", () => {
    const r = validateInput({ ...DEFAULT_INPUT, payerIncome: -5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.payerIncome).toContain("cannot be negative");
  });

  it("rejects a share above 100%", () => {
    const r = validateInput({ ...DEFAULT_INPUT, payerSharePercent: 101 });
    expect(r.ok).toBe(false);
  });
});