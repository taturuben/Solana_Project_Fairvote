import React, { useState } from "react";

const Vote = () => {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: validate code and fetch poll
    console.log("Entered code:", code);
  };

  return (
    <section className="section">
      <h2>Vote in a Poll</h2>

      {!showCodeInput ? (
        <div className="add-code-card" onClick={() => setShowCodeInput(true)}>
          <span className="plus">+</span>
          <p>Enter a poll code</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="code-form">
          <input
            type="text"
            placeholder="Enter poll code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" className="connect-btn">Join Poll</button>
        </form>
      )}
    </section>
  );
};

export default Vote;
