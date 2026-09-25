# Azure verification

Azure Pipelines owns CI execution and billing. GitHub hosts source and pull requests. Existing `.github/workflows/ci.yml` is retained as disabled history. Repository-level Actions execution must remain disabled.

## Equivalent gates

- Supported Node: 24.15.0, matching the existing workflow.
- `npm ci`
- `npm run check`
- `npm run build`
- New executable CI contracts validate source receipts, required commands, and the actual fork-policy shell block.

These are the existing published-source TypeScript gates. No additional local uncommitted tests or product changes are copied into this CI migration. This pipeline does not publish the package.

## Source and trust

The first job performs no checkout and rejects fork or unknown-origin PRs. The verification job records a full immutable tested SHA, full Git ancestry, the exact PR source or explicit merge-second-parent provenance, and hashes of pipeline/legacy workflow/AGENTS / lockfile inputs. It refuses dirty source, mismatched repository identity or revision, malformed PR identity, and ambiguous merge ancestry. A source receipt proves source identity only; Azure job results separately prove gates passed. It never calls a PR merge a direct test of its source head.

The checkout does not persist credentials. There are no variable groups, provider keys, secret downloads, deployment connections, provider writes, package publication, image push, or deployment steps. Azure job logs and the published source artifact provide evidence; the artifact task also runs on failures.

## External activation checklist

1. Review this source and create the Azure definition against the exact reviewed branch and `azure-pipelines.yml`.
2. In Azure's project/pipeline settings, refuse fork PR builds and fork secret access. YAML is reviewed source, not a defense against a malicious YAML change. Limit job authorization and repository access, and attach no secret-bearing variable groups or privileged service connections.
3. Verify a real successful Azure PR run and its source receipt. Required contexts must use the **observed** Azure check names bound to Azure Pipelines app 9426. Preserve reviews, stale-review dismissal, up-to-date branches, linear history, resolved conversations, and force-push/deletion restrictions. Do not remove the old required checks before replacement evidence exists.
4. Retain the disabled GitHub workflow as equivalence evidence. Local test success is not Azure hosted proof or production readiness.

CI runs for all PR target branches and pushes to main, preserving the former trigger coverage. This pipeline intentionally has no deployment stage. Existing release authorization remains separate.

## Saved Azure definition — September 25, 2026

Definition **MDCran.core-ai**, ID **4**, is saved in the existing private CORE Engineering project: [Azure pipeline](https://dev.azure.com/coretv/CORE%20Engineering/_build?definitionId=4). It uses the existing GitHub connection and this branch's reviewed YAML.

The authenticated Azure trigger view showed pull request validation enabled, YAML overrides off, and **Build pull requests from forks** unchecked and disabled by inherited policy. No fork access, provider secrets, privileged connection, deployment or package publication was added.

Hosted verification of this initial migration remains pending. Old required check contexts remain in place until successful Azure PR evidence is observed and retained. The definition exists; this is not a claim that its checks passed or its changes were deployed.
