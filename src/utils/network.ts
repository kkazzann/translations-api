import os from 'os';

export function getLocalLanIp(): string {
  const interfaces = os.networkInterfaces?.() as Record<string, any[]> | undefined;
  if (!interfaces) return 'localhost';

  for (const name of Object.keys(interfaces)) {
    const items = interfaces[name];
    for (const iface of items) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}
