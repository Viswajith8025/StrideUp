"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MOTION } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const TAB_ORDER = ["/home", "/challenges", "/partner", "/results"];

function tabIndex(pathname: string) {
  const i = TAB_ORDER.findIndex((href) => pathname.startsWith(href));
  return i >= 0 ? i : 0;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prev = useRef(tabIndex(pathname));
  const [dir, setDir] = useState(0);
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    const next = tabIndex(pathname);
    setDir(next === prev.current ? 0 : next > prev.current ? 1 : -1);
    prev.current = next;
    setKey(pathname);
  }, [pathname]);

  return (
    <div
      key={key}
      className={cn("tab-panel", dir > 0 && "tab-from-right", dir < 0 && "tab-from-left")}
      style={{ ["--tab-duration" as string]: `${MOTION.standard}ms` }}
    >
      {children}
    </div>
  );
}
