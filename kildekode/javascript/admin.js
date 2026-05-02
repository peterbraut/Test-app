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
    const name        = document.getElementById('f-name').value.trim();
    const courtsCount = parseInt(document.getElementById('f-courts').value);
    const numGroups   = parseInt(document.getElementById('f-groups').value);
    const teams       = document.getElementById('f-teams').value
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

// ── Match card with score picker ─────────────────────────────────────────────

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

  // Score buttons 0–11
  const btns = Array.from({ length: 12 }, (_, i) =>
    `<button type="button" class="score-btn" data-score="${i}">${i}</button>`
  ).join('');

  const div = document.createElement('div');
  div.className = `admin-card status-${m.status}`;
  div.innerHTML = `
    <div class="card-meta">${tags[m.status]} · ${g} · Runde ${m.round}</div>
    <div class="card-teams">${t1} mot ${t2}</div>
    <div class="score-picker">
      <div class="picker-row">
        <span class="picker-name">${t1}</span>
        <div class="picker-btns" data-team="1">${btns}</div>
      </div>
      <div class="picker-row">
        <span class="picker-name">${t2}</span>
        <div class="picker-btns" data-team="2">${btns}</div>
      </div>
      <button class="btn-save" disabled>Lagre resultat</button>
    </div>`;

  let s1 = null, s2 = null;
  const saveBtn = div.querySelector('.btn-save');

  const updateSave = () => { saveBtn.disabled = s1 === null || s2 === null; };

  div.querySelector('[data-team="1"]').addEventListener('click', e => {
    const btn = e.target.closest('.score-btn');
    if (!btn) return;
    div.querySelectorAll('[data-team="1"] .score-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    s1 = parseInt(btn.dataset.score);
    updateSave();
  });

  div.querySelector('[data-team="2"]').addEventListener('click', e => {
    const btn = e.target.closest('.score-btn');
    if (!btn) return;
    div.querySelectorAll('[data-team="2"] .score-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    s2 = parseInt(btn.dataset.score);
    updateSave();
  });

  saveBtn.addEventListener('click', () => {
    if (s1 === null || s2 === null) return;
    if (s1 === s2) { alert('Resultatet kan ikke være uavgjort.'); return; }
    if (Math.max(s1, s2) < 11) { alert('Vinnerlaget må ha minst 11 poeng.'); return; }
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
