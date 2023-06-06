import { ObjectId, WithId } from "mongodb";
import { Operation } from "../../../../entity";
import { MDB } from "../../utils/MDB";

export type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Balance = {
  chatId: number,
  seq: number,
  balance?: { [acc: string]: number }
}
export const BALANCE = () => MDB.collection<Balance>("balances");

export type ServerOp = OmitUnion<Operation, 'id' | 'correction'> & { correction?: ObjectId, chatId: number, idempotencyKey: string, corrected?: boolean }
export type SavedOp = WithId<ServerOp>
export const OP = () => MDB.collection<ServerOp>("ops");
