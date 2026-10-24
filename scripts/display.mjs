import { DISPLAY_STRINGS, DISPLAY_NAME_KEYS, SOURCE_ACTOR_ITEMS } from "./display-strings.mjs";

// PF2e parses range, time and other source values. Only rendered text is changed.
const NAME_KEYS = new Set(DISPLAY_NAME_KEYS);
const EXCLUDED = "script,style,pre,code,textarea,[contenteditable],.sf2-cn-field-translation";
const NAME_CONTAINER = "h1,h2,h3,h4,.item-name,.action-name,.strike-name,.document-name,.window-title,[data-document-name],[data-item-name]";
const PRAYER_EFFECT = "Compendium.sf2e-anachronism.spell-effects.Item.vRAHOPMR2JqsLzbt";
const PRAYER_NOTE = "You take @Damage[(@item.level - 1)[spirit]] damage";

function documentSources(document) {
    if (!document || typeof document !== "object") return [];
    return [document.uuid, document.sourceId, document._stats?.compendiumSource,
        document._source?._stats?.compendiumSource, document.flags?.core?.sourceId]
        .filter((source) => typeof source === "string");
}

export function isSourceDocument(document) {
    return documentSources(document).some((source) => source.startsWith("Compendium.sf2e-anachronism."));
}

export function isSourceItem(item, actor = item?.actor ?? item?.parent) {
    if (isSourceDocument(item)) return true;
    if (!item || !actor || typeof item.id !== "string") return false;
    return documentSources(actor).some((source) => Object.hasOwn(SOURCE_ACTOR_ITEMS, source) &&
        SOURCE_ACTOR_ITEMS[source].includes(item.id));
}

export function translateRenderedText(text, dictionary = DISPLAY_STRINGS) {
    if (typeof text !== "string") return text;
    const key = text.trim();
    const translated = Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
    return typeof translated === "string" ? text.replace(key, () => translated) : text;
}

function alreadyBilingual(node, key, dictionary) {
    if (!NAME_KEYS.has(key) || !Object.hasOwn(dictionary, key)) return false;
    const chinese = dictionary[key].slice(0, dictionary[key].lastIndexOf(key)).trim();
    const container = node.parentElement?.closest(NAME_CONTAINER);
    return !!chinese && !!container && container.textContent.includes(chinese) && container.textContent.includes(key);
}

export function localizeElement(element, dictionary = DISPLAY_STRINGS, acceptElement = () => true) {
    if (!element?.ownerDocument || !element.querySelectorAll) return;
    const owner = element.ownerDocument;
    const walker = owner.createTreeWalker(element, 4);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
        const parent = node.parentElement;
        if (!parent || !acceptElement(parent) || parent.isContentEditable || parent.closest(EXCLUDED)) continue;
        // An option without an explicit value submits its text as the value.
        const option = parent.closest("option");
        if (option && !option.hasAttribute("value")) continue;
        if (alreadyBilingual(node, node.nodeValue.trim(), dictionary)) continue;
        node.nodeValue = translateRenderedText(node.nodeValue, dictionary);
    }
    // Never assign input.value/defaultValue: provide a separate, non-editable reading.
    for (const input of element.querySelectorAll("input[type='text'][name^='system.'],input:not([type])[name^='system.']")) {
        if (!acceptElement(input) || input.isContentEditable || input.closest("[contenteditable]")) continue;
        const translated = translateRenderedText(input.value, dictionary);
        let hint = input.nextElementSibling;
        if (!hint?.classList?.contains("sf2-cn-field-translation")) hint = null;
        if (translated === input.value) { hint?.remove(); continue; }
        if (!hint) {
            hint = owner.createElement("span");
            hint.className = "sf2-cn-field-translation";
            input.insertAdjacentElement("afterend", hint);
        }
        hint.textContent = translated;
    }
}

function enabled() {
    return globalThis.game?.system?.id === "pf2e" &&
        game.modules.get("sf2e-anachronism")?.active &&
        /^(?:cn|zh)(?:$|[-_.])/i.test(game.i18n?.lang ?? "");
}

