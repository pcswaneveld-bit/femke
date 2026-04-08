"use client";

import { useEffect } from "react";

export default function ThemeProvider() {
  useEffect(() => {
    const opgeslagen = localStorage.getItem("studiehulp_thema");
    if (opgeslagen === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return null;
}
