#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: ${ENV_FILE} not found. Add SONAR_TOKEN=... (and optionally SONAR_HOST_URL=...)." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "error: SONAR_TOKEN is empty in ${ENV_FILE}." >&2
  exit 1
fi

SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"

if ! curl -fsS --connect-timeout 3 "${SONAR_HOST_URL}/api/system/status" >/dev/null; then
  echo "error: SonarQube is not reachable at ${SONAR_HOST_URL}." >&2
  echo "hint: start the shared sonarqube container (port 9000) and retry." >&2
  exit 1
fi

if [[ "${SONAR_SKIP_COVERAGE:-0}" != "1" ]]; then
  echo "Generating web coverage (apps/web)…"
  (
    cd "${REPO_ROOT}/apps/web"
    npm run test:coverage
  )
fi

echo "Scanning Localfakemail → ${SONAR_HOST_URL} (project from sonar-project.properties)"

docker run --rm \
  --user 0:0 \
  --network host \
  -e "SONAR_HOST_URL=${SONAR_HOST_URL}" \
  -e "SONAR_TOKEN=${SONAR_TOKEN}" \
  -v "${REPO_ROOT}:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=sonar-project.properties
