"use client";

import { useEffect, useState } from "react";
import AddDailyWorkModal from "./AddDailyWorkModal";

type Operation = { id: number; name: string; pricePerUnit: string };
type DailyWorkRecord = {
  id: number;
  seamstressName: string;
  operationId: number;
  quantity: number;
  date: string;
  operation: Operation;
};

type Props = {
  order: { id: number; name: string; orderOperations: Operation[] };
  onBack: () => void;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function OrderDetail({ order, onBack }: Props) {
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<DailyWorkRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Сводка за период
  const [showSummary, setShowSummary] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summaryRecords, setSummaryRecords] = useState<DailyWorkRecord[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function fetchRecords(d: string) {
    setLoading(true);
    const res = await fetch(`/api/daily-work?orderId=${order.id}&dateFrom=${d}&dateTo=${d}`);
    const data = await res.json();
    setRecords(data);
    setLoading(false);
  }

  async function fetchSummary() {
    if (!dateFrom || !dateTo) return;
    setSummaryLoading(true);
    const res = await fetch(`/api/daily-work?orderId=${order.id}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
    const data = await res.json();
    setSummaryRecords(data);
    setSummaryLoading(false);
  }

  async function deleteRecord(id: number) {
    await fetch(`/api/daily-work/${id}`, { method: "DELETE" });
    fetchRecords(date);
  }

  useEffect(() => {
    fetchRecords(date);
  }, [date]);

  // Сводка по швеям
  const summaryBySeamstress = summaryRecords.reduce<Record<string, number>>((acc, r) => {
    const earned = r.quantity * parseFloat(r.operation.pricePerUnit);
    acc[r.seamstressName] = (acc[r.seamstressName] ?? 0) + earned;
    return acc;
  }, {});

  // Итог за день
  const dayTotal = records.reduce((sum, r) => {
    return sum + r.quantity * parseFloat(r.operation.pricePerUnit);
  }, 0);

  // Записи дня, сгруппированные по швее (порядок появления сохраняется)
  const recordsBySeamstress = records.reduce<Record<string, DailyWorkRecord[]>>((acc, r) => {
    (acc[r.seamstressName] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
        <h2 className="text-[#2e2318] font-semibold truncate">{order.name}</h2>
      </div>

      {/* Переключатель дня */}
<div className="flex items-center justify-between bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4">
  <button
    onClick={() => setDate(shiftDate(date, -1))}
    className="text-[#6b5a45] hover:text-[#2e2318] text-xl px-3"
  >
    ‹
  </button>
  <div className="text-center relative">
    <button onClick={() => setShowDatePicker(!showDatePicker)}>
      <p className="text-[#2e2318] text-base font-medium">{formatDate(date)}</p>
      {date === todayStr() && <p className="text-[#a0907a] text-sm">сегодня</p>}
    </button>
    {showDatePicker && (
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-10">
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => {
            setDate(e.target.value);
            setShowDatePicker(false);
          }}
          className="bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
        />
      </div>
    )}
  </div>
  <button
    onClick={() => setDate(shiftDate(date, 1))}
    disabled={date === todayStr()}
    className="text-[#6b5a45] hover:text-[#2e2318] disabled:opacity-30 text-xl px-3"
  >
    ›
  </button>
</div>

      {/* Записи за день */}
      <div className="flex items-center justify-between">
        <p className="text-[#6b5a45] text-sm">Записи за день</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2"
        >
          + Добавить
        </button>
      </div>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : records.length === 0 ? (
        <p className="text-[#a0907a] text-base text-center py-8">Нет записей за этот день</p>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(recordsBySeamstress).map(([name, recs]) => {
            const seamstressTotal = recs.reduce(
              (sum, r) => sum + r.quantity * parseFloat(r.operation.pricePerUnit),
              0
            );
            return (
              <div key={name} className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex flex-col gap-3">
                <p className="text-[#2e2318] text-base font-semibold truncate">{name}</p>

                <div className="flex flex-col gap-2">
                  {recs.map((r) => {
                    const earned = r.quantity * parseFloat(r.operation.pricePerUnit);
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3">
                        <p className="text-[#6b5a45] text-sm min-w-0 truncate">
                          {r.operation.name} · {r.quantity} шт · {r.operation.pricePerUnit} ₽/шт
                        </p>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-[#2e2318] text-sm">{earned.toLocaleString("ru-RU")} ₽</p>
                          <button
                            onClick={() => deleteRecord(r.id)}
                            aria-label="Удалить запись"
                            className="text-[#a0907a] hover:text-[#c0392b] text-xl leading-none"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center border-t border-[#d4cdc0] pt-3">
                  <p className="text-[#6b5a45] text-sm">Итого по швее</p>
                  <p className="text-[#2e2318] text-base font-semibold">{seamstressTotal.toLocaleString("ru-RU")} ₽</p>
                </div>
              </div>
            );
          })}

          <div className="flex justify-between items-center px-1 pt-1.5">
            <p className="text-[#a0907a] text-sm">Итого за день</p>
            <p className="text-[#2e2318] text-base font-semibold">{dayTotal.toLocaleString("ru-RU")} ₽</p>
          </div>
        </div>
      )}

      {/* Сводка за период */}
      <div className="border-t border-[#d4cdc0] pt-5 mt-3">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="text-[#6b5a45] hover:text-[#2e2318] text-base"
        >
          {showSummary ? "▾" : "▸"} Сводка за период
        </button>

        {showSummary && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[#a0907a] text-sm mb-1.5 block">С</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[#a0907a] text-sm mb-1.5 block">По</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
                />
              </div>
            </div>

            <button
              onClick={fetchSummary}
              disabled={!dateFrom || !dateTo || summaryLoading}
              className="w-full bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base transition disabled:opacity-50"
            >
              {summaryLoading ? "Загрузка..." : "Показать"}
            </button>

            {summaryRecords.length > 0 && (
              <div className="flex flex-col gap-3">
                {Object.entries(summaryBySeamstress)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, total]) => (
                    <div key={name} className="flex justify-between items-center bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4">
                      <p className="text-[#2e2318] text-base">{name}</p>
                      <p className="text-[#2e2318] text-base font-semibold">{total.toLocaleString("ru-RU")} ₽</p>
                    </div>
                  ))}
                <div className="flex justify-between items-center px-1 pt-1.5">
                  <p className="text-[#a0907a] text-sm">Итого</p>
                  <p className="text-[#2e2318] text-base font-semibold">
                    {Object.values(summaryBySeamstress).reduce((a, b) => a + b, 0).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddDailyWorkModal
          orderId={order.id}
          operations={order.orderOperations}
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchRecords(date)}
        />
      )}
    </div>
  );
}
