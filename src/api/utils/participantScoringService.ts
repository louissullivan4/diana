import * as fs from 'fs';
import * as path from 'path';

interface TeamData {
    teamId: number;
    win: boolean;
    objectives: {
        atakhan: { kills: number };
        baron: { kills: number };
        champion: { kills: number };
        dragon: { kills: number };
        horde: { kills: number };
        inhibitor: { kills: number };
        riftHerald: { kills: number };
        tower: { kills: number };
    };
}

interface ParticipantData {
    teamId: number;
    win: boolean;
    individualPosition: string;
    kills: number;
    deaths: number;
    assists: number;
    goldEarned: number;
    timePlayed: number;
    visionScore: number;
    totalMinionsKilled: number;
    neutralMinionsKilled: number;
    totalDamageDealtToChampions: number;
    damageDealtToTurrets: number;
    dragonKills: number;
    baronKills: number;
    turretKills: number;
    gameEndedInSurrender: boolean;
    totalHealsOnTeammates: number;
    totalDamageShieldedOnTeammates: number;
    timeCCingOthers: number;
    challenges: {
        killParticipation?: number;
        kda?: number;
        goldPerMinute?: number;
        damagePerMinute?: number;
    };
}

interface ScoringConfig {
    kdaWeight?: number;
    csPerMinuteWeight?: number;
    damageDealtWeight?: number;
    turretDamageWeight?: number;
    visionScoreWeight?: number;
    jglObjectivesWeight?: number;
    objectiveParticipationWeight?: number;
    killParticipationWeight?: number;
    healingShieldingWeight?: number;
    crowdControlWeight?: number;
}

interface RoleStatMaxConfig {
    maxKDA?: number;
    maxCSPerMinute?: number;
    maxDamageDealt?: number;
    maxTurretDamage?: number;
    maxVisionScore?: number;
    maxJungleObjectives?: number;
    maxObjectiveParticipation?: number;
    maxHealingShielding?: number;
    maxKillParticipation?: number;
    maxCrowdControl?: number;
}

const roleScoringConfigs: Record<string, ScoringConfig> = {
    TOP: {
        kdaWeight: 25,
        csPerMinuteWeight: 20,
        damageDealtWeight: 15,
        turretDamageWeight: 10,
        visionScoreWeight: 10,
    },
    JUNGLE: {
        kdaWeight: 25,
        jglObjectivesWeight: 25,
        visionScoreWeight: 10,
        csPerMinuteWeight: 10,
        damageDealtWeight: 10,
    },
    MID: {
        kdaWeight: 25,
        damageDealtWeight: 20,
        csPerMinuteWeight: 15,
        turretDamageWeight: 10,
        visionScoreWeight: 10,
    },
    ADC: {
        kdaWeight: 25,
        damageDealtWeight: 30,
        csPerMinuteWeight: 20,
        visionScoreWeight: 5,
    },
    SUPPORT: {
        kdaWeight: 0,
        csPerMinuteWeight: 0,
        killParticipationWeight: 25,
        visionScoreWeight: 25,
        healingShieldingWeight: 10,
        crowdControlWeight: 10,
        damageDealtWeight: 10,
    },
};

const roleStatMaxConfigs: Record<string, RoleStatMaxConfig> = {
    TOP: {
        maxKDA: 5,
        maxCSPerMinute: 8,
        maxDamageDealt: 60000,
        maxTurretDamage: 8000,
        maxVisionScore: 40,
    },
    JUNGLE: {
        maxKDA: 5,
        maxCSPerMinute: 6,
        maxDamageDealt: 40000,
        maxVisionScore: 50,
        maxJungleObjectives: 13,
    },
    MID: {
        maxKDA: 5,
        maxCSPerMinute: 8,
        maxDamageDealt: 60000,
        maxTurretDamage: 6000,
        maxVisionScore: 40,
    },
    ADC: {
        maxKDA: 6,
        maxCSPerMinute: 9,
        maxDamageDealt: 70000,
        maxVisionScore: 20,
    },
    SUPPORT: {
        maxKDA: 0,
        maxCSPerMinute: 0,
        maxKillParticipation: 0.80,
        maxVisionScore: 80,
        maxHealingShielding: 10000,
        maxCrowdControl: 60,
    },
};

