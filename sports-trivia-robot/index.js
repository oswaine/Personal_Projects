const express = require('express');
const session = require('express-session');
const db = require('./db');  // Import the database
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session management
app.use(session({
    secret: 'my-secret',  // Replace with a secure random value
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }  // 24 hours
}));

// Function to get random trivia question
const triviaData = require('./sports-trivia.json');
const getRandomTriviaQuestion = () => {
    const randomIndex = Math.floor(Math.random() * triviaData.length);
    return triviaData[randomIndex];
};

// Check if user can answer the trivia today
const canAnswerToday = (userId, callback) => {
    db.get("SELECT last_answered FROM user_trivia WHERE user_id = ?", [userId], (err, row) => {
        if (err) {
            console.error(err);
            return callback(false);
        }

        if (!row) {
            return callback(true);  // No record found, allow answering
        }

        const lastAnsweredDate = new Date(row.last_answered);
        const now = new Date();
        const timeDifference = now - lastAnsweredDate;
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        callback(hoursDifference >= 24);  // True if 24 hours have passed
    });
};

// Serve trivia question via API
app.get('/api/trivia', (req, res) => {
    const userId = req.sessionID;  // Use session ID as a unique user identifier
    const trivia = getRandomTriviaQuestion();

    canAnswerToday(userId, (allowed) => {
        if (!allowed) {
            return res.json({ error: 'You have already answered today!' });
        }

        // Send the trivia question
        res.json(trivia);
    });
});

// Handle trivia answer submission
app.post('/api/submit-answer', (req, res) => {
    const userId = req.sessionID;
    const userAnswer = req.body.answer;
    const correctAnswer = req.body.correctAnswer;

    canAnswerToday(userId, (allowed) => {
        if (!allowed) {
            return res.json({ error: 'You have already answered today!' });
        }

        if (userAnswer === correctAnswer) {
            res.json({ result: 'Correct!' });
        } else {
            res.json({ result: `Wrong! The correct answer is: ${correctAnswer}` });
        }

        // Store the current timestamp in the database
        const now = new Date().toISOString();
        db.run("INSERT OR REPLACE INTO user_trivia (user_id, last_answered) VALUES (?, ?)", [userId, now], (err) => {
            if (err) {
                console.error('Error updating user answer time:', err);
            }
        });
    });
});

app.listen(port, () => {
    console.log(`Sports trivia app running at http://localhost:${port}`);
});
