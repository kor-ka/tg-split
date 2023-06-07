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

export type ServerOp = OmitUnion<Operation, 'id' | 'edited' | 'date'> & { chatId: number, idempotencyKey: string, seq: number }
export type SavedOp = WithId<ServerOp>
export const OP = () => MDB.collection<ServerOp>("ops");
