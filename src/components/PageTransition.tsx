"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start progress when pathname or searchParams change
    setVisible(true);
    setProgress(30);

    const timer = setTimeout(() => {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(hideTimer);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "3px",
        background: "linear-gradient(90deg, var(--primary) 0%, #ffc107 100%)",
        width: `${progress}%`,
        transition: "width 0.4s ease-out, opacity 0.3s ease-in",
        zIndex: 9999,
        boxShadow: "0 0 10px var(--primary)",
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
}
