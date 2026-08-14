import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

export function AddUserDialog({
  open,
  onOpenChange,
  email,
  onEmailChange,
  displayName,
  onDisplayNameChange,
  password,
  onPasswordChange,
  role,
  onRoleChange,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onEmailChange: (value: string) => void;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label
              htmlFor="add-email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="add-email"
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="user@example.com"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="add-name"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Display Name
            </label>
            <input
              id="add-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="John Doe"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="add-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="add-password"
              type="password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm text-slate-700 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-300"
              >
                <option value="BUYER">BUYER</option>
                <option value="AFFILIATE">AFFILIATE</option>
                <option value="AFFILIATE_MASTER">AFFILIATE_MASTER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-900 dark:hover:bg-emerald-400"
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
