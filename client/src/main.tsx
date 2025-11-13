console.log("1. main.tsx carregado");

import { createRoot } from "react-dom/client";
console.log("2. createRoot importado");

import TestDebug from "./test-debug";
console.log("3. TestDebug importado");

const rootElement = document.getElementById("root");
console.log("4. rootElement:", rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  console.log("5. root criado");
  
  root.render(<TestDebug />);
  console.log("6. render chamado");
} else {
  console.error("ERRO: elemento #root não encontrado!");
  document.body.innerHTML = '<div style="padding:20px;background:red;color:white;"><h1>ERRO: elemento #root não encontrado!</h1></div>';
}
