# 8. Security architecture

## 8.1 Trust boundaries

![8.1 Trust boundaries (diagram)](../diagrams/architecture-08-security-architecture-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    subgraph untrusted["🔴 Untrusted"]
        br["Browser<br/>URL params · form posts · cookies"]
        prov["Marketplace responses<br/>(JSON bodies, nextPageUrl, redirects)"]
    end

    subgraph server["🟢 MarginMint server (trusted)"]
        guard["Request guards<br/>Origin check · POST-only · allow-list params"]
        oauth["OAuth service<br/>hashed single-use state + cookie binding"]
        zod["Zod validation of every provider response<br/>+ nextPageUrl origin check"]
        svc["Services"]
        env["Server env (secrets)<br/>LWA / Flipkart secrets · TOKEN_ENCRYPTION_KEY · DATABASE_URL"]
        cipher["AES-256-GCM"]
    end

    subgraph store["🟡 Stored data"]
        db[("Neon: tokens = ciphertext only<br/>state = hash only · no buyer PII")]
    end

    br --> guard --> svc
    br --> oauth
    prov --> zod --> svc
    svc --> cipher --> db
    env -. "never sent to browser" .-> svc
```

</details>

## 8.2 Where each secret lives

| Secret | Location | Reaches the browser? | Stored in DB? |
|--------|----------|----------------------|---------------|
| `AMAZON_LWA_CLIENT_SECRET`, `FLIPKART_CLIENT_SECRET` | Server env | ❌ | ❌ |
| `TOKEN_ENCRYPTION_KEY` | Server env | ❌ | ❌ |
| `DATABASE_URL` (password) | Server env | ❌ | — |
| Seller refresh / access tokens | Server memory during a request | ❌ | ✅ ciphertext only |
| OAuth `state` | httpOnly cookie (browser) + hash in DB | Only as an opaque httpOnly cookie | ✅ SHA-256 hash only |

## 8.3 Attack → defence map

![8.3 Attack → defence map (diagram)](../diagrams/architecture-08-security-architecture-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    a1["Attacker tricks a victim into<br/>finishing the attacker's OAuth flow<br/>(login CSRF)"] --> d1["state must equal the httpOnly cookie<br/>set in the same browser"]
    a2["Replay a captured callback URL"] --> d2["state consumed atomically, single use,<br/>10-minute expiry"]
    a3["Cross-site form posts<br/>to connect / sync / disconnect"] --> d3["POST-only + Origin must match APP_URL"]
    a4["Link prefetch creating state"] --> d4["connect rejects GET (405)"]
    a5["Database dump"] --> d5["tokens AES-256-GCM encrypted;<br/>state stored as hash"]
    a6["Hostile provider response<br/>redirecting the bearer token"] --> d6["nextPageUrl must be on the configured host"]
    a7["Malformed payload"] --> d7["Zod schemas → bad_response, nothing saved"]
    a8["SQL injection"] --> d8["Prisma API + parameterised Prisma.sql only"]
    a9["Reflected text in result pages"] --> d9["allow-listed result codes → fixed messages"]
    a10["Spreadsheet formula injection<br/>in CSV exports"] --> d10["cells starting = + - @ tab CR are prefixed with '"]
```

</details>

## 8.4 The open gap

![8.4 The open gap (diagram)](../diagrams/architecture-08-security-architecture-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    anyone(["Anyone with the URL"]) -- "no login today" --> app["MarginMint"]
    app --> ws["getCurrentWorkspace()<br/>always returns ws_acme_india"]
    ws --> all["can connect accounts<br/>and read synced orders"]
```

</details>

Every query is already scoped by `workspaceId`, and the workspace always comes from the server. Adding login means changing `getCurrentWorkspace()` to return the **signed-in member's** workspace (see [Target architecture](09-target-architecture.md)). Until then, real credentials must stay off public deployments. Full details: [Security](../09-security.md).
