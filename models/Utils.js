function calculateStats(summonerPuuid, matchesData) {
    const data = {
        "🎮 Total Matches": 0,
        "🔪 Avg. Kills": 0,
        "💀 Avg. Deaths": 0,
        "🗡 Avg. KDA": 0,
        "🔪 Avg. Solo Kills": 0,
        "👁 Avg. Vision Score": 0,
        "🤝 Avg. Team Damage Percentage": 0,
        "🤝 Avg. Assists": 0,
        "🤝 Avg. Kill Participation": 0,
        "👑 Avg. Gold Per Minute": 0,
        "💥 Avg. Damage Per Minute": 0,
        "💥 Avg. Damage To Champions": 0,
        "🙃 Avg. Assist Me Pings": 0,
        "🤔 Avg. Enemy Missing Pings": 0,
        "👀 Avg. Control Wards Placed": 0,
        "🖖 Ability Uses": 0,
        "🏳 Games Surrendered": 0,
        "🐸 Scuttle Crab Kills": 0,
    };

    if (matchesData && matchesData.length) {
        data["🎮 Total Matches"] = matchesData.length;
        matchesData.forEach((match) => {
            const participants = match.info.participants;
            const stats =
                participants.find((obj) => obj.puuid === summonerPuuid) || {};
            const challenges = stats.challenges || {};

            if (stats.gameEndedInSurrender) {
                data["🏳 Games Surrendered"] += 1;
            }

            data["🔪 Avg. Kills"] += stats.kills || 0;
            data["💀 Avg. Deaths"] += stats.deaths || 0;
            data["👁 Avg. Vision Score"] += stats.visionScore || 0;
            data["👀 Avg. Control Wards Placed"] +=
                challenges.controlWardsPlaced || 0;
            data["🙃 Avg. Assist Me Pings"] += stats.assistMePings || 0;
            data["🐸 Scuttle Crab Kills"] += challenges.scuttleCrabKills || 0;
            data["💥 Avg. Damage To Champions"] +=
                stats.totalDamageDealtToChampions || 0;
            data["🤝 Avg. Assists"] += stats.assists || 0;
            data["🖖 Ability Uses"] += challenges.abilityUses || 0;
            data["🔪 Avg. Solo Kills"] += challenges.soloKills || 0;
            data["🤔 Avg. Enemy Missing Pings"] += stats.enemyMissingPings || 0;
            data["💥 Avg. Damage Per Minute"] +=
                challenges.damagePerMinute || 0;
            data["👑 Avg. Gold Per Minute"] += challenges.goldPerMinute || 0;
            data["🗡 Avg. KDA"] += challenges.kda || 0;
            data["🤝 Avg. Kill Participation"] +=
                challenges.killParticipation || 0;
            data["🤝 Avg. Team Damage Percentage"] +=
                challenges.teamDamagePercentage || 0;
        });

        // Calculate averages
        for (let key in data) {
            if (key.includes("Avg.")) {
                data[key] = data[key] / data["🎮 Total Matches"];
            }
        }

        // Round values to 2 decimal places for averages
        for (let key in data) {
            data[key] = Math.round(data[key] * 100) / 100;
        }
    } else {
        console.log(
            `Error calculating stats for summoner with puuid ${summonerPuuid}. No matches data provided.`
        );
    }

    return data;
}

module.exports = { calculateStats };
