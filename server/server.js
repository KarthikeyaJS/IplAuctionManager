const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

mongoose.connect('mongodb://localhost:27017/ipl-auction', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
    });

const playerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    age: { type: Number, required: true },
    nation: { type: String, required: true },
    bprice: { type: Number, required: true },
    imageUrl: String,
    bidPrice: { type: Number, default: 0 },
    teamId: { type: String, default: null },
    retained: { type: Boolean, default: false }
});

const Player = mongoose.model('Player', playerSchema);

const teamSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    budget: { type: Number, default: 0 },
    retainedPlayerIds: [{ type: String }],
    password: { type: String, required: true },
    logoUrl: { type: String, required: true }
});

const Team = mongoose.model('Team', teamSchema);

// Fetch grouped players by team and no_team
app.get('/api/players/grouped', async (req, res) => {
    try {
        const teams = await Team.find({});
        const groupedPlayers = {};

        for (const team of teams) {
            const players = await Player.find({ teamId: team._id });
            groupedPlayers[team._id] = {
                teamName: team.name,
                players: players
            };
        }

        const playersWithoutTeam = await Player.find({ teamId: null });
        groupedPlayers['no_team'] = playersWithoutTeam;

        res.json(groupedPlayers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve grouped players', details: err.message });
    }
});

// Delete a player by ID
app.delete('/api/players/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        const player = await Player.findOneAndDelete({ id: playerId });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Remove player ID from the retainedPlayerIds array in the team document
        if (player.teamId) {
            await Team.updateOne(
                { _id: player.teamId },
                { $pull: { retainedPlayerIds: playerId } }
            );
        }

        res.status(200).json({ message: 'Player deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete player', details: err.message });
    }
});

// Create a new team
app.post('/api/teams', async (req, res) => {
    try {
        const { _id, name, budget = 0, retainedPlayerIds = [], password, logoUrl } = req.body;

        if (!_id || !name || !password || !logoUrl) {
            return res.status(400).json({ error: 'Team ID, Team Name, Password, and Logo URL are required' });
        }

        const existingTeam = await Team.findById(_id);
        if (existingTeam) {
            return res.status(400).json({ error: 'Team ID already exists' });
        }

        // Validate each retained player ID before saving
        const validPlayerIds = [];
        for (const playerId of retainedPlayerIds) {
            const player = await Player.findOne({ id: playerId });
            if (!player) {
                return res.status(400).json({ error: `Player ID ${playerId} does not exist` });
            }
            validPlayerIds.push(playerId);
        }

        const newTeam = new Team({
            _id,
            name,
            budget,
            retainedPlayerIds: validPlayerIds,
            password,
            logoUrl
        });

        await newTeam.save();

        // Update Player documents for retained players
        await Player.updateMany({ id: { $in: validPlayerIds } }, { $set: { teamId: _id, retained: true } });

        res.status(200).json({ message: 'Team created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create team', details: err.message });
    }
});

// Fetch all teams
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.find({});
        res.status(200).json(teams);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch teams', details: err.message });
    }
});

// Fetch a specific team by ID
app.get('/api/teams/:teamId', async (req, res) => {
    const { teamId } = req.params;
    try {
        const team = await Team.findById(teamId);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }
        res.json({
            id: team._id,
            name: team.name,
            logoUrl: team.logoUrl,
            budget: team.budget
        });
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit a bid for a player
app.post('/api/players/:id/bid', async (req, res) => {
    try {
        const playerId = req.params.id;
        const { bidPrice, teamID } = req.body;

        const team = await Team.findById(teamID);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        if (team.budget < bidPrice) {
            return res.status(400).json({ error: 'Insufficient budget' });
        }

        const player = await Player.findOne({ id: playerId });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        player.bidPrice = bidPrice;
        player.teamId = teamID;
        player.retained = true;
        await player.save();

        team.budget -= bidPrice;

        if (!team.retainedPlayerIds.includes(playerId)) {
            team.retainedPlayerIds.push(playerId);
        }

        await team.save({ validateModifiedOnly: true }); 

        res.json({ player, team });
    } catch (err) {
        console.error('Error submitting bid:', err);
        res.status(500).json({ error: 'Failed to submit bid', details: err.message });
    }
});

// Fetch all players
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.find({});
        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve players', details: err.message });
    }
});

// Fetch all players for a specific team
app.get('/api/teams/:teamId/players', async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const players = await Player.find({ teamId });
        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve players for team', details: err.message });
    }
});

// Create a new player
app.post('/api/players', async (req, res) => {
    try {
        const { id, name, role, age, nation, bprice, imageUrl } = req.body;
        const existingPlayer = await Player.findOne({ id });

        if (existingPlayer) {
            return res.status(400).json({ error: 'Player ID already exists' });
        }

        const newPlayer = new Player({ id, name, role, age, nation, bprice, imageUrl });

        const player = await newPlayer.save();
        res.status(200).json(player);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create player', details: err.message });
    }
});

// Fetch a specific player by ID
app.get('/api/players/:id', async (req, res) => {
    try {
        const player = await Player.findOne({ id: req.params.id });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve player', details: err.message });
    }
});

// Delete a team by ID
app.delete('/api/teams/:id', async (req, res) => {
    try {
        const teamId = req.params.id;
        const team = await Team.findByIdAndDelete(teamId);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Reset retained players
        await Player.updateMany(
            { teamId: teamId },
            { $set: { teamId: null, retained: false, bidPrice: 0 } }
        );

        res.status(200).json({ message: 'Team deleted and retained players reset successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete team', details: err.message });
    }
});


// Validate team credentials
app.post('/api/teams/validate', async (req, res) => {
    try {
        const { userId, userPassword } = req.body;
        const team = await Team.findById(userId);

        if (team && team.password === userPassword) {
            res.json({ redirectUrl: `t00${userId}.html` });
        } else {
            res.status(401).json({ error: 'Invalid ID or Password' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to validate team credentials', details: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
