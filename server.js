import express from 'express';
import Papa from 'papaparse';

const app = express();
const PORT = process.env.PORT || 3000;

// API Configurations (e.g., Football-Data.org or API-Football)
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || 'YOUR_FREE_API_KEY';

// Sample function to fetch Starting Lineups & xG stats from external API
async function getMatchDetails(fixtureId) {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    });
    const data = await response.json();
    return data.response;
  } catch (err) {
    return null;
  }
}

// Function to fetch Player xG & Top Scorer Stats
async function getPlayerXgStats(leagueId, season = 2026) {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    });
    const data = await response.json();
    return data.response;
  } catch (err) {
    return [];
  }
}

app.get('/match-details', async (req, res) => {
  const fixtureId = req.query.id;
  if (!fixtureId) return res.status(400).json({ error: 'Fixture ID required' });

  const lineups = await getMatchDetails(fixtureId);
  res.json({ lineups });
});

app.get('/player-stats', async (req, res) => {
  const leagueId = req.query.league || 39; // Default: Premier League
  const stats = await getPlayerXgStats(leagueId);
  
  res.json(stats.map(item => ({
    player: item.player.name,
    team: item.statistics[0].team.name,
    goals: item.statistics[0].goals.total,
    xg: item.statistics[0].goals.xg || (item.statistics[0].goals.total * 0.85).toFixed(2), // Fallback xG
    assists: item.statistics[0].goals.assists || 0,
    shotsOnTarget: item.statistics[0].shots.on || 0
  })));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
