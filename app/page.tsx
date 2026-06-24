"use client";

import { useState, useCallback } from "react";
import SalaryTab from "@/components/SalaryTab";
import OrdersTab from "@/components/OrdersTab";
import EmployeesTab from "@/components/EmployeesTab";
import AnalyticsTab from "@/components/AnalyticsTab";

type Tab = "orders" | "salary" | "employees" | "analytics";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("salary");
  const [ordersKey, setOrdersKey] = useState(0);

  const refreshOrders = useCallback(() => {
    setOrdersKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-[#ede9e1] text-[#2e2318]">
      <header className="border-b border-[#d4cdc0] px-5 py-5">
        <h1 className="text-lg font-semibold">Швейный цех</h1>
      </header>

      <div className="border-b border-[#d4cdc0] px-5">
        <nav className="flex">
          {[
            { id: "salary", label: "Оплата ЗП" },
            { id: "orders", label: "Заказы" },
            { id: "employees", label: "Сотрудники" },
            { id: "analytics", label: "Аналитика" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 py-4 text-base font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-[#7a5c2e] text-[#7a5c2e]"
                  : "border-transparent text-[#6b5a45] hover:text-[#2e2318]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="px-5 py-5">
        {activeTab === "salary" && <SalaryTab key={ordersKey} />}
        {activeTab === "orders" && <OrdersTab onOrdersChanged={refreshOrders} />}
        {activeTab === "employees" && <EmployeesTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </main>
    </div>
  );
}
