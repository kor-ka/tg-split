import { Balance, BalanceState, Log, Operation, User } from "../../../../src/shared/entity";
import TB from "node-telegram-bot-api";
import { optimiseBalance } from "../../../../src/model/optimiseBalance";
import { container } from "tsyringe";
import { UserModule } from "../../modules/userModule/UserModule";
import { formatSum } from "../../../../src/view/utils/formatSum";
import { ChatMetaModule } from "../../modules/chatMetaModule/ChatMetaModule";

export function htmlEntities(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const renderPin = async (chatId: number, threadId: number | undefined, balance: Balance) => {
  const userModule = container.resolve(UserModule)
  const chatMetaModule = container.resolve(ChatMetaModule)
  const promieses = optimiseBalance(balance).filter(({ sum }) => sum !== 0).map(async ({ pair, sum }) => {
    try {
      const src = sum < 0 ? 0 : 1
      const dst = sum < 0 ? 1 : 0
      const srcUser = await userModule.getUser(pair[src]);
      const srcName = [srcUser?.name, srcUser?.lastname].filter(Boolean).join(' ') || '???';
      const dstUser = await userModule.getUser(pair[dst]);
      const dstName = [dstUser?.name, dstUser?.lastname].filter(Boolean).join(' ') || '???';

      return `${srcName} → ${dstName} ${formatSum(sum)}`;
    } catch (e) {
      console.error(e);
      return '';
    }
  });

  const text = (await Promise.all(promieses)).join('\n').trim() || '✨ All settled up ✨';
  let key = [chatId, threadId].filter(Boolean).join('_');
  const token = (await chatMetaModule.getChatMeta(chatId))?.token
  key = [key, token].filter(Boolean).join('T')
  let buttonsRows: TB.InlineKeyboardButton[][] = [];
  buttonsRows.push([
    {
      text: "Split",
      url: `https://t.me/splitsimplebot/split?startapp=${key}&startApp=${key}`,
    },
  ]);


  return { text, buttonsRows };
};
