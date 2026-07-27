/** Display version synced from repo-root VERSION via next.config.js */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}
