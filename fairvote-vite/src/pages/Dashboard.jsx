import React, { useState, useEffect } from "react";

const Dashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    const savedPolls = JSON.parse(localStorage.getItem("polls")) || [];
    setPolls(savedPolls);
  }, []);

  const walletAddress = localStorage.getItem("walletAddress"); // your walletAddress
  const allPolls = JSON.parse(localStorage.getItem("polls")) || [];
  const myPolls = allPolls.filter(p => p.creator === walletAddress);

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => setOptions([...options, ""]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const username = localStorage.getItem("username");
    const newPoll = {
      title,
      options: options.filter(opt => opt.trim() !== ""),
      code: generateCode(),
      creator: walletAddress,
      requests: [
        {
          walletAddress: walletAddress,
          username: username,
          status: "approved"
        }
      ],
      votes: [],
      ended: false
    };

    const updatedPolls = [...polls, newPoll];
    setPolls(updatedPolls);
    localStorage.setItem("polls", JSON.stringify(updatedPolls));
    setTitle("");
    setOptions(["", ""]);
    setShowForm(false);

    localStorage.setItem("activePollCode", newPoll.code);
  };
    const updateRequest = (code, walletAddress, newStatus) => {
      const polls = JSON.parse(localStorage.getItem("polls")) || [];
      const pollIndex = polls.findIndex(p => p.code === code);
      if (pollIndex === -1) return;

      const request = polls[pollIndex].requests.find(r => r.walletAddress === walletAddress);
      if (request) {
        request.status = newStatus;
        localStorage.setItem("polls", JSON.stringify(polls));
        setPolls(polls); // refresh UI
      }
    };
    
    const endElection = (code) => {
      const polls = JSON.parse(localStorage.getItem("polls")) || [];
      const updatedPolls = polls.map(p => {
        if (p.code === code) {
          return {
            ...p,
            ended: true,
            requests: [],
            code: null
          };
        }
        return p;
      });

      localStorage.setItem("polls", JSON.stringify(updatedPolls));
      localStorage.removeItem("activePollCode");

      const remaining = updatedPolls.filter(p => p.creator === walletAddress);
      setPolls(remaining);
    };

  return (
    <section className="section">
      <h2>My Polls</h2>

      {!showForm && (
        <div className="add-poll-card" onClick={() => setShowForm(true)}>
          <span className="plus">+</span>
          <p>Create a new poll</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="poll-form">
          <input
            type="text"
            placeholder="Poll Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {options.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
            />
          ))}
          <button type="button" onClick={addOption} className="connect-btn">Add Option</button>
          <button type="submit" className="connect-btn">Create Poll</button>
        </form>
      )}

      <hr style={{ margin: "2rem 0" }} />

      <h3>Created Polls</h3>
      {myPolls.map((poll, idx) => (
        <div key={idx} className="poll-card">
          <h4>{poll.title}</h4>

          {poll.ended ? (
            <p style={{ color: "red", fontWeight: "bold" }}>Voting ended.</p>
          ) : (
            <>
              <button onClick={() => endElection(poll.code)} className="end-btn">
                End Election
              </button>
              <p><strong>Invite Code:</strong> {poll.code}</p>

              <h5>Requests to Vote:</h5>
              {poll.requests.length === 0 ? (
                <p>No requests yet.</p>
              ) : (
                poll.requests
                  .filter(req => req.walletAddress !== poll.creator)
                  .map((req, rIdx) => (
                    <div key={rIdx} style={{ marginBottom: "0.5rem" }}>
                      {req.username} ({req.walletAddress}) — <strong>{req.status}</strong>
                      {req.status === "pending" && (
                        <>
                          <button
                            className="connect-btn"
                            onClick={() => updateRequest(poll.code, req.walletAddress, "approved")}
                            style={{ marginLeft: "1rem" }}
                          >
                            Approve
                          </button>
                          <button
                            className="signout-btn"
                            onClick={() => updateRequest(poll.code, req.walletAddress, "denied")}
                            style={{ marginLeft: "0.5rem" }}
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                  ))
              )}
            </>
          )}
        </div>
      ))}

    </section>
  );
};

export default Dashboard;
