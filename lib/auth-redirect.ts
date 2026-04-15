function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAuthCallbackUrl(nextPath?: string) {
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = trimTrailingSlash(publicSiteUrl || window.location.origin);
  const callbackUrl = new URL("/auth/callback", baseUrl);

  if (nextPath) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  return callbackUrl.toString();
}