# Fluxo de limpeza

Estado: migração aplicada e validada no Supabase remoto em 17/10/2026. Registada no histórico como `20261017002936_cleaning_task_lifecycle`.

## Comportamento

- `equipas`: administrador; `gerir_limpeza`: chefia; `limpeza`: executa tarefas atribuídas.
- A chefia atribui uma tarefa pendente a um membro ativo.
- `start_cleaning_task` exige responsável e checklist não vazia. Guarda início e uma cópia do valor à hora. Repetir o pedido não reinicia o relógio.
- `check_cleaning_item` guarda quem marcou e quando. O último item muda o estado para `concluida` e regista fim, segundos e custo na mesma transação.
- Custo = segundos completos × valor à hora / 3600, arredondado a cêntimos apenas no resultado final.
- Os resultados financeiros só podem ser lidos pelo administrador. As tarefas concluídas não podem ser reabertas nem reatribuídas pelo fluxo.
- O telemóvel recebe a confirmação do servidor antes de marcar um item como guardado. Pedidos repetidos são seguros. Não há fila offline: uma alteração sem confirmação deve ser novamente tentada.
- Limpezas anteriores à migração mantêm os dados existentes; o custo dessas limpezas continua a ser estimado pelo comportamento anterior. A cópia imutável do valor à hora aplica-se a novos inícios.

## Ativação concluída

A migração está em `supabase/migrations/20261017002936_cleaning_task_lifecycle.sql` e foi aplicada pelo SQL Editor do projeto `hdrecjxfyinlkxucsqdd`, com registo correspondente em `supabase_migrations.schema_migrations`.

As funções, triggers, policies, constraints e privilégios existentes foram inspecionados antes da aplicação. Não havia limpezas em curso. A sincronização de checkout passou para um trigger privado, autorizado pelas regras de escrita das reservas, para continuar a criar tarefas e checklists sem permitir alterações diretas de estado pelos clientes. Alterações de datas e cancelamentos apenas alteram/removem limpezas pendentes; trabalho iniciado ou concluído mantém o seu histórico.

Não atribuir automaticamente `gerir_limpeza` a todos os utilizadores de `limpeza`. O administrador escolhe a chefia em Equipas. No momento do teste existia apenas um membro ativo (administrador), com valor à hora de 0 €. Configurar os membros e respetivos valores antes da utilização operacional.

## Validação executada

- TypeScript, ESLint e compilação de produção (`npm run build`).
- `scripts/test-cleaning-lifecycle.mjs`: 31 verificações numa base Postgres isolada (PGlite), com os quatro triggers relevantes inspecionados na base real, incluindo acesso por perfil, início obrigatório, repetição de pedidos, rollback perante falha de gravação, conclusão automática e preservação do valor à hora.
- Inspeção da interface no navegador: checklist de 26 itens; itens bloqueados antes de iniciar; viewport de 390 × 844 sem transbordo horizontal.

- Ensaio transacional na base real (`supabase/cleaning-verification.sql`): permissões reais, criação da checklist, atribuição, início, repetição de pedidos, conclusão, custo histórico e sincronização de checkout/data/cancelamento. As alterações de dados foram revertidas.
- Teste completo pela interface com alojamento temporário: 26/26 itens, fecho e reabertura da checklist com progresso preservado, conclusão automática, cronómetro parado aos 36 segundos e resultado confirmado por leitura da base. Alojamento, tarefa, checklist e resultado temporários removidos.
- Contagens reais preservadas: 358 limpezas pendentes e 6 concluídas. Escrita direta do estado/checklist recusada; RPCs recusam acesso anónimo.
- Security Advisor executado novamente: 0 erros e 15 avisos relativos a configurações/funções anteriores (Auth, Storage, pg_net e automações); nenhum referente aos objetos criados nesta migração. A correção desses avisos fica fora desta alteração.

O teste local usa uma representação mínima das tabelas e policies; a validação transacional complementa-o usando a estrutura real.

Execução dos testes sem instalar dependências no projeto:

```sh
npm install --prefix /tmp/pms-cleaning-tests --no-save @electric-sql/pglite@0.3.14
PGLITE_MODULE=/tmp/pms-cleaning-tests/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-cleaning-lifecycle.mjs
```

## Ligação ao projeto

O servidor MCP `supabase` foi atualizado no Codex com o URL e os grupos de funcionalidades indicados pelo utilizador. A autenticação OAuth terminou com sucesso; o cliente oficial confirmou `authStatus: oAuth` e listou `execute_sql`, `apply_migration` e as restantes ferramentas. As skills Supabase já estavam instaladas no projeto.

A sessão de chat em curso ainda não expôs essas ferramentas diretamente. A ativação foi concluída pela sessão autenticada do painel Supabase, sem acesso direto ao Porta-chaves nem cópia de tokens para scripts.
