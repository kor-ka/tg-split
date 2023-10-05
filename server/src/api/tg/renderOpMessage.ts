import { SavedOp } from "../../modules/splitModule/splitStore";
import TB from "node-telegram-bot-api";
import { SavedUser, USER } from "../../modules/userModule/userStore";
import { getChatToken } from "../Auth";
import { htmlEntities } from "./renderPin";

const wrapInTag = (tag: string, str: string) => {
    return `<${tag}>${str}</${tag}>`
}

export const renderOpMessage = async (op: SavedOp) => {
    const { chatId, threadId } = op;
    let text = "";
    let buttonsRows: TB.InlineKeyboardButton[][] = [];
    if (op.type === 'split') {
        const conditions = op.conditions.filter(c => c.type !== 'disabled')
        // fetch all user data
        const users = new Map<number, SavedUser & { fullName: string }>();
        const usersIds = new Set(conditions.map(c => c.uid));
        usersIds.add(op.uid);
        (await USER().find({ id: { $in: [...usersIds] } }).toArray()).forEach(u => users.set(u.id, { ...u, fullName: [u.name, u.lastname].filter(Boolean).join(' ') }))

        const fullNames = conditions.map((cond) => users.get(cond.uid)?.fullName ?? "???").join(', ')
        const namesShort = conditions.length > 2 ? `${conditions.length} persons` : conditions.map((cond) => users.get(cond.uid)?.name ?? '???').join(', ')

        const srcUserFullName = users.get(op.uid)?.fullName ?? '???'

        let title = wrapInTag("b", htmlEntities(
            `⚡️ ${srcUserFullName} → ${op.description || namesShort}`
        ))
        if (op.deleted) {
            title = wrapInTag("s", title)
        }
        const subtitle = htmlEntities([
            op.description && `${srcUserFullName} paid for ${op.description.trim()}`, `Split among: ${fullNames}`].filter(Boolean).join('. ')
        )
        text = [title, subtitle].join('\n')

        let key = [chatId, threadId].filter(Boolean).join('_');
        const token = getChatToken(chatId);
        key = [key, token].filter(Boolean).join('T');

        buttonsRows = [[
            { text: "I'm in!", callback_data: `join_split/${op._id}` },
            {
                text: "Split app",
                url: `https://t.me/splitsimplebot/split?startapp=${key}&startApp=${key}`,
            }]]
    }

    return [text, buttonsRows] as const
}

