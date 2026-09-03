import React from "react";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  contractAddress?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, contractAddress }) => (
  <div className="app-shell">
    <Header activeTab={activeTab} onTabChange={onTabChange} contractAddress={contractAddress} />
    <main className="app-main">{children}</main>
    <Footer />
  </div>
);