export function localizeApplication(application, html) {
    if (!enabled()) return;
    const root = html?.nodeType === 1 ? html : html?.[0];
    if (!root) return;
    const document = application?.document ?? application?.item ?? application?.actor ?? application?.object ?? application?.options?.item;
    const actor = application?.actor ?? (document?.items?.get ? document : document?.actor ?? document?.parent);
    const strikeIsSource = (index) => Number.isInteger(index) && index >= 0 &&
        isSourceItem(actor?.system?.actions?.[index]?.item, actor);
    const belongsToSource = (element) => {
        const itemRow = element.closest("[data-item-id]");
        if (itemRow) return isSourceItem(actor?.items?.get(itemRow.dataset.itemId), actor);
        const strikeRow = element.closest("[data-action-index]");
        return !strikeRow || strikeIsSource(Number(strikeRow.dataset.actionIndex));
    };
    if (isSourceDocument(document) || (document?.type && isSourceItem(document, actor))) {
        localizeElement(root, DISPLAY_STRINGS, actor?.items?.get ? belongsToSource : undefined);
        return;
    }
    // A personal Actor may own source-module items without itself being a source Actor.
    if (!actor?.items?.get) return;
    for (const row of root.querySelectorAll("[data-item-id]")) {
        if (isSourceItem(actor.items.get(row.dataset.itemId), actor)) localizeElement(row, DISPLAY_STRINGS, belongsToSource);
    }
    for (const row of root.querySelectorAll("[data-action-index]")) {
        if (strikeIsSource(Number(row.dataset.actionIndex))) localizeElement(row, DISPLAY_STRINGS, belongsToSource);
    }
}

// This one source Note is assembled around an enriched damage-roll anchor by PF2e.
// Its exact effect provenance and unchanged Note rule are required; no generic sentence matching.
function localizePrayerNotes(message, root) {
    const actor = message?.speakerActor ?? message?.actor;
    for (const note of root.querySelectorAll(".roll-note[data-item-id]")) {
        if (note.isContentEditable || note.closest(EXCLUDED)) continue;
        const item = actor?.items?.get(note.dataset.itemId);
        if (!documentSources(item).includes(PRAYER_EFFECT) || !item.system?.rules?.some((rule) =>
            rule.key === "Note" && rule.text === PRAYER_NOTE &&
            Array.isArray(rule.selector) && rule.selector.includes("damage-received"))) continue;
        const textNodes = Array.from(note.childNodes).filter((node) => node.nodeType === 3 && node.nodeValue.trim());
        const anchors = note.querySelectorAll("a.inline-roll[data-damage-roll][data-formula]");
        if (anchors.length !== 1 || anchors[0].parentElement !== note || textNodes.length !== 2 ||
            textNodes[0].nodeValue.trim() !== "You take" || textNodes[1].nodeValue.trim() !== "damage") continue;
        const children = Array.from(note.childNodes);
        if (!(children.indexOf(textNodes[0]) < children.indexOf(anchors[0]) &&
            children.indexOf(anchors[0]) < children.indexOf(textNodes[1]))) continue;
        if (Array.from(note.children).some((child) => child !== anchors[0] && child.tagName !== "STRONG")) continue;
        textNodes[0].nodeValue = textNodes[0].nodeValue.replace("You take", "你受到");
        textNodes[1].nodeValue = textNodes[1].nodeValue.replace("damage", "伤害");
    }
}

export function localizeChatMessage(message, html) {
    if (!enabled()) return;
    const root = html?.nodeType === 1 ? html : html?.[0];
    if (!root) return;
    const actor = message?.speakerActor ?? message?.actor;
    if (isSourceItem(message?.item, message?.item?.actor ?? actor)) {
        localizeElement(root, DISPLAY_STRINGS, (element) => {
            if (element.closest(".message-header,.message-sender,.message-metadata")) return false;
            const note = element.closest(".roll-note[data-item-id]");
            return !note || isSourceItem(actor?.items?.get(note.dataset.itemId), actor);
        });
    }
    localizePrayerNotes(message, root);
}

Hooks.on("renderApplication", localizeApplication);
Hooks.on("renderApplicationV2", localizeApplication);
Hooks.on("renderChatMessage", localizeChatMessage);
Hooks.on("renderChatMessageHTML", localizeChatMessage);
