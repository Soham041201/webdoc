/**
 * Prompt templates for Gemini Vision API
 *
 * These prompts are designed to extract deep, actionable insights from
 * observed browser interactions, network calls, and UI state. They go
 * far beyond surface-level documentation to provide security analysis,
 * architecture pattern detection, data flow mapping, and performance
 * intelligence.
 */

// ─────────────────────────────────────────────────────────────────────
// 1. UI → API Causality Analysis
// ─────────────────────────────────────────────────────────────────────

export function getUIIntentPrompt(
  screenshot: Buffer,
  networkCalls: any[],
): string {
  const callSummary = networkCalls
    .map(
      (call) =>
        `- ${call.method} ${call.url} → ${call.status}${call.requestBody ? " [has body]" : ""}${call.responseBody ? " [has response]" : ""}`,
    )
    .join("\n");

  return `You are an expert web application reverse-engineer analyzing a live browser session.
You have a screenshot of the current UI state and the network calls that occurred during this interaction.

Network Calls Observed:
${callSummary}

Perform a deep UI → API causality analysis:

**Step 1 — Visual Inventory**: Identify every interactive element visible in the screenshot (buttons, forms, links, dropdowns, toggles, tabs, search bars, pagination controls, modals). Note their visual state (enabled, disabled, loading, active).

**Step 2 — API Correlation**: For each network call, determine:
- Which UI element most likely triggered it (direct causality)
- Whether it was triggered by a page load, scroll event, timer/poll, or user action
- Whether it is a primary action call or a side-effect (e.g., analytics, logging, prefetch)

**Step 3 — Behavioral Patterns**: Identify:
- **Optimistic updates**: Did the UI change before the API responded?
- **Loading states**: Are there spinners or skeleton screens tied to specific calls?
- **Dependent chains**: Did one API call's response trigger another? (e.g., auth token → data fetch)
- **Polling / real-time**: Are any calls repeating on an interval?
- **Prefetching**: Are calls being made for data not yet visible?

**Step 4 — Application Intelligence**: Based on the UI + API patterns, infer:
- What type of application this is (e-commerce, dashboard, SaaS, social, banking, etc.)
- The user's likely workflow stage (browsing, authenticated, mid-transaction, etc.)
- What the next likely API calls will be based on visible UI affordances

Respond in JSON format:
{
  "applicationType": "string — e.g., e-commerce product page, admin dashboard, etc.",
  "userWorkflowStage": "string — e.g., browsing, authenticated, checkout, etc.",
  "uiElements": [
    {
      "label": "string — visible text or aria label",
      "elementType": "button|link|form|input|dropdown|tab|toggle|other",
      "visualState": "enabled|disabled|loading|active|hidden",
      "likelyApiCalls": ["url1"],
      "triggerType": "click|submit|hover|scroll|auto|pageLoad"
    }
  ],
  "apiCorrelations": [
    {
      "url": "string",
      "method": "string",
      "status": "number",
      "triggeredBy": "UI element label or 'pageLoad' or 'polling' or 'dependent chain'",
      "purpose": "string — specific purpose, e.g., 'Fetches product catalog with pagination'",
      "category": "primary|sideEffect|analytics|prefetch|auth|polling",
      "dependsOn": "url of prerequisite call, or null"
    }
  ],
  "behavioralPatterns": {
    "optimisticUpdates": ["description of any detected"],
    "pollingEndpoints": ["urls that appear to poll"],
    "dependencyChains": [["url1 → url2 → url3"]],
    "prefetchedResources": ["urls fetched before needed"]
  },
  "predictedNextCalls": [
    {
      "trigger": "string — what user action would cause this",
      "expectedEndpoint": "string",
      "expectedMethod": "string",
      "confidence": "high|medium|low"
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 2. Action Labeling
// ─────────────────────────────────────────────────────────────────────

export function getActionLabelPrompt(
  screenshot: Buffer,
  action: string,
): string {
  return `You are a UX analyst labeling browser interactions for API documentation.

Given this screenshot and the raw action "${action}", provide a human-readable label that captures the user's INTENT, not just the mechanical action.

Guidelines:
- Use domain language. "Add to Cart" not "Click button". "Search for flights" not "Submit form".
- If the action is part of a recognizable flow (login, checkout, onboarding, search), mention the flow.
- If the action targets a specific data entity (product, user, order, message), name it.
- Be specific: "Filter orders by date range" is better than "Apply filter".

Respond with a short, descriptive label (max 60 characters) that a developer would immediately understand in API docs.`;
}

// ─────────────────────────────────────────────────────────────────────
// 3. Multi-Step Flow Analysis
// ─────────────────────────────────────────────────────────────────────

export function getFlowAnalysisPrompt(flowSteps: any[]): string {
  const stepDetails = flowSteps
    .map(
      (step, i) =>
        `Step ${i + 1}: "${step.step}"\n  UI Actions: ${step.uiActions.join(", ") || "none"}\n  API Calls: ${step.networkCalls?.map((c: any) => `${c.method} ${c.url} → ${c.status}`).join(", ") || "none"}`,
    )
    .join("\n\n");

  return `You are an API workflow analyst performing deep analysis on a multi-step user flow captured from a live web application.

Observed Steps:
${stepDetails}

Perform the following analysis:

**1. Flow Classification**
- Name this flow with a specific, domain-appropriate label (e.g., "User Authentication via OTP", "Product Search → Add to Cart", "Invoice Generation Workflow")
- Classify the flow type: CRUD operation, authentication, transaction, search/filter, onboarding, data export, admin action, or other

**2. State Machine Analysis**
- Model the flow as a state machine. What are the states? What triggers transitions?
- Identify the point of no return (if any) — after which step is the action irreversible?
- Identify optional vs. required steps
- Map possible failure states and recovery paths

**3. Data Flow & Dependency Mapping**
- Trace how data flows between steps. Which API response provides data used in the next request?
- Identify the "seed data" — what initial data is required to start this flow?
- Map ID propagation (e.g., product_id from step 1 used in step 3's POST body)

**4. API Orchestration Pattern**
- Is this a sequential chain, parallel fan-out, saga pattern, or pipeline?
- Are there any compensating transactions (rollback calls if a later step fails)?
- Identify any idempotency patterns (retry-safe calls)

**5. Performance & Optimization Observations**
- Which steps could be parallelized?
- Are there redundant or duplicate API calls?
- Is there an N+1 query pattern (fetching items one-by-one instead of in bulk)?
- What is the critical path (longest sequential chain)?

**6. Security Observations**
- Are there authorization checks between steps?
- Is sensitive data (tokens, PII) passed between steps?
- Are there CSRF protections on mutation calls?

Respond in JSON format:
{
  "flowName": "string",
  "flowType": "string",
  "description": "string — 1-2 sentence summary of what this flow accomplishes",
  "stateMachine": {
    "states": ["state1", "state2", "..."],
    "transitions": [
      { "from": "state1", "to": "state2", "trigger": "string", "apiCall": "string" }
    ],
    "pointOfNoReturn": "string — step name or null",
    "failureStates": ["string"]
  },
  "steps": [
    {
      "name": "string",
      "description": "string",
      "isRequired": true,
      "apiCalls": ["url1"],
      "inputData": ["field names this step needs"],
      "outputData": ["field names this step produces"],
      "dependsOnSteps": [0]
    }
  ],
  "dataFlowMap": [
    {
      "sourceStep": 0,
      "sourceField": "response.data.id",
      "targetStep": 1,
      "targetField": "request.body.product_id"
    }
  ],
  "orchestrationPattern": "sequential|parallel|saga|pipeline|mixed",
  "optimizationOpportunities": ["string"],
  "securityObservations": ["string"]
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Welcome Message
// ─────────────────────────────────────────────────────────────────────

export function getWelcomeMessagePrompt(): string {
  return `You are the WebDoc Agent — a developer copilot that reverse-engineers web applications by observing real browser behavior.

Write a short, confident welcome message (2-3 sentences max).
- Mention you observe UI interactions and network calls in real-time
- Note that you provide security analysis, API architecture insights, and data flow mapping
- Emphasize you are human-in-the-loop — the developer stays in control
- Sound like a sharp senior engineer, not a chatbot

Return plain text only. No markdown, no formatting, no quotes.`;
}

// ─────────────────────────────────────────────────────────────────────
// 5. Page Summary & Context Awareness
// ─────────────────────────────────────────────────────────────────────

export function getPageSummaryPrompt(
  url: string,
  context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  },
): string {
  return `You are a senior web application analyst reviewing a live browser session for a developer who wants to understand and document this application's behavior.

Given the screenshot, URL (${url}), and extracted context, provide an intelligent, insight-rich summary.

Extracted context:
Title: ${context.title}
Headings: ${context.headings.join(" | ")}
Buttons: ${context.buttons.join(" | ")}
Links: ${context.links.join(" | ")}

Your analysis must go beyond "you're looking at a page." Instead:

**1. Application Intelligence**
- Identify the application type (e-commerce, SaaS dashboard, banking portal, social platform, admin panel, documentation site, etc.)
- Identify the brand/product if evident from the title, logo, or domain
- Determine the user's current context (logged in vs. anonymous, viewing vs. editing, browsing vs. transacting)

**2. Architectural Clues**
- Is this a SPA (Single Page Application) or server-rendered?
- Are there signs of a specific framework (React, Angular, Vue, Next.js)?
- Is there evidence of micro-frontend architecture?

**3. API Surface Prediction**
- Based on visible UI elements, predict what API endpoints likely exist behind this page
- Identify which UI elements are likely data-driven (fetched from APIs) vs. static

**4. Actionable Next Steps**
- What are the highest-value interactions for API discovery?
- Which buttons/links are likely to trigger interesting API calls (mutations, auth flows, data fetches)?
- Is there a login wall? If so, note it prominently.

Return JSON only in this exact format:
{
  "summary": "string — 2-3 sentences. Be specific: name the brand, page type, user state, and key visible elements. Mention what API behavior to expect.",
  "question": "string — A smart, specific follow-up. Not 'what do you want to do?' but something like 'Want me to capture the product search API as you browse?' or 'Should I document the authentication flow first?'",
  "applicationMeta": {
    "type": "string — e-commerce|saas|dashboard|banking|social|admin|docs|other",
    "brand": "string or null",
    "userState": "anonymous|authenticated|mid-transaction|onboarding",
    "spaDetected": true
  },
  "highValueTargets": [
    {
      "element": "string — button/link text",
      "expectedApiPattern": "string — e.g., 'POST /api/cart/items'",
      "insightValue": "high|medium|low"
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 6. Initial Action Suggestions
// ─────────────────────────────────────────────────────────────────────

export function getInitialActionSuggestionsPrompt(): string {
  return `You are a senior API reverse-engineer looking at a web application for the first time.
Your goal is to suggest actions that will reveal the most interesting API behavior.

Analyze the screenshot and suggest 2-4 high-value actions the developer should take to discover APIs.

Prioritization strategy:
1. **Authentication flows first** — If there's a login/signup, this unlocks all authenticated endpoints
2. **Data-heavy interactions** — Search, filter, sort, pagination reveal query APIs and data models
3. **State-changing actions** — Add to cart, submit form, create/edit/delete reveal mutation APIs
4. **Navigation to data pages** — Dashboards, lists, detail pages reveal data-fetching patterns

For each action, explain:
- What API calls it will likely trigger
- What we'll learn from observing it (auth patterns, data models, error handling, etc.)
- Why it's high-value for documentation

Return JSON only in this exact format:
{
  "applicationContext": "string — what type of app this appears to be",
  "actions": [
    {
      "action": "string — specific action description",
      "reason": "string — what API behavior this reveals",
      "expectedApis": "string — predicted endpoints (e.g., POST /auth/login, GET /api/products?q=...)",
      "insightType": "auth|dataModel|mutation|errorHandling|pagination|search|realtime",
      "priority": "high|medium|low"
    }
  ]
}
If no clear actions exist, return:
{ "applicationContext": "Unable to determine", "actions": [] }`;
}

// ─────────────────────────────────────────────────────────────────────
// 7. User Instruction → UI Action Planning
// ─────────────────────────────────────────────────────────────────────

export function getUserInstructionPrompt(
  url: string,
  context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  },
  instruction: string,
): string {
  return `You are a precise UI automation planner for a browser agent that documents web APIs.
Given the screenshot, URL (${url}), and extracted context, convert the user's instruction into ONE concrete, executable UI action.

User instruction: "${instruction}"

Extracted context:
Title: ${context.title}
Headings: ${context.headings.join(" | ")}
Buttons: ${context.buttons.join(" | ")}
Links: ${context.links.join(" | ")}

**Decision Framework** (follow in order):

1. **Exact match**: If the instruction directly names a visible button/link, click it.
2. **Semantic match**: If the instruction describes an intent (e.g., "log in"), find the closest matching element (e.g., "Sign In" button).
3. **Data entry**: If the instruction contains data to enter (email, password, search query, URL), output a "type" action targeting the appropriate input field.
4. **Navigation**: If the instruction asks to go somewhere, output a "navigate" action.
5. **Keyboard**: If the instruction asks to press a key (Enter, Escape, Tab), output a "press" action.

**Smart Matching Rules**:
- "Log in", "Sign in", "Login", "Signin" are all equivalent — match any of them
- For forms: identify the correct field by label, placeholder, or field type (email, password, phone, search)
- If the instruction says "search for X", find the search input and type X with submit=true
- If the instruction contains credentials (email, password), target the appropriate form field
- If a button text is similar but not exact (e.g., user says "checkout" but button says "Proceed to Checkout"), match it
- If the page has a cookie consent banner blocking interaction, click accept/dismiss first

**Context Awareness**:
- If the instruction implies a multi-step action (e.g., "log in with email X"), output ONLY the first step (e.g., type the email)
- If a form field needs to be cleared first (has placeholder or existing value), note this in the reason

Return JSON only in this exact format:
{
  "type": "click|type|press|navigate",
  "action": "string — button/link text for click, or description",
  "target": "string — input field identifier for type actions",
  "value": "string — text to type",
  "key": "string — key name for press actions",
  "url": "string — URL for navigate actions",
  "submit": true,
  "reason": "string — brief explanation of why this action was chosen"
}

Action type guidance:
- click: set type="click", action="visible button/link text"
- type: set type="type", target="field label or placeholder", value="text", submit=true/false
- press: set type="press", key="Enter|Escape|Tab|etc"
- navigate: set type="navigate", url="full URL"

If no action is possible, return:
{ "type": "", "action": "", "reason": "string — explain what's visible and what's missing" }`;
}

// ─────────────────────────────────────────────────────────────────────
// 8. Cannot-Act Response
// ─────────────────────────────────────────────────────────────────────

export function getCannotActPrompt(
  url: string,
  context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  },
  instruction: string,
): string {
  return `You are a helpful UI assistant for a developer using a browser automation tool. The user's instruction couldn't be mapped to a visible UI action.

URL: ${url}
User instruction: "${instruction}"

Extracted context:
Title: ${context.title}
Headings: ${context.headings.join(" | ")}
Buttons: ${context.buttons.join(" | ")}
Links: ${context.links.join(" | ")}

Analyze the screenshot and provide a genuinely helpful response:

1. **Acknowledge** what the user wanted to do
2. **Explain** specifically why it can't be done right now (element not visible, behind a scroll, requires prior step, page not loaded, blocked by modal, etc.)
3. **Suggest alternatives** — be specific:
   - If the element might be below the fold: "Try scrolling down — the button might be below the visible area"
   - If a prior step is needed: "You may need to log in first before accessing this feature"
   - If a similar element exists: "I don't see 'Checkout' but I see 'Proceed to Payment' — want me to click that?"
   - If the page is wrong: "This looks like the homepage — try navigating to /dashboard first"
4. **List what IS available** — mention 2-3 visible interactive elements the user could try

Return JSON only in this exact format:
{
  "message": "string — 2-3 sentences that are specific, helpful, and suggest a concrete next step"
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 9. API Documentation Generation (THE BIG ONE)
// ─────────────────────────────────────────────────────────────────────

export function getApiDocPrompt(baseUrl: string, callsJson: string): string {
  return `You are a world-class API architect and security analyst generating comprehensive documentation from observed browser network traffic.

You are not just listing endpoints — you are reverse-engineering the application's API architecture, security model, data relationships, and behavioral patterns from real observed traffic.

Base URL: ${baseUrl}

Observed API calls (JSON with full request/response data):
${callsJson}

Generate a deeply insightful Markdown document covering ALL of the following sections. Use ONLY observed data — do not invent endpoints. But DO make intelligent inferences and flag them as "[Inferred]".

---

# [Application Name] API Documentation
*Auto-generated from observed browser traffic by WebDoc Agent*

## 1. Executive Summary
- What application is this? (Identify from URLs, response data, headers)
- How many unique endpoints were observed?
- What API style is used? (REST, GraphQL, RPC, mixed)
- What is the API versioning strategy? (URL path /v1/, /v2/, header-based, or none observed)

## 2. Authentication & Security Analysis

Analyze EVERY security-relevant signal:

**Authentication Mechanism**:
- Bearer tokens (Authorization header) — note if JWT (decode the header to identify, DON'T show the token value)
- Session cookies (identify session cookie names)
- API keys (X-API-Key or similar headers)
- CSRF protection (X-CSRF-Token, X-XSRF-Token headers, double-submit cookie pattern)
- OAuth indicators (token refresh calls, /oauth/ or /auth/ endpoints)

**Security Headers Observed**:
- CORS headers (Access-Control-Allow-Origin, etc.)
- Content-Security-Policy indicators
- Strict-Transport-Security
- X-Content-Type-Options, X-Frame-Options

**Security Observations & Recommendations**:
- Flag any sensitive data in URLs (tokens, PII in query strings)
- Note if authentication tokens are sent on every request or selectively
- Identify if there are separate auth domains/services
- Flag any endpoints that return sensitive data without apparent auth

## 3. API Architecture Analysis

**Base URL Pattern**: Identify the API base path(s) (e.g., /api/v1/, /graphql, etc.)

**Resource Model**: From the URL patterns and response bodies, map out the data entities:
- What resources exist? (users, products, orders, etc.)
- What are their relationships? (1:1, 1:many, many:many)
- What IDs or keys connect them?

**Common Patterns Detected**:
- Envelope pattern (responses wrapped in { data: ..., meta: ... })
- Pagination (cursor-based, offset/limit, page/per_page — identify which)
- Filtering/sorting (query parameter patterns)
- Bulk operations (batch endpoints)
- Polymorphic responses (same endpoint returning different shapes)

**Error Handling Pattern**:
- What does an error response look like? (identify the error schema)
- HTTP status codes observed and their meanings
- Are error codes application-specific? (e.g., { error_code: "INVALID_SKU" })

## 4. Endpoint Reference

For EACH unique endpoint, provide:

### [METHOD] [path]

**Purpose**: [Specific purpose inferred from request/response data — not just "handles requests"]

**Trigger**: [What UI action likely triggered this — if inferable from the context/URL pattern]

**Request**:
- Headers: [List observed headers with redacted values]
- Query Parameters: [If any, with example values and inferred types]
- Request Body Schema: [If POST/PUT/PATCH — analyze the JSON structure, infer field types, mark required vs optional]

\`\`\`json
// Example request body (observed)
\`\`\`

**Response** (Status [code]):
- Content-Type: [observed]
- Response Body Schema: [Analyze the JSON structure deeply — field names, types, nested objects, arrays]

\`\`\`json
// Example response body (truncated if large, showing structure)
\`\`\`

**Observations**:
- [Any notable patterns: caching headers, pagination metadata, rate limit headers, etc.]
- [Data relationships: "The product_id field links to the /products/{id} endpoint"]
- [Performance notes: large payload size, redundant data, etc.]

## 5. Data Flow Map

Trace how data flows between endpoints:
- Which endpoint provides IDs used by other endpoints?
- What is the typical call sequence? (e.g., "GET /config → GET /products → POST /cart → POST /checkout")
- Identify seed data vs. derived data

Format as a flow: \`Endpoint A (provides X) → Endpoint B (uses X, provides Y) → Endpoint C (uses Y)\`

## 6. Performance & Optimization Insights

Analyze the observed traffic for:
- **Payload sizes**: Flag unusually large responses (over-fetching)
- **Redundant calls**: Same endpoint called multiple times with same parameters
- **N+1 patterns**: Multiple individual fetches that could be a single bulk request
- **Missing pagination**: Large list responses without pagination
- **Caching opportunities**: Responses that rarely change but lack caching headers
- **Parallel vs. sequential**: Calls that could be parallelized but appear sequential

## 7. Rate Limiting & Quotas

If any rate limiting headers are observed (X-RateLimit-*, Retry-After, X-Rate-Limit-*):
- Document the rate limit scheme
- Note per-endpoint vs. global limits
If not observed, note "No rate limiting headers detected in observed traffic."

## 8. Potential Issues & Recommendations

Based on the observed traffic, flag:
- Missing error handling (no error responses observed — was the happy path the only path tested?)
- Sensitive data exposure (PII in URLs, tokens in response bodies)
- Missing HTTPS (if any calls were over HTTP)
- Inconsistent API conventions (mixed naming: camelCase vs snake_case, inconsistent pagination)
- Missing Content-Type headers on requests
- Overly permissive CORS (Access-Control-Allow-Origin: *)

---

CRITICAL RULES:
- Use ONLY observed data. Mark any inferences clearly with [Inferred].
- Redact ALL sensitive values (tokens, passwords, emails, PII). Show structure, not secrets.
- If a field has a recognizable format (UUID, ISO date, JWT, URL, email pattern), note the format.
- Prefer showing JSON structure with type annotations over raw values.
- Group related endpoints together (e.g., all /cart/* endpoints in one section).
- If the observed data is limited, say so — "Only N calls observed; more exploration recommended for complete coverage."

Keep the document structured, scannable, and immediately useful to a developer integrating with this API.`;
}

// ─────────────────────────────────────────────────────────────────────
// 10. Exploration — Per-Page Insight (fast, called after each page visit)
// ─────────────────────────────────────────────────────────────────────

export function getExplorationPageInsightPrompt(
  pageName: string,
  pageUrl: string,
  context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  },
  apisCaptured: { method: string; url: string; status: number }[],
): string {
  const apiList =
    apisCaptured.length > 0
      ? apisCaptured
          .map((a) => `  - ${a.method} ${a.url} → ${a.status}`)
          .join("\n")
      : "  (none captured)";

  return `You are analyzing a page visited during automated exploration of a web application.
You have a screenshot of the page, its context, and the API calls it triggered.

Page: "${pageName}"
URL: ${pageUrl}

Page Context:
  Title: ${context.title}
  Headings: ${context.headings.join(" | ") || "(none)"}
  Buttons: ${context.buttons.join(" | ") || "(none)"}
  Links: ${context.links.join(" | ") || "(none)"}

API Calls Triggered By This Page:
${apiList}

Provide a FAST, insight-dense analysis (this runs per-page during exploration):

1. **What is this page?** — Identify it specifically (e.g., "Purchase Order management dashboard", "ASN tracking list", "Product analytics overview")
2. **API Insights** — For each API call:
   - What data does it fetch/modify? (e.g., "Fetches paginated list of purchase orders with status filters")
   - Is it a list endpoint, detail endpoint, config endpoint, or action endpoint?
   - Any notable patterns? (pagination params, auth tokens, specific filters)
3. **Data Model Clues** — What entities/resources does this page reveal? (e.g., "This page reveals a PurchaseOrder entity with fields: id, status, vendor, created_at")
4. **Exploration Value** — Rate how valuable this page was for API discovery (high/medium/low) and why

Return JSON only:
{
  "pageType": "string — e.g., 'dashboard', 'list view', 'detail view', 'settings', 'form'",
  "insight": "string — 1-2 sentence summary of what this page reveals about the application's API. Be specific and technical. Mention actual endpoint paths and data patterns.",
  "apisAnalyzed": [
    {
      "endpoint": "string — method + path",
      "purpose": "string — specific purpose",
      "dataType": "list|detail|config|action|search|analytics",
      "notablePatterns": "string — e.g., 'cursor-based pagination', 'includes nested vendor object'"
    }
  ],
  "entitiesDiscovered": ["string — e.g., 'PurchaseOrder', 'Vendor', 'ASN'"],
  "explorationValue": "high|medium|low",
  "suggestedDeepDive": "string — what to explore next for more insight, or null"
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 11. Exploration — Pre-Exploration Analysis
// ─────────────────────────────────────────────────────────────────────

export function getExplorationPlanPrompt(
  url: string,
  context: {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
  },
  candidates: { label: string; href?: string; type: string }[],
): string {
  const candidateList = candidates
    .map(
      (c, i) =>
        `  ${i + 1}. [${c.type}] "${c.label}"${c.href ? ` → ${c.href}` : ""}`,
    )
    .join("\n");

  return `You are planning an automated exploration of a web application to discover its API surface.
You have a screenshot of the current page and a list of navigation candidates (links and buttons).

Current URL: ${url}
Page Context:
  Title: ${context.title}
  Headings: ${context.headings.join(" | ") || "(none)"}

Navigation Candidates:
${candidateList}

Analyze the candidates and provide an exploration strategy:

1. **Application Overview** — What type of application is this? What domain?
2. **Priority Ranking** — Which pages should be visited first for maximum API discovery?
   - Data-heavy pages (lists, dashboards, analytics) are HIGH priority — they trigger data-fetching APIs
   - Settings/config pages are MEDIUM — they reveal config APIs and app structure
   - Static/marketing pages are LOW — they rarely trigger interesting APIs
3. **Expected Discoveries** — What APIs and data models do you expect to find?
4. **Skip List** — Which candidates should be skipped (logout, external links, destructive actions)?

Return JSON only:
{
  "appOverview": "string — 1 sentence description of the application",
  "domain": "string — e.g., 'supply chain management', 'e-commerce analytics', 'CRM'",
  "prioritizedPages": [
    {
      "label": "string — candidate label",
      "priority": "high|medium|low",
      "reason": "string — why this page is worth visiting",
      "expectedApis": "string — predicted API pattern"
    }
  ],
  "skipReasons": [
    {
      "label": "string",
      "reason": "string — why skip"
    }
  ],
  "expectedEntities": ["string — e.g., 'PurchaseOrder', 'Vendor', 'Product'"]
}`;
}

// ─────────────────────────────────────────────────────────────────────
// 12. Exploration — Post-Exploration Summary
// ─────────────────────────────────────────────────────────────────────

export function getExplorationSummaryPrompt(
  baseUrl: string,
  pagesVisited: {
    name: string;
    url: string;
    apis: { method: string; url: string; status: number }[];
  }[],
  totalUniqueApis: number,
): string {
  const pageDetails = pagesVisited
    .map(
      (p) =>
        `Page: "${p.name}" (${p.url})\n  APIs: ${p.apis.length > 0 ? p.apis.map((a) => `${a.method} ${a.url} → ${a.status}`).join(", ") : "none"}`,
    )
    .join("\n\n");

  return `You have just completed an automated exploration of a web application. Synthesize everything discovered into a comprehensive summary.

Base URL: ${baseUrl}
Pages Visited: ${pagesVisited.length}
Total Unique API Endpoints: ${totalUniqueApis}

Exploration Details:
${pageDetails}

Provide a rich, insight-dense summary:

1. **Application Architecture** — What kind of application is this? What is its primary domain? How is the API structured?
2. **API Surface Map** — Categorize all discovered endpoints by resource/domain area
3. **Data Model** — What entities exist and how do they relate to each other?
4. **Authentication Pattern** — What auth mechanism was observed? (cookies, tokens, etc.)
5. **Key Findings** — The 3-5 most interesting/important things discovered
6. **Coverage Assessment** — How complete is the API surface exploration? What areas remain unexplored?
7. **Recommendations** — What should the developer explore manually for deeper insight?

Return JSON only:
{
  "appName": "string",
  "appDomain": "string — e.g., 'supply chain management', 'brand analytics'",
  "summary": "string — 3-4 sentence executive summary of the application's API architecture",
  "apiCategories": [
    {
      "category": "string — e.g., 'Purchase Orders', 'Authentication', 'Analytics'",
      "endpoints": ["string — method + path"],
      "description": "string"
    }
  ],
  "dataModel": [
    {
      "entity": "string",
      "relationships": ["string — e.g., 'belongs to Vendor', 'has many LineItems'"]
    }
  ],
  "topFindings": [
    "string — each finding is a specific, actionable insight"
  ],
  "coveragePercent": "string — estimated % of API surface explored",
  "unexploredAreas": ["string — areas that need manual exploration"],
  "recommendations": ["string — specific next steps"]
}`;
}
