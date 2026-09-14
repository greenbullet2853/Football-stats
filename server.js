import express from 'express';
import Papa from 'papaparse';

const app = express();
const PORT = process.env.PORT || 3000;

// URL for Current Season Premier League CSV from Football-Data.co.uk
const EPL_CSV_URL = 'https://www.football-data.co.uk/mmz4281/2425/E0.csv';

// Fetch & Parse CSV Function
async function getFootballData() {
  const response = await fetch(EPL_CSV_URL);
  const csvText = await response.text();
  
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });
  
  return parsed.data;
}

// Generate Premier League Standings from Match Results
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

// API Endpoint for raw JSON data
app.get('/api/matches', async (req, res) => {
  try {
    const data = await getFootballData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match data' });
  }
});

// Main Web Page Served Directly at your Render URL (http://your-app.onrender.com)
app.get('/', async (req, res) => {
  try {
    const matches = await getFootballData();
    const standings = calculateStandings(matches);

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Premier League Live Dashboard</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { text-align: center; color: #38bdf8; }
        h2 { margin-top: 40px; border-bottom: 2px solid #334155; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
        th, td { padding: 12px 15px; text-align: left; }
        th { background: #334155; color: #94a3b8; font-size: 14px; text-transform: uppercase; }
        tr:nth-child(even) { background: #1b263b; }
        tr:hover { background: #334155; }
        .win { color: #4ade80; font-weight: bold; }
        .badge { background: #0284c7; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚽ Football Stats Dashboard</h1>
        <p style="text-align:center; color: #94a3b8;">Data sourced live from Football-Data.co.uk CSV files</p>
        
        <h2>Premier League Standings</h2>
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Team</th>
              <th>MP</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
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
              <td>${gd > 0 ? '+' + gd : gd}</td>
              <td class="win">${t.pts}</td>
            </tr>`;
    });

    html += `
          </tbody>
        </table>

        <h2>Recent Matches & Odds (Bet365)</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Match</th>
              <th>Result</th>
              <th>Home Odds</th>
              <th>Draw Odds</th>
              <th>Away Odds</th>
            </tr>
          </thead>
          <tbody>`;

    // Show last 10 matches
    matches.slice(-10).reverse().forEach(m => {
      html += `
            <tr>
              <td>${m.Date}</td>
              <td><b>${m.HomeTeam}</b> vs <b>${m.AwayTeam}</b></td>
              <td><span class="badge">${m.FTHG} - ${m.FTAG}</span></td>
              <td>${m.B365H || 'N/A'}</td>
              <td>${m.B365D || 'N/A'}</td>
              <td>${m.B365A || 'N/A'}</td>
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
    res.status(500).send('Error rendering football stats dashboard.');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});