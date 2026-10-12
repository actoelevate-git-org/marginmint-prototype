# 7. Data model

Source of truth: `prisma/schema.prisma` · migration `prisma/migrations/20261011000000_marketplace_integrations/migration.sql`.

## 7.1 Entity-relationship diagram (as built)

![7.1 Entity-relationship diagram (diagram)](../diagrams/architecture-07-data-model-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
erDiagram
    Workspace ||--o{ MarketplaceConnection : "has (cascade)"
    Workspace ||--o{ OAuthState : "has (cascade)"
    Workspace ||--o{ ExternalOrder : "has (cascade)"
    Workspace ||--o{ SyncRun : "has (cascade)"
    ExternalOrder ||--o{ ExternalOrderItem : "contains (cascade)"

    Workspace {
        text id PK "e.g. ws_acme_india"
        text name
        timestamp createdAt
    }
    MarketplaceConnection {
        text id PK "cuid"
        text workspaceId FK
        enum provider "AMAZON or FLIPKART"
        text externalSellerId "Amazon selling_partner_id"
        enum status "CONNECTED, REAUTH_REQUIRED, DISCONNECTED"
        text refreshTokenEnc "AES-256-GCM ciphertext"
        text accessTokenEnc "AES-256-GCM ciphertext"
        timestamp accessTokenExpiresAt
        timestamp refreshTokenExpiresAt
        jsonb syncState "provider cursor"
        timestamp connectedAt
        timestamp updatedAt
        timestamp lastSyncAt
        enum lastSyncStatus "RUNNING, SUCCEEDED, PARTIAL, FAILED"
        text lastSyncMessage "safe text only"
    }
    OAuthState {
        text id PK
        text workspaceId FK
        enum provider
        text stateHash UK "SHA-256 hex"
        timestamp expiresAt "now + 10 min"
        timestamp consumedAt "null until used"
        timestamp createdAt
    }
    ExternalOrder {
        text id PK
        text workspaceId FK
        enum provider
        text externalOrderId "marketplace order id"
        timestamp orderedAt "UTC"
        timestamp providerUpdatedAt
        enum status "PENDING … RETURNED"
        text providerStatus "raw marketplace status"
        text fulfilledBy "MERCHANT, AMAZON or null"
        char currency "INR"
        decimal itemValue "14,2 · null if unpriced"
        decimal discount "14,2 · null if unknown"
        int units
        timestamp firstSyncedAt
        timestamp lastSyncedAt
    }
    ExternalOrderItem {
        text id PK
        text orderId FK
        text externalItemId "Amazon orderItemId / Flipkart orderItemId"
        text sku
        text productRef "ASIN or FSN"
        text title
        int quantity
        decimal unitPrice "14,2"
        decimal lineValue "14,2"
        text providerStatus
    }
    SyncRun {
        text id PK
        text workspaceId FK
        enum provider
        enum status
        timestamp startedAt
        timestamp finishedAt
        int ordersFetched
        int ordersCreated
        int ordersUpdated
        text message
    }
```

</details>

## 7.2 Keys and indexes

| Table | Unique | Indexes | Why |
|-------|--------|---------|-----|
| `MarketplaceConnection` | `(workspaceId, provider)` | — | One account per marketplace per workspace |
| `OAuthState` | `stateHash` | `expiresAt` | Fast lookup on callback; cheap cleanup of old states |
| `ExternalOrder` | `(workspaceId, provider, externalOrderId)` | `(workspaceId, orderedAt)`, `(workspaceId, provider, status)` | Idempotent upsert; Orders tab date range and status tabs |
| `ExternalOrderItem` | `(orderId, externalItemId)` | — | One row per marketplace line |
| `SyncRun` | — | `(workspaceId, provider, startedAt)` | Lock check + history |

## 7.3 Data deliberately NOT stored

- Buyer name, email, phone, address (Amazon `BUYER`/`RECIPIENT` never requested)
- Plaintext tokens (ciphertext only) or raw OAuth `state` (hash only)
- Raw provider payloads (only normalized fields)

## 7.4 Where demo data lives

The analytics demo dataset is **not** in the database. It is generated in memory from `src/data/demo/seed.ts`. Its shapes (`DemoOrder`, `DemoProduct`, `DemoReturn`, `DemoSettlementTxn`, `DemoAdMetric`, `DemoExpense`) are in `src/data/demo/types.ts`. See [Target architecture](09-target-architecture.md) for the plan to persist analytics data.
