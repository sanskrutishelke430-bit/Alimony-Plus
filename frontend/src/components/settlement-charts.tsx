"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RULES,
  calcMaintenance,
  distributeAssets,
  type SettlementInput,
} from "@/lib/settlement";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const compact = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

type Row = { name: string; amount: number };

function ChartCard({
  title,
  caption,
  rows,
  color,
}: {
  title: string;
  caption: string;
  rows: Row[];
  color: string;
}) {
  return (
    <figure className="rounded-lg border border-gray-300 bg-white p-4 text-black">
      <figcaption className="mb-2">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm">{caption}</span>
      </figcaption>
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`${title}: ${rows.map((r) => `${r.name} ${inr(r.amount)}`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => compact(Number(v))} width={56} />
            <Tooltip formatter={(v) => inr(Number(v))} />
            <Bar dataKey="amount" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row">{r.name}</th>
              <td>{inr(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function SettlementCharts({ input }: { input: SettlementInput }) {
  const d = distributeAssets(input);

  const assetRows: Row[] = [
    { name: "Total assets", amount: d.totalAssets },
    { name: "Debts", amount: d.debts },
    { name: "Net estate", amount: d.netEstate },
  ];
  const shareRows: Row[] = [
    { name: "Paying spouse", amount: d.payerShare },
    { name: "Receiving spouse", amount: d.recipientShare },
  ];
  const ruleRows: Row[] = RULES.map((r) => ({
    name: r.label,
    amount: calcMaintenance({ ...input, ruleId: r.id }).monthly,
  }));

  return (
    <section aria-labelledby="charts-title" className="space-y-3">
      <h2 id="charts-title" className="text-xl font-semibold">
        Charts
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Assets and debts"
          caption="Total assets, debts and the resulting net estate."
          rows={assetRows}
          color="#1e40af"
        />
        <ChartCard
          title="Net estate split"
          caption="How the net estate divides at the chosen share."
          rows={shareRows}
          color="#047857"
        />
        <ChartCard
          title="Monthly maintenance by rule"
          caption="Same inputs, all three illustrative rules."
          rows={ruleRows}
          color="#b45309"
        />
      </div>
    </section>
  );
}