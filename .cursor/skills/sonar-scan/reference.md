# Sonar MCP — referência rápida (Localfakemail)

Ler `.cursor/rules/sonarqube_mcp_instructions.mdc` antes de usar MCP.

## Descoberta de ferramentas

```
GetDynamicTools → pattern "sonar"
```

Namespace típico: `user-sonarqube` (MCP server name em `~/.cursor/mcp.json`: `sonarqube`).

Ferramentas típicas:

| Acção | Ferramenta esperada |
|-------|---------------------|
| Listar projectos | `search_my_sonarqube_projects` |
| Issues por projecto | `search_sonar_issues_in_projects` |
| Quality gate | `get_project_quality_gate_status` |
| Análise de ficheiros editados | `analyze_file_list` / `analyze_code_snippet` (se existirem) |
| Auto-análise IDE | `toggle_automatic_analysis` (off no início, on no fim; se existir) |

## Identidade do projecto

| Ficheiro | Valor |
|----------|-------|
| `sonar-project.properties` | `sonar.projectKey=localfakemail-local` |
| `.sonarlint/connectedMode.json` | `projectKey: localfakemail-local`, `serverUrl: http://127.0.0.1:9000` |
| Dashboard | http://127.0.0.1:9000/dashboard?id=localfakemail-local |

## Parâmetros úteis — issues

- `projectKeys`: `["localfakemail-local"]` (confirmar via search, não adivinhar)
- `severities`: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, `INFO` (começar por BLOCKER/HIGH)
- `issueStatuses`: `OPEN` (não `statuses`)
- `pageSize`: suficiente para triagem (ex. 50; máx. 500)

## Token / MCP

- User token em `.env`: `SONAR_TOKEN=squ_…`
- Opcional: `SONAR_HOST_URL=http://localhost:9000`
- MCP global (`~/.cursor/mcp.json`):
  - `SONARQUBE_TOKEN` = mesmo valor que `SONAR_TOKEN`
  - `SONARQUBE_URL` = `http://localhost:9000`
  - comando Docker: `sonarsource/sonarqube-mcp` com `--network host`

## Scan local

```bash
./sonar-scan.sh
```

Requisitos: Docker, container/imagem `sonarsource/sonar-scanner-cli`, Sonar UP em `:9000`.

## O que não fazer

- Não verificar fixes com `search_sonar_issues_in_projects` **antes** de `./sonar-scan.sh` completar.
- Não usar project token — só user token (`SONAR_TOKEN` em `.env`).
- Não adivinhar `projectKey`; confirmar via MCP / ficheiros de config.
- Não apontar skills FitForge (`fitforge-local`, etc.) neste repo.
