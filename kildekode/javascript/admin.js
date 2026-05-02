// Admin interface logic

function renderAdmin() {
  const state = getState();
  const app = document.getElementById('admin-app');
  app.innerHTML = '';
  state ? renderActive(app, state) : renderSetup(app);
}

// ── Setup phase ──────────────────────────────────────────────────────────────

function renderSetup(container) {
  container.innerHTML = `
    <div class="setup-form">
      <h2>Sett opp ny turnering</h2>
      <form id="setup-form">
        <div class="field">
          <label>Turneringsnavn</label>
          <input id="f-name" type="text" placeholder="Pickleball Cup 2026" required />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Antall baner (samtidige kamper)</label>
            <input id="f-courts" type="number" value="5" min="1" max="20" required />
          </div>
          <div class="field">
            <label>Antall grupper</label>
            <input id="f-groups" type="number" value="3" min="1" max="10" required />
          </div>
        </div>
        <div class="field">
          <label>Lagnavn – ett lag per linje</label>
          <textarea id="f-teams" rows="12"
            placeholder="Lag Alpha&#10;Lag Beta&#10;Lag Gamma&#10;Lag Delta&#10;..." required></textarea>
        </div>
        <button type="submit" class="btn-primary">Start turnering</button>
      </form>
    </div>`;

  document.getElementById('setup-form').addEventListener('submit', e => {
    e.preventDefault();
    const name       = document.getElementById('f-name').value.trim();
    const courtsCount = parseInt(document.getElementById('f-courts').value);
    const numGroups  = parseInt(document.getElementById('f-groups').value);
    const teams      = document.getElementById('f-teams').value
      .split('\n').map(t => t.trim()).filter(Boolean);

    if (teams.length < 2) { alert('Du må ha minst 2 lag.'); return; }
    if (teams.length < numGroups * 2) {
      alert(`Med ${numGroups} grupper trenger du minst ${numGroups * 2} lag.`);
      return;
    }

    createTournament({ name, teams, numGroups, courtsCount });
    renderAdmin();
  });
}

// ── Active tournament phase ───────────────────────────────────────────────────

function renderActive(container, state) {
  const statusOrder = { playing: 0, on_deck: 1, standby: 2, scheduled: 3 };
  const pending = state.matches
    .filter(m => m.status !== 'completed')
    .sort((a, b) => (statusOrder[a.status] - statusOrder[b.status]) || (a.round - b.round));

  const done = state.matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => b.completedAt - a.completedAt);

  container.innerHTML = `
    <div class="admin-top">
      <h2>${state.tournament.name}</h2>
      <button id="btn-reset" class="btn-danger">Nullstill turnering</button>
    </div>
    <div class="admin-cols">
      <div>
        <h3>Registrer resultat <span class="count">(${pending.length} gjenstår)</span></h3>
        <div id="pending-list"></div>
      </div>
      <div>
        <h3>Ferdigspilte <span class="count">(${done.length})</span></h3>
        <div id="done-list"></div>
      </div>
    </div>`;

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Nullstill hele turneringen? Dette kan ikke angres.')) {
      clearState();
      renderAdmin();
    }
  });

  const pendingList = document.getElementById('pending-list');
  pending.forEach(m => pendingList.appendChild(adminMatchCard(state, m)));

  const doneList = document.getElementById('done-list');
  if (done.length === 0) {
    doneList.innerHTML = '<p class="muted">Ingen ferdigspilte ennå.</p>';
  } else {
    done.forEach(m => doneList.appendChild(adminDoneCard(state, m)));
  }
}

function adminMatchCard(state, m) {
  const t1 = teamName(state, m.team1Id);
  const t2 = teamName(state, m.team2Id);
  const g  = groupName(state, m.groupId);

  const tags = {
    playing:   '<span class="tag-playing">● Spilles nå</span>',
    on_deck:   '<span class="tag-next">Neste kamp</span>',
    standby:   '<span class="tag-standby">Venteraden</span>',
    scheduled: '<span class="tag-sched">Planlagt</span>'
  };

  const div = document.createElement('div');
  div.className = `admin-card status-${m.status}`;
  div.innerHTML = `
    <div class="card-meta">${tags[m.status]} · ${g} · Runde ${m.round}</div>
    <div class="card-teams"><strong>${t1}</strong> mot <strong>${t2}</strong></div>
    <form class="score-form">
      <label class="score-label">${t1}</label>
      <input type="number" name="s1" min="0" max="25" class="score-inp" placeholder="0" />
      <span class="score-dash">–</span>
      <input type="number" name="s2" min="0" max="25" class="score-inp" placeholder="0" />
      <label class="score-label">${t2}</label>
      <button type="submit" class="btn-save">Lagre</button>
    </form>`;

  div.querySelector('.score-form').addEventListener('submit', e => {
    e.preventDefault();
    const s1 = parseInt(e.target.s1.value);
    const s2 = parseInt(e.target.s2.value);

    if (isNaN(s1) || isNaN(s2))       { alert('Fyll inn poeng for begge lag.'); return; }
    if (s1 === s2)                     { alert('Resultatet kan ikke være uavgjort.'); return; }
    const winner = Math.max(s1, s2);
    const loser  = Math.min(s1, s2);
    if (winner < 11)                   { alert('Vinnerlaget må ha minst 11 poeng.'); return; }
    if (winner > 11 && winner - loser < 2) {
      alert('Vinnerlaget må vinne med minst 2 poeng (f.eks. 12–10).'); return;
    }

    submitScore(m.id, s1, s2);
    renderAdmin();
  });

  return div;
}

function adminDoneCard(state, m) {
  const t1 = teamName(state, m.team1Id);
  const t2 = teamName(state, m.team2Id);
  const g  = groupName(state, m.groupId);
  const w1 = m.score1 > m.score2;

  const div = document.createElement('div');
  div.className = 'admin-card done';
  div.innerHTML = `
    <div class="card-meta">${g} · Runde ${m.round}</div>
    <div class="done-result">
      <span class="${w1 ? 'winner' : 'loser'}">${t1}</span>
      <span class="score-num">${m.score1} – ${m.score2}</span>
      <span class="${w1 ? 'loser' : 'winner'}">${t2}</span>
    </div>`;
  return div;
}

document.addEventListener('DOMContentLoaded', renderAdmin);
