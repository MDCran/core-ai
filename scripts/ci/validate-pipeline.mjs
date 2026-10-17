import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_COMMANDS = ["npm ci","npm run check","npm run build"];
export function validatePipeline(text) {
  const failures = [];
  const require = (pattern, label) => { if (!pattern.test(text)) failures.push("Missing " + label); };
  const forbid = (pattern, label) => { if (pattern.test(text)) failures.push("Forbidden " + label); };
  require(/vmImage: ubuntu-24\.04/, "Microsoft-hosted Ubuntu");
  require(/version: '24\.15\.0'/, "pinned supported Node");
  require(/trigger:\s+batch: true\s+branches:\s+include: \[main\]/, "existing push branches");
  require(/pr:\s+autoCancel: true\s+branches:\s+include: \['\*'\]/, "PR verification");
  require(/job: source_policy/, "separate pre-checkout source policy");
  require(/checkout: none/, "pre-checkout source policy");
  require(/dependsOn: source_policy/, "source-policy dependency");
  require(/checkout: self\s+clean: true\s+fetchDepth: 0\s+persistCredentials: false/, "clean complete checkout without credential persistence");
  require(/CORE_CI_FORK: \$\(System\.PullRequest\.IsFork\)/, "trusted fork metadata");
  require(/CORE_CI_REASON: \$\(Build\.Reason\)/, "trusted build reason");
  require(/CORE_CI_REPOSITORY: \$\(Build\.Repository\.Name\)/, "repository identity");
  require(/CORE_CI_SELF_SHA: \$\(Build\.SourceVersion\)/, "tested revision");
  require(/CORE_CI_PR_SOURCE_SHA: \$\(System\.PullRequest\.SourceCommitId\)/, "PR source revision");
  require(/node scripts\/ci\/source-receipt\.mjs/, "source receipt");
  require(/node scripts\/ci\/validate-pipeline\.mjs/, "source pipeline contract");
  require(/node --test scripts\/ci\/\*\.test\.mjs/, "CI regression checks");
  require(/set -euo pipefail/, "failing command propagation");
  require(/PublishPipelineArtifact@1\s+condition: always\(\)/, "failure evidence retention");
  for (const command of REQUIRED_COMMANDS) {
    if (!text.split(/\r?\n/).some((line) => line.trim() === command)) failures.push("Missing exact gate: " + command);
  }
  forbid(/persistCredentials: true|continueOnError: true/, "credential persistence or ignored failure");
  forbid(/npm install|npm ci\s*\|\|/, "dependency fallback");
  forbid(/uses:\s*(?:actions|azure|docker)\//, "GitHub Actions execution");
  forbid(/docker push|npm publish|az login|az containerapp|AzureCLI@|AzureKeyVault@|DownloadSecureFile@|endpoint:|System\.AccessToken/, "deployment or privileged credentials");
  forbid(/(?:STRIPE|RESEND|TWILIO|SENTRY_AUTH|AZURE_CLIENT|SUPABASE_SERVICE)[A-Z_]*(?:KEY|SECRET|TOKEN)|group:/, "provider credentials or variable groups");
  forbid(/NEXT_BUILD_SKIP_CHECKS|ignoreBuildErrors|ignoreDuringBuilds/, "skipped build checks");
  if (failures.length) throw new Error(failures.join("\n"));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validatePipeline(readFileSync("azure-pipelines.yml", "utf8"));
    console.log("Azure pipeline source contract passed; hosted execution and external security settings are separate evidence.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
