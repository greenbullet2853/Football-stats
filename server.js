import express from 'express';
import Papa from 'papaparse';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Domestic CSV Sources (Football-Data.co.uk 2026/2027)
const CSV_LEAGUES = {
  E0: { name: 'Premier League (England)', url: 'https://www.football-data.co.uk/mmz4281/2627/E0.csv' },
  E1: { name: 'Championship (England)', url: 'https://www.football-data.co.uk/mmz4281/2627/E1.csv' },
  SP1: { name: 'La Liga (Spain)', url: 'https://www.football-data.co.uk/mmz4281/2627/SP1.csv' },
  I1: { name: 'Serie A (Italy)', url: 'https://www.football-data.co.uk/mmz4281/2627/I1.csv' },
  D1: { name: 'Bundesliga (Germany)', url: 'https://www.football-data.co.uk/mmz4281/2627/D1.csv' },
  F1: { name: 'Ligue 1 (France)', url: 'https://www.football-data.co.uk/mmz4281/2627/F1.csv' },
  N1: { name: 'Eredivisie (Netherlands)', url: 'https://www.football-data.co.uk/mmz4281/2627/N1.csv' },
  P1: { name: 'Primeira Liga (Portugal)', url: 'https://www.football-data.co.uk/mmz4281/2627/P1.csv' },
  B1: { name: 'Pro League (Belgium)', url: 'https://www.football-data.co.uk/mmz4281/2627/B1.csv' },
  T1: { name: 'Super Lig (Turkey)', url: 'https://www.football-data.co.uk/mmz4281/2627/T1.csv' },
  G1: { name: 'Super League (Greece)', url: 'https://www.football-data.co.uk/mmz4281/2627/G1.csv' },
  SC0: { name: 'Premiership (Scotland)', url: 'https://www.football-data.co.uk/mmz4281/2627/SC0.csv' }
};

// 2. Tournament Open JSON Sources (Open Football Data)
const JSON_TOURNAMENTS = {
  CL: { name: 'UEFA Champions League', url: 'https://raw.githubusercontent.com/openfootball/cl/master/2024-25/cl.json' },
  WC: { name: 'FIFA World Cup', url: 'https://raw.githubusercontent.com/openfootball/worldcup/master/2022/worldcup.json' }
};

// Fetch CSV League Data
async function getCsvData(url) {
  const response = await fetch(url);
  const csvText = await response.text();
  return Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
}

// Fetch Tournament JSON Data
async function getJsonTournament(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    return null;
  }
}

