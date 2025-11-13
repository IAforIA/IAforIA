// Usando classes Tailwind CSS em vez de estilos inline
export default function TestSimple() {
  return (
    <div className="p-10 bg-background min-h-screen">
      <h1 className="text-foreground text-3xl font-bold mb-5">
        ✅ React Funcionando!
      </h1>
      <p className="text-muted-foreground text-lg">
        Se você está vendo esta mensagem, o React está carregando corretamente.
      </p>
      <div className="mt-8 p-5 bg-muted rounded-lg">
        <h2 className="text-foreground text-xl font-semibold mb-3">Status do Sistema:</h2>
        <ul className="text-muted-foreground list-disc list-inside">
          <li>✅ Servidor funcionando</li>
          <li>✅ HTML carregando</li>
          <li>✅ React renderizando</li>
          <li>✅ JavaScript executando</li>
        </ul>
      </div>
      <div className="mt-5">
        <a href="/" className="text-blue-500 hover:underline text-base">
          ← Voltar para página inicial
        </a>
      </div>
    </div>
  );
}
