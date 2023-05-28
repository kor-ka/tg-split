import TB from "node-telegram-bot-api";
import { PinsModule } from "../../modules/pinsModule/PinsModule";
import { renderPin } from "./renderPin";
import { container } from "tsyringe";
import { ChatMetaModule } from "../../modules/chatMetaModule/ChatMetaModule";
import { SplitModule } from "../../modules/splitModule/SplitModule";

export class TelegramBot {
  private pinModule = container.resolve(PinsModule);
  private chatMetaModule = container.resolve(ChatMetaModule);
  private splitModule = container.resolve(SplitModule);

  private token =
    process.env.TELEGRAM_BOT_TOKEN ||
    require("../../../../../../secret.json").tgBotToken;
  private bot = new TB(this.token, {
    polling: true,
  });

  private createPin = async (chatId: number) => {
    console.log("createPin", chatId);
    let message: TB.Message;

    let { text, buttonsRows } = renderPin(chatId, false);
    message = await this.bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: buttonsRows },
      parse_mode: "HTML",
    });

    const { message_id: messageId } = message
    this.pinModule.updatePinMeta(chatId, { messageId }).catch(((e) => console.log(e)));
    await this.bot.sendMessage(
      chatId,
      "❗️Don't forget do pin it ☝️, so everyone can open app"
    );
  };

  init = () => {
    this.bot.on("new_chat_members", async (upd) => {
      try {
        // TODO: save all new users
        console.log("new_chat_members", upd.new_chat_members);
        let botAdded = upd.new_chat_members?.find(
          // TODO: update id
          (u) => u.id === 304064430 || u.id === 431107640 || u.id === 5333305311
        );
        if (botAdded) {
          this.createPin(upd.chat.id).catch(((e) => console.log(e)));
          if (upd.chat.title) {
            await this.chatMetaModule.updateName(upd.chat.id, upd.chat.title);
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    this.bot.onText(/\/pin/, async (upd) => {
      try {
        await this.createPin(upd.chat.id);
      } catch (e) {
        console.log(e);
      }
    });

    this.bot.onText(/\/buymeacoffee/, async (upd) => {
      try {
        await this.bot.sendMessage(
          upd.chat.id,
          "https://bmc.link/korrrka"
        );
      } catch (e) {
        console.log(e);
      }
    });


    // Buttons press handlers
    this.bot.on("callback_query", async (q) => {
      const { data: dataString, from, message, chat_instance: chatInstance } = q;
      if (message) {
        const { chat: { id: chatId } } = message
        if (dataString) {
          try {
            let data = dataString.split("/");
            console.log("callback_query", data);
            if (data[0] === "a") {
              await this.pinModule.updatePinMeta(chatId, { chatInstance })
              const { text, buttonsRows } = renderPin(chatId, !!chatInstance);
              await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: buttonsRows },
              });

            }
            await this.bot.answerCallbackQuery(q.id);
          } catch (e) {
            console.error(e);
          }
        }

      }
    });

    this.bot.on("message", async (message) => {
      try {
        //  TODO: save users 
      } catch (e) {
        console.error(e);
      }
    });
  };
}
