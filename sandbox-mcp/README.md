# Alenaz PayPal Sandbox MCP server

**Private API**; all PayPal requests go to `https://api-m.sandbox.paypal.com` only. No Live billing, no credit cards, no real charges.

Vercel env variables (production deployment of this *separate, Sandbox-only server*):
- `ALENAZ_MCP_ACCESS_TOKEN`: a random, unique authentication token, at least 32 characters, stored as **Sensitive**.
- `PAYPAL_CLIENT_ID`: Sandbox app client ID, stored as Sensitive.
- `PAYPAL_CLIENT_SECRET`: matching Sandbox app Client Secret, stored as Sensitive.

Do not publish or send values through chat or commit them to Git. The server can be reachable publicly but **every MCP request must provide Authorization: Bearer <token>**, including tool discovery. The `/healthz` endpoint shows only configuration readiness (boolean), never secrets. The plugin's `mcp.json` uses the deployment URL and bearer API-key authentication, configured privately by its owner during connection.

Available tools: `check_sandbox_connection`, `inspect_sandbox_plan`, `create_alenaz_premium_sandbox_plan`. Creating a plan requires a boolean confirmation and stable idempotency key from the user. Creation makes a Sandbox product and fixed $9.99/month plan, returning only non-secret IDs. The plugin cannot directly change Alenaz Vercel's separate environment variables; after plan creation, set `PAYPAL_PREMIUM_PLAN_ID` on Alenaz's Preview project and deploy its `paypal-sandbox-checkout` branch.

If unable to connect, verify MCP bearer key matches between this Vercel project and the plugin's secure connection screen; then check Sandbox credentials with the read-only tool. Never enable Live billing.

Source: `davitvardanyangugu/alenaz-ai`, branch `paypal-sandbox-checkout`, folder `sandbox-mcp/`.
