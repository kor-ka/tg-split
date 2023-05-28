import { BalanceState, Log, Operation, User } from "../../../../entity";
import TB from "node-telegram-bot-api";

export function htmlEntities(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const renderPin = (chatId: number, activated: boolean) => {
  const textRows: string[] = [];
  textRows.push(`⚡️Split⚡️`);

  let buttonsRows: TB.InlineKeyboardButton[][] = [];
  if (activated) {
    buttonsRows.push([
      {
        text: "Split",
        url: `https://t.me/splitsimplebot/split?startapp=${chatId}&startApp=${chatId}`,
      },
    ]);
  } else {
    buttonsRows.push([
      {
        text: "Activate",
        callback_data: "a"
      },
    ]);
  }


  return { text: textRows.join("\n"), buttonsRows };
};
