# WebDoc Agent

**Human-in-the-loop API documentation agent for web applications**

A Claude-Code–style CLI built with Bun, TypeScript, React Ink, and Playwright that observes UI interactions and network calls, correlates them using LLM + Vision, and generates safe, structured API documentation.

---

## 1. What This Tool Is

WebDoc Agent is a developer tool that helps you understand and document how a web application behaves by:

- Observing real UI interactions
- Capturing network/API calls
- Correlating UI intent → API behavior
- Generating human-readable documentation
- Pausing for explicit human approval before sensitive actions

This tool behaves like a copilot, not a bot.

---

## 2. What This Tool Is Not

WebDoc Agent does **not**:

- Bypass authentication, paywalls, or security controls
- Break CAPTCHAs, OTPs, or DRM
- Access APIs the browser itself cannot access
- Perform actions without user confirmation
- Scrape data from systems you are not authorized to use

---

## 3. Core Design Principles

- **UI → API causality**: APIs are documented as consequences of UI actions
- **Human-in-the-loop by default**: Sensitive or irreversible actions require approval
- **Observe first, act second**: Manual login, OTPs, and SSO are supported
- **Stateful & explainable**: The agent exposes intent, not hidden automation
- **CLI-native**: Keyboard-driven, fast, developer-friendly

---

## 4. Tech Stack

| Layer              | Technology            |
| ------------------ | --------------------- |
| Runtime            | Bun                   |
| Language           | TypeScript            |
| CLI UI             | React Ink             |
| Browser Automation | Playwright            |
| LLM / Vision       | Gemini 3 Flash Vision |
| Output Formats     | Markdown, OpenAPI     |

---

## 5. High-Level Architecture

```
┌────────────────────┐
│ React Ink CLI      │  ← Claude-Code–style UX
└─────────┬──────────┘
          │ events / approvals
┌─────────▼──────────┐
│ Agent Core         │  ← state machine
└─────────┬──────────┘
          │ commands
┌─────────▼──────────┐
│ Playwright         │  ← UI + Network
└─────────┬──────────┘
          │ screenshots / metadata
┌─────────▼──────────┐
│ Gemini Flash       │  ← Vision + reasoning
└────────────────────┘
```

---

## 6. Repository Structure

```
webdoc-agent/
├── bun.lockb
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                 # CLI entrypoint
│   │
│   ├── cli/                     # React Ink UI
│   │   ├── App.tsx
│   │   ├── Layout.tsx
│   │   ├── Prompt.tsx
│   │   └── Theme.ts
│   │
│   ├── agent/                   # Headless agent logic
│   │   ├── Agent.ts
│   │   ├── Events.ts
│   │   ├── Risk.ts
│   │   └── FlowTracker.ts
│   │
│   ├── browser/                 # Playwright integration
│   │   ├── playwright.ts
│   │   ├── networkRecorder.ts
│   │   └── uiObserver.ts
│   │
│   ├── llm/                     # Gemini integration
│   │   ├── gemini.ts
│   │   └── prompts.ts
│   │
│   └── export/                  # Documentation output
│       ├── markdown.ts
│       └── openapi.ts
```

---

## 7. Installation (Bun)

**Prerequisites**

- Bun ≥ 1.0
- Node-compatible OS (macOS / Linux / WSL)

```sh
curl -fsSL https://bun.sh/install | bash
bun install
bunx playwright install
```

---

## 8. Running the CLI

After installation:

```sh
webdoc open https://dashboard.example.com
```

Or for development:

```sh
bun run src/index.tsx open https://dashboard.example.com
```

---

## 9. Agent Event Model (Core Contract)

All communication is event-driven.

```ts
export type AgentEvent =
  | { type: "info"; message: string }
  | { type: "ui_action"; label: string }
  | {
      type: "approval_required";
      action: string;
      api: {
        method: string;
        endpoint: string;
        preview?: string;
      };
      risk: "low" | "medium" | "high";
    }
  | { type: "network"; method: string; url: string; status: number }
  | { type: "flow"; name: string; step: string };
```

