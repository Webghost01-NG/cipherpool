import React from "react";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header activeTab={activeTab} onTabChange={onTabChange} />
      <main style={{ flex: 1, paddingTop: "var(--space-xl)", paddingBottom: "var(--space-2xl)" }}>
        <div className="container">{children}</div>
      </main>
      <Footer />
    </div>
  );
};
