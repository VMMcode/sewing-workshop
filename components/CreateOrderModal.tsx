"use client";

import { useState } from "react";

type Operation = { name: string; pricePerUnit: string };

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateOrderModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [fabricReceived, setFabricReceived] = useState("");
  const [operations, setOperations] = useState<Operation[]>([
    { name: "", pricePerUnit: "" },
  ]);
  const [loading, setLoading] = useState(false);

  function addOperation() {
    setOperations([...operations, { name: "", pricePerUnit: "" }]);
  }

  function updateOperation(index: number, field: keyof Operation, value: string) {
    const updated = [...operations];
    updated[index][field] = value;
    setOperations(updated);
  }

  function removeOperation(index: number) {
    setOperations(operations.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    const validOps = operations.filter((o) => o.name.trim() && o.pricePerUnit);
    setLoading(true);

    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        fabricReceived: parseInt(fabricReceived) || 0,
        fabricSewn: 0,
        operations: validOps,
      }),
    });

    setLoading(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-5">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-5 border-b border-[#d4cdc0] flex items-center justify-between">
          <h2 className="text-[#2e2318] font-semibold">Новый заказ</h2>
          <button onClick={onClose} className="text-[#6b5a45] hover:text-[#2e2318] text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Название заказа</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Платье летнее"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
          </div>

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Получено материала (м)</label>
            <input
              type="number"
              value={fabricReceived}
              onChange={(e) => setFabricReceived(e.target.value)}
              placeholder="0"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
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
