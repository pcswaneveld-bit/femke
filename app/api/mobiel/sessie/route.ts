import { NextRequest } from "next/server";
import os from "os";
import { maakSessie } from "../../../lib/mobileSessie";

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

export async function POST(req: NextRequest) {
  const sessie = maakSessie();
  const host = req.headers.get("host") ?? "localhost:3000";
  const port = host.includes(":") ? host.split(":")[1] : "3000";
  const ip = getLocalIP();
  const url = `http://${ip}:${port}/mobiel.html?sessionId=${sessie.id}`;
  return Response.json({ sessionId: sessie.id, url });
}
