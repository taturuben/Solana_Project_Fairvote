import { LoaderCircle } from 'lucide-react';
import React, { useState, useEffect } from "react";
import { useApi } from "../contexts/ApiProvider";
import { cn } from "../utilities/cn";
import { APIClient } from '../contexts/client';
import bs58 from "bs58";

const Dashboard = () => {
  const apiClient = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    const savedPolls = JSON.parse(localStorage.getItem("polls")) || [];
    setPolls(savedPolls);
  }, []);

  const walletAddress = localStorage.getItem("walletAddress"); // your walletAddress
  const myPolls = JSON.parse(localStorage.getItem("polls")) || [];

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => setOptions([...options, ""]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const wallet = window.solana.publicKey.toBase58();

    const { uuid, address } = await apiClient.createElection(
      wallet,
      {
        entries: [{
          question: question,
          options: options.filter(opt => opt.trim() !== "")
        }]
      }
    );

    const username = localStorage.getItem("username");
    const newPoll = {
      question,
      options: options.filter(opt => opt.trim() !== ""),
      code: address,
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

    const elections = await apiClient.getElections(wallet);
    const updatedPolls = elections.map((e) => {
      return {
        uuid: e.uuid,
        code: e.address,
        creator: wallet,
        options: e.data.entries[0].options,
        question: e.data.entries[0].question,
        requests: e.requests, // TODO: map this shit
        ended: !e.isRunning
      }
    });

    setPolls(updatedPolls);
    localStorage.setItem("polls", JSON.stringify(updatedPolls));

    localStorage.setItem("activePollCodes", JSON.stringify(
      updatedPolls.map((p) => p.code)
    ));

    setQuestion("");
    setOptions(["", ""]);
    setShowForm(false);
    setIsLoading(false);
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
  
  const endElection = async (poll) => {
    try {
      const { signature } = await window.solana.signMessage(new TextEncoder().encode(poll.uuid), 'utf8');
      await apiClient.stopElection(poll.uuid, bs58.encode(Uint8Array.from(signature)));
    } catch (e) {
      console.log(e);
      return;
    }

    const code = poll.code;
    const polls = JSON.parse(localStorage.getItem("polls")) || [];
    const updatedPolls = polls.map(p => {
      if (p.code === code) {
        return {
          ...p,
          ended: true,
          requests: p.requests,
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
          <h3>Create a New Poll</h3>

          <div className="form-group">
            <label htmlFor="question">Question</label>
            <input
              id="question"
              className="option-input"
              type="text"
              placeholder="Who should be the president?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Options</label>
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Candidate ${idx + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                required
                className="option-input"
              />
            ))}
            <button type="button" onClick={addOption} className="add-option-btn">
              + Add Another Option
            </button>
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
              Create Poll
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      <hr style={{ margin: "2rem 0" }} />

      <h3>Created Polls</h3>
      {myPolls
        .sort((a,b) => (a.ended?1:0) - (b.ended?1:0)).map((poll, idx) => (
        <div key={idx} className="poll-card">
          <div className='flex gap-2 justify-between items-center'>
            <h1 className='text-l font-bold'>{poll.question}</h1>
            <EndButton onClick={() => endElection(poll)}/>
          </div>

          {poll.ended ? (
            <p style={{ color: "red", fontWeight: "bold" }}>Voting ended.</p>
          ) : (
            <>
              <p><span className='font-semibold'>Invite Code:</span> <span className=''>{poll.code}</span></p>

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

const EndButton = ({ children, onClick }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  }

  return <button onClick={handler} className={cn(
            "flex justify-between items-center gap-2",
            "end-btn"
          )}>
            <LoaderCircle className={cn(
              "animate animate-spin h-5",
              isLoading ? "inline" : "hidden"
            )}/>
            End Election
        </button>
}

export default Dashboard;
