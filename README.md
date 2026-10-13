# Core AI

[![Security checks](https://github.com/MDCran/core-ai/actions/workflows/security-checks.yml/badge.svg)](https://github.com/MDCran/core-ai/actions/workflows/security-checks.yml) [![CodeQL](https://github.com/MDCran/core-ai/actions/workflows/codeql.yml/badge.svg)](https://github.com/MDCran/core-ai/actions/workflows/codeql.yml)

![CORE robot protecting a conversation channel before it reaches a private AI runtime](assets/readme-hero.png)

Chat, voice, and search applications use Core AI's safety and usage contracts before requests reach private policy, provider, or data services.

Core AI is a small TypeScript package for provider-neutral conversation safety and metered-usage contracts. It is designed to be used by web apps, workers, and voice services without exposing production prompts, customer data, or provider credentials.

## What it provides

- Input isolation for user-supplied text before it enters a prompt data field.
- A typed authorization boundary for metered chat, voice, and embedding requests.
- No provider SDKs, credentials, or tenant data.

## Framework

- TypeScript 5
- ECMAScript modules
- Node.js 20 or later

## Use

```ts
import { isolateUntrustedText, requireUsageAuthorization } from "@mdcran/core-ai";

const safeNote = isolateUntrustedText(visitorMessage);
await requireUsageAuthorization(policy, { channel: "chat", operation: "reply", subjects: [] });
```

## Development

```bash
npm install
npm run check
npm run build
```

## Release boundary

This public package contains reusable safety and authorization contracts only.
It has no production prompts, customer data, provider credentials, or runtime
configuration. Product deployments pair `main` with [coretv.co](https://coretv.co)
and `devel` with [dev.coretv.co](https://dev.coretv.co); those environment
values remain outside this package.

## Ownership

Built and maintained by [MDCran](https://github.com/MDCran).
