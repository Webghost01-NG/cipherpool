import React from "react";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { DEFAULT_POOL_ADDRESS } from "../../contracts/config.js";

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  contractAddress?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  contractAddress = DEFAULT_POOL_ADDRESS,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header activeTab={activeTab} onTabChange={onTabChange} contractAddress={contractAddress} />
      <main style={{ flex: 1, paddingTop: "var(--space-xl)", paddingBottom: "var(--space-2xl)" }}>
        <div className="container">{children}</div>
      </main>
      <Footer />
    </div>
  );
};
