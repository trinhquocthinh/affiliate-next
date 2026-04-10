"use client";

function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[Math.min(score, labels.length) - 1] || "Very weak" };
}

const strengthColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-emerald-400",
  "bg-emerald-500",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (password.length === 0) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength.score ? strengthColors[strength.score - 1] : "bg-white/50"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{strength.label}</p>
    </div>
  );
}
