import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { describeCheckout, requireSha, writeSourceReceipt } from "./source-receipt.mjs";
const a = "a".repeat(40), b = "b".repeat(40), c = "c".repeat(40);
test("source revisions require full immutable SHAs", () => {
  for (const value of [undefined, "", "main", "abc123", "a".repeat(39), "A".repeat(40)]) assert.throws(() => requireSha(value, "source"));
  assert.equal(requireSha(a, "source"), a);
});
test("mismatched checkout and malformed parent or supplied PR source fail", () => {
  assert.throws(() => describeCheckout({ actual: a, expected: b }));
  assert.throws(() => describeCheckout({ actual: a, expected: a, parents: ["main"] }));
  assert.throws(() => describeCheckout({ actual: a, expected: a, reason: "PullRequest", prSource: "bad", parents: [c, b] }));
});
test("merge receipts bind the exact source parent without claiming direct-source execution", () => {
  const value = describeCheckout({ actual: a, expected: a, reason: "PullRequest", prSource: b, parents: [c, b] });
  assert.equal(value.testedSelfSha, a);
  assert.equal(value.pullRequestSourceSha, b);
  assert.equal(value.testedRevisionKind, "pull-request-merge");
  assert.equal(value.testedPullRequestSourceDirectly, false);
  assert.throws(() => describeCheckout({ actual: a, expected: a, reason: "PullRequest", prSource: c, parents: [c, b] }));
});
test("unavailable Azure PR variable may use exact second parent; ambiguous history fails", () => {
  for (const prSource of [undefined, "", "$(System.PullRequest.SourceCommitId)"]) {
    const value = describeCheckout({ actual: a, expected: a, reason: "PullRequest", prSource, parents: [c, b] });
    assert.equal(value.pullRequestSourceSha, b);
    assert.equal(value.pullRequestSourceOrigin, "merge-second-parent");
  }
  assert.throws(() => describeCheckout({ actual: a, expected: a, reason: "PullRequest", parents: [c] }));
});
test("direct source and ordinary commit receipts remain distinct", () => {
  assert.equal(describeCheckout({ actual: a, expected: a, reason: "PullRequest", prSource: a, parents: [c] }).testedPullRequestSourceDirectly, true);
  assert.equal(describeCheckout({ actual: a, expected: a, reason: "IndividualCI", parents: [c] }).pullRequestSourceSha, null);
});
test("real isolated Git receipt hashes inputs, rejects repository mismatch, and rejects dirty source", () => {
  const dir = mkdtempSync(join(tmpdir(), "core-source-receipt-"));
  const repo = join(dir, "repo");
  mkdirSync(repo);
  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    git("init", "--quiet");
    mkdirSync(join(repo, ".github", "workflows"), { recursive: true });
    for (const file of ["azure-pipelines.yml", ".github/workflows/ci.yml", "AGENTS.md", "package-lock.json"]) writeFileSync(join(repo, file), "synthetic fixture\n");
    git("add", ".");
    git("-c", "user.name=Synthetic fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "Synthetic receipt");
    const env = { CORE_CI_REPOSITORY: "MDCran/core-ai", CORE_CI_SELF_SHA: git("rev-parse", "HEAD"), CORE_CI_REASON: "Manual", CORE_CI_SOURCE_RECEIPT: join(dir, "receipt.json") };
    const result = writeSourceReceipt(env, repo);
    assert.equal(result.scope, "source-verification-only");
    assert.match(result.fileSha256["azure-pipelines.yml"], /^[0-9a-f]{64}$/);
    assert.equal(JSON.parse(readFileSync(env.CORE_CI_SOURCE_RECEIPT, "utf8")).testedSelfSha, env.CORE_CI_SELF_SHA);
    assert.throws(() => writeSourceReceipt({ ...env, CORE_CI_REPOSITORY: "MDCran/other" }, repo));
    writeFileSync(join(repo, "untracked.txt"), "synthetic");
    assert.throws(() => writeSourceReceipt(env, repo));
  } finally {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.match(basename(dir), /^core-source-receipt-/);
    rmSync(dir, { recursive: true, force: true });
  }
});
