export async function getAuthUserId(): Promise<string> {
  try {
    const pkg = '@clerk/nextjs/server';
    const clerk = await import(/* webpackIgnore: true */ pkg);
    if (clerk && typeof clerk.auth === 'function') {
      const authObj = await clerk.auth();
      if (authObj && authObj.userId) {
        return authObj.userId;
      }
    }
  } catch {
    // Clerk is not installed or not in an authenticated session
  }
  return 'anonymous';
}
