import { PINS } from "./pinsStore";
import { singleton } from "tsyringe";

@singleton()
export class PinsModule {
  private db = PINS();

  updatePinMeta = async (chatId: number, options: {
    messageId?: number, chatInstance?: string
  }) => {
    const {messageId, chatInstance} = options;
    return await this.db.updateOne(
      { chatId },
      { $set: { 
        chatId,
        ...messageId ? {messageId} : {},
        ...chatInstance ? {chatInstance} : {}
        } 
      },
      { upsert: true }
    );
  };

  getPinMeta = async (chatId: number) => {
    return await this.db.findOne({ chatId });
  };

  getPinMetaByInstance = async (chatInstance: string) => {
    return await this.db.findOne({ chatInstance });
  };
}
