import { z } from "zod";

/** Subset of the Orders API 2026-01-01 response we rely on. Unknown fields are ignored. */
const money = z.object({ amount: z.string(), currencyCode: z.string() });

const breakdown = z.object({ type: z.string(), subtotal: money });

export const amazonOrderItemSchema = z.object({
  orderItemId: z.string(),
  quantityOrdered: z.number().int().nonnegative(),
  product: z
    .object({
      asin: z.string().optional(),
      title: z.string().optional(),
      sellerSku: z.string().optional(),
      price: z.object({ unitPrice: money.optional() }).optional(),
    })
    .optional(),
  proceeds: z.object({ proceedsTotal: money.optional(), breakdowns: z.array(breakdown).optional() }).optional(),
  fulfillment: z.object({ quantityFulfilled: z.number().optional(), quantityUnfulfilled: z.number().optional() }).optional(),
});

export const amazonOrderSchema = z.object({
  orderId: z.string(),
  createdTime: z.string(),
  lastUpdatedTime: z.string(),
  salesChannel: z.object({ channelName: z.string(), marketplaceId: z.string().optional() }),
  fulfillment: z
    .object({
      fulfillmentStatus: z.string(),
      fulfilledBy: z.string().optional(),
    })
    .optional(),
  packages: z.array(z.object({ packageStatus: z.object({ status: z.string() }).optional() })).optional(),
  orderItems: z.array(amazonOrderItemSchema),
});

export const searchOrdersResponseSchema = z.object({
  orders: z.array(amazonOrderSchema),
  pagination: z.object({ nextToken: z.string().optional() }).optional(),
  lastUpdatedBefore: z.string().optional(),
  createdBefore: z.string().optional(),
});

export const lwaTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  token_type: z.string().optional(),
  expires_in: z.number().int().positive(),
});

export type AmazonOrder = z.infer<typeof amazonOrderSchema>;
export type AmazonOrderItem = z.infer<typeof amazonOrderItemSchema>;
