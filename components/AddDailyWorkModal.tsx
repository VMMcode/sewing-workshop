"use client";

import { useState } from "react";

type Operation = { id: number; name: string; pricePerUnit: string };
type OperationEntry = { operationId: number | ""; quantity: string };

type Props = {
  orderId: number;
  operations: Operation[];
  onClose: () => void;
  onAdded: () => void;
};

export default function AddDailyWorkModal({ orderId, operations, onClose, onAdded }: Props) {
  const [seamstressName, setSeamstressName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<OperationEntry[]>([
    { operationId: operations[0]?.id ?? "", quantity: "" },
  ]);
  const [loading, setLoading] = useState(false);

  function addEntry() {
    setEntries([...entries, { operationId: operations[0]?.id ?? "", quantity: "" }]);
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof OperationEntry, value: string | number) {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  }

  const isValid = seamstressName.trim() && entries.every((e) => e.operationId && e.quantity);

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);

    await Promise.all(
      entries.map((e) =>
        fetch("/api/daily-work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            seamstressName: seamstressName.trim(),
            operationId: e.operationId,
            quantity: parseInt(e.quantity),
            date,
          }),
        })
      )
    );

    setLoading(false);
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-5 border-b border-[#d4cdc0] flex items-center justify-between">
          <h2 className="text-[#2e2318] font-semibold">Добавить запись</h2>
          <button onClick={onClose} className="text-[#6b5a45] hover:text-[#2e2318] text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Швея</label>
            <input
              value={seamstressName}
              onChange={(e) => setSeamstressName(e.target.value)}
              placeholder="Имя швеи"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
          </div>

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[#6b5a45] text-sm">Операции</label>
              <button
                onClick={addEntry}
                className="text-sm text-[#6b5a45] hover:text-[#2e2318] border border-[#d4cdc0] rounded-md px-3 py-1.5"
              >
                + добавить
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {entries.map((entry, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <select
                    value={entry.operationId}
                    onChange={(e) => updateEntry(i, "operationId", parseInt(e.target.value))}
                    className="flex-1 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
                  >
                    {operations.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} — {op.pricePerUnit} ₽/шт
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={entry.quantity}
                    onChange={(e) => updateEntry(i, "quantity", e.target.value)}
                    placeholder="шт"
                    className="w-16 bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
                  />
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(i)}
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
            disabled={loading || !isValid}
            className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
