"use client";

import { useEffect, useState } from "react";

type OpRow = { name: string; ops: number; earned: number };
type OrderRow = { orderId: number; orderName: string; ops: number; earned: number; operations: OpRow[] };
type SeamstressRow = { name: string; ops: number; earned: number; orders: OrderRow[] };
type ProfitRow = {
  orderId: number;
  orderName: string;
  revenue: number | null;
  payout: number;
  margin: number | null;
  marginPct: number | null;
  hasOverage: boolean;
  completed: boolean;
  completedAt: string | null;
};

type Data = {
  totals: { totalEarned: number; totalOps: number; seamstressCount: number; ordersCount: number };
  profit: { totalRevenue: number; totalPayout: number; totalMargin: number };
  byOrderProfit: ProfitRow[];
  bySeamstress: SeamstressRow[];
};

function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export default function AnalyticsTab() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<{ orderId: number; orderName: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    fetch(`/api/analytics?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Убыток по заказу = переплата (к выплате сверх выручки). В норме 0.
  const lossOf = (o: ProfitRow) => (o.revenue != null ? Math.max(0, o.payout - o.revenue) : null);
  const totalLoss = data
    ? data.byOrderProfit.reduce((s, o) => s + (lossOf(o) ?? 0), 0)
    : 0;

  if (selectedOrder) {
    return (
      <OrderOperationsDetail
        orderId={selectedOrder.orderId}
        orderName={selectedOrder.orderName}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Выручка и выплаты по заказам — за всё время */}
      <div>
        <p className="text-[#6b5a45] text-sm mb-3">Выручка и выплаты по заказам <span className="text-[#a0907a]">(за всё время)</span></p>
        {loading ? (
          <p className="text-[#a0907a] text-base text-center py-6">Загрузка...</p>
        ) : !data || data.byOrderProfit.length === 0 ? (
          <p className="text-[#a0907a] text-base text-center py-6">Нет данных</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard label="Выручка" value={`${fmtMoney(data.profit.totalRevenue)} ₽`} />
              <StatCard label="К выплате" value={`${fmtMoney(data.profit.totalPayout)} ₽`} />
              <StatCard
                label="Убыток"
                value={`${fmtMoney(totalLoss)} ₽`}
                accent={totalLoss > 0 ? "neg" : undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              {data.byOrderProfit.map((o) => {
                const loss = lossOf(o);
                return (
                  <button
                    key={o.orderId}
                    onClick={() => setSelectedOrder({ orderId: o.orderId, orderName: o.orderName })}
                    className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl px-4 py-3 flex flex-col gap-1 text-left w-full hover:border-[#a08060] transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[#2e2318] text-base font-semibold min-w-0 truncate">{o.orderName}</p>
                        {o.completed && (
                          <span className="text-[#7a5c2e] text-sm bg-[#7a5c2e]/10 border border-[#7a5c2e]/30 rounded-md px-2 py-0.5 shrink-0">завершён</span>
                        )}
                        {o.hasOverage && (
                          <span className="text-[#c0392b] text-sm bg-[#c0392b]/10 border border-[#c0392b]/30 rounded-md px-2 py-0.5 shrink-0">превышение</span>
                        )}
                      </div>
                      {loss == null ? (
                        <span className="text-[#a0907a] text-sm shrink-0">цена не задана</span>
                      ) : loss > 0 ? (
                        <span className="text-[#c0392b] text-base font-semibold shrink-0">Убыток {fmtMoney(loss)} ₽</span>
                      ) : (
                        <span className="text-[#a0907a] text-sm shrink-0">убытка нет</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-x-4 text-sm text-[#a0907a]">
                        <span>Выручка: {o.revenue != null ? `${fmtMoney(o.revenue)} ₽` : "—"}</span>
                        <span>К выплате: {fmtMoney(o.payout)} ₽</span>
                      </div>
                      <span className="text-[#a0907a] text-xl shrink-0">›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Ведомость к выплате — за период */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#6b5a45] text-sm">Ведомость к выплате</p>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-sm text-[#6b5a45] hover:text-[#2e2318] border border-[#d4cdc0] rounded-md px-3 py-1.5"
            >
              Сбросить период
            </button>
          )}
        </div>

        <div className="flex items-end gap-3 mb-3">
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

        {loading ? (
          <p className="text-[#a0907a] text-base text-center py-6">Загрузка...</p>
        ) : !data || data.bySeamstress.length === 0 ? (
          <p className="text-[#a0907a] text-base text-center py-6">
            Нет записей {dateFrom || dateTo ? "за выбранный период" : ""}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard label="Итого к выплате" value={`${fmtMoney(data.totals.totalEarned)} ₽`} accent="pos" />
              <StatCard label="Швей" value={String(data.totals.seamstressCount)} />
              <StatCard label="Операций" value={`${data.totals.totalOps} оп.`} />
            </div>

            <p className="text-[#a0907a] text-sm mb-2">Нажмите на швею, чтобы раскрыть выплату до операций</p>

            <div className="flex flex-col gap-2">
              {data.bySeamstress.map((s) => {
                const open = expanded.has(s.name);
                return (
                  <div key={s.name} className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggle(s.name)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#e8e3d9] transition"
                    >
                      <p className="text-[#2e2318] text-base font-semibold min-w-0 truncate">
                        {open ? "▾" : "▸"} {s.name}
                      </p>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[#a0907a] text-sm">{s.ops} оп.</span>
                        <span className="text-[#2e2318] text-base font-semibold">{fmtMoney(s.earned)} ₽</span>
                      </div>
                    </button>

                    {open && (
                      <div className="px-4 pb-3 pt-3 border-t border-[#d4cdc0] flex flex-col gap-3">
                        {s.orders.map((o) => (
                          <div key={o.orderId} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[#2e2318] text-base min-w-0 truncate">{o.orderName}</p>
                              <span className="text-[#2e2318] text-base font-semibold shrink-0">{fmtMoney(o.earned)} ₽</span>
                            </div>
                            <div className="pl-3 flex flex-col gap-0.5 border-l-2 border-[#d4cdc0]">
                              {o.operations.map((op) => (
                                <div key={op.name} className="flex items-center justify-between gap-3">
                                  <span className="text-[#6b5a45] text-sm min-w-0 truncate">{op.name} · {op.ops} оп.</span>
                                  <span className="text-[#6b5a45] text-sm shrink-0">{fmtMoney(op.earned)} ₽</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "pos" | "neg" }) {
  const color = accent === "pos" ? "text-[#7a5c2e]" : accent === "neg" ? "text-[#c0392b]" : "text-[#2e2318]";
  return (
    <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-4 py-4">
      <p className="text-[#a0907a] text-sm mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// --- Детальная аналитика по операциям заказа ---

type OpSeamstress = { name: string; quantity: number };
type OpAnalytics = {
  operationId: number;
  name: string;
  pricePerUnit: string;
  total: number;
  overage: number;
  isOver: boolean;
  bySeamstress: OpSeamstress[];
};
type OrderOpsData = {
  orderId: number;
  orderName: string;
  itemCount: number;
  completed: boolean;
  completedAt: string | null;
  hasOverage: boolean;
  operations: OpAnalytics[];
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ru-RU");
}

function OrderOperationsDetail({
  orderId,
  orderName,
  onBack,
}: {
  orderId: number;
  orderName: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<OrderOpsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orders/${orderId}/operations-analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const overOps = data ? data.operations.filter((o) => o.isOver) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
        <h2 className="text-[#2e2318] font-semibold truncate">{orderName}</h2>
        {data?.completed && (
          <span className="text-[#7a5c2e] text-sm bg-[#7a5c2e]/10 border border-[#7a5c2e]/30 rounded-md px-2 py-0.5 shrink-0">
            завершён{data.completedAt ? ` ${fmtDate(data.completedAt)}` : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : !data ? (
        <p className="text-[#a0907a] text-base text-center py-8">Не удалось загрузить данные</p>
      ) : (
        <>
          {data.hasOverage && (
            <div className="bg-[#c0392b]/10 border border-[#c0392b]/40 rounded-2xl px-5 py-4">
              <p className="text-[#c0392b] text-base font-semibold mb-1">Превышение операций</p>
              <p className="text-[#6b5a45] text-sm">
                По {overOps.length === 1 ? "операции" : "операциям"}{" "}
                {overOps.map((o) => `«${o.name}»`).join(", ")}{" "}
                сделано больше, чем изделий в заказе — возможно, кто-то из швей завысил подсчёт.
              </p>
            </div>
          )}

          <p className="text-[#6b5a45] text-sm">
            Изделий в заказе: <span className="text-[#2e2318] font-semibold">{data.itemCount || "—"}</span>
          </p>

          {data.operations.length === 0 ? (
            <p className="text-[#a0907a] text-base text-center py-8">Нет операций по заказу</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.operations.map((op) => (
                <div
                  key={op.operationId}
                  className={`bg-[#f5f2ec] border rounded-2xl px-4 py-4 flex flex-col gap-3 ${op.isOver ? "border-[#c0392b]/50" : "border-[#d4cdc0]"}`}
                >
                  <div>
                    <p className={`text-base font-semibold truncate ${op.isOver ? "text-[#c0392b]" : "text-[#2e2318]"}`}>{op.name}</p>
                    <p className={`text-sm ${op.isOver ? "text-[#c0392b]" : "text-[#a0907a]"}`}>
                      {op.total} из {data.itemCount || "—"}
                      {op.isOver && ` (+${op.overage})`}
                    </p>
                  </div>
                  {op.bySeamstress.length === 0 ? (
                    <p className="text-[#a0907a] text-sm">Нет выработки</p>
                  ) : (
                    <div className="flex flex-col gap-1 border-t border-[#d4cdc0] pt-2">
                      {op.bySeamstress.map((s) => (
                        <div key={s.name} className="flex items-center justify-between gap-3">
                          <span className="text-[#6b5a45] text-sm min-w-0 truncate">{s.name}</span>
                          <span className="text-[#2e2318] text-sm shrink-0">{s.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
