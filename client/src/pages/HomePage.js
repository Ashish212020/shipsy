// client/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const HomePage = () => {
  const [surveys, setSurveys] = useState([]);
  const [error, setError] = useState('');
  const [votedSurveyIds, setVotedSurveyIds] = useState(() => {
    const savedVotes = localStorage.getItem('votedSurveyIds');
    return savedVotes ? JSON.parse(savedVotes) : [];
  });

  // Function to fetch surveys, can be called to refresh
  const fetchSurveys = async () => {
    try {
      const res = await axios.get('/api/surveys/public');
      setSurveys(res.data);
    } catch (err) {
      setError('Could not load surveys.');
    }
  };

  useEffect(() => {
    fetchSurveys();

    // --- THIS IS THE FIX ---
    // Only set up Socket.IO for local development
    if (process.env.NODE_ENV === 'development') {
      const socket = io('http://localhost:5001');

      socket.on('voteUpdate', (updatedSurvey) => {
        setSurveys((prevSurveys) =>
          prevSurveys.map((survey) =>
            survey._id === updatedSurvey._id ? updatedSurvey : survey
          )
        );
      });

      // Clean up the socket connection when the component unmounts
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  const handleVote = async (surveyId, optionId) => {
    if (votedSurveyIds.includes(surveyId)) {
      alert("You have already voted on this survey.");
      return;
    }
    try {
      // The vote request still works on Vercel
      await axios.put(`/api/surveys/vote/${surveyId}/${optionId}`);
      
      const newVotedIds = [...votedSurveyIds, surveyId];
      setVotedSurveyIds(newVotedIds);
      localStorage.setItem('votedSurveyIds', JSON.stringify(newVotedIds));

      // Refresh the survey data after voting to show the result
      fetchSurveys();

    } catch (err) {
      alert('Failed to submit vote. The survey may have expired.');
    }
  };

  return (
    <div className="homepage-container">
      <header className="hero-section">
        <h1>Welcome to SurveySphere</h1>
        <p>Your voice matters. Participate in live polls and see results in real-time.</p>
      </header>
      
      <h2>Active Surveys</h2>
      {error && <p className="error-message">{error}</p>}
      {surveys.length > 0 ? (
        <div className="surveys-grid">
          {surveys.map((survey) => {
            const totalVotes = survey.options.reduce((acc, option) => acc + option.votes, 0);
            const hasVoted = votedSurveyIds.includes(survey._id);

            return (
              <div key={survey._id} className={`survey-card ${hasVoted ? 'voted' : ''}`}>
                <h3>{survey.title}</h3>
                <div className="options-list">
                  {survey.options.map((option) => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    return (
                      <div key={option._id} className="option-item">
                        <button 
                          onClick={() => handleVote(survey._id, option._id)}
                          className="vote-btn"
                          disabled={hasVoted}
                        >
                          {option.text}
                        </button>
                        {hasVoted && ( // Only show progress bar after voting
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar"
                              style={{ width: `${percentage}%` }}
                            ></div>
                            <span className="progress-text">
                              {option.votes} votes ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="expires-text">Expires: {new Date(survey.expiresAt).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="no-surveys-message">There are no active surveys at the moment. Please check back later!</p>
      )}
    </div>
  );
};

export default HomePage;