class RoleScoring {
    protected participant: ParticipantData;
    protected team: TeamData;
    protected config: ScoringConfig;
    protected maxValues: RoleStatMaxConfig;

    constructor(participant: ParticipantData, team: TeamData, config: ScoringConfig, maxValues: RoleStatMaxConfig) {
        this.participant = participant;
        this.team = team;
        this.config = config;
        this.maxValues = maxValues;
    }

    protected calculateKDA(): number {
        return this.participant.deaths === 0 ? this.participant.kills + this.participant.assists : (this.participant.kills + this.participant.assists) / this.participant.deaths;
    }

    protected calculateCSPerMinute(): number {
        const totalMinions = this.participant.totalMinionsKilled + this.participant.neutralMinionsKilled;
        return this.participant.timePlayed === 0 ? 0 : totalMinions / (this.participant.timePlayed / 60);
    }

    protected calculateNormalizedScore(value: number, maxValue: number | undefined, weight = 0): number {
        if (!weight || !maxValue) return 0;
        const normalized = Math.min(value / maxValue, 1);
        return normalized * weight;
    }

    protected calculateWinScore(): number {
        if (this.participant.win) {
            if (this.participant.timePlayed < 2040) return 20;
            if (this.participant.timePlayed <= 2160) return 15;
            if (this.participant.timePlayed <= 2340) return 10;
            return 5;
        }

        if (this.participant.gameEndedInSurrender) return 0;
        if (this.participant.timePlayed > 2340) return 10;
        if (this.participant.timePlayed > 2160) return 5;
        return 0;
    }

    public calculateScore(): number {
        const kda = this.calculateKDA();
        const csPerMinute = this.calculateCSPerMinute();
        const winScore = this.calculateWinScore();

        return winScore
            + this.calculateNormalizedScore(kda, this.maxValues.maxKDA, this.config.kdaWeight)
            + this.calculateNormalizedScore(csPerMinute, this.maxValues.maxCSPerMinute, this.config.csPerMinuteWeight);
    }
}

class TopScoring extends RoleScoring {
    public calculateScore(): number {
        const baseScore = super.calculateScore();
        return baseScore
            + this.calculateNormalizedScore(this.participant.damageDealtToTurrets, this.maxValues.maxTurretDamage, this.config.turretDamageWeight)
            + this.calculateNormalizedScore(this.participant.totalDamageDealtToChampions, this.maxValues.maxDamageDealt, this.config.damageDealtWeight)
            + this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight);
    }
}

class JungleScoring extends RoleScoring {
    public calculateScore(): number {
        const baseScore = super.calculateScore();
        const totalJglObjectives = this.team.objectives.atakhan.kills +
            this.team.objectives.baron.kills +
            this.team.objectives.dragon.kills +
            this.team.objectives.horde.kills +
            this.team.objectives.riftHerald.kills;

        return baseScore
            + this.calculateNormalizedScore(totalJglObjectives, this.maxValues.maxJungleObjectives, this.config.jglObjectivesWeight)
            + this.calculateNormalizedScore(this.participant.totalDamageDealtToChampions, this.maxValues.maxDamageDealt, this.config.damageDealtWeight)
            + this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight);
    }
}

class MidScoring extends RoleScoring {
    public calculateScore(): number {
        const baseScore = super.calculateScore();
        return baseScore
            + this.calculateNormalizedScore(this.participant.damageDealtToTurrets, this.maxValues.maxTurretDamage, this.config.turretDamageWeight)
            + this.calculateNormalizedScore(this.participant.totalDamageDealtToChampions, this.maxValues.maxDamageDealt, this.config.damageDealtWeight)
            + this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight);
    }
}

