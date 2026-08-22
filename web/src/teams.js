// Team 0 is neutral — it is what an unclaimed building paints as.
export const NEUTRAL = "#3a3f4b";

export const TEAMS = [
  { id: 1, name: "Crveni",  color: "#ff3b30" },
  { id: 2, name: "Plavi",   color: "#0a84ff" },
  { id: 3, name: "Zeleni",  color: "#30d158" },
  { id: 4, name: "Zuti",    color: "#ffd60a" },
];

export const TEAM_COUNT = TEAMS.length;
export const colorOf = (team) => TEAMS.find((t) => t.id === team)?.color ?? NEUTRAL;
