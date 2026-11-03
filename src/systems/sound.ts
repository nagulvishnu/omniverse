import { audio } from "@/audio/engine";
import { useStore } from "@/store";

/** Audio stays off until the visitor explicitly enables it. */
export async function enableSound() {
  const s = useStore.getState();
  try {
    await audio.enable(s.volume, s.muted);
    useStore.setState({ audioOn: true, muted: false });
    audio.setMuted(false);
    audio.setWorld(s.focused);
    audio.sfx("click");
  } catch {
    useStore.setState({
      audioOn: false,
      notice: { tone: "error", title: "Audio unavailable", message: "Your browser could not start the audio engine. The experience works fine without sound." },
    });
  }
}

export function disableSound() {
  void audio.disable();
  useStore.setState({ audioOn: false });
}

export function toggleSound() {
  if (useStore.getState().audioOn) disableSound();
  else void enableSound();
}

export function setVolume(v: number) {
  useStore.setState({ volume: v });
  audio.setVolume(v);
}

export function toggleMute() {
  const s = useStore.getState();
  if (!s.audioOn) {
    void enableSound();
    return;
  }
  useStore.setState({ muted: !s.muted });
  audio.setMuted(!s.muted);
}
