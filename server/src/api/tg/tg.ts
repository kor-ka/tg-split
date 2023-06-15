import TB from "node-telegram-bot-api";
import { PinsModule } from "../../modules/pinsModule/PinsModule";
import { renderPin } from "./renderPin";
import { container } from "tsyringe";
import { ChatMetaModule } from "../../modules/chatMetaModule/ChatMetaModule";
import { SplitModule } from "../../modules/splitModule/SplitModule";
import { UserModule } from "../../modules/userModule/UserModule";
import { optimiseBalance } from "../../../../src/model/optimiseBalance";
import { BALANCE, OP } from "../../modules/splitModule/splitStore";
import { MDBClient } from "../../utils/MDB";
import { PINS } from "../../modules/pinsModule/pinsStore";
import { CHATMETA } from "../../modules/chatMetaModule/chatMetaStore";
import { USER } from "../../modules/userModule/userStore";

export class TelegramBot {
  private pinModule = container.resolve(PinsModule);
  private chatMetaModule = container.resolve(ChatMetaModule);
  private userModule = container.resolve(UserModule)
  private splitModule = container.resolve(SplitModule)

  private token = process.env.TELEGRAM_BOT_TOKEN!;
  private bot = new TB(this.token, {
    polling: true,
  });

  private createPin = async (chatId: number, threadId: number | undefined) => {
    console.log("createPin", chatId);
    let message: TB.Message;
    const balanceState = await this.splitModule.getBalance(chatId, threadId)
    let { text, buttonsRows } = await renderPin(chatId, threadId, balanceState.balance);
    message = await this.bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: buttonsRows },
      parse_mode: "HTML",
      message_thread_id: threadId
    });

    const { message_id: messageId } = message
    this.pinModule.updatePinMeta(chatId, threadId, { messageId }).catch(((e) => console.log(e)));
    await this.bot.sendMessage(
      chatId,
      `Hi there! 
I'll help you split expenses among this group. Imagine someone paid for dinner, another one paid for the taxi, and someone bought ice cream for all. Who owes whom what sum? I'm here so you don't need to puzzle over it each time; just enjoy your time. 
To start, add your first expense using the "Split" button. 
And don't forget to pin the message with the button, so everyone can open the app.`,
      { message_thread_id: threadId }
    );
  };

  init = () => {
    this.bot.on("group_chat_created", async (upd) => {
      try {
        await this.createPin(upd.chat.id, upd.message_thread_id)
        if (upd.chat.title) {
          await this.chatMetaModule.updateName(upd.chat.id, upd.chat.title);
        }
      } catch (e) {
        console.error(e)
      }
    })

    this.bot.on("migrate_from_chat_id", async (upd) => {
      try {
        const fromId = upd.migrate_from_chat_id;
        const toId = upd.chat.id;

        if (fromId !== undefined) {
          console.log("migrate_from_chat_id >>>", fromId, toId)
          // yep, concurrent ops/corrections can get lost, whatever
          const session = MDBClient.startSession();
          try {
            await session.withTransaction(async () => {
              await BALANCE().updateOne({ chatId: fromId }, { $set: { chatId: toId } }, { session });
              await OP().updateMany({ chatId: fromId }, { $set: { chatId: toId } }, { session });
              await CHATMETA().updateOne({ chatId: fromId }, { $set: { chatId: toId } }, { session });
              await USER().updateMany({ chatIds: fromId }, { $addToSet: { chatIds: toId } }, { session });
              await USER().updateMany({ disabledChatIds: fromId }, { $addToSet: { disabledChatIds: toId } }, { session });
            });
          } finally {
            await session.endSession();
          }
          await this.createPin(toId, undefined)

          console.log("migrate_from_chat_id <<<", fromId, toId)

        }
      } catch (e) {
        console.error(e);
      }
    })

    this.bot.on("new_chat_members", async (upd) => {
      try {
        console.log("new_chat_members", upd.new_chat_members);
        let botAdded = upd.new_chat_members?.find(
          (u) => u.id === 6065926905
        );
        if (botAdded) {
          await this.createPin(upd.chat.id, undefined)
          if (upd.chat.title) {
            await this.chatMetaModule.updateName(upd.chat.id, upd.chat.title);
          }
        }

        upd.new_chat_members?.filter(u => !u.is_bot || (upd.chat.title?.endsWith("__DEV__"))).forEach(u => {
          this.userModule.updateUser(upd.chat.id, undefined, {
            id: u.id,
            name: u.first_name,
            lastname: u.last_name,
            username: u.username,
            disabled: false
          }).catch(e => console.error(e))
        })

      } catch (e) {
        console.log(e);
      }
    });

    this.bot.on("left_chat_member", async (upd) => {
      try {
        const left = upd.left_chat_member;
        if (left && (!left.is_bot || (upd.chat.title?.endsWith("__DEV__")))) {
          await this.userModule.updateUser(upd.chat.id, undefined, {
            id: left.id,
            name: left.first_name,
            lastname: left.last_name,
            username: left.username,
            disabled: true
          });
        }
      } catch (e) {
        console.log(e);
      }
    });

    this.bot.onText(/\/pin/, async (upd) => {
      try {
        await this.createPin(upd.chat.id, upd.message_thread_id);
      } catch (e) {
        console.log(e);
      }
    });

    this.bot.onText(/\/buymeacoffee/, async (upd) => {
      try {
        await this.bot.sendMessage(
          upd.chat.id,
          "https://bmc.link/korrrka",
          { message_thread_id: upd.message_thread_id }
        );
      } catch (e) {
        console.log(e);
      }
    });

    this.bot.on("message", async (message) => {
      try {
        if (message.from && (!message.from.is_bot || (message.chat.title?.endsWith("__DEV__")))) {
          await this.userModule.updateUser(message.chat.id, message.message_thread_id, {
            id: message.from.id,
            name: message.from.first_name,
            lastname: message.from.last_name,
            username: message.from.username,
            disabled: false
          })
        }
        
        if(message.entities){
          for(let e of message.entities){
            const user = e.user;
            if(user && (!user.is_bot || (message.chat.title?.endsWith("__DEV__")))){
              await this.userModule.updateUser(message.chat.id, message.message_thread_id, {
                id: user.id,
                name: user.first_name,
                lastname: user.last_name,
                username: user.username,
                disabled: false
              });
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    // TODO: this shit can race, add worker
    this.splitModule.stateUpateSubject.subscribe(async (upd) => {
      try {
        const { chatId, threadId, balanceState } = upd;
        const pinned = await this.pinModule.getPinMeta(chatId, threadId);

        if (pinned) {
          // TODO: move to render pin, no pin case?

          const { text, buttonsRows } = await renderPin(chatId, threadId, balanceState.balance);

          await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: pinned.messageId,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttonsRows },
          });

        }
      } catch (e) {
        console.error(e)
      }
    })

  };

}
