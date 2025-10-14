import React, { useState, useEffect } from "react";

const Vote = () => {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [pollsToShow, setPollsToShow] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");

  const walletAddress = localStorage.getItem("walletAddress");
  const username = localStorage.getItem("username");

  useEffect(() => {
    const allPolls = JSON.parse(localStorage.getItem("polls")) || [];
    const activeCodes = JSON.parse(localStorage.getItem("activePollCodes")) || [];

    const filtered = allPolls.filter(p =>
      activeCodes.includes(p.code) &&
      (
        p.creator === walletAddress ||
        p.requests.some(r => r.walletAddress === walletAddress)
      )
    );

    setPollsToShow(filtered);
  }, []);

  const handleSubmitCode = (e) => {
    e.preventDefault();
    const allPolls = JSON.parse(localStorage.getItem("polls")) || [];
    const found = allPolls.find(p => p.code === code.toUpperCase());

    if (!found) {
      alert("Poll not found.");
      return;
    }

    const activeCodes = JSON.parse(localStorage.getItem("activePollCodes")) || [];
    if (!activeCodes.includes(found.code)) {
      activeCodes.push(found.code);
      localStorage.setItem("activePollCodes", JSON.stringify(activeCodes));
    }

    if (found.creator === walletAddress) {
      setPollsToShow([...pollsToShow, found]);
    } else {
      const alreadyRequested = found.requests.find(r => r.walletAddress === walletAddress);
      if (!alreadyRequested) {
        found.requests.push({
          walletAddress,
          username,
          status: "pending"
        });
        const updatedPolls = allPolls.map(p => p.code === found.code ? found : p);
        localStorage.setItem("polls", JSON.stringify(updatedPolls));
      }
      setPollsToShow([...pollsToShow, found]);
    }

    setCode("");
    setShowCodeInput(false);
  };

  const handleVote = (e, pollCode) => {
    e.preventDefault();
    const allPolls = JSON.parse(localStorage.getItem("polls")) || [];
    const pollIndex = allPolls.findIndex(p => p.code === pollCode);
    if (pollIndex === -1) return;

    const poll = allPolls[pollIndex];
    const alreadyVoted = poll.votes.find(v => v.walletAddress === walletAddress);
    if (alreadyVoted) {
      alert("You already voted.");
      return;
    }

    poll.votes.push({ walletAddress, option: selectedOption });
    localStorage.setItem("polls", JSON.stringify(allPolls));
    setSelectedOption("");
    alert("Vote submitted!");

    const updated = allPolls.filter(p =>
      JSON.parse(localStorage.getItem("activePollCodes")).includes(p.code)
    );
    setPollsToShow(updated);
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
      )}

      <hr style={{ margin: "2rem 0" }} />

      {pollsToShow.length === 0 ? (
        <p>No active polls yet.</p>
      ) : (
        pollsToShow.map((poll, idx) => {
          const req = poll.requests.find(r => r.walletAddress === walletAddress);
          const status = poll.creator === walletAddress ? "approved" : req?.status;
          const voted = poll.votes.find(v => v.walletAddress === walletAddress);

          return (
            <div key={idx} className="poll-card">
              <h3>{poll.title}</h3>

              {poll.ended ? (
                <p style={{ color: "red", fontWeight: "bold" }}>Voting has ended.</p>
              ) : (
                <>
                  {poll.creator !== walletAddress && (
                    <>
                      {status === "pending" && <p>Your request is pending approval.</p>}
                      {status === "denied" && <p>Your request was denied.</p>}
                    </>
                  )}

                  {status === "approved" && (
                    voted ? (
                      <div className="voted-card">
                        <p><strong>You voted for:</strong></p>
                        <div className="voted-option">{voted.option}</div>
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleVote(e, poll.code)}>
                        <p>Select your vote:</p>
                        {poll.options.map((opt, i) => (
                          <label key={i} className="vote-option">
                            <input
                              type="radio"
                              name={`vote-${poll.code}`}
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
                    )
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </section>
  );
};

export default Vote;
