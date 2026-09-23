import { prisma } from './db';

/**
 * Fires POST webhooks for a given userId without blocking the caller.
 * All errors are swallowed so this can safely be called with `void`.
 */
export async function triggerWebhook(
  userId: string | null | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  if (!userId || userId === 'anonymous') return;

  let webhooks: { url: string; secret: string | null }[] = [];
  try {
    webhooks = await prisma.webhook.findMany({
      where: { userId, isActive: true },
      select: { url: true, secret: true },
    });
  } catch {
    return;
  }

  if (!webhooks.length) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': wh.secret ?? '',
          },
          body,
          signal: controller.signal,
        });
      } catch {
        // Non-blocking – silently ignore timeout / network errors
      } finally {
        clearTimeout(timer);
      }
    })
  );
}
