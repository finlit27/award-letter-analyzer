"use client";

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function DeclineLoansToggle({ value, onChange }: Props) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className="text-sm font-medium text-[#1B4332]">
        Decline all optional loans
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-[#1B4332]" : "bg-[#E8E4DC]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
