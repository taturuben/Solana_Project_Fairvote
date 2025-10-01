import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Header = ({ wallet, username }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left">
        <span className="app-name">FairVote.ro</span>
      </div>
      <nav className="header-center">
        <NavLink to="/vote" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Vote</NavLink>
        <NavLink to="/results" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Results</NavLink>
      </nav>
      <div className="header-right">
        {wallet ? (
          <>
            <span style={{ fontSize: "0.9rem" }}>{username} ({wallet.slice(0, 6)}...)</span>
            <NavLink to="/dashboard" className="nav-link">My Pools</NavLink>
            <button className="connect-btn" onClick={() => {
              localStorage.clear();
              window.location.href = "/connect";
            }}>Sign Out</button>
          </>
        ) : (
          <WalletMultiButton />
        )}
      </div>
    </header>
  );
};

export default Header;
