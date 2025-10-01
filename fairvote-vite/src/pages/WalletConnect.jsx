import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";

const WalletConnect = ({ onConnect }) => {
  const { publicKey } = useWallet();
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (publicKey) {
      const savedUsername = localStorage.getItem("username");
      if (savedUsername) {
        onConnect(publicKey.toBase58(), savedUsername);
        navigate("/dashboard");
      }
    }
  }, [publicKey]);

  const handleSubmit = () => {
    if (username && publicKey) {
      localStorage.setItem("username", username);
      onConnect(publicKey.toBase58(), username);
      navigate("/dashboard");
    }
  };

  return (
    <section className="section">
      <h2>Conectare Wallet Phantom</h2>
      {publicKey ? (
        <>
          <p>Wallet conectat: {publicKey.toBase58()}</p>
          <input
            type="text"
            placeholder="Nume utilizator"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
          />
          <button className="connect-btn" onClick={handleSubmit}>Continuă</button>
        </>
      ) : (
        <p>Deschide Phantom și conectează-te folosind butonul din dreapta sus.</p>
      )}
    </section>
  );
};

export default WalletConnect;