> The CLI never talks directly to Playwright.

---

## 10. Agent Core (Human-in-the-Loop)

```ts
export class Agent {
  private listeners: ((e) => void)[] = [];
  private resolver?: (v: "yes" | "no" | "doc") => void;

  onEvent(cb) {
    this.listeners.push(cb);
  }

  emit(event) {
    this.listeners.forEach((l) => l(event));
  }

  async requestApproval(payload) {
    this.emit({ type: "approval_required", ...payload });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  resolveApproval(decision) {
    this.resolver?.(decision);
  }
}
```

---

## 11. CLI UX (React Ink)

**Approval Prompt:**

```tsx
import { Box, Text, useInput } from "ink";

export const ApprovalPrompt = ({ onDecision }) => {
  useInput((input) => {
    if (input === "y") onDecision("yes");
    if (input === "n") onDecision("no");
    if (input === "d") onDecision("doc");
  });

  return (
    <Box borderStyle="round" flexDirection="column">
      <Text color="yellow">⚠ Sensitive action detected</Text>
      <Text>[y] Proceed [d] Document only [n] Skip</Text>
    </Box>
  );
};
```

- Keyboard-first. No hidden automation.

---

## 12. Execution Modes

| Mode          | Behavior                       |
| ------------- | ------------------------------ |
| EXECUTE       | Agent performs UI actions      |
| OBSERVE_ONLY  | User performs actions manually |
| DOCUMENT_ONLY | APIs inferred but not executed |

**Example:**

```
→ Login detected
→ Switching to OBSERVE_ONLY
→ Waiting for manual completion
```

---

## 13. Risk Detection

```ts
export function assessRisk(method: string, url: string) {
  if (method === "DELETE") return "high";
  if (url.match(/checkout|payment|order/)) return "high";
  return "low";
}
```

- High risk → approval required.

---

## 14. Multi-Step Flows

Flows are grouped automatically:

```
Checkout Flow
├─ Address selection
├─ Price calculation
├─ Order creation
└─ Payment initiation (approval required)
```

- Flows are replayable later.

---

## 15. LLM + Vision Usage

Gemini Flash Vision is used to:

- Understand UI intent
- Label actions meaningfully
- Correlate UI → API causality

**Example prompt:**

```
Given this screenshot and these network calls,
which API is most likely triggered by clicking
the "Add to Cart" button?
```

---

## 16. Documentation Output

**Markdown:**

```md
## Add to Cart

UI Trigger:

- Button: Add to Cart

API:

- POST /cart/items

Payload:

- sku_id (string)
- quantity (number)

Side Effects:

- Cart badge updated
```

**OpenAPI:**

```yaml
paths:
  /cart/items:
    post:
      summary: Add item to cart
```

---

## 17. CLI Commands (Planned)

- `agent start`
- `agent open <url>`
- `agent explore`
- `agent export md`
- `agent export openapi`
- `agent replay <flow>`

---

## 18. Legal & Responsible Use

This tool is intended for:

- Systems you own
- Systems you are explicitly authorized to access
- QA, debugging, documentation, and internal tooling

This tool must **NOT** be used to:

- Bypass security or access controls
- Access other users’ data
- Circumvent ToS restrictions intentionally
- Automate destructive actions without consent

> The agent’s human-approval design is intentional and required.

---

## 19. Why Bun + Ink

- ⚡ Instant startup
- 🧠 TypeScript-first
- ⌨️ Keyboard-native UX
- 🛠 Ideal for serious CLI tooling

This is why it feels like Claude Code — fast, respectful, and transparent.

---

## 20. Final Statement

WebDoc Agent is not an AI agent that runs wild.

It is:

> **Developer infrastructure for understanding real web behavior — safely.**
