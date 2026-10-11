import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { InfoTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MarketplaceRow } from "@/services/dashboard";

export function MarketplaceTable({ rows }: { rows: MarketplaceRow[] }) {
  return (
    <TableContainer>
      <Table className="min-w-[760px]">
        <THead>
          <tr>
            <Th className="pl-4">Marketplace</Th>
            <Th align="right">Orders</Th>
            <Th align="right">Net sales</Th>
            <Th align="right">Net profit</Th>
            <Th align="right">Margin</Th>
            <Th align="right">
              <span className="inline-flex items-center gap-1">
                Return rate
                <InfoTooltip label="Return rate" content="Returned units ÷ sold units in the selected period (unit-level, not order-level)." />
              </span>
            </Th>
            <Th align="right" className="pr-4">
              <span className="inline-flex items-center gap-1">
                Pending settlement
                <InfoTooltip
                  label="Pending settlement"
                  content="Expected proceeds not yet paid out, as of the last sync. Not filtered by date."
                />
              </span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => {
            const total = row.id === "TOTAL";
            const overhead = row.id === "OVERHEAD";
            return (
              <Tr
                key={row.id}
                className={cn(total && "border-t border-slate-300 bg-slate-50/70 font-semibold hover:bg-slate-50/70", overhead && "text-muted")}
              >
                <Td className="pl-4">
                  <span className="inline-flex items-center gap-2">
                    {row.label}
                    {row.selected && !total ? (
                      <span className="rounded-[4px] bg-mint px-1 text-2xs font-medium text-forest">Filtered</span>
                    ) : null}
                  </span>
                </Td>
                <Td align="right">{row.orders}</Td>
                <Td align="right">{row.netSales}</Td>
                <Td align="right" className={row.netProfitNegative ? "text-loss-text" : undefined}>
                  {row.netProfit}
                </Td>
                <Td align="right" className={row.margin.startsWith("−") ? "text-loss-text" : undefined}>
                  {row.margin}
                </Td>
                <Td align="right">{row.returnRate}</Td>
                <Td align="right" className="pr-4">
                  {row.pendingSettlement}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </TableContainer>
  );
}
