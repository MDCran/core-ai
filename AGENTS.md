# Core AI agent guide

Core AI is the public, provider-neutral package boundary for reusable safety
and usage contracts.

- Keep it free of credentials, production prompts, customer data, and
  environment-specific configuration.
- Put proprietary workflow policy in private `MDCran/core-brain` and secret
  contracts in private `MDCran/core-secrets`.
- Preserve the TypeScript build and type-check gates before publishing a new
  package revision.
