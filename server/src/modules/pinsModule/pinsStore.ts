import { ObjectId } from "mongodb";
import { MDB } from "../../utils/MDB";
interface Pins {
  _id: ObjectId;
  chatId: number;
  messageId: number;
  chatInstance?: string;
}

export const PINS = () => MDB.collection<Pins>("pins");
