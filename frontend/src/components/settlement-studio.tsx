"use client";

import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  DEFAULT_INPUT,
  RULES,
  runSettlement,
  validateInput,
  type SettlementInput,
} from "@/lib/settlement";

type Key = keyof SettlementInput;
type Raw = Record<Key, string>;
type Scenario = {
  name: string;
  input: SettlementInput;
  result: ReturnType<typeof runSettlement>;
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const field = "mt-1 w-full rounded-md border border-gray-400 bg-white p-2 text-black";
const btn =
  "rounded-md bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-900 disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-blue-800";
const card = "rounded-lg border border-gray-300 bg-white p-4 text-black";

const initialRaw = Object.fromEntries(
  Object.entries(DEFAULT_INPUT).map(([k, v]) => [k, String(v)]),
) as Raw;

function toInput(raw: Raw) {
  const num = (k: Key) => (raw[k].trim() === "" ? NaN : Number(raw[k]));
  return {
    payerIncome: num("payerIncome"),
    recipientIncome: num("recipientIncome"),
    recipientNeeds: num("recipientNeeds"),
    ruleId: raw.ruleId,
    propertyValue: num("propertyValue"),
    savings: num("savings"),
    investments: num("investments"),
    otherAssets: num("otherAssets"),
    debts: num("debts"),
    payerSharePercent: num("payerSharePercent"),
  };
}

export function SettlementStudio() {
  const [raw, setRaw] = useState<Raw>(initialRaw);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const set = (k: Key, v: string) => setRaw((r) => ({ ...r, [k]: v }));
  const checked = validateInput(toInput(raw));
  const errors = checked.ok ? {} : checked.errors;
  const result = checked.ok ? runSettlement(checked.data) : null;

  function NumberField({ k, label }: { k: Key; label: string }) {
    return (
      <label className="block text-sm">
        {label}
        <input
          className={field}
          inputMode="numeric"
          value={raw[k]}
          aria-invalid={!!errors[k]}
          aria-describedby={errors[k] ? `${k}-err` : undefined}
          onChange={(e) => set(k, e.target.value)}
        />
        {errors[k] && (
          <span id={`${k}-err`} className="text-sm text-red-700">
            {errors[k]}
          </span>
        )}
      </label>
    );
  }

  function SliderField({ k, label, max, step }: { k: Key; label: string; max: number; step: number }) {
    const value = Number(raw[k]) || 0;
    return (
      <div className="text-sm">
        <div className="flex justify-between">
          <span id={`${k}-lbl`}>{label}</span>
          <span className="font-medium">
            {k === "payerSharePercent" ? `${value}%` : inr(value)}
          </span>
        </div>
        <Slider.Root
          className="relative mt-2 flex h-5 w-full touch-none select-none items-center"
          value={[Math.min(value, max)]}
          min={0}
          max={max}
          step={step}
          onValueChange={([n]) => set(k, String(n))}
        >
          <Slider.Track className="relative h-2 grow rounded-full bg-gray-300">
            <Slider.Range className="absolute h-full rounded-full bg-blue-800" />
          </Slider.Track>
          <Slider.Thumb
            aria-labelledby={`${k}-lbl`}
            className="block h-5 w-5 rounded-full border-2 border-blue-800 bg-white focus:outline-2 focus:outline-offset-2 focus:outline-blue-800"
          />
        </Slider.Root>
      </div>
    );
  }

  const rule = RULES.find((r) => r.id === raw.ruleId);

  return (
    <div className="space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Settlement Simulation Studio</h1>
        <p role="note" className="mt-2 rounded bg-yellow-100 p-2 text-sm text-black">
          Planning tool only. Results use illustrative rules, are not legal
          advice, and are not what a court will necessarily order.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="inputs-title" className="space-y-4">
          <h2 id="inputs-title" className="text-xl font-semibold">Inputs</h2>

          <label className="block text-sm">
            Calculation rule
            <select className={field} value={raw.ruleId} onChange={(e) => set("ruleId", e.target.value)}>
              {RULES.map((r) => (
                <option key={r.id} value={r.id}>{r.label} ({r.jurisdiction})</option>
              ))}
            </select>
            {errors.ruleId && <span className="text-sm text-red-700">{errors.ruleId}</span>}
          </label>
          {rule && <p className="text-sm">{rule.description}</p>}

          <SliderField k="payerIncome" label="Paying spouse monthly income" max={500000} step={1000} />
          <SliderField k="recipientIncome" label="Receiving spouse monthly income" max={500000} step={1000} />
          <SliderField k="payerSharePercent" label="Paying spouse share of net assets" max={100} step={1} />

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField k="payerIncome" label="Paying spouse income (exact)" />
            <NumberField k="recipientIncome" label="Receiving spouse income (exact)" />
            <NumberField k="recipientNeeds" label="Receiving spouse monthly needs" />
            <NumberField k="propertyValue" label="Property value" />
            <NumberField k="savings" label="Savings" />
            <NumberField k="investments" label="Investments" />
            <NumberField k="otherAssets" label="Other assets" />
            <NumberField k="debts" label="Debts" />
            <NumberField k="payerSharePercent" label="Paying spouse share (%)" />
          </div>
        </section>

        <section aria-labelledby="results-title" className="space-y-4">
          <h2 id="results-title" className="text-xl font-semibold">Live results</h2>
          {!result && (
            <p role="alert" className={card}>
              Fix the highlighted fields to see results.
            </p>
          )}
          {result && (
            <div className={card} aria-live="polite">
              <p className="text-sm">{result.maintenance.ruleLabel}</p>
              <p className="text-3xl font-semibold">
                {inr(result.maintenance.monthly)}
                <span className="text-base font-normal"> / month</span>
              </p>
              <p className="text-sm">{inr(result.maintenance.annual)} per year</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt>Total assets</dt><dd>{inr(result.distribution.totalAssets)}</dd>
                <dt>Debts</dt><dd>{inr(result.distribution.debts)}</dd>
                <dt>Net estate</dt><dd>{inr(result.distribution.netEstate)}</dd>
                <dt>Paying spouse share</dt><dd>{inr(result.distribution.payerShare)}</dd>
                <dt>Receiving spouse share</dt><dd>{inr(result.distribution.recipientShare)}</dd>
              </dl>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={btn}
              disabled={!checked.ok || !result || scenarios.length >= 3}
              onClick={() => {
                if (!checked.ok || !result) return;
                setScenarios((s) => [
                  ...s,
                  { name: `Scenario ${s.length + 1}`, input: checked.data, result },
                ]);
              }}
            >
              Save as scenario ({scenarios.length}/3)
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-400 px-4 py-2"
              onClick={() => setScenarios([])}
              disabled={scenarios.length === 0}
            >
              Clear scenarios
            </button>
          </div>
        </section>
      </div>

      <section aria-labelledby="cmp-title" className="space-y-2">
        <h2 id="cmp-title" className="text-xl font-semibold">Scenario comparison</h2>
        {scenarios.length === 0 ? (
          <p className={card}>
            Change the sliders, then press &ldquo;Save as scenario&rdquo; to compare up to 3 versions side by side.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm text-black">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th scope="col" className="p-2">Measure</th>
                  {scenarios.map((s) => (
                    <th scope="col" key={s.name} className="p-2">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Rule", (s: Scenario) => s.result.maintenance.ruleLabel],
                  ["Monthly maintenance", (s: Scenario) => inr(s.result.maintenance.monthly)],
                  ["Annual maintenance", (s: Scenario) => inr(s.result.maintenance.annual)],
                  ["Net estate", (s: Scenario) => inr(s.result.distribution.netEstate)],
                  ["Paying spouse share", (s: Scenario) => inr(s.result.distribution.payerShare)],
                  ["Receiving spouse share", (s: Scenario) => inr(s.result.distribution.recipientShare)],
                ].map(([label, fn]) => (
                  <tr key={label as string} className="border-t border-gray-300 bg-white">
                    <th scope="row" className="p-2 text-left font-medium">{label as string}</th>
                    {scenarios.map((s) => (
                      <td key={s.name} className="p-2">{(fn as (s: Scenario) => string)(s)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}