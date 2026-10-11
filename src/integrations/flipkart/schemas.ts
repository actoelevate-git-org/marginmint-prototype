import { z } from "zod";

/** Subset of the Shipments v3 filter response we rely on. Unknown fields are ignored. */
const amount = z.union([z.number(), z.string()]).nullable().optional();

export const flipkartOrderItemSchema = z.object({
  orderItemId: z.union([z.string(), z.number()]).transform(String),
  orderId: z.string(),
  status: z.string(),
  orderDate: z.string(),
  sku: z.string().nullable().optional(),
  fsn: z.string().nullable().optional(),
  quantity: z.number().int().nonnegative(),
  priceComponents: z
    .object({
      sellingPrice: amount,
      totalPrice: amount,
      shippingCharge: amount,
      customerPrice: amount,
    })
    .partial()
    .optional(),
});

export const shipmentsResponseSchema = z.object({
  hasMore: z.boolean().optional(),
  nextPageUrl: z.string().nullable().optional(),
  shipments: z
    .array(
      z.object({
        shipmentId: z.string().optional(),
        updatedAt: z.string().nullable().optional(),
        orderItems: z.array(flipkartOrderItemSchema),
      }),
    )
    .default([]),
});

export const flipkartTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  refresh_token_expires_in: z.number().int().positive().optional(),
});

export type FlipkartOrderItem = z.infer<typeof flipkartOrderItemSchema>;
