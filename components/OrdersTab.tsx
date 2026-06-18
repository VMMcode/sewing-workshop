"use client";

import { useEffect, useState } from "react";

type Operation = { id: number; name: string; pricePerUnit: string };
type Order = {
  id: number;
  name: string;
  description: string | null;
  fabricReceived: number;
  receivedAt: string | null;
  deadline: string | null;
  supplier: string | null;
  notes: string | null;
  orderOperations: Operation[];
};

type Props = {
  onOrdersChanged: () => void;
};

export default function OrdersTab({ onOrdersChanged }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
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
  }, []);

  if (selectedOrder) {
    return (
      <OrderEditView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onSaved={() => { fetchOrders(); onOrdersChanged(); }}
        onDeleteRequest={() => setConfirmDeleteId(selectedOrder.id)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[#6b5a45] text-sm">Заказы</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2"
        >
          + Добавить
        </button>
      </div>

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
              className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex flex-col gap-2 text-left w-full hover:border-[#a08060] transition"
            >
              <p className="text-[#2e2318] text-base font-semibold">{order.name}</p>
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
                  <span className="text-[#a0907a] text-sm">🧵 {order.fabricReceived} м</span>
                )}
              </div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
          <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-8 w-full max-w-sm">
            <p className="text-[#2e2318] font-semibold mb-3">Удалить заказ?</p>
            <p className="text-[#6b5a45] text-base mb-8">Заказ будет перемещён в архив. Все данные сохранятся.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteOrder(confirmDeleteId)}
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

// --- Форма редактирования заказа ---

type EditProps = {
  order: Order;
  onBack: () => void;
  onSaved: () => void;
  onDeleteRequest: () => void;
};

function OrderEditView({ order, onBack, onSaved, onDeleteRequest }: EditProps) {
  const [name, setName] = useState(order.name);
  const [description, setDescription] = useState(order.description ?? "");
  const [fabricReceived, setFabricReceived] = useState(String(order.fabricReceived));
  const [receivedAt, setReceivedAt] = useState(order.receivedAt ?? "");
  const [deadline, setDeadline] = useState(order.deadline ?? "");
  const [supplier, setSupplier] = useState(order.supplier ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [loading, setLoading] = useState(false);

  // Новые операции
  const [newOps, setNewOps] = useState<{ name: string; pricePerUnit: string }[]>([]);

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

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);

    const validOps = newOps.filter((o) => o.name.trim() && o.pricePerUnit);

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        fabricReceived: parseInt(fabricReceived) || 0,
        receivedAt: receivedAt || null,
        deadline: deadline || null,
        supplier: supplier || null,
        notes: notes || null,
        operations: validOps,
      }),
    });

    setLoading(false);
    onSaved();
    onBack();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
          <h2 className="text-[#2e2318] font-semibold truncate">{order.name}</h2>
        </div>
        <button
          onClick={onDeleteRequest}
          className="text-[#c0392b] hover:text-[#c0392b] text-sm border border-[#c0392b]/30 rounded-xl px-4 py-2"
        >
          Удалить
        </button>
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
          <label className="text-[#6b5a45] text-sm mb-1.5 block">Кол-во материала (м)</label>
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

        {/* Существующие операции */}
        {order.orderOperations.length > 0 && (
          <div>
            <label className="text-[#6b5a45] text-sm mb-3 block">Текущие операции</label>
            <div className="flex flex-col gap-1">
              {order.orderOperations.map((op) => (
                <div key={op.id} className="flex justify-between items-center bg-[#e8e3d9] rounded-xl px-4 py-3">
                  <p className="text-[#2e2318] text-base">{op.name}</p>
                  <p className="text-[#6b5a45] text-sm">{op.pricePerUnit} ₽/шт</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Добавить новые операции */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[#6b5a45] text-sm">Добавить операции</label>
            <button
              onClick={addNewOp}
              className="text-sm text-[#6b5a45] hover:text-[#2e2318] border border-[#d4cdc0] rounded-md px-3 py-1.5"
            >
              + добавить
            </button>
          </div>
          {newOps.length > 0 && (
            <div className="flex flex-col gap-3">
              {newOps.map((op, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    value={op.name}
                    onChange={(e) => updateNewOp(i, "name", e.target.value)}
                    placeholder="Операция"
                    className="flex-1 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  <input
                    type="number"
                    value={op.pricePerUnit}
                    onChange={(e) => updateNewOp(i, "pricePerUnit", e.target.value)}
                    placeholder="₽/шт"
                    className="w-20 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  <button
                    onClick={() => removeNewOp(i)}
                    className="text-[#a0907a] hover:text-[#c0392b] text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !name.trim()}
        className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
      >
        {loading ? "Сохранение..." : "Сохранить"}
      </button>
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
  const [receivedAt, setReceivedAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [operations, setOperations] = useState([{ name: "", pricePerUnit: "" }]);
  const [loading, setLoading] = useState(false);

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
    if (!name.trim()) return;
    setLoading(true);
    const validOps = operations.filter((o) => o.name.trim() && o.pricePerUnit);

    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        fabricReceived: parseInt(fabricReceived) || 0,
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
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Кол-во материала (м)</label>
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
              <label className="text-[#6b5a45] text-sm">Швейные операции</label>
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
                    type="number"
                    value={op.pricePerUnit}
                    onChange={(e) => updateOperation(i, "pricePerUnit", e.target.value)}
                    placeholder="₽/шт"
                    className="w-20 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
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
          </div>
        </div>

        <div className="px-5 py-5 border-t border-[#d4cdc0]">
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Создать заказ"}
          </button>
        </div>
      </div>
    </div>
  );
}
