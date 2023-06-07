import { BalanceState, Log, Operation, User } from "../../../../entity";
import TB from "node-telegram-bot-api";

export function htmlEntities(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const renderPin = (chatId: number, threadId: number | undefined) => {
  const textRows: string[] = [];
  textRows.push(`⚡️Split⚡️`);

  const key = [chatId, threadId].filter(Boolean).join('_');
  let buttonsRows: TB.InlineKeyboardButton[][] = [];
  buttonsRows.push([
    {
      text: "Split",
      url: `https://t.me/splitsimplebot/split?startapp=${key}&startApp=${key}`,
    },
  ]);


  return { text: textRows.join("\n"), buttonsRows };
};
