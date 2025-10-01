import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import WalletConnect from "./pages/WalletConnect";
import Dashboard from "./pages/Dashboard";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import WalletConnectionProvider from "./components/WalletProvider";

function App() {
  const [wallet, setWallet] = useState(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const savedWallet = localStorage.getItem("wallet");
    const savedUsername = localStorage.getItem("username");
    if (savedWallet && savedUsername) {
      setWallet(savedWallet);
      setUsername(savedUsername);
    }
  }, []);

  const handleConnect = (walletAddress, name) => {
    setWallet(walletAddress);
    setUsername(name);
    localStorage.setItem("wallet", walletAddress);
    localStorage.setItem("username", name);
  };

  return (
    <WalletConnectionProvider>
      <Router>
        <Header wallet={wallet} username={username} />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/connect" />} />
            <Route path="/connect" element={<WalletConnect onConnect={handleConnect} />} />
            <Route path="/dashboard" element={wallet ? <Dashboard /> : <Navigate to="/connect" />} />
            <Route path="/vote" element={<Vote />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
      </Router>
    </WalletConnectionProvider>
  );
}

export default App;