class AdcScoring extends RoleScoring {
    public calculateScore(): number {
        const baseScore = super.calculateScore();
        const objectiveScore = this.calculateNormalizedScore(
            this.participant.turretKills + this.participant.dragonKills + this.participant.baronKills,
            this.maxValues.maxObjectiveParticipation,
            this.config.objectiveParticipationWeight
        );
        console.log(`Normalised Score Summary`);
        console.log(`Damage Dealt: ${this.calculateNormalizedScore(this.participant.totalDamageDealtToChampions, this.maxValues.maxDamageDealt, this.config.damageDealtWeight)}`);
        console.log(`Turret Damage: ${this.calculateNormalizedScore(this.participant.damageDealtToTurrets, this.maxValues.maxTurretDamage, this.config.turretDamageWeight)}`);
        console.log(`KDA: ${this.calculateNormalizedScore(this.calculateKDA(), this.maxValues.maxKDA, this.config.kdaWeight)}`);
        console.log(`CS Per Minute: ${this.calculateNormalizedScore(this.calculateCSPerMinute(), this.maxValues.maxCSPerMinute, this.config.csPerMinuteWeight)}`);

        return baseScore
            + objectiveScore
            + this.calculateNormalizedScore(this.participant.totalDamageDealtToChampions, this.maxValues.maxDamageDealt, this.config.damageDealtWeight)
            + this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight);
    }
}

class SupportScoring extends RoleScoring {
    public calculateScore(): number {
        const baseScore = super.calculateScore();
        console.log(`Normalised Score Summary`);
        console.log(`Kill Participation: ${this.calculateNormalizedScore(this.participant.challenges?.killParticipation || 0, this.maxValues.maxKillParticipation, this.config.killParticipationWeight)}`);
        console.log(`Vision Score: ${this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight)}`);
        console.log(`Objective Participation: ${this.calculateNormalizedScore(this.participant.turretKills + this.participant.dragonKills + this.participant.baronKills, this.maxValues.maxObjectiveParticipation, this.config.objectiveParticipationWeight)}`);
        console.log(`Healing and Shielding: ${this.calculateNormalizedScore(this.participant.totalHealsOnTeammates + this.participant.totalDamageShieldedOnTeammates, this.maxValues.maxHealingShielding, this.config.healingShieldingWeight)}`);
        console.log(`Crowd Control: ${this.calculateNormalizedScore(this.participant.timeCCingOthers, this.maxValues.maxCrowdControl, this.config.crowdControlWeight)}`);
        
        return baseScore
            + this.calculateNormalizedScore(this.participant.challenges?.killParticipation || 0, this.maxValues.maxKillParticipation, this.config.killParticipationWeight)
            + this.calculateNormalizedScore(this.participant.visionScore, this.maxValues.maxVisionScore, this.config.visionScoreWeight)
            + this.calculateNormalizedScore(this.participant.turretKills + this.participant.dragonKills + this.participant.baronKills, this.maxValues.maxObjectiveParticipation, this.config.objectiveParticipationWeight)
            + this.calculateNormalizedScore(this.participant.totalHealsOnTeammates + this.participant.totalDamageShieldedOnTeammates, this.maxValues.maxHealingShielding, this.config.healingShieldingWeight)
            + this.calculateNormalizedScore(this.participant.timeCCingOthers, this.maxValues.maxCrowdControl, this.config.crowdControlWeight);
    }
}

const getRoleScorer = (participant: ParticipantData, team: TeamData): RoleScoring => {
    const role = participant.individualPosition.toUpperCase();
    const config = roleScoringConfigs[role] || roleScoringConfigs.TOP;
    const maxValues = roleStatMaxConfigs[role] || roleStatMaxConfigs.TOP;

    switch (role) {
        case 'TOP':
            return new TopScoring(participant, team, config, maxValues);
        case 'JUNGLE':
            return new JungleScoring(participant, team, config, maxValues);
        case 'MIDDLE':
            return new MidScoring(participant, team, config, maxValues);
        case 'BOTTOM':
            return new AdcScoring(participant, team, config, maxValues);
        case 'UTILITY':
            return new SupportScoring(participant, team, config, maxValues);
        default:
            return new RoleScoring(participant, team, config, maxValues);
    }
};

const filePath = path.join('db/data/one_match.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const matchDetail = JSON.parse(rawData);
for (const participant of matchDetail.participants) {
    const participantData: ParticipantData = participant;
    const teamData: TeamData = matchDetail.teams.find((team: TeamData) => team.teamId === participantData.teamId);
    const scorer = getRoleScorer(participantData, teamData);
    const finalScore = scorer.calculateScore().toFixed(2);
    console.log(`${participant.championName} ${participant.individualPosition} Final Score: ${finalScore}`);
    console.log(`-------------------------`);
}
