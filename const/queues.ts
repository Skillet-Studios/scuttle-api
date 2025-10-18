export const QUEUE_IDS_TO_CACHE = [420, 1700];

export const QUEUE_ID_NAMES: Record<number, string> = {
    420: "Ranked Solo",
    1700: "Arena",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    700: "Clash",
    900: "ARURF",
    1020: "One For All",
    1200: "Nexus Blitz",
    1400: "Ultimate Spellbook",
};

export function getQueueName(queueId: number): string {
    return QUEUE_ID_NAMES[queueId] || `Queue ${queueId}`;
}
