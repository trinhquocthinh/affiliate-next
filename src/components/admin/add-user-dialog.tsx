import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-md bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="add-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              id="add-email"
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="user@example.com"
              className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="add-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
            <input
              id="add-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="John Doe"
              className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="add-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              id="add-password"
              type="password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => onRoleChange(e.target.value)}
                className="appearance-none w-full bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-slate-900 font-bold py-2.5 px-4 rounded-lg shadow-md shadow-emerald-500/20 transition-all text-sm"
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
