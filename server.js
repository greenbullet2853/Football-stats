import express from 'express';
import Papa from 'papaparse';

const app = express();
const PORT = process.env.PORT || 3000;

// Football-Data.co.uk 2026/2027 Season Data
const EPL_RESULTS_URL = 'https://www.football-data.co.uk/mmz4281/2627/E0.csv';

async function getFootballData() {
  const response = await fetch(EPL_RESULTS_URL);
  const csvText = await response.text();
  
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });
  
  return parsed.data;
}

function calculateStandingsAndGoalStats(matches) {
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

  const standings = Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  const topScoring = [...standings].sort((a, b) => b.gf - a.gf).slice(0, 5);

  return { standings, topScoring };
}

app.get('/', async (req, res) => {
  try {
    const rawMatches = await getFootballData();
    
    // Split into played matches vs upcoming scheduled fixtures
    const completedMatches = rawMatches.filter(m => m.FTHG !== "" && m.FTHG !== undefined);
    const upcomingMatches = rawMatches.filter(m => m.FTHG === "" || m.FTHG === undefined).slice(0, 5);
    
    const { standings, topScoring } = calculateStandingsAndGoalStats(completedMatches);

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Premier League Stats Hub</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { text-align: center; color: #38bdf8; margin-bottom: 5px; }
        .sub { text-align: center; color: #94a3b8; margin-bottom: 30px; }
        h2 { margin-top: 30px; border-bottom: 2px solid #334155; padding-bottom: 8px; color: #38bdf8; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 25px; font-size: 14px; }
        th, td { padding: 10px 12px; text-align: left; }
        th { background: #334155; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
        tr:nth-child(even) { background: #1b263b; }
        tr:hover { background: #334155; }
        .win { color: #4ade80; font-weight: bold; }
        .badge { background: #0284c7; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        .news-card { background: #1e293b; border-left: 4px solid #38bdf8; padding: 12px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
        .news-title { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
        .news-meta { color: #94a3b8; font-size: 12px; }
        .stat-line { font-size: 12px; color: #cbd5e1; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚽ Football Stats & News Dashboard</h1>
        <p class="sub">Live 2026/2027 Premier League Analytics</p>

        <div class="grid">
          <!-- Next Up Games -->
          <div>
            <h2>📅 Next Up Games</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fixture</th>
                  <th>Odds (H/D/A)</th>
                </tr>
              </thead>
              <tbody>`;

    if (upcomingMatches.length === 0) {
      html += `<tr><td colspan="3">No upcoming fixtures scheduled in current batch.</td></tr>`;
    } else {
      upcomingMatches.forEach(m => {
        html += `
          <tr>
            <td>${m.Date || 'TBD'}</td>
            <td><b>${m.HomeTeam}</b> vs <b>${m.AwayTeam}</b></td>
            <td>${m.B365H || '-'}/${m.B365D || '-'}/${m.B365A || '-'}</td>
          </tr>`;
      });
    }

    html += `
              </tbody>
            </table>
          </div>

          <!-- Top Attack Teams -->
          <div>
            <h2>🎯 Top Scoring Teams</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Matches</th>
                  <th>Goals Scored</th>
                </tr>
              </thead>
              <tbody>`;

    topScoring.forEach((t, i) => {
      html += `
        <tr>
          <td><b>#${i + 1}</b></td>
          <td>${t.team}</td>
          <td>${t.mp}</td>
          <td class="win">${t.gf} goals</td>
        </tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Transfer News Feed -->
        <h2>📰 Latest Transfer News & Rumors</h2>
        <div class="news-card">
          <div class="news-title">Summer Transfer Window Planning Underway</div>
          <div class="news-meta">Premier League clubs finalizing target shortlists for upcoming scouting reports.</div>
        </div>
        <div class="news-card">
          <div class="news-title">Midfield Target Monitoring</div>
          <div class="news-meta">Top 4 contenders scouting South American talent ahead of the next window.</div>
        </div>

        <!-- League Standings Table with Goals Scored & Conceded -->
        <h2>🏆 League Standings</h2>
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

        <!-- Detailed Game Stats -->
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
                <span class="stat-line">${m.Date}</span>
              </td>
              <td><span class="badge">${m.FTHG} - ${m.FTAG}</span></td>
              <td>${m.HS || 0}:${m.AS || 0} (${m.HST || 0}:${m.AST || 0})</td>
              <td>${m.HC || 0} : ${m.AC || 0}</td>
              <td>${m.HF || 0} : ${m.AF || 0}</td>
              <td>🟨 ${m.HY || 0}:${m.AY || 0} | 🟥 ${m.HR || 0}:${m.AR || 0}</td>
            </tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    </body>
    </html>`;

    res.send(html);
  } catch (error) {
    res.status(500).send('Error generating dashboard.');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
