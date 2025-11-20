# 🎯 Próximas Ações Comentadas

Este documento resume, em etapas comentadas, o que fazer antes da entrega final. Cada item traz uma orientação clara e o motivo por trás dela.

## 1. Validar Fluxos Principais
- **Objetivo:** Garantir que todos os dashboards (`/central`, `/client`, `/driver`) carreguem sem erros e que os botões da sidebar naveguem conforme esperado.
- **Como fazer:** Inicie o servidor com `npm run dev` e use as credenciais dos scripts de importação para navegar entre as telas. Teste registrar pedidos e atualizar status.
- **Comentário:** Essa validação elimina regressões visuais e confirma que o React + WebSocket estão integrados.

## 2. Reconfirmar Comunicação em Tempo Real
- **Objetivo:** Checar se os dashboards trocam informações via WebSocket (criar um pedido em um navegador e observar o reflexo nos demais em tempo real).
- **Como fazer:** Abra três janelas (central, cliente, motoboy) e acompanhe um pedido do início ao fim. Em paralelo, monitore o console do servidor (`npm run dev`) em busca de erros.
- **Comentário:** A experiência em tempo real é essencial para o produto; sem ela, o sistema perde valor.

## 3. Verificar Scripts de Build e Tipagem
- **Objetivo:** Manter as garantias dos testes já automatizados (`npm run check` e `npm run build`).
- **Como fazer:** Execute ambos os comandos após cada alteração significativa e registre a conclusão bem-sucedida.
- **Comentário:** Teatro preliminar para o deploy — qualquer falha aqui impede o lançamento.

## 4. Conferir Configuração de Banco e Seeds
- **Objetivo:** Confirmar que os scripts de importação (`import-users.ts`, `import-motoboys-reais.ts`) rodaram e que o banco contém os 39 usuários esperados.
- **Como fazer:** Execute `npm run db:push` seguido dos scripts com `npx tsx server/scripts/...` e verifique tabelas no Neon (ou via `psql`).
- **Comentário:** Sem dados reais, os dashboards não podem ser testados e o usuário verá erros de login.

## 5. Validar Deploy e Documentação
- **Objetivo:** Assegurar que a documentação (`INICIO-RAPIDO.md`, `DEPLOYMENT.md`, `LANCAMENTO-INTERNO.md`) esteja atualizada com os comandos corretos e links de acesso.
- **Como fazer:** Revise cada guia, confirme a consistência com os scripts que você usou, e liste ajustes pendentes neste arquivo.
- **Comentário:** Documentação alinhada evita erros no lançamento e dá confiança a todos os stakeholders.

## 6. Feedback dos Usuários Reais
- **Objetivo:** Coletar confirmações de que os diferentes papéis entram no sistema e executam suas rotinas sem erros.
- **Como fazer:** Compartilhe os links e credenciais (para clientes, motoboys e central), peça print do console e relato de falhas; mantenha registro de cada acesso.
- **Comentário:** A aprovação de usuários reais é a última camada de segurança antes do deploy.

## 7. Monitorar Avisos Persistentes
- **Objetivo:** Não ignorar warnings conhecidos, como o do PostCSS (`from` ausente), que podem precisar de atenção futura.
- **Como fazer:** Se surgir novo plugin de PostCSS, garanta que ele declare `from` ou substitua-o por alternativa compatível.
- **Comentário:** Ignorar warnings acumulados pode custar tempo e estabilidade no futuro.

_Documento criado automaticamente para orientar o próximo lançamento preparado._