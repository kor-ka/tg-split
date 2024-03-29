import TB from "node-telegram-bot-api";
import { PinsModule } from "../../modules/pinsModule/PinsModule";
import { renderPin } from "./renderPin";
import { container } from "tsyringe";
import { ChatMetaModule } from "../../modules/chatMetaModule/ChatMetaModule";
import { SplitModule } from "../../modules/splitModule/SplitModule";
import { UserModule } from "../../modules/userModule/UserModule";
import { optimiseBalance } from "../../../../src/model/optimiseBalance";
import { BALANCE, OP, SavedOp } from "../../modules/splitModule/splitStore";
import { MDBClient } from "../../utils/MDB";
import { PINS } from "../../modules/pinsModule/pinsStore";
import { CHATMETA } from "../../modules/chatMetaModule/chatMetaStore";
import { USER } from "../../modules/userModule/userStore";
import { renderOpMessage } from "./renderOpMessage";
import { BalanceState } from "../../../../src/shared/entity";

const nick = "splitsimplebot"

export class TelegramBot {
  private pinModule = container.resolve(PinsModule);
  private chatMetaModule = container.resolve(ChatMetaModule);
  private userModule = container.resolve(UserModule)
  private splitModule = container.resolve(SplitModule)

  private token = process.env.TELEGRAM_BOT_TOKEN!;
  private bot = new TB(this.token, {
    polling: true,
  });

  onCommand = (command: string, callback: (msg: TB.Message, match: RegExpExecArray | null) => void) => {
    return this.bot.onText(new RegExp(`^\/(${command}|${command}@${nick})$`), callback)
  }

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
    const prevPin = await this.pinModule.updatePinMeta(chatId, threadId, { messageId })

    if (prevPin.value) {
      this.bot.deleteMessage(chatId, prevPin.value.messageId).catch(e => console.error(e.message))
    }

    let pinned = true
    try {
      await this.bot.pinChatMessage(chatId, messageId)
    } catch (e) {
      pinned = false
    }

    await this.bot.sendMessage(
      chatId,
      `Hi there! 
I'll help you split expenses among this group. Imagine someone paid for dinner, another one paid for the taxi, and someone bought ice cream for all. Who owes whom what sum? I'm here so you don't need to puzzle over it each time; just enjoy your time. 
To start, add your first expense using the "Split" button. 
${pinned ? '' : "And don't forget to pin the message with the button, so everyone can open the app."}`.trim(),
      { message_thread_id: threadId }
    );
  };

  updatePin = async (chatId: number, threadId: number | undefined, balanceState: BalanceState) => {
    const pinned = await this.pinModule.getPinMeta(chatId, threadId);

    if (pinned) {
      const { text, buttonsRows } = await renderPin(chatId, threadId, balanceState.balance);

      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: pinned.messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttonsRows },
      });

    }
  }

  sendEventMessage = async (op: SavedOp) => {
    if (op.type === 'split') {
      const [text, buttons] = await renderOpMessage(op)
      const message = await this.bot.sendMessage(op.chatId, text, {
        reply_markup: { inline_keyboard: buttons },
        parse_mode: "HTML",
        message_thread_id: op.threadId
      });
      await OP().updateOne({ _id: op._id }, { $addToSet: { messages: message.message_id } })
    }
  }

  updateEventMessages = async (op: SavedOp) => {
    const [text, buttons] = await renderOpMessage(op)
    const meessages = (await OP().findOne({ _id: op._id }))?.messages || []
    await Promise.all(meessages.map(mid =>
      this.bot.editMessageText(text, {
        chat_id: op.chatId,
        message_id: mid,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      })))
  }

  init = () => {
    this.bot.on("group_chat_created", async (upd) => {
      try {
        await this.chatMetaModule.updateChat(upd.chat.id, upd.chat.title ?? '');
        await this.createPin(upd.chat.id, upd.message_thread_id)

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
          await this.chatMetaModule.updateChat(toId, upd.chat.title ?? "");
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
          await this.chatMetaModule.updateChat(upd.chat.id, upd.chat.title ?? "");
          await this.createPin(upd.chat.id, undefined)

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

    this.onCommand('pin', async (upd) => {
      try {
        let canCreatePin = false

        if (upd.chat.type === 'private') {
          canCreatePin = true
        } else if (upd.from) {
          const member = await this.bot.getChatMember(upd.chat.id, upd.from.id)
          if (member.status === 'administrator' || member.status === 'creator') {
            canCreatePin = true
          }
        }
        if (canCreatePin) {
          await this.chatMetaModule.updateChat(upd.chat.id, upd.chat.title ?? "");
          await this.createPin(upd.chat.id, upd.message_thread_id);
        } else {
          await this.bot.sendMessage(upd.chat.id, "Only admins can create a pin message")
        }

      } catch (e) {
        console.log(e);
      }
    });

    this.onCommand('start', async (upd) => {
      try {
        if (upd.chat.type === 'private') {
          await this.bot.sendMessage(
            upd.chat.id,
            'Hey👋\nThis bot is meant to work in groups with your friends, add me to any group to start.',
            { reply_markup: { inline_keyboard: [[{ text: 'Add to group', url: "https://telegram.me/splitsimplebot?startgroup=true&admin=pin_messages" }]] } }
          );
        } else {
          await this.createPin(upd.chat.id, upd.message_thread_id)
        }


      } catch (e) {
        console.log(e);
      }
    });


    this.onCommand('buymeacoffee', async (upd) => {
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

        // races with new_chat_members - an queues by chat?
        // const pinned = await this.pinModule.getPinMeta(message.chat.id, message.message_thread_id);
        // if(!pinned){
        //     await this.chatMetaModule.updateChat(message.chat.id, message.chat.title ?? "");
        //     await this.createPin(message.chat.id, message.message_thread_id);      
        // }

        if (message.from && (!message.from.is_bot || (message.chat.title?.endsWith("__DEV__")))) {
          await this.userModule.updateUser(message.chat.id, message.message_thread_id, {
            id: message.from.id,
            name: message.from.first_name,
            lastname: message.from.last_name,
            username: message.from.username,
            disabled: false
          })
        }

        if (message.entities) {
          for (let e of message.entities) {
            const user = e.user;
            if (user && (!user.is_bot || (message.chat.title?.endsWith("__DEV__")))) {
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

    this.bot.on("callback_query", async q => {
      try {
        const { data: dataString, from, message } = q;
        if (message && dataString && from) {
          let data = dataString.split("/");
          if (data[0] === 'join_split') {
            const opId = data[1]
            await this.splitModule.joinSplit(message.chat.id, message.message_thread_id, from.id, opId)
          }
        }
        await this.bot.answerCallbackQuery(q.id);
      } catch (e) {
        console.error(e)
      }
    })

    // TODO: this shit can race, add worker
    this.splitModule.stateUpateSubject.subscribe(async (upd) => {
      try {
        const { chatId, threadId, balanceState } = upd;

        await Promise.all([
          (upd.type === 'create' ? this.sendEventMessage : this.updateEventMessages)(upd.operation),
          this.updatePin(chatId, threadId, balanceState)
        ])

      } catch (e) {
        console.error(e)
      }
    })

  };

}
