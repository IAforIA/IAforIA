# Public Assets Guidelines

Os arquivos em `client/public/` existem apenas para:

1. **Diagnóstico rápido** (ex.: `debug.html`, `diagnostico.html`, `error-capture.html`)
2. **Landing ou fallback mínimo** para quando o build do React não está disponível (`index-fallback.html`)
3. **Testes manuais** de disponibilidade (`ping.html`, `test.html`, `test-page.html`)

## Regras obrigatórias

- **Nada de credenciais fixas**: qualquer login de teste deve usar variáveis de ambiente, prompts ou scripts CLI. Nunca commitar email/senha hardcoded.
- **Sem lógica sensível**: cálculos financeiros, regras de negócio e integrações com banco pertencem ao backend ou ao app React/Node. Os HTMLs estáticos devem apenas fazer chamadas simples a endpoints já públicos.
- **Conteúdo temporário**: protótipos e sketches (como `interactive_prototype.html`) devem viver em `prototipos/` ou em ferramentas externas (Figma, Storybook). Não deixe protótipos enormes dentro de `public/`.
- **Avisos visíveis**: sempre que houver botão de "Test Login" ou similar, explique que é necessário usar credenciais descartáveis e que os dados não ficam armazenados no arquivo.

Seguindo estas regras, evitamos que a pasta `public/` exponha segredos ou lógica que deveria estar protegida pelo backend.
