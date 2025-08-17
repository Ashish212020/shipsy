// server/routes/surveys.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Survey = require('../models/survey');

// --- (The POST and GET routes for admin do not need changes) ---
router.post('/', auth, async (req, res) => { /* ...existing code... */ });
router.get('/', auth, async (req, res) => { /* ...existing code... */ });
router.get('/public', async (req, res) => { /* ...existing code... */ });


// --- Submit a vote --- (Public) - UPDATED
router.put('/vote/:surveyId/:optionId', async (req, res) => {
    try {
        const survey = await Survey.findOne({
            _id: req.params.surveyId,
            'options._id': req.params.optionId
        });

        if (!survey) {
            return res.status(404).json({ msg: 'Survey or option not found' });
        }
        
        if (new Date() > survey.expiresAt) {
            return res.status(400).json({ msg: 'This survey has expired.' });
        }

        const option = survey.options.id(req.params.optionId);
        option.votes += 1;
        
        await survey.save();
        
        // --- THIS IS THE FIX ---
        // Get the io object from the app instance
        const io = req.app.get('socketio');
        // ONLY emit if the io object exists (i.e., not in the Vercel serverless environment)
        if (io) {
            io.emit('voteUpdate', survey);
        }

        // Always respond with the updated survey
        res.json(survey);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
