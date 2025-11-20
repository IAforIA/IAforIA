/**
 * ARQUIVO: client/src/main.tsx
 * PROPÓSITO: Ponto de entrada da aplicação React (entry point)
 * 
 * RESPONSABILIDADES:
 * - Localizar elemento #root no HTML
 * - Renderizar componente App com React 18
 * - Habilitar StrictMode para detectar problemas em desenvolvimento
 * - Importar estilos globais (Tailwind CSS)
 * 
 * FLUXO DE EXECUÇÃO:
 * 1. Vite carrega index.html
 * 2. index.html importa main.tsx via <script type="module">
 * 3. main.tsx renderiza <App /> no elemento #root
 * 4. App.tsx configura rotas e autenticação
 */

// StrictMode: Componente React que ativa verificações extras em desenvolvimento
import { StrictMode } from "react";
// createRoot: API React 18 para renderizar aplicação (substitui ReactDOM.render)
import { createRoot } from "react-dom/client";
// App: Componente raiz que contém rotas, autenticação e providers
import App from "./App";
// index.css: Estilos globais (Tailwind CSS + customizações)
import "./index.css";

// ========================================
// LOGS DE DEPURAÇÃO
// ========================================

// LOG: Confirma que main.tsx foi carregado pelo navegador
console.log("🚀 main.tsx loaded");

// ========================================
// LOCALIZAÇÃO DO ELEMENTO ROOT
// ========================================

/**
 * CONSTANTE: rootElement
 * PROPÓSITO: Elemento DOM onde a aplicação React será montada
 * LOCALIZAÇÃO: <div id="root"></div> em client/index.html
 * VALIDAÇÃO: Lança erro se elemento não existir (previne erro silencioso)
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  // LOG: Registra erro no console para depuração
  console.error("❌ Root element not found!");
  
  // FALLBACK: Exibe mensagem de erro amigável no navegador
  // NOTA: Só alcançado se index.html foi modificado incorretamente
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;"><h1>Error: Root element not found</h1><p>The element with id="root" is missing from the HTML.</p></div>';
  
  // CRÍTICO: Lança erro para interromper execução
  throw new Error("Root element not found");
}

// LOG: Confirma que elemento foi encontrado
console.log("✅ Root element found, rendering App...");

// ========================================
// RENDERIZAÇÃO DA APLICAÇÃO
// ========================================

try {
  /**
   * RENDERIZAÇÃO: Monta aplicação React no DOM
   * 
   * createRoot(): Cria uma raiz React 18 (concurrent mode)
   * .render(): Renderiza componente dentro da raiz
   * 
   * <StrictMode>: Ativa verificações extras:
   *   - Detecta efeitos colaterais em render
   *   - Avisa sobre APIs deprecated
   *   - Valida hooks corretamente utilizados
   *   - Só ativo em desenvolvimento (removido em produção)
   * 
   * <App />: Componente raiz que contém:
   *   - QueryClientProvider (React Query)
   *   - AuthContext (autenticação)
   *   - Router (Wouter - roteamento)
   *   - TooltipProvider, Toaster (shadcn/ui)
   */
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  // LOG: Confirma renderização bem-sucedida
  console.log("✅ App rendered successfully");
  
} catch (error) {
  // LOG: Registra erro de renderização
  console.error("❌ Error rendering App:", error);
  
  // FALLBACK: Exibe erro técnico para depuração
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;"><h1>Error rendering app</h1><pre>' + error + '</pre></div>';
}
