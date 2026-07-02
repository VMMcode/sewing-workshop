"use client";

import { useEffect, useState } from "react";

type Operation = { id: number; name: string; pricePerUnit: string; workCount?: number };
type Order = {
  id: number;
  name: string;
  description: string | null;
  fabricReceived: number;
  pricePerPiece: string | null;
  receivedAt: string | null;
  deadline: string | null;
  supplier: string | null;
  notes: string | null;
  status: string;
  completedAt: string | null;
  orderOperations: Operation[];
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Приводим ввод к числу: поддерживаем и точку, и запятую (1,2 = 1 руб 20 коп)
function parsePrice(value: string | null) {
  return parseFloat(String(value ?? "").replace(",", "."));
}

function totalPrice(quantity: number, pricePerPiece: string | null) {
  const price = parsePrice(pricePerPiece);
  if (!price || !quantity) return 0;
  return quantity * price;
}

// Красивый вывод суммы: разделители тысяч, копейки через запятую
function fmtMoney(value: string | number | null) {
  const n = typeof value === "number" ? value : parsePrice(value);
  if (!n) return "0";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

type Props = {
  onOrdersChanged: () => void;
};

export default function OrdersTab({ onOrdersChanged }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<number | null>(null);
  const [statusTab, setStatusTab] = useState<"active" | "completed">("active");

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch(`/api/orders?status=${statusTab}`);
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  // Завершение заказа и возврат в активные
  async function setOrderStatus(id: number, status: "completed" | "active") {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        status === "completed" ? { status, completedAt: todayStr() } : { status }
      ),
    });
    setConfirmCompleteId(null);
    await refreshSelectedOrder(id);
    fetchOrders();
    onOrdersChanged();
  }

  async function refreshSelectedOrder(id: number) {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    setSelectedOrder(data);
  }

  function openOrder(order: Order) {
    setSelectedOrder(order);        // мгновенно показываем данные из списка
    refreshSelectedOrder(order.id); // подгружаем детали (кол-во выработки по операциям)
  }

  async function deleteOrder(id: number) {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    setSelectedOrder(null);
    fetchOrders();
    onOrdersChanged();
  }

  useEffect(() => {
    fetchOrders();
  }, [statusTab]);

  if (selectedOrder && isEditing) {
    return (
      <OrderEditView
        order={selectedOrder}
        onBack={() => setIsEditing(false)}
        onSaved={async () => {
          await refreshSelectedOrder(selectedOrder.id);
          fetchOrders();
          onOrdersChanged();
          setIsEditing(false);
        }}
      />
    );
  }

  if (selectedOrder) {
    return (
      <>
        <OrderInfoView
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onEdit={() => setIsEditing(true)}
          onDeleteRequest={() => setConfirmDeleteId(selectedOrder.id)}
          onCompleteRequest={() => setConfirmCompleteId(selectedOrder.id)}
          onReopen={() => setOrderStatus(selectedOrder.id, "active")}
        />
        {confirmDeleteId !== null && (
          <ConfirmDeleteModal
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={() => deleteOrder(confirmDeleteId)}
          />
        )}
        {confirmCompleteId !== null && (
          <ConfirmCompleteModal
            onCancel={() => setConfirmCompleteId(null)}
            onConfirm={() => setOrderStatus(confirmCompleteId, "completed")}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {([
            { id: "active", label: "Активные" },
            { id: "completed", label: "Завершённые" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusTab(t.id)}
              className={`text-sm rounded-xl px-4 py-2 border transition ${
                statusTab === t.id
                  ? "bg-[#7a5c2e] text-white border-[#7a5c2e]"
                  : "bg-[#e8e3d9] hover:bg-[#d4cdc0] border-[#d4cdc0] text-[#2e2318]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2 shrink-0"
        >
          + Добавить
        </button>
      </div>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : orders.length === 0 ? (
        <p className="text-[#a0907a] text-base text-center py-8">
          {statusTab === "completed" ? "Нет завершённых заказов" : "Нет активных заказов"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => openOrder(order)}
              className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex flex-col gap-2 text-left w-full hover:border-[#a08060] transition"
            >
              <div className="flex items-center gap-2">
                <p className="text-[#2e2318] text-base font-semibold min-w-0 truncate">{order.name}</p>
                {order.status === "completed" && (
                  <span className="text-[#7a5c2e] text-sm bg-[#7a5c2e]/10 border border-[#7a5c2e]/30 rounded-md px-2 py-0.5 shrink-0">
                    завершён{order.completedAt ? ` ${fmtDate(order.completedAt)}` : ""}
                  </span>
                )}
              </div>
              {order.description && (
                <p className="text-[#6b5a45] text-sm line-clamp-2">{order.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1">
                {order.receivedAt && (
                  <span className="text-[#a0907a] text-sm">
                    📅 {new Date(order.receivedAt + "T00:00:00").toLocaleDateString("ru-RU")}
                  </span>
                )}
                {order.fabricReceived > 0 && (
                  <span className="text-[#a0907a] text-sm">🧵 {order.fabricReceived} шт</span>
                )}
                {parsePrice(order.pricePerPiece) > 0 && (
                  <span className="text-[#a0907a] text-sm">💵 {fmtMoney(order.pricePerPiece)} ₽/шт</span>
                )}
              </div>
              {totalPrice(order.fabricReceived, order.pricePerPiece) > 0 && (
                <p className="text-[#7a5c2e] text-base font-semibold mt-1">
                  {fmtMoney(totalPrice(order.fabricReceived, order.pricePerPiece))} ₽
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { fetchOrders(); onOrdersChanged(); }}
        />
      )}

      {confirmDeleteId !== null && (
        <ConfirmDeleteModal
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => deleteOrder(confirmDeleteId)}
        />
      )}
    </div>
  );
}

// --- Иконки (outline) ---

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.165m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.16-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

// --- Модалка подтверждения удаления ---

function ConfirmDeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-8 w-full max-w-sm">
        <p className="text-[#2e2318] font-semibold mb-3">Удалить заказ?</p>
        <p className="text-[#6b5a45] text-base mb-8">Заказ будет перемещён в архив. Все данные сохранятся.</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#c0392b]/10 hover:bg-[#c0392b]/20 border border-[#c0392b]/40 text-[#c0392b] rounded-xl py-3.5 text-base"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Модалка подтверждения завершения ---

function ConfirmCompleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-8 w-full max-w-sm">
        <p className="text-[#2e2318] font-semibold mb-3">Завершить заказ?</p>
        <p className="text-[#6b5a45] text-base mb-8">Заказ уйдёт из активных и из «Оплаты ЗП». Все данные сохранятся, вернуть в активные можно в любой момент.</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#7a5c2e]/10 hover:bg-[#7a5c2e]/20 border border-[#7a5c2e]/40 text-[#7a5c2e] rounded-xl py-3.5 text-base"
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Просмотр информации о заказе (только чтение) ---

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ru-RU");
}

type InfoProps = {
  order: Order;
  onBack: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onCompleteRequest: () => void;
  onReopen: () => void;
};

function OrderInfoView({ order, onBack, onEdit, onDeleteRequest, onCompleteRequest, onReopen }: InfoProps) {
  const isCompleted = order.status === "completed";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button
              onClick={onReopen}
              className="text-sm border border-[#d4cdc0] text-[#6b5a45] hover:border-[#a08060] hover:text-[#2e2318] rounded-xl px-4 py-2.5 transition"
            >
              Вернуть в активные
            </button>
          ) : (
            <button
              onClick={onCompleteRequest}
              className="text-sm border border-[#7a5c2e]/40 text-[#7a5c2e] hover:bg-[#7a5c2e]/10 rounded-xl px-4 py-2.5 transition"
            >
              ✓ Завершить
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label="Редактировать"
            className="border border-[#d4cdc0] text-[#6b5a45] hover:border-[#a08060] hover:text-[#2e2318] rounded-xl p-2.5 transition"
          >
            <PencilIcon />
          </button>
          <button
            onClick={onDeleteRequest}
            aria-label="Удалить"
            className="border border-[#c0392b]/40 text-[#c0392b] hover:bg-[#c0392b]/10 rounded-xl p-2.5 transition"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-[#2e2318] text-lg font-semibold">{order.name}</h2>
          {isCompleted && (
            <span className="text-[#7a5c2e] text-sm bg-[#7a5c2e]/10 border border-[#7a5c2e]/30 rounded-md px-2 py-0.5">
              завершён{order.completedAt ? ` ${fmtDate(order.completedAt)}` : ""}
            </span>
          )}
        </div>
        {order.description && <p className="text-[#6b5a45] text-base">{order.description}</p>}

        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Поставщик" value={order.supplier} />
          <InfoField label="Материал" value={order.fabricReceived > 0 ? `${order.fabricReceived} шт` : null} />
          <InfoField label="Цена за штуку" value={parsePrice(order.pricePerPiece) > 0 ? `${fmtMoney(order.pricePerPiece)} ₽` : null} />
          <InfoField
            label="Цена за весь заказ"
            value={
              totalPrice(order.fabricReceived, order.pricePerPiece) > 0
                ? `${fmtMoney(totalPrice(order.fabricReceived, order.pricePerPiece))} ₽`
                : null
            }
          />
          <InfoField label="Дата получения" value={order.receivedAt ? fmtDate(order.receivedAt) : null} />
          <InfoField label="Срок реализации" value={order.deadline ? fmtDate(order.deadline) : null} />
        </div>

        {order.notes && (
          <div>
            <p className="text-[#a0907a] text-sm mb-0.5">Примечания</p>
            <p className="text-[#2e2318] text-base whitespace-pre-line">{order.notes}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-[#6b5a45] text-sm mb-3">Операции</p>
        {order.orderOperations.length === 0 ? (
          <p className="text-[#a0907a] text-base">Нет операций</p>
        ) : (
          <div className="flex flex-col gap-2">
            {order.orderOperations.map((op) => (
              <div key={op.id} className="flex justify-between items-center bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl px-4 py-3">
                <p className="text-[#2e2318] text-base">{op.name}</p>
                <p className="text-[#6b5a45] text-sm">{op.pricePerUnit} ₽/шт</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[#a0907a] text-sm mb-0.5">{label}</p>
      <p className="text-[#2e2318] text-base">{value ?? "—"}</p>
    </div>
  );
}

// --- Форма редактирования заказа ---

type EditProps = {
  order: Order;
  onBack: () => void;
  onSaved: () => void;
};

type OpDraft = { id: number; name: string; pricePerUnit: string; workCount: number };

function recordsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "записи";
  return "записей";
}

function OrderEditView({ order, onBack, onSaved }: EditProps) {
  const [name, setName] = useState(order.name);
  const [description, setDescription] = useState(order.description ?? "");
  const [fabricReceived, setFabricReceived] = useState(String(order.fabricReceived));
  const [pricePerPiece, setPricePerPiece] = useState(order.pricePerPiece ?? "");
  const [receivedAt, setReceivedAt] = useState(order.receivedAt ?? "");
  const [deadline, setDeadline] = useState(order.deadline ?? "");
  const [supplier, setSupplier] = useState(order.supplier ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [loading, setLoading] = useState(false);

  const orderTotal = totalPrice(parseInt(fabricReceived) || 0, pricePerPiece);

  // Существующие операции (можно редактировать/удалять)
  const [existingOps, setExistingOps] = useState<OpDraft[]>(
    order.orderOperations.map((o) => ({
      id: o.id,
      name: o.name,
      pricePerUnit: String(o.pricePerUnit),
      workCount: o.workCount ?? 0,
    }))
  );
  const [deletedOpIds, setDeletedOpIds] = useState<number[]>([]);
  // Индекс операции, для которой запрошено удаление с предупреждением
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  // Новые операции
  const [newOps, setNewOps] = useState<{ name: string; pricePerUnit: string }[]>([]);

  function updateExistingOp(i: number, field: "name" | "pricePerUnit", value: string) {
    const updated = [...existingOps];
    updated[i][field] = value;
    setExistingOps(updated);
  }

  function requestRemoveExisting(i: number) {
    if (existingOps[i].workCount > 0) {
      setPendingDeleteIdx(i); // есть выработка — спросить подтверждение
    } else {
      removeExistingOp(i);
    }
  }

  function removeExistingOp(i: number) {
    setDeletedOpIds((prev) => [...prev, existingOps[i].id]);
    setExistingOps(existingOps.filter((_, idx) => idx !== i));
    setPendingDeleteIdx(null);
  }

  function addNewOp() {
    setNewOps([...newOps, { name: "", pricePerUnit: "" }]);
  }

  function updateNewOp(i: number, field: "name" | "pricePerUnit", value: string) {
    const updated = [...newOps];
    updated[i][field] = value;
    setNewOps(updated);
  }

  function removeNewOp(i: number) {
    setNewOps(newOps.filter((_, idx) => idx !== i));
  }

  // Умная сверка: сумма стоимостей операций не должна превышать цену за штуку
  const opsSum =
    existingOps.reduce((s, o) => s + (parsePrice(o.pricePerUnit) || 0), 0) +
    newOps.reduce((s, o) => s + (parsePrice(o.pricePerUnit) || 0), 0);
  const pricePerPieceNum = parsePrice(pricePerPiece) || 0;
  const opsOverBudget = pricePerPieceNum > 0 && opsSum > pricePerPieceNum;

  async function handleSave() {
    if (!name.trim() || opsOverBudget) return;
    setLoading(true);

    const validNew = newOps
      .filter((o) => o.name.trim() && o.pricePerUnit)
      .map((o) => ({ name: o.name, pricePerUnit: o.pricePerUnit.replace(",", ".") }));
    const validUpdated = existingOps
      .filter((o) => o.name.trim() && o.pricePerUnit)
      .map((o) => ({ id: o.id, name: o.name, pricePerUnit: o.pricePerUnit.replace(",", ".") }));

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        fabricReceived: parseInt(fabricReceived) || 0,
        pricePerPiece: pricePerPiece ? pricePerPiece.replace(",", ".") : null,
        receivedAt: receivedAt || null,
        deadline: deadline || null,
        supplier: supplier || null,
        notes: notes || null,
        operations: validNew,
        updatedOperations: validUpdated,
        deletedOperationIds: deletedOpIds,
      }),
    });

    setLoading(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
        <h2 className="text-[#2e2318] font-semibold truncate">Редактирование</h2>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { label: "Название", value: name, setter: setName, placeholder: "Название заказа" },
          { label: "Поставщик", value: supplier, setter: setSupplier, placeholder: "Имя поставщика" },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">{label}</label>
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
          </div>
        ))}

        <div>
          <label className="text-[#6b5a45] text-sm mb-1.5 block">Краткое описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание заказа"
            rows={2}
            className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060] resize-none"
          />
        </div>

        <div>
          <label className="text-[#6b5a45] text-sm mb-1.5 block">Кол-во материала (шт)</label>
          <input
            type="number"
            value={fabricReceived}
            onChange={(e) => setFabricReceived(e.target.value)}
            placeholder="0"
            className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Цена за штуку (₽)</label>
            <input
              type="text"
              inputMode="decimal"
              value={pricePerPiece}
              onChange={(e) => setPricePerPiece(e.target.value)}
              placeholder="0"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Цена за весь заказ</label>
            <div className="w-full bg-[#ede9e1] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base">
              {orderTotal > 0 ? `${fmtMoney(orderTotal)} ₽` : "—"}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Дата получения</label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Срок реализации</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
            />
          </div>
        </div>

        <div>
          <label className="text-[#6b5a45] text-sm mb-1.5 block">Примечания</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Доп. информация"
            rows={2}
            className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060] resize-none"
          />
        </div>

        {/* Операции — редактирование, удаление, добавление */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <label className="text-[#6b5a45] text-sm">Операции</label>
              {pricePerPieceNum > 0 && (
                <span className={`text-sm ${opsOverBudget ? "text-[#c0392b] font-medium" : "text-[#a0907a]"}`}>
                  {fmtMoney(opsSum)} / {fmtMoney(pricePerPieceNum)} ₽
                </span>
              )}
            </div>
            <button
              onClick={addNewOp}
              className="text-sm text-[#6b5a45] hover:text-[#2e2318] border border-[#d4cdc0] rounded-md px-3 py-1.5"
            >
              + добавить
            </button>
          </div>

          {existingOps.length === 0 && newOps.length === 0 ? (
            <p className="text-[#a0907a] text-base">Нет операций. Нажмите «+ добавить».</p>
          ) : (
            <div className="flex flex-col gap-3">
              {existingOps.map((op, i) => (
                <div key={`e-${op.id}`} className="flex gap-3 items-center">
                  <input
                    value={op.name}
                    onChange={(e) => updateExistingOp(i, "name", e.target.value)}
                    placeholder="Операция"
                    className="flex-1 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={op.pricePerUnit}
                    onChange={(e) => updateExistingOp(i, "pricePerUnit", e.target.value)}
                    placeholder="₽/шт"
                    className={`w-20 bg-[#e8e3d9] border rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none ${opsOverBudget ? "border-[#c0392b] focus:border-[#c0392b]" : "border-[#d4cdc0] focus:border-[#a08060]"}`}
                  />
                  <button
                    onClick={() => requestRemoveExisting(i)}
                    aria-label="Удалить операцию"
                    className="text-[#a0907a] hover:text-[#c0392b] text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newOps.map((op, i) => (
                <div key={`n-${i}`} className="flex gap-3 items-center">
                  <input
                    value={op.name}
                    onChange={(e) => updateNewOp(i, "name", e.target.value)}
                    placeholder="Операция"
                    className="flex-1 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={op.pricePerUnit}
                    onChange={(e) => updateNewOp(i, "pricePerUnit", e.target.value)}
                    placeholder="₽/шт"
                    className={`w-20 bg-[#e8e3d9] border rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none ${opsOverBudget ? "border-[#c0392b] focus:border-[#c0392b]" : "border-[#d4cdc0] focus:border-[#a08060]"}`}
                  />
                  <button
                    onClick={() => removeNewOp(i)}
                    aria-label="Удалить операцию"
                    className="text-[#a0907a] hover:text-[#c0392b] text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {opsOverBudget && (
            <p className="text-[#c0392b] text-sm mt-3">
              Сумма стоимостей операций ({fmtMoney(opsSum)} ₽) превышает цену за штуку ({fmtMoney(pricePerPieceNum)} ₽). Уменьшите стоимости операций или повысьте цену за штуку.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !name.trim() || opsOverBudget}
        className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
      >
        {loading ? "Сохранение..." : "Сохранить"}
      </button>

      {pendingDeleteIdx !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
          <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-8 w-full max-w-sm">
            <p className="text-[#2e2318] font-semibold mb-3">Удалить операцию?</p>
            <p className="text-[#6b5a45] text-base mb-2">
              По операции «{existingOps[pendingDeleteIdx].name}» есть{" "}
              <span className="text-[#c0392b] font-medium">
                {existingOps[pendingDeleteIdx].workCount}{" "}
                {recordsWord(existingOps[pendingDeleteIdx].workCount)}
              </span>{" "}
              выработки.
            </p>
            <p className="text-[#6b5a45] text-base mb-8">
              После сохранения они будут удалены вместе с операцией без возможности восстановления. Заработок швей по ней исчезнет из сводок.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPendingDeleteIdx(null)}
                className="flex-1 bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base"
              >
                Отмена
              </button>
              <button
                onClick={() => removeExistingOp(pendingDeleteIdx)}
                className="flex-1 bg-[#c0392b]/10 hover:bg-[#c0392b]/20 border border-[#c0392b]/40 text-[#c0392b] rounded-xl py-3.5 text-base"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Модалка создания заказа (дублируем логику из CreateOrderModal) ---

type CreateProps = {
  onClose: () => void;
  onCreated: () => void;
};

function CreateOrderModal({ onClose, onCreated }: CreateProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fabricReceived, setFabricReceived] = useState("");
  const [pricePerPiece, setPricePerPiece] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [operations, setOperations] = useState([{ name: "", pricePerUnit: "" }]);
  const [loading, setLoading] = useState(false);

  const orderTotal = totalPrice(parseInt(fabricReceived) || 0, pricePerPiece);

  // Умная сверка: сумма стоимостей операций не должна превышать цену за штуку
  const opsSum = operations.reduce((s, o) => s + (parsePrice(o.pricePerUnit) || 0), 0);
  const pricePerPieceNum = parsePrice(pricePerPiece) || 0;
  const opsOverBudget = pricePerPieceNum > 0 && opsSum > pricePerPieceNum;

  function addOperation() {
    setOperations([...operations, { name: "", pricePerUnit: "" }]);
  }

  function updateOperation(i: number, field: "name" | "pricePerUnit", value: string) {
    const updated = [...operations];
    updated[i][field] = value;
    setOperations(updated);
  }

  function removeOperation(i: number) {
    setOperations(operations.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!name.trim() || opsOverBudget) return;
    setLoading(true);
    const validOps = operations
      .filter((o) => o.name.trim() && o.pricePerUnit)
      .map((o) => ({ name: o.name, pricePerUnit: o.pricePerUnit.replace(",", ".") }));

    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        fabricReceived: parseInt(fabricReceived) || 0,
        pricePerPiece: pricePerPiece ? pricePerPiece.replace(",", ".") : null,
        receivedAt: receivedAt || null,
        deadline: deadline || null,
        supplier: supplier || null,
        notes: notes || null,
        operations: validOps,
      }),
    });

    setLoading(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-5 border-b border-[#d4cdc0] flex items-center justify-between">
          <h2 className="text-[#2e2318] font-semibold">Новый заказ</h2>
          <button onClick={onClose} className="text-[#6b5a45] hover:text-[#2e2318] text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          {[
            { label: "Название", value: name, setter: setName, placeholder: "Название заказа" },
            { label: "Поставщик", value: supplier, setter: setSupplier, placeholder: "Имя поставщика" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-[#6b5a45] text-sm mb-1.5 block">{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
              />
            </div>
          ))}

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Краткое описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
              rows={2}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060] resize-none"
            />
          </div>

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Кол-во материала (шт)</label>
            <input
              type="number"
              value={fabricReceived}
              onChange={(e) => setFabricReceived(e.target.value)}
              placeholder="0"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Цена за штуку (₽)</label>
              <input
                type="text"
                inputMode="decimal"
                value={pricePerPiece}
                onChange={(e) => setPricePerPiece(e.target.value)}
                placeholder="0"
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Цена за весь заказ</label>
              <div className="w-full bg-[#ede9e1] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base">
                {orderTotal > 0 ? `${fmtMoney(orderTotal)} ₽` : "—"}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Дата получения</label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Срок реализации</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
              />
            </div>
          </div>

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Примечания</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Доп. информация"
              rows={2}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060] resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <label className="text-[#6b5a45] text-sm">Швейные операции</label>
                {pricePerPieceNum > 0 && (
                  <span className={`text-sm ${opsOverBudget ? "text-[#c0392b] font-medium" : "text-[#a0907a]"}`}>
                    {fmtMoney(opsSum)} / {fmtMoney(pricePerPieceNum)} ₽
                  </span>
                )}
              </div>
              <button
                onClick={addOperation}
                className="text-sm text-[#6b5a45] hover:text-[#2e2318] border border-[#d4cdc0] rounded-md px-3 py-1.5"
              >
                + добавить
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {operations.map((op, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    value={op.name}
                    onChange={(e) => updateOperation(i, "name", e.target.value)}
                    placeholder="Операция"
                    className="flex-1 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={op.pricePerUnit}
                    onChange={(e) => updateOperation(i, "pricePerUnit", e.target.value)}
                    placeholder="₽/шт"
                    className={`w-20 bg-[#e8e3d9] border rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none ${opsOverBudget ? "border-[#c0392b] focus:border-[#c0392b]" : "border-[#d4cdc0] focus:border-[#a08060]"}`}
                  />
                  {operations.length > 1 && (
                    <button
                      onClick={() => removeOperation(i)}
                      className="text-[#a0907a] hover:text-[#c0392b] text-xl leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {opsOverBudget && (
              <p className="text-[#c0392b] text-sm mt-3">
                Сумма стоимостей операций ({fmtMoney(opsSum)} ₽) превышает цену за штуку ({fmtMoney(pricePerPieceNum)} ₽). Уменьшите стоимости операций или повысьте цену за штуку.
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-5 border-t border-[#d4cdc0]">
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || opsOverBudget}
            className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Создать заказ"}
          </button>
        </div>
      </div>
    </div>
  );
}
