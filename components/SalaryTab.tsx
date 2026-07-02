"use client";

import { useEffect, useState } from "react";
import OrderDetail from "./OrderDetail";

type Operation = { id: number; name: string; pricePerUnit: string };
type Order = {
  id: number;
  name: string;
  description: string | null;
  fabricReceived: number;
  fabricSewn: number;
  orderOperations: Operation[];
};

export default function SalaryTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  async function fetchOrders() {
    setLoading(true);
    // Завершённые заказы в оплату ЗП не подтягиваем — по ним оплата уже не вносится
    const res = await fetch("/api/orders?status=active");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[#6b5a45] text-sm">Заказы</p>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : orders.length === 0 ? (
        <p className="text-[#a0907a] text-base text-center py-8">Нет заказов</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex items-center justify-between gap-3 text-left w-full hover:border-[#a08060] transition"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-[#2e2318] text-base font-medium truncate">{order.name}</p>
                {order.description && (
                  <p className="text-[#6b5a45] text-sm truncate">{order.description}</p>
                )}
                <p className="text-[#a0907a] text-sm">
                  {order.orderOperations.length} операций
                </p>
              </div>
              <span className="text-[#a0907a] text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
