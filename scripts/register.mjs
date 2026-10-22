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

// Match embedded documents by stable ID and expected English text. Only display fields are copied.
function translateEmbedded(value, translation, descriptions) {
    if (!Array.isArray(value) || !Array.isArray(translation) || translation.length === 0) return undefined;
    const ids = new Set();
    for (const patch of translation) {
        if (typeof patch?.id !== "string" || ids.has(patch.id) || typeof patch.expectedName !== "string") return undefined;
        if (patch.name !== undefined && (typeof patch.name !== "string" || !patch.name.trim())) return undefined;
        if (patch.description !== undefined && (!descriptions || typeof patch.description !== "string" || typeof patch.expectedDescription !== "string")) return undefined;
        ids.add(patch.id);
    }
    const result = structuredClone(value);
    for (const patch of translation) {
        const item = result.find((entry) => entry._id === patch.id);
        if (!item || item.name !== patch.expectedName) continue;
        if (patch.name !== undefined) item.name = patch.name;
        if (patch.description !== undefined && item.system?.description?.value === patch.expectedDescription) {
            item.system.description.value = patch.description;
        }
    }
    return result;
}

export function translateItems({value, translation}) {
    return translateEmbedded(value, translation, true);
}

export function translatePages({value, translation}) {
    return translateEmbedded(value, translation, false);
}

Hooks.once("babele.init", (babele) => {
    if (game.system.id !== "pf2e") return;
    const source = game.modules.get("sf2e-anachronism");
    if (!source?.active || source.version !== "2.4.0") {
        console.warn("SF2e 中文补丁：本版仅面向 Anachronism 2.4.0，已跳过注册。");
        return;
    }
    babele.registerConverter("sf2eAnachronismCnPrerequisites", {translate: translatePrerequisites});
    babele.registerConverter("sf2eAnachronismCnItems", {translate: translateItems});
    babele.registerConverter("sf2eAnachronismCnPages", {translate: translatePages});
    for (const lang of ["cn", "zh", "zh-CN", "zh-cn", "zh-Hans", "zh-hans"]) {
        babele.register({module: "sf2e-anachronism-zh-cn", lang, dir: "translations"});
    }
});

