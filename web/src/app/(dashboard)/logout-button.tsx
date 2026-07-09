"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        await logout();
        router.push("/login");
      }}
      className="w-full text-left px-2 py-1.5 text-sm text-destructive hover:bg-muted rounded-md transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
