import OrderCard from '../OrderCard';

export default function OrderCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      <OrderCard
        id="2024-001"
        origin="Rua das Flores, 123 - Centro"
        destination="Av. Principal, 456 - Bairro Norte"
        status="pending"
        value="45.00"
        onView={() => console.log('View order')}
      />
      <OrderCard
        id="2024-002"
        origin="Shopping Center - Loja 201"
        destination="Condomínio Residencial, Bloco A"
        status="in_progress"
        value="78.50"
        driverName="João Silva"
        onView={() => console.log('View order')}
      />
      <OrderCard
        id="2024-003"
        origin="Empresa XYZ Ltda"
        destination="Cliente ABC - Escritório 5"
        status="delivered"
        value="125.00"
        driverName="Maria Santos"
        onView={() => console.log('View order')}
      />
    </div>
  );
}
