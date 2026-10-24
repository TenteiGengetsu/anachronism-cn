import { DISPLAY_STRINGS, DISPLAY_NAME_KEYS, SOURCE_ACTOR_ITEMS, DISPLAY_GRANTED_NAMES, SOURCE_ITEM_SUBITEMS, DISPLAY_SUSTAINED_DURATIONS } from "./display-strings.mjs";

// PF2e parses range, time and other source values. Only rendered text is changed.
const NAME_KEYS = new Set(DISPLAY_NAME_KEYS);
const APPLICATION_OBSERVERS = new WeakMap();
const EXCLUDED = "script,style,pre,code,textarea,[contenteditable],.sf2-cn-field-translation";
const NAME_CONTAINER = "h1,h2,h3,h4,a.name,span.name,label,.item-name,.action-name,.strike-name,.document-name,.window-title,[data-document-name],[data-item-name]";
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

function isOriginalSubitem(parent, id, actor) {
    if (!parent || typeof id !== "string") return false;
    const sources = documentSources(parent);
    if (typeof parent.id === "string") {
        sources.push(...documentSources(actor).map((uuid) => `${uuid}.Item.${parent.id}`));
    }
    return sources.some((uuid) => Object.hasOwn(SOURCE_ITEM_SUBITEMS, uuid) && SOURCE_ITEM_SUBITEMS[uuid].includes(id));
}

export function isSourceItem(item, actor = item?.actor ?? item?.parent) {
    if (isSourceDocument(item)) return true;
    if (isOriginalSubitem(item?.parentItem, item?.id, actor)) return true;
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

function translateReferenceName(node) {
    const row = node.parentElement?.closest("[data-item-uuid]");
    if (!node.parentElement?.closest("a.name") || !row) return node.nodeValue;
    const uuid = row.dataset.itemUuid;
    const reference = Object.hasOwn(DISPLAY_GRANTED_NAMES, uuid) ? DISPLAY_GRANTED_NAMES[uuid] : null;
    const key = node.nodeValue.trim();
    if (!reference?.expectedNames.includes(key)) return node.nodeValue;
    const chinese = reference.name.slice(0, reference.name.lastIndexOf(key)).trim();
    const anchor = node.parentElement.closest("a.name");
    if (chinese && anchor.textContent.includes(chinese)) return node.nodeValue;
    return node.nodeValue.replace(key, () => reference.name);
}

function spellFieldDictionary(dictionary) {
    const derived = Object.create(null);
    if (typeof globalThis.game?.i18n?.format !== "function") return derived;
    for (const duration of DISPLAY_SUSTAINED_DURATIONS) {
        const translated = translateRenderedText(duration, dictionary);
        if (translated === duration) continue;
        const key = "PF2E.Item.Spell.Sustained.Duration";
        // Match the same localized format and casing used by PF2e's description helper.
        const source = game.i18n.format(key, {maximum: duration}).toLocaleLowerCase();
        const target = game.i18n.format(key, {maximum: translated}).toLocaleLowerCase();
        if (source !== target) derived[source] = target;
    }
    return derived;
}

function translateSpellField(node, dictionary, derived) {
    const parent = node.parentElement;
    if (!parent?.matches(".item-block-line > span") || !parent.querySelector(":scope > strong")) return node.nodeValue;
    const text = node.nodeValue;
    const direct = translateRenderedText(text, derived);
    if (direct !== text) return direct;
    // The template merges its localized line separator with a raw range/target text node.
    // Handle only a terminal separator in this verified spell-field container.
    const match = /^(\s*)([\s\S]*?)([;；]\s*)$/.exec(text);
    if (!match) return text;
    const body = match[2];
    const translated = translateRenderedText(translateRenderedText(body, dictionary), derived);
    return translated === body ? text : match[1] + translated + match[3];
}

export function localizeElement(element, dictionary = DISPLAY_STRINGS, acceptElement = () => true) {
    if (!element?.ownerDocument || !element.querySelectorAll) return;
    const owner = element.ownerDocument;
    const derived = spellFieldDictionary(dictionary);
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
        let translated = translateRenderedText(node.nodeValue, dictionary);
        if (translated === node.nodeValue) translated = translateReferenceName(node);
        if (translated === node.nodeValue) translated = translateSpellField(node, dictionary, derived);
        if (translated !== node.nodeValue) node.nodeValue = translated;
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
        if (hint.textContent !== translated) hint.textContent = translated;
    }
}

