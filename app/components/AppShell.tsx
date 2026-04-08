"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Tour from "./Tour";
import Avatar from "./Avatar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobiel = pathname.startsWith("/mobiel");

  if (isMobiel) {
    return (
      <>
        {/* Override the root layout's h-full / flex / overflow-hidden on html+body
            These Tailwind classes block touch events on Android Chrome.
            !important is required to beat the class-based specificity. */}
        <style>{`
          html, body {
            height: auto !important;
            min-height: 100% !important;
            display: block !important;
            overflow: auto !important;
            flex: none !important;
          }
        `}</style>
        {children}
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <Avatar />
      <Tour />
    </>
  );
}
