// Only display strings are supplied. No Documents or Rule Elements are updated.
export function translatePrerequisites({value, translation}) {
    if (!Array.isArray(value) || !Array.isArray(translation) || translation.length === 0) return undefined;
    const seen = new Set();
    for (const patch of translation) {
        if (!Number.isInteger(patch?.index) || patch.index < 0 || patch.index >= value.length || seen.has(patch.index)) return undefined;
        if (typeof patch.expected !== "string" || typeof patch.text !== "string" || !patch.text.trim()) return undefined;
        if (value[patch.index]?.value !== patch.expected) return undefined;
        seen.add(patch.index);
    }
    const result = structuredClone(value);
    for (const patch of translation) result[patch.index].value = patch.text;
    return result;
}

Hooks.once("babele.init", (babele) => {
    if (game.system.id !== "pf2e") return;
    const source = game.modules.get("sf2e-anachronism");
    if (!source?.active || source.version !== "2.4.0") {
        console.warn("SF2e 中文补丁：本版仅面向 Anachronism 2.4.0，已跳过注册。");
        return;
    }
    babele.registerConverter("sf2eAnachronismCnPrerequisites", {translate: translatePrerequisites});
    for (const lang of ["cn", "zh", "zh-CN", "zh-cn", "zh-Hans", "zh-hans"]) {
        babele.register({module: "sf2e-anachronism-zh-cn", lang, dir: "translations"});
    }
});
