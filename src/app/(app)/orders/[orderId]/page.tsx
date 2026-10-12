import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { InfoTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getOrderDetail } from "@/services/orders";

export const metadata: Metadata = { title: "Order detail" };

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let id: string;
  try {
    id = decodeURIComponent(orderId);
  } catch {
    notFound();
  }
  const order = getOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All orders
      </Link>
      <PageHeader
        title={order.id}
        description={`${order.marketplace} · placed ${order.placedAt} · ${order.customerRef}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} label={order.statusLabel} />
            <span className="text-[13px] text-muted">{order.fulfillment}</span>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Line items" description="Shipping is allocated to lines in proportion to line value." />
          <TableContainer className="mt-3">
            <Table className="min-w-[760px]">
              <THead>
                <tr>
                  <Th className="pl-4">Product</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Unit price</Th>
                  <Th align="right">Discount</Th>
                  <Th align="right">Line net</Th>
                  <Th align="right">Est. cost</Th>
                  <Th align="right">Fees</Th>
                  <Th align="right" className="pr-4">
                    Shipping
                  </Th>
                </tr>
              </THead>
              <TBody>
                {order.lines.map((line) => (
                  <Tr key={line.sku}>
                    <Td className="pl-4">
                      <Link href={line.productHref} className="font-medium hover:underline">
                        {line.name}
                      </Link>
                      <div className="font-mono text-2xs text-muted">{line.sku}</div>
                    </Td>
                    <Td align="right">{line.quantity}</Td>
                    <Td align="right">{line.unitPrice}</Td>
                    <Td align="right">{line.discount}</Td>
                    <Td align="right" className="font-medium">
                      {line.net}
                    </Td>
                    <Td align="right">{line.cogs}</Td>
                    <Td align="right">{line.fees}</Td>
                    <Td align="right" className="pr-4">
                      {line.shipping}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        </Card>

        <Card>
          <CardHeader
            title="Order profit"
            description={order.cancelled ? "Cancelled orders carry no sales or costs." : "Before advertising and shared overhead."}
            titleAddon={
              <InfoTooltip
                label="Order profit"
                content="Advertising and overhead are tracked at product and workspace level, not per order, so they are excluded here to avoid inventing an allocation."
              />
            }
          />
          <CardContent>
            <dl className="divide-y divide-line text-[13px]">
              {order.profit.map((row) => (
                <div key={row.label} className={cn("flex justify-between gap-4 py-1.5", row.emphasis && "font-semibold")}>
                  <dt className={row.emphasis ? "text-ink" : "text-slate-600"}>{row.label}</dt>
                  <dd className={cn("num", row.negative && "text-loss-text")}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Settlement transactions" description="Cash movements for this order — not additional sales." />
          {order.settlements.length === 0 ? (
            <EmptyState title="No settlement yet" description="Proceeds are expected after the channel's settlement cycle once the order ships." />
          ) : (
            <TableContainer className="mt-3">
              <Table className="min-w-[560px]">
                <THead>
                  <tr>
                    <Th className="pl-4">Transaction</Th>
                    <Th align="right">Expected</Th>
                    <Th align="right">Actual</Th>
                    <Th align="right">Difference</Th>
                    <Th className="pr-4">Status</Th>
                  </tr>
                </THead>
                <TBody>
                  {order.settlements.map((txn) => (
                    <Tr key={txn.id}>
                      <Td className="pl-4">
                        <div className="font-mono text-xs">{txn.id}</div>
                        <div className="text-2xs text-muted">
                          {txn.type} · {txn.date}
                        </div>
                      </Td>
                      <Td align="right">{txn.expected}</Td>
                      <Td align="right">{txn.actual}</Td>
                      <Td align="right" className={txn.difference.startsWith("−") ? "text-loss-text" : undefined}>
                        {txn.difference}
                      </Td>
                      <Td className="pr-4 text-slate-600">
                        {txn.status}
                        <div className="max-w-[220px] whitespace-normal text-2xs text-muted">{txn.notes}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          )}
        </Card>
        <Card>
          <CardHeader title="Returns & refunds" />
          {order.returns.length === 0 ? (
            <EmptyState title="No returns" description="No return has been recorded against this order." />
          ) : (
            <TableContainer className="mt-3">
              <Table className="min-w-[560px]">
                <THead>
                  <tr>
                    <Th className="pl-4">Return</Th>
                    <Th>Reason</Th>
                    <Th align="right">Refund</Th>
                    <Th align="right" className="pr-4">
                      Est. loss
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {order.returns.map((ret) => (
                    <Tr key={ret.id}>
                      <Td className="pl-4">
                        <div className="font-mono text-xs">{ret.id}</div>
                        <div className="text-2xs text-muted">
                          {ret.quantity} × {ret.sku} · {ret.date}
                        </div>
                      </Td>
                      <Td>
                        {ret.reason}
                        <div className="text-2xs text-muted">{ret.recovered ? "Stock recovered" : "Not recoverable"}</div>
                      </Td>
                      <Td align="right">{ret.refund}</Td>
                      <Td align="right" className="pr-4">
                        {ret.loss}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
