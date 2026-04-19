/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const data = (event as PushEvent).data?.json() ?? {
    title: "EczemaTrack",
    body: "Time for your daily skin check-in.",
    url: "/log",
  };
  (event as ExtendableEvent).waitUntil(
    self.registration.showNotification(data.title as string, {
      body: data.body as string,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: (data.url as string) ?? "/log" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  (event as NotificationEvent).notification.close();
  (event as ExtendableEvent).waitUntil(
    self.clients.openWindow(
      ((event as NotificationEvent).notification.data as { url: string }).url ?? "/home",
    ),
  );
});
