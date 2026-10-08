"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";

type Props = {
  children: ReactNode;
  section: string;
};
type State = { failed: boolean };

export class MyBooksSectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`BFG Buku Saya: ${this.props.section} failed`, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Card className="content-stack" role="alert">
        <strong>{this.props.section} belum dapat dimuat.</strong>
        <p className="subtle">Bagian lain tetap bisa digunakan. Coba muat ulang bagian ini.</p>
        <div>
          <Button type="button" variant="secondary" onClick={() => this.setState({ failed: false })}>
            Coba lagi
          </Button>
        </div>
      </Card>
    );
  }
}
