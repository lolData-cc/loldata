// import { Participant } from "@/assets/types/riot"
// import { Anchor, Scale, TrendingUp, Sword } from "lucide-react"

// export type Badge = {
//   id: string
//   label: string
//   icon: JSX.Element
// }

// export function getPlayerBadges(participant: Participant, team: Participant[]): Badge[] {
//   const badges: Badge[] = []

//   const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled
//   const gameMinutes = participant.timePlayed ? participant.timePlayed / 60 : 30
//   const csPerMin = cs / gameMinutes
//   const teamKills = team.reduce((acc, p) => acc + p.kills, 0)
//   const kp = teamKills > 0 ? (participant.kills + participant.assists) / teamKills : 0

//   // Badge: Macro Master
//   if (csPerMin > 7 && kp >= 0.7) {
//     badges.push({
//       id: "macro",
//       label: "Macro Master",
//       icon: <Scale className="w-3 h-3 text-jade" />,
//     })
//   }

//   // Badge: CS King
//   if (csPerMin >= 9) {
//     badges.push({
//       id: "csking",
//       label: "CS King",
//       icon: <TrendingUp className="w-3 h-3 text-jade" />,
//     })
//   }

//   // Badge: Consistent
//   const avgTeamCs =
//     team.reduce((acc, p) => acc + p.totalMinionsKilled + p.neutralMinionsKilled, 0) /
//     team.length
//   const avgTeamGold = team.reduce((acc, p) => acc + p.goldEarned, 0) / team.length
//   const avgTeamKda =
//     team.reduce((acc, p) => acc + (p.kills + p.assists) / Math.max(1, p.deaths), 0) / team.length
//   const playerKda = (participant.kills + participant.assists) / Math.max(1, participant.deaths)

//   const aboveAverage =
//     cs > avgTeamCs && participant.goldEarned > avgTeamGold && playerKda > avgTeamKda
//   if (aboveAverage) {
//     badges.push({
//       id: "consistent",
//       label: "Consistent",
//       icon: <Anchor className="w-3 h-3 text-jade" />,
//     })
//   }

//   // Badge: Solo Carry
//   if (participant.soloKills && participant.soloKills >= 3) {
//     badges.push({
//       id: "solocarry",
//       label: "Solo Carry",
//       icon: <Sword className="w-3 h-3 text-jade" />,
//     })
//   }

//   return badges
// }
