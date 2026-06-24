"use client";

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react";

export type SelectOption = { value: number | string; label: string };

type Props = {
  value: number | string | "";
  onChange: (value: number | string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export default function Select({ value, onChange, options, placeholder = "Выберите…", className = "" }: Props) {
  const selected = options.find((o) => o.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="w-full bg-[#e8e3d9] border border-[#d4cdc0] rounded-xl pl-4 pr-3 py-3.5 text-left text-[#2e2318] text-base focus:outline-none focus:border-[#a08060] data-[open]:border-[#a08060] flex items-center justify-between gap-2">
          <span className={`truncate ${selected ? "" : "text-[#a0907a]"}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className="[--anchor-gap:0.25rem] w-[var(--button-width)] z-50 rounded-xl border border-[#d4cdc0] bg-[#f5f2ec] p-1 shadow-lg focus:outline-none max-h-72 overflow-auto origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {options.map((o) => (
            <ListboxOption
              key={o.value}
              value={o.value}
              className="cursor-pointer select-none rounded-lg px-3 py-2.5 text-[#2e2318] text-base data-[focus]:bg-[#e8e3d9] data-[selected]:font-semibold"
            >
              {o.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-5 h-5 text-[#6b5a45] shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
