import OrderDetail from "@/components/OrderDetail";

type Props = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  return <OrderDetail orderId={id} />;
}
