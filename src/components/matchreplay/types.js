// src/components/matchreplay/types.ts
//
// Match-V5 Timeline DTOs — narrow but practical. We type only the
// fields we actually read in the UI. Anything obscure / situational
// stays loose so the parser doesn't ossify around Riot's quirks.
//
// Reference layout:
//   MatchTimelineDto
//     ├── metadata
//     │     ├── matchId
//     │     └── participants: string[]   // puuid[], indexed 0..9 → participantId 1..10
//     └── info
//           ├── frameInterval: number    // ms (usually 60_000)
//           ├── frames: FrameDto[]
//           └── participants: { participantId, puuid }[]
export {};
