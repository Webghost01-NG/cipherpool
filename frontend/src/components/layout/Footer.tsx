import React from "react";
import { Code2, LockKeyhole } from "lucide-react";

const repositoryUrl = "https://github.com/Webghost01-NG/fhevm-pooltogether-security";

export const Footer: React.FC = () => (
  <footer className="site-footer">
    <div className="container">
      <div className="footer-grid">
        <div>
          <div className="footer-title">CipherPool</div>
          <p className="footer-copy">
            Prize savings where individual positions and winning odds remain encrypted.
            Built for the Zama fhEVM testnet and designed to surface cryptographic evidence—not promises.
          </p>
        </div>
        <div>
          <p className="footer-heading">Security specifications</p>
          <ul className="footer-links">
            <li><a href={repositoryUrl + "/blob/main/docs/security/replay-boundaries.md"} target="_blank" rel="noreferrer">Replay boundaries</a></li>
            <li><a href={repositoryUrl + "/blob/main/docs/security/stale-handles.md"} target="_blank" rel="noreferrer">Stale-handle analysis</a></li>
            <li><a href={repositoryUrl + "/blob/main/docs/spec/adversarial-test-plan.md"} target="_blank" rel="noreferrer">Adversarial test plan</a></li>
          </ul>
        </div>
        <div>
          <p className="footer-heading">Protocol</p>
          <ul className="footer-links">
            <li><a href={repositoryUrl} target="_blank" rel="noreferrer"><Code2 size={13} aria-hidden="true" /> Source repository</a></li>
            <li><span><LockKeyhole size={13} aria-hidden="true" /> Ethereum Sepolia</span></li>
            <li><span>Zama fhEVM</span></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Open-source security research and testnet software.</span>
        <span>Never share wallet seed phrases or private keys.</span>
      </div>
    </div>
  </footer>
);
