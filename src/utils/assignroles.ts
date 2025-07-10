export type TeamId = 100 | 200

export type Role = "top" | "jungle" | "mid" | "bot" | "support"

export type Participant = {
    teamId: number
    summonerName: string
    championId: number
    spell1Id: number
    spell2Id: number
    perks: any
}

const SUPPORT_CHAMPS = new Set([
    99, 43, 89, 497, 432, 267, 16, 37, 526, 201, 412, 555, 111, 117, 25, 40,
])

const ADC_CHAMPS = new Set([
    202, 18, 81, 51, 222, 15, 145, 110, 23,  6, 119, 29, 67, 21, 498, 360,
])

const TOP_CHAMPS = new Set([
    24, 39, 36, 122, 266, 82, 2, 41, 86, 58, 164, 54, 106, 897, 75, 150, 420, 98, 516, 92
])

export function assignRoles(participants: Participant[]) {
    const teams: Record<TeamId, Partial<Record<Role, Participant>>> = {
        100: {},
        200: {},
    }

    for (const teamId of [100, 200] as TeamId[]) {
        const team = participants.filter(p => p.teamId === teamId)

        const jungle = team.find(p => p.spell1Id === 11 || p.spell2Id === 11)
        if (jungle) teams[teamId].jungle = jungle

        let remaining = team.filter(p => p !== jungle)

        const support = remaining.find(p => SUPPORT_CHAMPS.has(p.championId))
        if (support) teams[teamId].support = support
        remaining = remaining.filter(p => p !== support)

        const adc = remaining.find(p =>
            ADC_CHAMPS.has(p.championId) &&
            ([7, 21].includes(p.spell1Id) || [7, 21].includes(p.spell2Id))
        )
        if (adc) teams[teamId].bot = adc
        remaining = remaining.filter(p => p !== adc)

        const top = remaining.find(p =>
            TOP_CHAMPS.has(p.championId) ||
            p.spell1Id === 14 || p.spell2Id === 14
        )
        if (top) teams[teamId].top = top
        remaining = remaining.filter(p => p !== top)

        const mid = remaining.find(p => p !== jungle && p !== adc && p !== support && p !== top)
        if (mid) teams[teamId].mid = mid

        if (!teams[teamId].mid) {
            const fallbackMid = team.find(p => !Object.values(teams[teamId]).includes(p))
            if (fallbackMid) teams[teamId].mid = fallbackMid
        }

        if (!teams[teamId].top) {
            const fallbackTop = team.find(p => !Object.values(teams[teamId]).includes(p))
            if (fallbackTop) teams[teamId].top = fallbackTop
        }
    }

    return teams
}