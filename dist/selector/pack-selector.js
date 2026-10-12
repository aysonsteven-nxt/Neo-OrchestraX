const signalMap = {
    android: ["android"],
    kotlin: ["kotlin"],
    compose: ["jetpack-compose"],
    room: ["android"],
    hilt: ["android"],
    java: ["java"],
    "spring-boot": ["java", "api-development"],
    angular: ["frontend", "angular"],
    typescript: ["typescript", "frontend"],
    "layered-structure": ["architecture", "system-architecture"]
};
function evidenceFor(capability, signal) {
    return (signalMap[signal.key] ?? []).includes(capability);
}
export function selectPacks(profile, packs) {
    const recommendations = packs.map(pack => {
        const matched = new Set();
        const evidence = [];
        for (const signal of profile.signals) {
            for (const capability of pack.capabilities) {
                if (evidenceFor(capability, signal)) {
                    matched.add(capability);
                    evidence.push(`${signal.value}: ${signal.evidence}`);
                }
            }
        }
        // Strong explicit language/platform matches receive higher relevance.
        let score = pack.capabilities.length === 0 ? 0 :
            Math.min(100, Math.round((matched.size / pack.capabilities.length) * 100));
        // Pack-specific capability aliases make recommendations useful with
        // the initial built-in pack definitions.
        if (pack.name === "android-kotlin-dev") {
            const keys = new Set(profile.signals.map(s => s.key));
            if (keys.has("android"))
                score = Math.max(score, 70);
            if (keys.has("kotlin"))
                score = Math.max(score, 85);
            if (keys.has("compose"))
                score = Math.max(score, 95);
            if (keys.has("room") || keys.has("hilt"))
                score = Math.max(score, 100);
        }
        if (pack.name === "java-dev") {
            if (profile.signals.some(s => s.key === "java"))
                score = Math.max(score, 85);
            if (profile.signals.some(s => s.key === "spring-boot"))
                score = Math.max(score, 100);
        }
        if (pack.name === "solutions-architect") {
            if (profile.signals.some(s => s.key === "layered-structure"))
                score = Math.max(score, 80);
            if (profile.signals.length >= 4)
                score = Math.max(score, 75);
        }
        if (pack.name === "project-manager") {
            if (profile.signals.length >= 2)
                score = Math.max(score, 70);
        }
        return {
            pack,
            score,
            matchedCapabilities: [...matched],
            evidence: [...new Set(evidence)]
        };
    });
    recommendations.sort((a, b) => b.score - a.score || a.pack.name.localeCompare(b.pack.name));
    return { profile, recommendations };
}
