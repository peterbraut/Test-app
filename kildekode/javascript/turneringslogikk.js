// Shared tournament state and logic

const STORAGE_KEY = 'pickleball_tournament';

let _channel = null;
try { _channel = new BroadcastChannel('pickleball'); } catch (e) {}

function getState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  try { _channel?.postMessage('update'); } catch (e) {}
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  try { _channel?.postMessage('update'); } catch (e) {}
}

function onStateChange(cb) {
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) cb(); });
  try { _channel?.addEventListener('message', cb); } catch (e) {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Divide teams randomly into N groups
function divideTeams(teams, numGroups) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: uid(),
    name: 'Gruppe ' + String.fromCharCode(65 + i),
    teamIds: []
  }));
  shuffled.forEach((t, i) => groups[i % numGroups].teamIds.push(t.id));
  return groups;
}

// Generate round-robin schedule for a group
function roundRobin(teamIds, groupId) {
  const list = [...teamIds];
  if (list.length % 2 !== 0) list.push(null); // bye for odd count
  const n = list.length;
  const matches = [];

  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const t1 = list[i];
      const t2 = list[n - 1 - i];
      if (t1 && t2) {
        matches.push({
          id: uid(),
          round: r + 1,
          groupId,
          team1Id: t1,
          team2Id: t2,
          score1: null,
          score2: null,
          // scheduled | playing | on_deck | standby | completed
          status: 'scheduled',
          completedAt: null
        });
      }
    }
    // Rotate keeping index 0 fixed
    list.splice(1, 0, list.pop());
  }
  return matches;
}

// Fill target queue slot from allowed sources, avoiding team conflicts
function fillSlots(state, target, sources, blockedBy) {
  const courts = state.tournament.courtsCount;
  const inSlot = state.matches.filter(m => m.status === target);

  while (inSlot.length < courts) {
    const busy = new Set(
      state.matches
        .filter(m => blockedBy.includes(m.status))
        .flatMap(m => [m.team1Id, m.team2Id])
    );

    let pick = null;
    for (const src of sources) {
      pick = state.matches.find(
        m => m.status === src && !busy.has(m.team1Id) && !busy.has(m.team2Id)
      );
      if (pick) break;
    }

    if (!pick) break;
    pick.status = target;
    inSlot.push(pick);
  }
}

// Advance the three-row queue: playing → on_deck → standby → scheduled
function fillQueue(state) {
  fillSlots(state, 'playing', ['on_deck', 'standby', 'scheduled'], ['playing']);
  fillSlots(state, 'on_deck', ['standby', 'scheduled'], ['playing', 'on_deck']);
  fillSlots(state, 'standby', ['scheduled'], ['playing', 'on_deck', 'standby']);
}

function createTournament({ name, teams, numGroups, courtsCount }) {
  const teamObjs = teams.map(n => ({ id: uid(), name: n.trim() }));
  const groups = divideTeams(teamObjs, numGroups);

  const allMatches = [];
  groups.forEach(g => allMatches.push(...roundRobin(g.teamIds, g.id)));
  // Sort by round so queue fills round 1 first across all groups
  allMatches.sort((a, b) => a.round - b.round);

  const state = {
    tournament: { name, courtsCount, status: 'active' },
    teams: teamObjs,
    groups,
    matches: allMatches
  };

  fillQueue(state);
  saveState(state);
  return state;
}

function submitScore(matchId, score1, score2) {
  const state = getState();
  if (!state) return null;

  const match = state.matches.find(m => m.id === matchId);
  if (!match || match.status === 'completed') return null;

  match.score1 = score1;
  match.score2 = score2;
  match.status = 'completed';
  match.completedAt = Date.now();

  fillQueue(state);
  saveState(state);
  return state;
}

function teamName(state, id) {
  return state.teams.find(t => t.id === id)?.name ?? '?';
}

function groupName(state, id) {
  return state.groups.find(g => g.id === id)?.name ?? '';
}
