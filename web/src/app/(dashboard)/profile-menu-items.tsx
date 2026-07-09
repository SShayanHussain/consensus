"use client";

import Link from "next/link";

export function ProfileMenuItems() {
  return (
    <>
      <Link
        href="/settings/profile"
        className="block px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
      >
        Profile
      </Link>
      <Link
        href="/settings/workspace"
        className="block px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
      >
        Workspace Settings
      </Link>
    </>
  );
}
