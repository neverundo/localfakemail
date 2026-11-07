---
name: sonar-scan
description: >-
  Manutenção SonarQube local do Localfakemail: projecto localfakemail-local
  (apps/web + apps/smtp). Stack Docker Compose da app, scan via ./sonar-scan.sh,
  triagem MCP, fixes e testes existentes no escopo dos ficheiros alterados.
  Use com /sonar-scan.
---

# SonarQube — scan e manutenção Localfakemail

## Projecto (escopo fixo)

| Escopo | `projectKey` | Scan |
|--------|--------------|------|
| `apps/web` + `apps/smtp` | `localfakemail-local` | `./sonar-scan.sh` |

Config: `sonar-project.properties` e `.sonarlint/connectedMode.json`.

## Pré-requisitos

- MCP `sonarqube` / `user-sonarqube` activo (Settings → Tools & MCP)
- SonarQube em `http://localhost:9000` (container Docker `sonarqube` — stack partilhada, **não** faz parte do `docker-compose.yml` deste repo)
- User token em `.env` (`SONAR_TOKEN=squ_…`) alinhado com `~/.cursor/mcp.json` (`SONARQUBE_TOKEN`)
- Detalhes MCP: [reference.md](reference.md) e `.cursor/rules/sonarqube_mcp_instructions.mdc`

## Workflow (obrigatório)

```
Progresso:
- [ ] 1. Stack + token
- [ ] 2. Scan
- [ ] 3. Triagem MCP
- [ ] 4. Fixes (lote limitado)
- [ ] 4b. Testes existentes no escopo dos ficheiros alterados
- [ ] 5. Re-scan + resumo
```

### 1. Stack + token

```bash
curl -s http://localhost:9000/api/system/status
docker ps --filter name=sonarqube --format '{{.Names}} {{.Status}} {{.Ports}}'
```

Se MCP falhar com 401: sincronizar `SONARQUBE_TOKEN` em `~/.cursor/mcp.json` com `SONAR_TOKEN` do `.env` (User Token).

### 2. Scan

```bash
./sonar-scan.sh
```

Esperar conclusão antes de confiar em métricas/issues no MCP.

Coverage: `./sonar-scan.sh` corre `npm run test:coverage` em `apps/web` e envia LCOV (`apps/web/coverage/lcov.info`). Skip com `SONAR_SKIP_COVERAGE=1`.

### 3. Triagem via MCP

Namespace típico: `user-sonarqube`.

1. Confirmar project key: `search_my_sonarqube_projects` (`localfakemail-local`).
2. Quality gate: `get_project_quality_gate_status` com `projectKey: localfakemail-local`.
3. Issues: `search_sonar_issues_in_projects` com:
   - `projectKeys: ["localfakemail-local"]`
   - `issueStatuses: ["OPEN"]`
   - `severities`: começar por `["BLOCKER","HIGH"]`, depois `MEDIUM`
4. Para cada issue ambígua: `show_rule` com a rule key.

**Não** usar `search_sonar_issues_in_projects` para “confirmar” fixes até um novo scan (`./sonar-scan.sh`) completar.

### 4. Fixes

**Regra de ouro — zero regressão de funcionalidade**

A skill **nunca** deve fechar uma issue Sonar à custa de comportamento que já funcionava. Corrigir qualidade estática ≠ alterar contratos de runtime (SMTP, Prisma, rotas Next, sanitização HTML, auth local).

| Situação | O agente **deve** | O agente **não deve** |
|----------|-------------------|------------------------|
| Fix óbvio e local (ex. `replaceAll`, complexidade) | Aplicar no lote | — |
| Fix que muda parsing de email, retention, DB schema, ou UI de inbox | **Parar e alertar** com risco + opções | Decidir sozinho e “simplificar” |
| Dúvida se o fix quebra fluxo SMTP → web | **Adiar a issue** e reportar no resumo | Assumir que “compila” chega |

- Lote por defeito: **até 5 issues** (ou o limite que o utilizador indicar).
- Prioridade: BLOCKER → HIGH → MEDIUM; preferir ficheiros com várias issues da mesma regra.
- Diff mínimo; respeitar runtime Docker-only (`.cursor/rules/docker-only.mdc`).
- Não marcar FALSE_POSITIVE / ACCEPTED sem pedido explícito do utilizador.
- Se existir `analyze_code_snippet` / `analyze_file_list`, usar nos ficheiros editados no fim do lote.
- Se existir `toggle_automatic_analysis`: off no início da tarefa, on no fim.

#### 4.1 Classificar antes de corrigir

| Risco | Exemplos | Abordagem |
|-------|----------|-----------|
| **Baixo** | `replaceAll`, `Readonly<>`, complexidade cognitiva, dead code | Corrigir no lote; correr testes existentes no escopo (§4.2) |
| **Alto** | Sanitização HTML (`sanitize`), parser SMTP, Prisma schema/migrations, auth | Fix mínimo ou **alertar**; smoke Docker se tocar no fluxo email |

#### 4.2 Testes no escopo dos ficheiros alterados (obrigatório)

**Depois de cada lote de fixes e antes do re-scan**, correr os testes **já existentes** que cobrem os ficheiros editados.

1. Identificar `*.test.ts(x)` / `*.spec.ts(x)` co-localizados ou que importam o módulo.
2. Executar os encontrados (preferir ficheiro/pattern exacto).
3. Se falhar: corrigir ou reverter antes do re-scan.
4. Se não existir teste: não bloqueia o lote, mas **registar no resumo**.

Neste repo, se ainda não houver testes automatizados, registar esse facto no resumo e fazer smoke mínimo via Docker quando o lote tocar em SMTP/inbox:

```bash
docker compose ps
curl -fsS http://127.0.0.1:8025/ >/dev/null
```

### 5. Re-scan + resumo

```bash
./sonar-scan.sh
```

Depois: `get_project_quality_gate_status` e resumir:

- Issues corrigidas (ficheiro, regra, severidade)
- Testes/smoke corridos no escopo (comando + resultado)
- Issues restantes no lote / porquê adiadas
- Estado do quality gate (condições em ERROR)

## Invocação

No chat Agent:

```text
/sonar-scan
```

ou: “Corre /sonar-scan e corrige até 5 issues HIGH/BLOCKER”.

## Fora de âmbito

- Não alterar quality gate / quality profiles no Sonar sem pedido.
- Não commit/push a menos que o utilizador peça.
- Automations cloud não alcançam `localhost:9000` — este fluxo é local.
- Não misturar com projectos FitForge (`fitforge-*`) no mesmo scan.
