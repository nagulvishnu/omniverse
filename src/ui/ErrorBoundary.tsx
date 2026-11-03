import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError: (e: Error) => void;
}

/** Catches 3D render failures so the discovery interface can take over. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("[OMNIVERSE] 3D scene failed:", error);
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