function calculateStandings(matches) {
  const teams = {};

  matches.forEach(m => {
    const home = m.HomeTeam;
    const away = m.AwayTeam;
    const hg = parseInt(m.FTHG, 10);
    const ag = parseInt(m.FTAG, 10);

    if (!home || !away || isNaN(hg) || isNaN(ag)) return;

    if (!teams[home]) teams[home] = { team: home, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    if (!teams[away]) teams[away] = { team: away, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

    teams[home].mp++;
    teams[away].mp++;
    teams[home].gf += hg;
    teams[home].ga += ag;
    teams[away].gf += ag;
    teams[away].ga += hg;

    if (hg > ag) {
      teams[home].w++;
      teams[home].pts += 3;
      teams[away].l++;
    } else if (hg < ag) {
      teams[away].w++;
      teams[away].pts += 3;
      teams[home].l++;
    } else {
      teams[home].d++;
      teams[home].pts += 1;
      teams[away].d++;
      teams[away].pts += 1;
    }
  });

  return Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
}

app.get('/', async (req, res) => {
  try {
    const selected = req.query.league || 'E0';
    let isTournament = JSON_TOURNAMENTS[selected] !== undefined;
    let selectedName = isTournament ? JSON_TOURNAMENTS[selected].name : (CSV_LEAGUES[selected]?.name || CSV_LEAGUES.E0.name);

    let standings = [];
    let completedMatches = [];
    let upcomingMatches = [];
    let tournamentRounds = [];

    if (isTournament) {
      const tourneyData = await getJsonTournament(JSON_TOURNAMENTS[selected].url);
      if (tourneyData && tourneyData.rounds) {
        tournamentRounds = tourneyData.rounds;
      }
    } else {
      const targetUrl = CSV_LEAGUES[selected]?.url || CSV_LEAGUES.E0.url;
      const rawMatches = await getCsvData(targetUrl);
      completedMatches = rawMatches.filter(m => m.FTHG !== "" && m.FTHG !== undefined);
      upcomingMatches = rawMatches.filter(m => m.FTHG === "" || m.FTHG === undefined).slice(0, 5);
      standings = calculateStandings(completedMatches);
    }

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${selectedName} - Global Football Hub</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { text-align: center; color: #38bdf8; margin-bottom: 5px; }
        .sub { text-align: center; color: #94a3b8; margin-bottom: 20px; }
        .league-selector { text-align: center; margin-bottom: 30px; }
        select { background: #1e293b; color: #38bdf8; border: 2px solid #38bdf8; padding: 10px 15px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; outline: none; }
        h2 { margin-top: 30px; border-bottom: 2px solid #334155; padding-bottom: 8px; color: #38bdf8; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 25px; font-size: 14px; }
        th, td { padding: 10px 12px; text-align: left; }
        th { background: #334155; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
        tr:nth-child(even) { background: #1b263b; }
        tr:hover { background: #334155; }
        .win { color: #4ade80; font-weight: bold; }
        .badge { background: #0284c7; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .tourney-round { background: #1e293b; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #38bdf8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚽ Global Football Stats Hub</h1>
        <p class="sub">Leagues, Champions League & World Cup Data</p>

        <div class="league-selector">
          <label for="league" style="margin-right: 10px; font-weight: bold;">Select Competition:</label>
          <select id="league" onchange="window.location.href='/?league=' + this.value">
            <optgroup label="🏆 International Tournaments">
              ${Object.keys(JSON_TOURNAMENTS).map(code => `
                <option value="${code}" ${selected === code ? 'selected' : ''}>${JSON_TOURNAMENTS[code].name}</option>
              `).join('')}
            </optgroup>
            <optgroup label="🌍 National Leagues">
              ${Object.keys(CSV_LEAGUES).map(code => `
                <option value="${code}" ${selected === code ? 'selected' : ''}>${CSV_LEAGUES[code].name}</option>
              `).join('')}
            </optgroup>
          </select>
        </div>`;

    if (isTournament) {
      html += `<h2>🏆 ${selectedName} Matches & Knockout Rounds</h2>`;
      if (tournamentRounds.length === 0) {
        html += `<p>Tournament data loading or unavailable.</p>`;
      } else {
        tournamentRounds.forEach(r => {
          html += `<div class="tourney-round"><h3>${r.name}</h3><ul>`;
          r.matches.forEach(m => {
            const score1 = m.score ? m.score.ft[0] : '-';
            const score2 = m.score ? m.score.ft[1] : '-';
            html += `<li><b>${m.team1}</b> ${score1} - ${score2} <b>${m.team2}</b> <span style="color:#94a3b8; font-size:12px;">(${m.date})</span></li>`;
          });
          html += `</ul></div>`;
        });
      }
    } else {
      html += `
        <h2>🏆 Standings (${selectedName})</h2>
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Team</th>
              <th>MP</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>`;

      standings.forEach((t, i) => {
        const gd = t.gf - t.ga;
        html += `
              <tr>
                <td><b>${i + 1}</b></td>
                <td>${t.team}</td>
                <td>${t.mp}</td>
                <td>${t.w}</td>
                <td>${t.d}</td>
                <td>${t.l}</td>
                <td style="color: #4ade80;">${t.gf}</td>
                <td style="color: #f87171;">${t.ga}</td>
                <td>${gd > 0 ? '+' + gd : gd}</td>
                <td class="win">${t.pts}</td>
              </tr>`;
      });

      html += `
            </tbody>
          </table>

          <h2>📊 Detailed Match Stats (Recent Results)</h2>
          <table>
            <thead>
              <tr>
                <th>Date & Match</th>
                <th>Score</th>
                <th>Shots (Target)</th>
                <th>Corners</th>
                <th>Fouls</th>
                <th>Cards (Y/R)</th>
              </tr>
            </thead>
            <tbody>`;

      completedMatches.slice(-8).reverse().forEach(m => {
        html += `
              <tr>
                <td>
                  <b>${m.HomeTeam}</b> vs <b>${m.AwayTeam}</b><br>
                  <span style="font-size:12px; color:#cbd5e1;">${m.Date}</span>
                </td>
                <td><span class="badge">${m.FTHG} - ${m.FTAG}</span></td>
                <td>${m.HS || 0}:${m.AS || 0} (${m.HST || 0}:${m.AST || 0})</td>
                <td>${m.HC || 0} : ${m.AC || 0}</td>
                <td>${m.HF || 0} : ${m.AF || 0}</td>
                <td>🟨 ${m.HY || 0}:${m.AY || 0} | 🟥 ${m.HR || 0}:${m.AR || 0}</td>
              </tr>`;
      });

      html += `</tbody></table>`;
    }

    html += `</div></body></html>`;
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading stats dashboard.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
