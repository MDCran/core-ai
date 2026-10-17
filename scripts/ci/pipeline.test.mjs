import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { validatePipeline, REQUIRED_COMMANDS } from "./validate-pipeline.mjs";
const pipeline = readFileSync(new URL("../../azure-pipelines.yml", import.meta.url), "utf8");
test("Azure source preserves all existing verification gates", () => {
  assert.doesNotThrow(() => validatePipeline(pipeline));
  for (const command of REQUIRED_COMMANDS) assert.throws(() => validatePipeline(pipeline.replaceAll(command, "removed")));
});
test("exact-source, clean checkout, fork metadata and artifact requirements cannot be dropped", () => {
  for (const anchor of [
    "CORE_CI_SELF_SHA: $(Build.SourceVersion)", "CORE_CI_PR_SOURCE_SHA: $(System.PullRequest.SourceCommitId)",
    "CORE_CI_REPOSITORY: $(Build.Repository.Name)", "CORE_CI_FORK: $(System.PullRequest.IsFork)",
    "fetchDepth: 0", "persistCredentials: false", "condition: always()", "node scripts/ci/source-receipt.mjs",
    "dependsOn: source_policy", "node --test scripts/ci/*.test.mjs",
  ]) assert.throws(() => validatePipeline(pipeline.replaceAll(anchor, "removed")), anchor);
});
test("privileged execution, dependency fallbacks and suppressed failures are rejected", () => {
  for (const unsafe of ["persistCredentials: true", "continueOnError: true", "npm ci || npm install",
    "npm publish", "docker push image", "AzureCLI@2", "AzureKeyVault@2", "endpoint: production",
    "group: production", "System.AccessToken", "STRIPE_SECRET_KEY: value", "NEXT_BUILD_SKIP_CHECKS=1"]) {
    assert.throws(() => validatePipeline(pipeline + "\n" + unsafe), unsafe);
  }
});
test("the actual pre-checkout shell guard refuses forks and unknown PR origin", () => {
  const match = pipeline.match(/- bash: \|\r?\n([\s\S]*?)\r?\n        displayName: Refuse fork/);
  assert.ok(match, "source policy shell block");
  const script = match[1].split(/\r?\n/).map((line) => line.slice(10)).join("\n");
  const shell = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  for (const fork of ["True", "true", "", "$(System.PullRequest.IsFork)", "unknown"]) {
    const result = spawnSync(shell, ["-c", script], { env: { ...process.env, CORE_CI_REASON: "PullRequest", CORE_CI_FORK: fork }, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 1, "reject " + fork);
  }
  for (const [reason, fork] of [["PullRequest", "False"], ["PullRequest", "false"], ["IndividualCI", ""], ["Manual", ""]]) {
    const result = spawnSync(shell, ["-c", script], { env: { ...process.env, CORE_CI_REASON: reason, CORE_CI_FORK: fork }, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, reason + "/" + fork);
  }
});
