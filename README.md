# Pickleball Turnering

En nettapp for å kjøre pickleballturnering med gruppe-spill og live kampvisning.

## To skjermer

| Skjerm | Fil | Hvem bruker den |
|---|---|---|
| **Kampvisning** | `public/index.html` | Spillerne – vises på storskjerm/TV |
| **Admin** | `public/admin.html` | Turneringsansvarlig |

## Slik bruker du appen

### 1. Sett opp turneringen (admin)
1. Åpne `admin.html`
2. Fyll inn turneringsnavn, antall baner og antall grupper
3. Lim inn alle lagnavn (ett per linje)
4. Trykk **Start turnering** – appen lager gruppeinndelingen og kampoppsettet automatisk

### 2. Vis kampskjermen
- Åpne `index.html` på storskjermen / projektoren
- Skjermen oppdaterer seg automatisk hvert 2. sekund

### 3. Registrere resultater (admin)
- Når to lag er ferdige, gå til `admin.html`
- Finn kampen (markert **Spilles nå** i rødt)
- Fyll inn poengsum og trykk **Lagre**
- Kampen flyttes automatisk til «Ferdigspilte kamper» på kampvisningen

## Kampvisningens tre rader

```
┌─────────────────────────────────────────┐
│  ● Spilles nå  (rød)  – aktive kamper  │
├─────────────────────────────────────────┤
│  Neste kamp   (gul)   – klar til start │
├─────────────────────────────────────────┤
│  Venteraden   (grå)   – venter         │
├─────────────────────────────────────────┤
│  ── Ferdigspilte kamper ──              │
│  Vinner (grønn)  Score  Taper (rød)    │
└─────────────────────────────────────────┘
```

## Flyt-kontroll
Appen sørger for at ingen lag raser gjennom alle kampene sine:
- Et lag kan ikke stå i «Neste kamp» mens de allerede «Spilles nå»
- Køen fylles automatisk opp med lag som venter lengst

## Regler
- Spilles til 11 poeng
- Vinnerlaget må vinne med minst 2 poeng (ved 10–10 spilles til 12)

## Teknisk
- Ren HTML/CSS/JavaScript – ingen installasjon nødvendig
- Data lagres lokalt i nettleseren (`localStorage`)
- Begge faner i **samme nettleser** oppdateres i sanntid via `BroadcastChannel`
