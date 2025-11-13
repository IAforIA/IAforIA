export default function TestSimple() {
  return (
    <div style={{ padding: '40px', background: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'black', fontSize: '32px', marginBottom: '20px' }}>
        ✅ React Funcionando!
      </h1>
      <p style={{ color: '#666', fontSize: '18px' }}>
        Se você está vendo esta mensagem, o React está carregando corretamente.
      </p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', fontSize: '20px', marginBottom: '10px' }}>Status do Sistema:</h2>
        <ul style={{ color: '#666' }}>
          <li>✅ Servidor funcionando</li>
          <li>✅ HTML carregando</li>
          <li>✅ React renderizando</li>
          <li>✅ JavaScript executando</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#667eea', textDecoration: 'none', fontSize: '16px' }}>
          ← Voltar para página inicial
        </a>
      </div>
    </div>
  );
}
