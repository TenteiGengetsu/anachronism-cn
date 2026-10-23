// Display strings, plus one explicitly requested Commercial Holy Module correction.
// Compendium data is cloned; existing world Documents are never updated here.
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
function translateEmbedded(value, translation, descriptions, pages = false) {
    if (!Array.isArray(value) || !Array.isArray(translation) || translation.length === 0) return undefined;
    const ids = new Set();
    for (const patch of translation) {
        if (typeof patch?.id !== "string" || ids.has(patch.id) || typeof patch.expectedName !== "string") return undefined;
        if (patch.name !== undefined && (typeof patch.name !== "string" || !patch.name.trim())) return undefined;
        if (patch.description !== undefined && (!descriptions || typeof patch.description !== "string" || typeof patch.expectedDescription !== "string")) return undefined;
        if (patch.content !== undefined && (!pages || typeof patch.content !== "string" || typeof patch.expectedContent !== "string")) return undefined;
        if (patch.extraFields !== undefined && (!descriptions || !Array.isArray(patch.extraFields))) return undefined;
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
        if (pages && patch.content !== undefined && item.text?.content === patch.expectedContent) {
            item.text.content = patch.content;
        }
        for (const field of patch.extraFields ?? []) {
            if (isSafeDisplayPatch(item, field, true)) {
                writePath(item, field.path, field.text);
            }
        }
    }
    return result;
}

export function translateItems({value, translation}) {
    return translateEmbedded(value, translation, true);
}

export function translatePages({value, translation}) {
    return translateEmbedded(value, translation, false, true);
}

// Only explicitly reviewed display fields are writable; identifiers and rule values are excluded.
function safeParts(path) {
    if (typeof path !== "string") return null;
    const parts = path.split(".");
    return parts.length && parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p) && !["__proto__", "prototype", "constructor"].includes(p)) ? parts : null;
}

function readPath(object, path) {
    const parts = safeParts(path);
    if (!parts) return undefined;
    for (const part of parts) {
        if (!object || typeof object !== "object" || !Object.hasOwn(object, part)) return undefined;
        object = object[part];
    }
    return object;
}

function writePath(object, path, text) {
    const parts = safeParts(path);
    if (!parts) return;
    for (const part of parts.slice(0, -1)) object = object[part];
    object[parts.at(-1)] = text;
}

function guardsMatch(source, guards) {
    return guards === undefined || (Array.isArray(guards) && guards.every((g) =>
        g && typeof g.expected === "string" && readPath(source, g.path) === g.expected));
}

function isDisplayTextPath(path, item = false) {
    if (!safeParts(path)) return false;
    if (item) return /^system\.(?:requirements|area\.details|selfEffect\.name|overlays\.[A-Za-z0-9_-]+\.name|subitems\.\d+\.(?:name|system\.description\.value)|spell\.(?:name|system\.description\.value)|rules\.\d+\.(?:label|suboptions\.\d+\.label))$/.test(path);
    return path === "prototypeToken.name" || /^system\.(?:details\.(?:description|disable|routine|reset|crew|pilotingCheck|speed|passengers|blurb|languages\.details|gender\.value)|attributes\.(?:stealth\.details|hp\.details|ac\.details|speed\.details|allSaves\.value)|perception\.details|skills\.[a-z]+\.(?:note|special\.\d+\.label))$/.test(path);
}

function hasIdentityGuard(source, guards, path) {
    const expected = readPath(source, path);
    return typeof expected === "string" && expected.length > 0 && Array.isArray(guards) &&
        guards.some((g) => g?.path === path && g.expected === expected);
}

function isSafeDisplayPatch(source, patch, item = false) {
    if (!patch || !isDisplayTextPath(patch.path, item) || typeof patch.expected !== "string" ||
        typeof patch.text !== "string" || readPath(source, patch.path) !== patch.expected || !guardsMatch(source, patch.guards)) return false;
    const child = /^system\.subitems\.(\d+)\./.exec(patch.path);
    if (child && !hasIdentityGuard(source, patch.guards, `system.subitems.${child[1]}._id`)) return false;
    if (patch.path.startsWith("system.spell.") && !hasIdentityGuard(source, patch.guards, "system.spell._id")) return false;
    const rule = /^system\.rules\.(\d+)\.(label|suboptions\.(\d+)\.label)$/.exec(patch.path);
    if (rule) {
        const root = `system.rules.${rule[1]}`;
        if (!hasIdentityGuard(source, patch.guards, `${root}.key`)) return false;
        const key = readPath(source, `${root}.key`);
        if (key === "RollOption") {
            if (!hasIdentityGuard(source, patch.guards, `${root}.option`)) return false;
            if (rule[3] !== undefined && !hasIdentityGuard(source, patch.guards, `${root}.suboptions.${rule[3]}.value`)) return false;
        } else if (key === "Strike" && rule[2] === "label") {
            // Without an explicit slug PF2e derives one from the label. Never translate that case.
            if (!hasIdentityGuard(source, patch.guards, `${root}.slug`)) return false;
        } else return false;
    }
    return true;
}

