import { z } from "zod";

/* ---------- RULES ----------
   These are ILLUSTRATIVE planning rules, not statutes or legal advice.
   Courts decide maintenance case by case. State-specific rules should be
   added here as new entries only after verifying official sources. */
export const RULE_IDS = ["benchmark-25", "equalisation", "needs-based"] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const RULES: {
  id: RuleId;
  label: string;
  jurisdiction: string;
  description: string;
}[] = [
  {
    id: "benchmark-25",
    label: "25% income benchmark",
    jurisdiction: "Central (illustrative)",
    description:
      "A commonly cited planning benchmark of 25% of the paying spouse's net income, capped so the recipient does not end up with more than half of the combined income. Not a statutory formula.",
  },
  {
    id: "equalisation",
    label: "Income equalisation",
    jurisdiction: "Central (illustrative)",
    description:
      "Half of the income gap between the spouses. Shows an upper-end scenario.",
  },
  {
    id: "needs-based",
    label: "Needs-based",
    jurisdiction: "Central (illustrative)",
    description:
      "The recipient's stated monthly needs minus their own income, capped at 50% of the paying spouse's income.",
  },
];

/* ---------- VALIDATION (Zod) ---------- */
const money = (label: string) =>
  z
    .number({ message: `${label}: enter a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(1_000_000_000, `${label} is too large.`);

export const settlementSchema = z.object({
  payerIncome: money("Paying spouse income"),
  recipientIncome: money("Receiving spouse income"),
  recipientNeeds: money("Monthly needs"),
  ruleId: z.enum(RULE_IDS, { message: "Choose a rule." }),
  propertyValue: money("Property value"),
  savings: money("Savings"),
  investments: money("Investments"),
  otherAssets: money("Other assets"),
  debts: money("Debts"),
  payerSharePercent: z
    .number({ message: "Share: enter a number." })
    .min(0, "Share cannot be below 0%.")
    .max(100, "Share cannot be above 100%."),
});

export type SettlementInput = z.infer<typeof settlementSchema>;

export type ValidationResult =
  | { ok: true; data: SettlementInput }
  | { ok: false; errors: Record<string, string> };

export function validateInput(raw: unknown): ValidationResult {
  const parsed = settlementSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/* ---------- CALCULATIONS ---------- */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcMaintenance(input: SettlementInput) {
  const { payerIncome, recipientIncome, recipientNeeds, ruleId } = input;
  const rule = RULES.find((r) => r.id === ruleId)!;
  const equalCap = Math.max(0, (payerIncome - recipientIncome) / 2);
  let monthly = 0;

  if (ruleId === "benchmark-25") {
    monthly = Math.min(payerIncome * 0.25, equalCap);
  } else if (ruleId === "equalisation") {
    monthly = equalCap;
  } else {
    monthly = Math.min(
      Math.max(0, recipientNeeds - recipientIncome),
      payerIncome * 0.5,
    );
  }
  monthly = round2(Math.max(0, monthly));
  return {
    monthly,
    annual: round2(monthly * 12),
    ruleLabel: rule.label,
    jurisdiction: rule.jurisdiction,
  };
}

export function distributeAssets(input: SettlementInput) {
  const totalAssets =
    input.propertyValue + input.savings + input.investments + input.otherAssets;
  const netEstate = totalAssets - input.debts;
  const payerShare = round2((netEstate * input.payerSharePercent) / 100);
  const recipientShare = round2(netEstate - payerShare);
  return {
    totalAssets: round2(totalAssets),
    debts: round2(input.debts),
    netEstate: round2(netEstate),
    payerShare,
    recipientShare,
  };
}

export function runSettlement(input: SettlementInput) {
  return {
    maintenance: calcMaintenance(input),
    distribution: distributeAssets(input),
  };
}

export const DEFAULT_INPUT: SettlementInput = {
  payerIncome: 100000,
  recipientIncome: 20000,
  recipientNeeds: 50000,
  ruleId: "benchmark-25",
  propertyValue: 5000000,
  savings: 500000,
  investments: 300000,
  otherAssets: 0,
  debts: 800000,
  payerSharePercent: 50,
};