"use client";

import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

type Props = {
  value: string;
  size?: number;
};

export default function QRCode({ value, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-xl" />;
}
