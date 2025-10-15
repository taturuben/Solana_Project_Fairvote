import React, { useState, useEffect } from "react";
import { cn } from "../utilities/cn";
import { LoaderCircle } from 'lucide-react';
import { useApi } from "../contexts/ApiProvider";
import bs58 from "bs58";

const Vote = () => {
  const apiClient = useApi();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.requestVotingRight(code, window.solana.publicKey.toBase58());
    } catch (e) {
      console.log("Vote.jsx error", e);
    }

    const activeCodes = JSON.parse(localStorage.getItem("activePollCodes")) || [];
    if (!activeCodes.includes(code)) {
      activeCodes.push(code);
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
    setIsLoading(false);
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
          <h3>Join a Poll</h3>

          <div className="form-group">
            <label htmlFor="pollCode">Poll Code</label>
            <input
              className="w-full"
              id="pollCode"
              type="text"
              placeholder="e.g. 113c1c6c-e9c1-4717-8b78-6727ff080290"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className={cn(
              "flex justify-between items-center gap-2",
              isLoading ? "submit-btn-loading" : "submit-btn"
            )}>
              <LoaderCircle className={cn(
                "animate-spin h-5",
                isLoading ? "inline" : "hidden"
              )}/>
              Join Poll
            </button>
            <button type="button" onClick={() => setShowCodeInput(false)} className="cancel-btn">
              Cancel
            </button>
          </div>
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
