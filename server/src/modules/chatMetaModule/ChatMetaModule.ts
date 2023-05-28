import { ObjectId } from "mongodb";
import { singleton } from "tsyringe";
import { Subject } from "../../utils/subject";
import { CHATMETA } from "./chatMetaStore";
import { ChatMeta } from "./chatMetaStore";

@singleton()
export class ChatMetaModule {
  private db = CHATMETA();

  metaSubject = new Subject<ChatMeta>();

  private onMetaUpdated = (chatId: number) => {
    this.db.findOne({ chatId }).then((meta) => {
      if (meta) {
        this.metaSubject.next(meta);
      }
    });
  };

  updateSettings = async (
    chatId: number,
    settings: Required<ChatMeta>["settings"]
  ) => {
    let update = Object.entries(settings).reduce((update, [key, value]) => {
      update[`settings.${key}`] = value;
      return update;
    }, {} as any);

    let res = await this.db.updateOne(
      { chatId },
      {
        $set: {
          chatId,
          ...update,
        },
      },
      { upsert: true }
    );
    this.onMetaUpdated(chatId);
    return res;
  };

  updateName = async (chatId: number, name: string) => {
    let res = await this.db.updateOne(
      { chatId },
      { $set: { chatId, name } },
      { upsert: true }
    );
    this.onMetaUpdated(chatId);
    return res;
  };

  getChatMeta = async (chatId: number) => {
    return await this.db.findOne({ chatId });
  };
}