export function translateDisplayText({value, translation, source, field, path}) {
    if (typeof field !== "string" || !field.startsWith("cnText_") || !isDisplayTextPath(path)) return undefined;
    if (typeof value !== "string" || typeof translation?.expected !== "string" || typeof translation.text !== "string") return undefined;
    if (value !== translation.expected || !guardsMatch(source, translation.guards)) return undefined;
    return translation.text;
}

const HOLY_COMMERCIAL_ID = "he1AD9ck10fLSvWn";
const HOLY_COMMERCIAL_RULES = [
    {damageType: "spirit", diceNumber: 1, dieSize: "d4", key: "DamageDice", selector: "{item|parentItem.id}-damage", slug: "holy-module"},
    {key: "DamageAlteration", mode: "upgrade", predicate: ["target:trait:unholy"], property: "dice-number", selectors: ["{item|parentItem.id}-damage"], slug: "holy-module", value: 3},
    {key: "Note", outcome: ["criticalSuccess"], selector: "{item|parentItem.id}-damage", text: "SF2E.SpecificRule.Equipment.Upgrades.Weapon.HolyModule.CriticalNoteCommercial", title: "SF2E.SpecificRule.Equipment.Upgrades.Weapon.HolyModule.LabelCommercial"},
];
let holyCorrectionWarningShown = false;

function sameJson(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]));
}

// Apply the text and dice change atomically. A guard failure leaves both source fields intact.
export function translateHolyCommercial({value, translation, source, contextCompendium, field, path}) {
    if (translation === undefined || translation === null) return undefined;
    if (field !== "cnHolyModuleCorrection" || path !== "system") return undefined;
    const module = game.modules.get("sf2e-anachronism");
    if (!module?.active || module.version !== "2.4.0") return undefined;
    if (source?._id !== HOLY_COMMERCIAL_ID || source.type !== "equipment" || source.system?.slug !== "holy-module-commercial") return undefined;
    const pack = contextCompendium?.metadata?.id;
    if (pack !== "sf2e-anachronism.equipment") return undefined;
    // Compendium indexes may contain the slug without the full description or rules.
    if (value?.description?.value === undefined || value?.rules === undefined) return undefined;
    const validText = typeof translation?.expectedDescription === "string" && typeof translation.text === "string" && translation.text.trim();
    const correctedRules = structuredClone(HOLY_COMMERCIAL_RULES);
    correctedRules[1].value = 2;
    if (validText && sameJson(value?.rules, correctedRules) && value?.description?.value === translation.text) return structuredClone(value);
    if (!validText || !sameJson(value?.rules, HOLY_COMMERCIAL_RULES) || value?.description?.value !== translation.expectedDescription) {
        if (!holyCorrectionWarningShown) {
            holyCorrectionWarningShown = true;
            const message = "商用型圣洁模组2d4修正已跳过：源说明或规则与适配版本不一致，已保留原数据。";
            console.warn(message);
            if (game.user?.isGM) ui?.notifications?.warn(message);
        }
        return undefined;
    }
    const result = structuredClone(value);
    result.description.value = translation.text;
    result.rules[1].value = 2;
    return result;
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
    // Foundry enforces the minimum dependency version from module.json.
    // Translation registration must survive later source-module updates.
    if (!source?.active) {
        return {registered: false, reason: "source", sourceVersion: source?.version ?? null};
    }
    babele.registerConverter("sf2eAnachronismCnPrerequisites", {translate: translatePrerequisites});
    babele.registerConverter("sf2eAnachronismCnItems", {translate: translateItems});
    babele.registerConverter("sf2eAnachronismCnPages", {translate: translatePages});
    babele.registerConverter("sf2eAnachronismCnHolyCommercial", {translate: translateHolyCommercial});
    babele.registerConverter("sf2eAnachronismCnText", {translate: translateDisplayText});
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
            console.warn("SF2e 中文汉化：Anachronism 未启用，已跳过注册。", registrationResult);
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
        ui.notifications.warn("SF2e 中文汉化未加载：请启用 Anachronism 2.4.0 或更新版本；当前版本：" + (registrationResult.sourceVersion ?? "未安装"));
    } else if (registrationResult?.reason === "error") {
        ui.notifications.warn("SF2e 中文汉化注册失败：" + registrationResult.message);
    } else if (!registrationResult) {
        ui.notifications.warn("SF2e 中文汉化未加载：未收到 Babele 初始化事件，请确认 Babele 2.9.1 或更新版本已启用。");
    }
});
