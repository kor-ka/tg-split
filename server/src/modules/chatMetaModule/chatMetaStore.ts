import { ObjectId } from "mongodb";
import { MDB } from "../../utils/MDB";

export interface ChatMeta {
  _id: ObjectId;
  chatId: number;
  name: string;
  settings: {
  };
}

export const CHATMETA = () => MDB.collection<ChatMeta>("settings");
