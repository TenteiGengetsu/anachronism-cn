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

const MODULE_ID = "sf2e-anachronism-zh-cn";
const LANGUAGES = ["cn", "cn.foundry_chn", "zh", "zh-CN", "zh-cn", "zh-Hans", "zh-hans"];
let registrationResult = null;
let babeleFacade = null;

export function isChineseLanguage(language) {
    return typeof language === "string" && /^(?:cn|zh)(?:$|[-_.])/i.test(language);
}

export function registerLocalization(babele) {
    if (game.system.id !== "pf2e") return {registered: false, reason: "system"};
    const source = game.modules.get("sf2e-anachronism");
    if (!source?.active || source.version !== "2.4.0") {
        return {registered: false, reason: "source", sourceVersion: source?.version ?? null};
    }
    babele.registerConverter("sf2eAnachronismCnPrerequisites", {translate: translatePrerequisites});
    babele.registerConverter("sf2eAnachronismCnItems", {translate: translateItems});
    babele.registerConverter("sf2eAnachronismCnPages", {translate: translatePages});
    const languages = new Set(LANGUAGES);
    // Core settings and the resolved UI language may not exist during babele.init.
    for (const lang of [game.i18n?.lang]) {
        if (isChineseLanguage(lang)) languages.add(lang);
    }
    for (const lang of languages) {
        babele.register({module: MODULE_ID, lang, dir: "translations"});
    }
    return {registered: true, languages: [...languages]};
}

Hooks.once("babele.init", (babele) => {
    babeleFacade = babele;
    try {
        registrationResult = registerLocalization(babele);
        if (registrationResult.reason === "source") {
            console.warn("SF2e 中文汉化：本版仅面向 Anachronism 2.4.0，已跳过注册。", registrationResult);
        }
    } catch (error) {
        registrationResult = {registered: false, reason: "error", message: error.message};
        console.error("SF2e 中文汉化注册失败", error);
    }
});

// setup runs after localization is initialized and before Babele loads its ready session.
Hooks.once("setup", () => {
    if (!registrationResult?.registered) return;
    const language = game.i18n?.lang;
    if (isChineseLanguage(language) && !registrationResult.languages.includes(language)) {
        try {
            babeleFacade.register({module: MODULE_ID, lang: language, dir: "translations"});
            registrationResult.languages.push(language);
        } catch (error) {
            registrationResult = {registered: false, reason: "error", message: error.message};
            console.error("SF2e 中文汉化语言注册失败", error);
        }
    }
});

Hooks.once("ready", () => {
    if (!game.user?.isGM || !isChineseLanguage(game.i18n?.lang)) return;
    if (registrationResult?.reason === "source") {
        ui.notifications.warn("SF2e 中文汉化未加载：请启用 Anachronism 2.4.0；当前版本：" + (registrationResult.sourceVersion ?? "未安装"));
    } else if (registrationResult?.reason === "error") {
        ui.notifications.warn("SF2e 中文汉化注册失败：" + registrationResult.message);
    } else if (!registrationResult) {
        ui.notifications.warn("SF2e 中文汉化未加载：未收到 Babele 初始化事件，请确认 Babele 2.9.1 或更新版本已启用。");
    }
});
