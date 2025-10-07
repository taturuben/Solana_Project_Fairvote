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
    const newPoll = {
      title,
      options: options.filter(opt => opt.trim() !== ""),
      code: generateCode()
    };
    const updatedPolls = [...polls, newPoll];
    setPolls(updatedPolls);
    localStorage.setItem("polls", JSON.stringify(updatedPolls));
    setTitle("");
    setOptions(["", ""]);
    setShowForm(false);
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
      {polls.length === 0 ? (
        <p>No polls created yet.</p>
      ) : (
        <div className="poll-list">
          {polls.map((poll, idx) => (
            <div key={idx} className="poll-card">
              <h4>{poll.title}</h4>
              <p>{poll.options.length} options</p>
              <p><strong>Invite Code:</strong> {poll.code}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Dashboard;