function enabled() {
    return globalThis.game?.system?.id === "pf2e" &&
        game.modules.get("sf2e-anachronism")?.active &&
        /^(?:cn|zh)(?:$|[-_.])/i.test(game.i18n?.lang ?? "");
}

export function stopApplicationObserver(application) {
    const state = application && APPLICATION_OBSERVERS.get(application);
    state?.observer.disconnect();
    if (state) APPLICATION_OBSERVERS.delete(application);
}

function observeApplication(application, root) {
    if (!application || typeof application !== "object") return;
    const existing = APPLICATION_OBSERVERS.get(application);
    if (existing?.root === root) return;
    stopApplicationObserver(application);
    const Observer = root.ownerDocument?.defaultView?.MutationObserver;
    if (!Observer) return;
    let processing = false;
    const observer = new Observer(() => {
        if (processing) return;
        if (!root.isConnected || !enabled()) { stopApplicationObserver(application); return; }
        processing = true;
        try {
            // PF2e inserts item summaries asynchronously after the application's render hook.
            // A mutation batch is rechecked with the same document/row/editor boundaries.
            localizeApplication(application, root);
        } finally {
            // Remove only mutations produced synchronously by this display pass.
            observer.takeRecords();
            processing = false;
        }
    });
    APPLICATION_OBSERVERS.set(application, {root, observer});
    observer.observe(root, {childList: true, characterData: true, subtree: true});
}

export function localizeApplication(application, html) {
    if (!enabled()) { stopApplicationObserver(application); return; }
    const root = html?.nodeType === 1 ? html : html?.[0];
    if (!root) return;
    if (APPLICATION_OBSERVERS.get(application)?.root !== root) stopApplicationObserver(application);
    const document = application?.document ?? application?.item ?? application?.actor ?? application?.object ?? application?.options?.item;
    const actor = application?.actor ?? (document?.items?.get ? document : document?.actor ?? document?.parent);
    const strikeIsSource = (index) => Number.isInteger(index) && index >= 0 &&
        isSourceItem(actor?.system?.actions?.[index]?.item, actor);
    const belongsToSource = (element) => {
        const subitemRow = element.closest("[data-subitem-id]");
        if (subitemRow) {
            const parentRow = subitemRow.closest("[data-item-id]");
            const parent = actor?.items?.get(parentRow?.dataset.itemId) ?? (document?.system?.subitems ? document : null);
            const id = subitemRow.dataset.subitemId;
            return isSourceDocument(parent?.subitems?.get(id)) || isOriginalSubitem(parent, id, actor);
        }
        const itemRow = element.closest("[data-item-id]");
        if (itemRow) return isSourceItem(actor?.items?.get(itemRow.dataset.itemId), actor);
        const strikeRow = element.closest("[data-action-index]");
        return !strikeRow || strikeIsSource(Number(strikeRow.dataset.actionIndex));
    };
    if (isSourceDocument(document) || (document?.type && isSourceItem(document, actor))) {
        localizeElement(root, DISPLAY_STRINGS, belongsToSource);
        observeApplication(application, root);
        return;
    }
    // A personal Actor may own source-module items without itself being a source Actor.
    if (!actor?.items?.get) { stopApplicationObserver(application); return; }
    let hasSourceRow = false;
    for (const row of root.querySelectorAll("[data-item-id]")) {
        if (isSourceItem(actor.items.get(row.dataset.itemId), actor)) {
            hasSourceRow = true;
            localizeElement(row, DISPLAY_STRINGS, belongsToSource);
        }
    }
    for (const row of root.querySelectorAll("[data-action-index]")) {
        if (strikeIsSource(Number(row.dataset.actionIndex))) {
            hasSourceRow = true;
            localizeElement(row, DISPLAY_STRINGS, belongsToSource);
        }
    }
    if (hasSourceRow) observeApplication(application, root);
    else stopApplicationObserver(application);
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

Hooks.on("closeApplication", stopApplicationObserver);
Hooks.on("closeApplicationV2", stopApplicationObserver);
