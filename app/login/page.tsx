"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError("Неверный пароль");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ede9e1] flex items-center justify-center">
      <div className="bg-[#f5f2ec] border border-[#d4cdc0] rounded-2xl p-10 w-full max-w-sm">
        <h1 className="text-[#2e2318] text-3xl font-semibold mb-3">Швейный цех</h1>
        <p className="text-[#6b5a45] text-base mb-8">Введите пароль для входа</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl px-5 py-4 text-[#2e2318] placeholder-[#a0907a] focus:outline-none focus:border-[#a08060]"
          />

          {error && <p className="text-[#c0392b] text-base">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#7a5c2e] text-white rounded-xl py-4 font-medium hover:bg-[#5c4420] transition disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
