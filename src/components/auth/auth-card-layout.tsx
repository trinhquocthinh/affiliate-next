import React from "react";
import Image from "next/image";

interface AuthCardLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function AuthCardLayout({
  title,
  description,
  children,
  maxWidthClass = "max-w-105",
}: AuthCardLayoutProps) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-5"
      style={{ background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" }}
    >
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div
        className={`auth-glass-card relative z-10 w-full ${maxWidthClass} rounded-3xl border border-white/50 bg-white/40 px-8 py-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl`}
      >
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/logo.png"
            alt="Shop Quành"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>

        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
