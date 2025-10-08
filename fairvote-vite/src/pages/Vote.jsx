import React, { useState } from "react";

const Vote = () => {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [poll, setPoll] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");

  const wallet = localStorage.getItem("wallet");
  const username = localStorage.getItem("username");

  // 🔄 Auto-load poll if user is creator or has requested access
  if (!poll) {
    const polls = JSON.parse(localStorage.getItem("polls")) || [];
    const savedCode = localStorage.getItem("activePollCode");

    if (savedCode) {
      const found = polls.find(p => p.code === savedCode);
      if (found) {
        if (found.creator === wallet) {
          setPoll(found);
          setStatus("approved");
        } else {
          const req = found.requests.find(r => r.wallet === wallet);
          if (req) {
            setPoll(found);
            setStatus(req.status);
          }
        }
      }
    }
  }

  const handleSubmitCode = (e) => {
    e.preventDefault();
    const polls = JSON.parse(localStorage.getItem("polls")) || [];
    const found = polls.find(p => p.code === code.toUpperCase());

    if (!found) {
      alert("Invalid code");
      return;
    }

    localStorage.setItem("activePollCode", code.toUpperCase());

    if (found.creator === wallet) {
      setPoll(found);
      setStatus("approved");
      return;
    }

    const existingRequest = found.requests.find(r => r.wallet === wallet);
    if (!existingRequest) {
      found.requests.push({ wallet, username, status: "pending" });
      localStorage.setItem("polls", JSON.stringify(polls));
      setStatus("pending");
    } else {
      setStatus(existingRequest.status);
    }

    setPoll(found);
  };

  const handleVote = (e) => {
    e.preventDefault();
    const polls = JSON.parse(localStorage.getItem("polls")) || [];
    const updatedPoll = polls.find(p => p.code === poll.code);

    const alreadyVoted = updatedPoll.votes.find(v => v.wallet === wallet);
    if (alreadyVoted) {
      alert("You already voted.");
      return;
    }

    updatedPoll.votes.push({ wallet, option: selectedOption });
    localStorage.setItem("polls", JSON.stringify(polls));

    setPoll({ ...updatedPoll });
    alert("Vote submitted!");
  };

  return (
    <section className="section">
      <h2>Vote in a Poll</h2>

      {!poll ? (
        !showCodeInput ? (
          <div className="add-code-card" onClick={() => setShowCodeInput(true)}>
            <span className="plus">+</span>
            <p>Enter a poll code</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitCode} className="code-form">
            <input
              type="text"
              placeholder="Enter poll code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className="connect-btn">Join Poll</button>
          </form>
        )
      ) : (
        <div className="poll-card">
          <h3>{poll.title}</h3>

          {/* Show status only if user is not the creator */}
          {poll.creator !== wallet && (
            <>
              {status === "pending" && <p>Your request is pending approval.</p>}
              {status === "denied" && <p>Your request was denied.</p>}
            </>
          )}

          {/* Show vote form or confirmation if approved */}
          {status === "approved" && (() => {
            const voted = poll.votes.find(v => v.wallet === wallet);
            return voted ? (
              <div className="voted-card">
                <p><strong>You voted for:</strong></p>
                <div className="voted-option">{voted.option}</div>
              </div>
            ) : (
              <form onSubmit={handleVote}>
                <p>Select your vote:</p>
                {poll.options.map((opt, idx) => (
                  <label key={idx} className="vote-option">
                    <input
                      type="radio"
                      name="vote"
                      value={opt}
                      checked={selectedOption === opt}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      required
                    />
                    {opt}
                  </label>
                ))}
                <button type="submit" className="connect-btn">Submit Vote</button>
              </form>
            );
          })()}
        </div>
      )}
    </section>
  );
};

export default Vote;
