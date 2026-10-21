# Core AI

[![Security checks](https://github.com/MDCran/core-ai/actions/workflows/security-checks.yml/badge.svg)](https://github.com/MDCran/core-ai/actions/workflows/security-checks.yml) [![CodeQL](https://github.com/MDCran/core-ai/actions/workflows/codeql.yml/badge.svg)](https://github.com/MDCran/core-ai/actions/workflows/codeql.yml)

Provider-neutral TypeScript contracts for input handling and metered AI usage.

![Core AI project illustration](assets/readme-hero.png)

Core AI separates two small, reusable concerns from application-specific AI integrations: normalizing untrusted text and requiring an explicit usage-authorization decision before a provider call.

## What is implemented

- **Input normalization:** `isolateUntrustedText` applies Unicode normalization, removes selected control characters, softens role markers and delimiters, and limits text length.
- **Usage authorization:** `requireUsageAuthorization` calls an application-supplied policy and throws when it denies a request.
- **Typed contracts:** chat, voice, and embedding channels share the same policy interface.

The package contains no provider SDK or runtime dependency. Applications supply their own policy, provider integration, and storage.

## Source guide

- [src/input-safety.ts](src/input-safety.ts): text-normalization helper
- [src/usage-policy.ts](src/usage-policy.ts): authorization types and enforcement
- [src/index.ts](src/index.ts): public exports
- [package.json](package.json): package name, version, scripts, and Node.js requirement

## Local development

Requires Node.js 20 or later and npm.

```bash
git clone https://github.com/MDCran/core-ai.git
cd core-ai
npm ci
npm run check
npm run build
```

The build creates ECMAScript modules and TypeScript declarations in `dist/`. The package name in the manifest is `@mdcran/core-ai`; these instructions build from source and do not assume an npm release.

## Example

After building, run this as an ECMAScript module from the repository root:

```js
import {
  isolateUntrustedText,
  requireUsageAuthorization,
} from "./dist/index.js";

const visitorMessage = "Summarize this project.";
const promptData = isolateUntrustedText(visitorMessage);

// Illustrative deny-by-default policy. Supply your own authorization logic.
const policy = {
  async authorize() {
    return { allowed: false, reason: "No usage allowance configured" };
  },
};

try {
  await requireUsageAuthorization(policy, {
    channel: "chat",
    operation: "reply",
    subjects: [],
  });
  // A metered provider call belongs here, after authorization succeeds.
} catch (error) {
  console.error(error.message);
}
```

Treat `promptData` as untrusted data in the consuming application. Text normalization does not prevent prompt injection or replace context-specific output escaping, permission checks, quotas, or provider-side controls. The usage helper enforces the policy's decision; it does not implement billing, rate limiting, or quota storage.

## Verification and security

The [Azure source pipeline](azure-pipelines.yml) binds the checked-out revision, exercises its CI contracts, installs locked dependencies, type-checks, and builds with Node.js 24.15.0. Inspect the checks on the exact commit for execution results.

The separate [CodeQL](.github/workflows/codeql.yml) and [security checks](.github/workflows/security-checks.yml) workflows retain code scanning and dependency audits. CI tooling tests and a successful build do not establish application behavior, provider safety, or production readiness.

Keep credentials, production prompts, customer data, and environment-specific configuration outside this public package.

## License and ownership

[MIT](LICENSE). Built and maintained by [MDCran](https://github.com/MDCran).
