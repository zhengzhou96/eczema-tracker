import webPush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function getWebPush() {
  webPush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return webPush;
}

export async function sendPushNotification(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<void> {
  await getWebPush().sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
  );
}
