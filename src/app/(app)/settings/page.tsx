import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { MARKETPLACE_RATE_CARD } from "@/data/demo/catalog";
import { MARKETPLACES } from "@/data/demo/types";
import { DEFAULT_INSIGHT_THRESHOLDS } from "@/domain/insights";
import { formatInr, Money } from "@/domain/money";
import { BUSINESS_TIME_ZONE, formatDayLong } from "@/lib/dates";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 text-[13px] sm:grid-cols-3 sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink sm:col-span-2">{value}</dd>
    </div>
  );
}

const POLICIES: [string, string][] = [
  ["Net sales", "Gross item sales − discounts − value of cancelled lines. GST is not treated as revenue."],
  ["Gross profit", "Net sales − cost of goods sold. Missing unit cost makes profit unknown, never zero."],
  ["Contribution profit", "Gross profit − marketplace fees − shipping & fulfilment."],
  ["Net profit", "Contribution profit − advertising − refund & return losses − other recorded expenses."],
  ["Return losses", "Recognised on the return date: refund + return shipping − cost of stock recovered."],
  ["Settlement difference", "Actual received − expected. Negative = underpaid; positive = unexplained additional credit."],
  ["Settlements vs sales", "Payouts are cash movements and are never added to sales."],
  ["Shared overhead", "Expenses without a marketplace count only in workspace totals; they are not allocated to channels or products."],
  ["Money precision", "All amounts are stored in paise and calculated with decimal arithmetic; display rounds half-up."],
];

export default function SettingsPage() {
  const ws = getCurrentWorkspace();
  const t = DEFAULT_INSIGHT_THRESHOLDS;
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Workspace details and the accounting policies every figure follows." />
      <Notice>
        Settings are read-only in the demo. Editing thresholds, rate cards and team members requires authentication and the database layer,
        which arrive in the next phase.
      </Notice>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Workspace" />
          <CardContent>
            <dl className="divide-y divide-line">
              <Row label="Name" value={ws.name} />
              <Row label="Mode" value="Demo — simulated, seeded records" />
              <Row label="Reporting currency" value={`${ws.currency} (Indian Rupee), 2 decimal places`} />
              <Row label="Business time zone" value={`${BUSINESS_TIME_ZONE} (IST). Days are bucketed in IST.`} />
              <Row label="Data history" value={`${formatDayLong(ws.dataStartDay)} – ${formatDayLong(ws.today)}`} />
              <Row label="Last data update" value={ws.lastSyncedLabel} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Insight thresholds" description="Rules behind “Needs your attention”." />
          <CardContent>
            <dl className="divide-y divide-line">
              <Row label="Stock-out risk" value={`Warning ≤ ${t.stockWarningDays} days of cover, critical ≤ ${t.stockCriticalDays} days (or a top-profit product)`} />
              <Row label="High return rate" value={`≥ ${t.returnRatePct}% of units, with at least ${t.minUnitsForReturnRate} units sold`} />
              <Row label="Low margin" value={`< ${t.lowMarginPct}% net margin for the top ${t.highRevenueShare * 100}% of products by net sales`} />
              <Row label="Ad spend outpacing sales" value={`Spend up ≥ ${t.adSpendIncreasePct}% while net sales move within ±${t.flatSalesBandPct}%`} />
              <Row label="Loss after advertising" value={`Net loss of at least ₹${t.materialLossRupees} on a product that is profitable before ads`} />
              <Row label="Settlement discrepancy" value="Any received transaction whose amount differs from expected" />
            </dl>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader title="Accounting policies" description="Management-accounting estimates, not audited statutory profit." />
        <CardContent>
          <dl className="divide-y divide-line">
            {POLICIES.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Channel rate card" description="Fees used to seed the demo and to estimate unit contribution." />
        <TableContainer className="mt-3">
          <Table className="min-w-[640px]">
            <THead>
              <tr>
                <Th className="pl-4">Channel</Th>
                <Th align="right">Commission</Th>
                <Th align="right">Fixed fee / unit</Th>
                <Th align="right">Shipping / order</Th>
                <Th align="right" className="pr-4">
                  Settlement cycle
                </Th>
              </tr>
            </THead>
            <TBody>
              {MARKETPLACES.map((m) => {
                const card = MARKETPLACE_RATE_CARD[m];
                return (
                  <Tr key={m}>
                    <Td className="pl-4">{MARKETPLACE_LABEL[m]}</Td>
                    <Td align="right">{(card.commissionBps / 100).toFixed(2)}%</Td>
                    <Td align="right">{formatInr(Money.fromMinor(card.fixedFeePaise))}</Td>
                    <Td align="right">{formatInr(Money.fromMinor(card.shippingPaise))}</Td>
                    <Td align="right" className="pr-4">
                      {card.settlementLagDays} days
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
      </Card>
    </div>
  );
}
