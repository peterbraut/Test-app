// Public display logic

let _lastHash = null;

function render() {
  const state = getState();
  const hash = JSON.stringify(state);
  if (hash === _lastHash) return;
  _lastHash = hash;

  const noTournament = document.getElementById('no-tournament');
  const view = document.getElementById('tournament-view');

  if (!state) {
    noTournament.style.display = '';
    view.style.display = 'none';
    return;
  }

  noTournament.style.display = 'none';
  view.style.display = '';
  document.getElementById('tournament-name').textContent = state.tournament.name;

  const byStatus = s => state.matches.filter(m => m.status === s);
  const courts = state.tournament.courtsCount;

  renderGrid('playing-grid', state, byStatus('playing'), 'playing');
  renderGrid('next-grid', state, nextDisplay(state, courts), 'next');
  renderGrid('standby-grid', state, standbyDisplay(state, courts), 'standby');

  const completed = byStatus('completed').sort((a, b) => b.completedAt - a.completedAt);
  renderCompleted(state, completed);
}

function renderGrid(id, state, matches, type) {
  const el = document.getElementById(id);
  if (matches.length === 0) {
    el.innerHTML = '<div class="empty-row">—</div>';
    return;
  }
  el.innerHTML = matches.map(m => matchCardHTML(state, m, type)).join('');
}

function matchCardHTML(state, m, type) {
  const t1 = teamName(state, m.team1Id);
  const t2 = teamName(state, m.team2Id);
  const g = groupName(state, m.groupId);
  return `
    <div class="match-card ${type}">
      <div class="match-meta">${g} · Runde ${m.round}</div>
      <div class="match-teams">
        <span class="team">${t1}</span>
        <span class="vs">VS</span>
        <span class="team">${t2}</span>
      </div>
    </div>`;
}

function renderCompleted(state, matches) {
  const el = document.getElementById('completed-grid');
  if (matches.length === 0) {
    el.innerHTML = '<div class="empty-row">Ingen ferdigspilte kamper ennå</div>';
    return;
  }
  el.innerHTML = matches.map(m => completedCardHTML(state, m)).join('');
}

function completedCardHTML(state, m) {
  const t1 = teamName(state, m.team1Id);
  const t2 = teamName(state, m.team2Id);
  const g = groupName(state, m.groupId);
  const w1 = m.score1 > m.score2;
  return `
    <div class="match-card completed">
      <div class="match-meta">${g} · Runde ${m.round}</div>
      <div class="match-teams">
        <span class="team ${w1 ? 'winner' : 'loser'}">${t1}</span>
        <span class="vs score-num">${m.score1}–${m.score2}</span>
        <span class="team ${w1 ? 'loser' : 'winner'}">${t2}</span>
      </div>
    </div>`;
}

// Always show upcoming matches even when those teams are still playing
function nextDisplay(state, courts) {
  const onDeck = state.matches.filter(m => m.status === 'on_deck');
  if (onDeck.length >= courts) return onDeck;
  const scheduled = state.matches.filter(m => m.status === 'scheduled');
  return [...onDeck, ...scheduled].slice(0, courts);
}

function standbyDisplay(state, courts) {
  const standby = state.matches.filter(m => m.status === 'standby');
  if (standby.length >= courts) return standby;
  const nextIds = new Set(nextDisplay(state, courts).map(m => m.id));
  const scheduled = state.matches.filter(m => m.status === 'scheduled' && !nextIds.has(m.id));
  return [...standby, ...scheduled].slice(0, courts);
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  setInterval(render, 2000);
  onStateChange(render);
});
