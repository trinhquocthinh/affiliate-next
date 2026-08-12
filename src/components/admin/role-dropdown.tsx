import { ChevronDown } from "lucide-react";
import { roleStyles } from "@/lib/user-status";

export function RoleDropdown({
  role,
  onChange,
  disabled,
}: {
  role: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block w-32">
      <select
        className={`appearance-none w-full px-3 py-1.5 text-xs font-bold rounded-full border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${roleStyles[role] || ""
          }`}
        value={role}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="BUYER">BUYER</option>
        <option value="AFFILIATE">AFFILIATE</option>
        <option value="AFFILIATE_MASTER">AFFILIATE_MASTER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <ChevronDown size={14} className="opacity-70" />
      </div>
    </div>
  );
}
