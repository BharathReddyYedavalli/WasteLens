/**
 * Load Google's browser Maps API once. The key comes from a gitignored
 * frontend/.env.local file (VITE_GOOGLE_MAPS_API_KEY), never from source.
 * A failed load can be retried on another Finder search.
 */
let pending: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== "undefined" && typeof google.maps.importLibrary === "function") {
    return Promise.resolve();
  }
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const callback = "__wasteLensGoogleMapsReady";
    const global = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    let settled = false;
    const timeout = window.setTimeout(() => {
      fail(new Error("Google Maps could not be loaded."));
    }, 15000);
    function clean() {
      window.clearTimeout(timeout);
      delete global[callback];
      script.onerror = null;
    }
    function fail(error: Error) {
      if (settled) return;
      settled = true;
      clean();
      script.remove();
      reject(error);
    }
    global[callback] = () => {
      if (settled) return;
      if (typeof google === "undefined" || !google.maps?.importLibrary) {
        fail(new Error("The Google Maps API is not available."));
        return;
      }
      settled = true;
      clean();
      resolve();
    };
    script.async = true;
    script.src = "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) + "&v=weekly&loading=async&callback=" + callback;
    script.onerror = () => fail(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  }).catch(error => {
    pending = null;
    throw error;
  });
  return pending;
}
