import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPOSITORY = "MDCran/core-ai";
const SHA = /^[0-9a-f]{40}$/;
export function requireSha(value, label) {
  if (!SHA.test(value ?? "")) throw new Error(label + " must be a full commit SHA.");
  return value;
}
export function describeCheckout({ actual, expected, reason, prSource, parents = [] }) {
  requireSha(actual, "Checked-out revision");
  requireSha(expected, "Expected revision");
  parents.forEach((parent) => requireSha(parent, "Commit parent"));
  if (actual !== expected) throw new Error("Checked-out revision differs from the pipeline revision.");
  const isPr = reason === "PullRequest";
  const unavailable = prSource == null || prSource === "" || prSource === "$(System.PullRequest.SourceCommitId)";
  const supplied = unavailable ? null : requireSha(prSource, "PR source");
  const source = isPr ? supplied ?? (parents.length === 2 ? parents[1] : null) : null;
  if (isPr && !source) throw new Error("PR source revision is unavailable.");
  if (isPr && actual !== source && (parents.length !== 2 || parents[1] !== source)) {
    throw new Error("PR source is not the second parent of the tested merge.");
  }
  return {
    testedSelfSha: actual,
    pullRequestSourceSha: source,
    pullRequestSourceOrigin: isPr ? supplied ? "pipeline" : "merge-second-parent" : null,
    testedRevisionKind: isPr ? actual === source ? "pull-request-source" : "pull-request-merge" : "commit",
    testedPullRequestSourceDirectly: isPr ? actual === source : null,
    parents,
  };
}
function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error("Unable to verify checked-out Git source.");
  return result.stdout.trim();
}
export function writeSourceReceipt(env = process.env, cwd = process.cwd()) {
  if (env.CORE_CI_REPOSITORY !== REPOSITORY) throw new Error("Repository identity does not match this verification contract.");
  const expected = requireSha(env.CORE_CI_SELF_SHA, "Pipeline source");
  const actual = git(cwd, ["rev-parse", "HEAD"]);
  const parents = git(cwd, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/).slice(1);
  const checkout = describeCheckout({ actual, expected, reason: env.CORE_CI_REASON, prSource: env.CORE_CI_PR_SOURCE_SHA, parents });
  if (git(cwd, ["status", "--porcelain", "--untracked-files=normal"])) throw new Error("Checkout is modified before verification.");
  const files = ["azure-pipelines.yml", ".github/workflows/ci.yml", "AGENTS.md", "package-lock.json"];
  const fileSha256 = Object.fromEntries(files.map((file) => [
    file, createHash("sha256").update(readFileSync(resolve(cwd, file))).digest("hex"),
  ]));
  const result = {
    schemaVersion: 1, scope: "source-verification-only",
    provider: env.TF_BUILD === "True" || env.TF_BUILD === "true" ? "azure-pipelines" : "local",
    repository: REPOSITORY, node: process.version, buildId: env.BUILD_BUILDID ?? null,
    sourceRef: env.BUILD_SOURCEBRANCH ?? null, ...checkout, fileSha256,
  };
  const destination = resolve(env.CORE_CI_SOURCE_RECEIPT ?? "artifacts/ci/source-receipt.json");
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(result, null, 2) + "\n");
  console.log("Exact source receipt written. This is not a deployment or a successful-gates receipt.");
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { writeSourceReceipt(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
