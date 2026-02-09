# WebDoc Agent

**Human-in-the-loop API documentation agent for web applications**

A Claude-Code–style CLI built with Bun, TypeScript, React Ink, and Playwright that observes UI interactions and network calls, correlates them using LLM + Vision, and generates safe, structured API documentation.

## What This Tool Is

WebDoc Agent is a developer tool that helps you understand and document how a web application behaves by:

- Observing real UI interactions
- Capturing network/API calls
- Correlating UI intent → API behavior
- Generating human-readable documentation
- Pausing for explicit human approval before sensitive actions

This tool behaves like a copilot, not a bot.

## What This Tool Is Not

WebDoc Agent does **not**:

- Bypass authentication, paywalls, or security controls
- Break CAPTCHAs, OTPs, or DRM
- Access APIs the browser itself cannot access
- Perform actions without user confirmation
- Scrape data from systems you are not authorized to use

## Core Design Principles

- **UI → API causality**: APIs are documented as consequences of UI actions
- **Human-in-the-loop by default**: Sensitive or irreversible actions require approval
- **Observe first, act second**: Manual login, OTPs, and SSO are supported
- **Stateful & explainable**: The agent exposes intent, not hidden automation
- **CLI-native**: Keyboard-driven, fast, developer-friendly

## Tech Stack

| Layer              | Technology        |
| ------------------ | ----------------- |
| Runtime            | Bun               |
| Language           | TypeScript        |
| CLI UI             | React Ink         |
| Browser Automation | Playwright        |
| LLM / Vision       | Gemini 1.5 Flash  |
| Output Formats     | Markdown, OpenAPI |

## Prerequisites

- Bun ≥ 1.0
- Node-compatible OS (macOS / Linux / WSL)
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Installation

```sh
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install
```

## Configuration

Set your Gemini API key as an environment variable:

```sh
export GEMINI_API_KEY="your-api-key-here"
```

Or create a `.env` file:

```
GEMINI_API_KEY=your-api-key-here
```

## Installation

### Global Installation (Recommended)

```sh
# Install globally via npm
npm install -g webdoc-agent

# Or via bun
bun install -g webdoc-agent

# After installation, use the webdoc command directly
webdoc open https://example.com
```

### Local Installation

```sh
# Install as a dev dependency
npm install --save-dev webdoc-agent

# Or with bun
bun add -d webdoc-agent

# Use via npx or bunx
npx webdoc open https://example.com
# or
bunx webdoc open https://example.com
```

## Usage

### Quick Start

After installation, use the tool like this:

```sh
# Open a URL and start documenting (recommended)
webdoc open https://example.com

# Show help
webdoc help

# Show version
webdoc version
```

### Examples

```sh
# Simple - auto-adds https://
webdoc open example.com

# Full URL
webdoc open https://dashboard.example.com

# Get help
webdoc help

# Check version
webdoc version
```

### Interactive Commands

While running:

- `y` - Approve action
- `n` - Skip action
- `d` - Document only (don't execute)
- `m` - Change execution mode
- `q` - Quit

## Execution Modes

| Mode          | Behavior                       |
| ------------- | ------------------------------ |
| EXECUTE       | Agent performs UI actions      |
| OBSERVE_ONLY  | User performs actions manually |
| DOCUMENT_ONLY | APIs inferred but not executed |

## Project Structure

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

## Legal & Responsible Use

This tool is intended for:

- Systems you own
- Systems you are explicitly authorized to access
- QA, debugging, documentation, and internal tooling

This tool must **NOT** be used to:

- Bypass security or access controls
- Access other users' data
- Circumvent ToS restrictions intentionally
- Automate destructive actions without consent

> The agent's human-approval design is intentional and required.

## Development

```sh
# Clone the repository
git clone https://github.com/Soham041201/webdoc.git
cd webdoc

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install

# Run in development mode with watch
bun run dev

# Type check
bun run typecheck

# Build
bun run build

# Test the webdoc command locally
bun run src/index.tsx open https://example.com
```

## License

MIT
