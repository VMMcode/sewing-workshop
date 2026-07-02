"use client";

import { useEffect, useState } from "react";

type Employee = {
  id: number;
  name: string;
  hiredAt: string | null;
  terminatedAt: string | null;
  skills: string[] | null;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ru-RU");
}

export default function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function fetchEmployees() {
    setLoading(true);
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data);
    setLoading(false);
  }

  async function deleteEmployee(id: number) {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    fetchEmployees();
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Активные сверху, уволенные — в конце
  const sorted = [...employees].sort((a, b) => {
    const aFired = a.terminatedAt ? 1 : 0;
    const bFired = b.terminatedAt ? 1 : 0;
    if (aFired !== bFired) return aFired - bFired;
    return a.name.localeCompare(b.name, "ru");
  });

  if (selectedEmployee) {
    return <EmployeeDetail employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[#6b5a45] text-sm">Сотрудники</p>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2"
        >
          + Добавить
        </button>
      </div>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : employees.length === 0 ? (
        <p className="text-[#a0907a] text-base text-center py-8">Нет сотрудников</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((emp) => (
            <div
              key={emp.id}
              className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setSelectedEmployee(emp)}
                  className="min-w-0 text-left"
                >
                  <p className="text-[#2e2318] text-base font-semibold truncate hover:text-[#7a5c2e] transition">{emp.name} ›</p>
                  {emp.terminatedAt && (
                    <span className="inline-block mt-1 text-[#c0392b] text-sm bg-[#c0392b]/10 border border-[#c0392b]/30 rounded-md px-2 py-0.5">
                      уволена
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditEmployee(emp)}
                    aria-label="Редактировать сотрудника"
                    className="border border-[#d4cdc0] text-[#6b5a45] hover:border-[#a08060] hover:text-[#2e2318] rounded-xl p-2.5 transition"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(emp.id)}
                    aria-label="Удалить сотрудника"
                    className="border border-[#c0392b]/40 text-[#c0392b] hover:bg-[#c0392b]/10 rounded-xl p-2.5 transition"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                {emp.hiredAt && (
                  <p className="text-[#a0907a] text-sm">Принята: {fmtDate(emp.hiredAt)}</p>
                )}
                {emp.terminatedAt && (
                  <p className="text-[#a0907a] text-sm">Уволена: {fmtDate(emp.terminatedAt)}</p>
                )}
              </div>

              {emp.skills && emp.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {emp.skills.map((s) => (
                    <span
                      key={s}
                      className="text-[#6b5a45] text-sm bg-[#e8e3d9] border border-[#d4cdc0] rounded-md px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EmployeeModal
          onClose={() => setShowModal(false)}
          onSaved={fetchEmployees}
        />
      )}

      {editEmployee && (
        <EmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={fetchEmployees}
        />
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
          <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-8 w-full max-w-sm">
            <p className="text-[#2e2318] font-semibold mb-3">Удалить сотрудника?</p>
            <p className="text-[#6b5a45] text-base mb-8">Сотрудник будет перемещён в архив. Записи по зарплате сохранятся.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl py-3.5 text-base"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteEmployee(confirmDeleteId)}
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

// --- Модалка добавления / редактирования сотрудника ---

type ModalProps = {
  employee?: Employee;
  onClose: () => void;
  onSaved: () => void;
};

function EmployeeModal({ employee, onClose, onSaved }: ModalProps) {
  const isEdit = !!employee;
  const [name, setName] = useState(employee?.name ?? "");
  const [hiredAt, setHiredAt] = useState(employee?.hiredAt ?? "");
  const [terminatedAt, setTerminatedAt] = useState(employee?.terminatedAt ?? "");
  const [skills, setSkills] = useState<string[]>(employee?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/operations")
      .then((r) => r.json())
      .then((data) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => setSuggestions([]));
  }, []);

  function addSkill(value: string) {
    const v = value.trim();
    if (!v) return;
    if (!skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSkills([...skills, v]);
    }
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  // Подсказки: совпадают с вводом и ещё не добавлены
  const matched = skillInput.trim()
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(skillInput.trim().toLowerCase()) &&
            !skills.some((x) => x.toLowerCase() === s.toLowerCase())
        )
        .slice(0, 6)
    : [];

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(isEdit ? `/api/employees/${employee!.id}` : "/api/employees", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        hiredAt: hiredAt || null,
        terminatedAt: terminatedAt || null,
        skills,
      }),
    });
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-5 border-b border-[#d4cdc0] flex items-center justify-between">
          <h2 className="text-[#2e2318] font-semibold">{isEdit ? "Редактировать сотрудника" : "Новый сотрудник"}</h2>
          <button onClick={onClose} className="text-[#6b5a45] hover:text-[#2e2318] text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя сотрудника"
              className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
            />
            {isEdit && name.trim() !== employee!.name && (
              <p className="text-[#a0907a] text-sm mt-1.5">
                Связь с записями ЗП сохранится (по id), но в старых записях останется прежнее имя.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Дата принятия</label>
              <input
                type="date"
                value={hiredAt}
                onChange={(e) => setHiredAt(e.target.value)}
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[#6b5a45] text-sm mb-1.5 block">Дата увольнения</label>
              <input
                type="date"
                value={terminatedAt}
                onChange={(e) => setTerminatedAt(e.target.value)}
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base focus:outline-none focus:border-[#a08060]"
              />
            </div>
          </div>

          <div>
            <label className="text-[#6b5a45] text-sm mb-1.5 block">Навыки (необязательно)</label>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[#6b5a45] text-sm bg-[#e8e3d9] border border-[#d4cdc0] rounded-md px-2 py-1"
                  >
                    {s}
                    <button
                      onClick={() => removeSkill(s)}
                      aria-label="Убрать навык"
                      className="text-[#a0907a] hover:text-[#c0392b] leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                placeholder="Например: Втачка рукава — Enter, чтобы добавить"
                className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-4 py-3.5 text-[#2e2318] text-base placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
              />
              {matched.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl overflow-hidden z-10">
                  {matched.map((s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="block w-full text-left px-4 py-2.5 text-[#2e2318] text-base hover:bg-[#e8e3d9]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 border-t border-[#d4cdc0]">
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full bg-[#7a5c2e] text-white rounded-xl py-4 text-base font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
          >
            {loading ? "Сохранение..." : isEdit ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Аналитика по сотруднику ---

type Analytics = {
  totals: {
    totalPieces: number;
    totalEarned: number;
    ordersCount: number;
    operationsCount: number;
    workingDays: number;
    firstDate: string | null;
    lastDate: string | null;
  };
  byOperation: { name: string; pieces: number; earned: number }[];
  byOrder: OrderAnalytics[];
};

type OrderAnalytics = {
  orderId: number;
  orderName: string;
  completed: boolean;
  completedAt: string | null;
  pieces: number;
  earned: number;
  operations: { name: string; pieces: number; earned: number }[];
};

function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function EmployeeDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(orderId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/employees/${employee.id}/analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm bg-[#e8e3d9] hover:bg-[#d4cdc0] border border-[#d4cdc0] text-[#2e2318] rounded-xl px-4 py-2">← Назад</button>
        <h2 className="text-[#2e2318] font-semibold truncate">{employee.name}</h2>
        {employee.terminatedAt && (
          <span className="text-[#c0392b] text-sm bg-[#c0392b]/10 border border-[#c0392b]/30 rounded-md px-2 py-0.5 shrink-0">уволена</span>
        )}
      </div>

      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-5 py-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <p className="text-[#6b5a45] text-sm">Принята: <span className="text-[#2e2318]">{employee.hiredAt ? fmtDate(employee.hiredAt) : "—"}</span></p>
          {employee.terminatedAt && (
            <p className="text-[#6b5a45] text-sm">Уволена: <span className="text-[#2e2318]">{fmtDate(employee.terminatedAt)}</span></p>
          )}
        </div>
        {employee.skills && employee.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {employee.skills.map((s) => (
              <span key={s} className="text-[#6b5a45] text-sm bg-[#e8e3d9] border border-[#d4cdc0] rounded-md px-2 py-0.5">{s}</span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-[#a0907a] text-base text-center py-8">Загрузка...</p>
      ) : !data || data.totals.workingDays === 0 ? (
        <p className="text-[#a0907a] text-base text-center py-8">Нет записей по этой швее</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Заработано" value={`${fmtMoney(data.totals.totalEarned)} ₽`} accent />
            <StatCard label="Операций" value={`${data.totals.totalPieces} оп.`} />
            <StatCard label="Заказов" value={String(data.totals.ordersCount)} />
            <StatCard label="Рабочих дней" value={String(data.totals.workingDays)} />
          </div>
          {(data.totals.firstDate || data.totals.lastDate) && (
            <p className="text-[#a0907a] text-sm -mt-3">
              Активность: {data.totals.firstDate ? fmtDate(data.totals.firstDate) : "—"} — {data.totals.lastDate ? fmtDate(data.totals.lastDate) : "—"}
            </p>
          )}

          {(() => {
            const activeOrders = data.byOrder.filter((o) => !o.completed);
            const completedOrders = data.byOrder.filter((o) => o.completed);
            return (
              <>
                <div>
                  <p className="text-[#6b5a45] text-sm mb-3">По заказам ({activeOrders.length})</p>
                  {activeOrders.length === 0 ? (
                    <p className="text-[#a0907a] text-base">Нет активных заказов</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeOrders.map((o) => (
                        <div key={o.orderId} className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl px-4 py-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[#2e2318] text-base font-semibold min-w-0 truncate">{o.orderName}</p>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-[#a0907a] text-sm">{o.pieces} оп.</span>
                              <span className="text-[#2e2318] text-base font-semibold">{fmtMoney(o.earned)} ₽</span>
                            </div>
                          </div>
                          <OrderOperationsRows operations={o.operations} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {completedOrders.length > 0 && (
                  <div>
                    <p className="text-[#6b5a45] text-sm mb-3">Завершённые заказы ({completedOrders.length})</p>
                    <div className="flex flex-col gap-2">
                      {completedOrders.map((o) => {
                        const open = expanded.has(o.orderId);
                        return (
                          <div key={o.orderId} className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl overflow-hidden">
                            <button
                              onClick={() => toggle(o.orderId)}
                              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#e8e3d9] transition"
                            >
                              <p className="text-[#2e2318] text-base font-semibold min-w-0 truncate">
                                {open ? "▾" : "▸"} {o.orderName}
                              </p>
                              <div className="flex items-center gap-4 shrink-0">
                                <span className="text-[#a0907a] text-sm">{o.pieces} оп.</span>
                                <span className="text-[#2e2318] text-base font-semibold">{fmtMoney(o.earned)} ₽</span>
                              </div>
                            </button>
                            {open && (
                              <div className="px-4 pb-3">
                                <OrderOperationsRows operations={o.operations} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <div>
            <p className="text-[#6b5a45] text-sm mb-3">По операциям ({data.totals.operationsCount})</p>
            <div className="flex flex-col gap-2">
              {data.byOperation.map((op) => (
                <div key={op.name} className="flex items-center justify-between gap-3 bg-[#f5f2ec] border border-[#d4cdc0] rounded-xl px-4 py-3">
                  <p className="text-[#2e2318] text-base min-w-0 truncate">{op.name}</p>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[#a0907a] text-sm">{op.pieces} шт</span>
                    <span className="text-[#2e2318] text-base font-semibold">{fmtMoney(op.earned)} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderOperationsRows({ operations }: { operations: { name: string; pieces: number; earned: number }[] }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[#d4cdc0] pt-2">
      {operations.map((op) => (
        <div key={op.name} className="flex items-center justify-between gap-3">
          <p className="text-[#6b5a45] text-sm min-w-0 truncate">{op.name}</p>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[#a0907a] text-sm">{op.pieces} шт</span>
            <span className="text-[#6b5a45] text-sm">{fmtMoney(op.earned)} ₽</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl px-4 py-4">
      <p className="text-[#a0907a] text-sm mb-1">{label}</p>
      <p className={`text-lg font-semibold ${accent ? "text-[#7a5c2e]" : "text-[#2e2318]"}`}>{value}</p>
    </div>
  );
}
