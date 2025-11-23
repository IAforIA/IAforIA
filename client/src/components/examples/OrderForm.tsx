import OrderForm from '../OrderForm';

export default function OrderFormExample() {
  const handleSubmit = (data: { origin: string; destination: string; description: string; value: string }) => {
    console.log('Order submitted:', data);
  };

  return (
    <div className="max-w-md p-4">
      <OrderForm onSubmit={handleSubmit} />
    </div>
  );
}
