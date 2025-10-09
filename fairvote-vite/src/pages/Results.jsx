import React from "react";

const Results = () => {
  const walletAddress = localStorage.getItem("walletAddress");
  const polls = JSON.parse(localStorage.getItem("polls")) || [];

  const endedPolls = polls.filter(p =>
    p.ended &&
    p.requests.some(r => r.walletAddress === walletAddress && r.status === "approved")
  );

  return (
    <section className="section">
      <h2>Election Results</h2>
      {endedPolls.length === 0 ? (
        <p>No results available yet.</p>
      ) : (
        endedPolls.map((poll, idx) => {
          const counts = poll.options.map(opt =>
            poll.votes.filter(v => v.option === opt).length
          );

          return (
            <div key={idx} className="poll-card">
              <h3>{poll.title}</h3>
              {poll.options.map((opt, i) => (
                <p key={i}>
                  {opt}: {counts[i]} vote{counts[i] !== 1 ? "s" : ""}
                </p>
              ))}
            </div>
          );
        })
      )}
    </section>
  );
};

export default Results;

