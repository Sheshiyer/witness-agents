// ─── Witness Agents — Deployment Metadata ──────────────────────────────
// Small deploy-proof surface for Railway / Docker runtime verification.

export const WITNESS_VERSION = '0.1.0';

const PROCESS_STARTED_AT = new Date().toISOString();

export interface WitnessDeploymentInfo {
  witness_version: string;
  build_id: string;
  deploy_origin: 'github' | 'railway' | 'local';
  started_at: string;
  deployment_id: string | null;
  snapshot_id: string | null;
  git_commit_sha: string | null;
  git_branch: string | null;
  project_name: string | null;
  environment_name: string | null;
  service_name: string | null;
  public_domain: string | null;
  replica_id: string | null;
  replica_region: string | null;
}

function envOrNull(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getWitnessDeploymentInfo(): WitnessDeploymentInfo {
  const deploymentId = envOrNull('RAILWAY_DEPLOYMENT_ID');
  const gitCommitSha = envOrNull('RAILWAY_GIT_COMMIT_SHA');
  const deployOrigin: WitnessDeploymentInfo['deploy_origin'] = gitCommitSha
    ? 'github'
    : deploymentId
      ? 'railway'
      : 'local';

  return {
    witness_version: WITNESS_VERSION,
    build_id: deploymentId || gitCommitSha || `startup:${PROCESS_STARTED_AT}`,
    deploy_origin: deployOrigin,
    started_at: PROCESS_STARTED_AT,
    deployment_id: deploymentId,
    snapshot_id: envOrNull('RAILWAY_SNAPSHOT_ID'),
    git_commit_sha: gitCommitSha,
    git_branch: envOrNull('RAILWAY_GIT_BRANCH'),
    project_name: envOrNull('RAILWAY_PROJECT_NAME'),
    environment_name: envOrNull('RAILWAY_ENVIRONMENT_NAME'),
    service_name: envOrNull('RAILWAY_SERVICE_NAME'),
    public_domain: envOrNull('RAILWAY_PUBLIC_DOMAIN'),
    replica_id: envOrNull('RAILWAY_REPLICA_ID'),
    replica_region: envOrNull('RAILWAY_REPLICA_REGION'),
  };
}
