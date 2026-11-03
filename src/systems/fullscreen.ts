import { useStore } from "@/store";

export function toggleFullscreen() {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const active = document.fullscreenElement || doc.webkitFullscreenElement;
  try {
    if (active) {
      void (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    } else {
      const p = el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
      (p as Promise<void> | undefined)?.catch?.(() => notSupported());
      if (!el.requestFullscreen && !el.webkitRequestFullscreen) notSupported();
    }
  } catch {
    notSupported();
  }
}

function notSupported() {
  useStore.setState({
    notice: { tone: "info", title: "Fullscreen unavailable", message: "Your browser or the embedding frame blocked fullscreen mode." },
  });
}

export function watchFullscreen() {
  const h = () => useStore.setState({ fullscreen: !!document.fullscreenElement });
  document.addEventListener("fullscreenchange", h);
  return () => document.removeEventListener("fullscreenchange", h);
}
