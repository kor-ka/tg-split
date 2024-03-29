import { ObjectId, WithId } from "mongodb";
import { Operation } from "../../../../src/shared/entity";
import { MDB } from "../../utils/MDB";

export type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Balance = {
  chatId: number,
  threadId: number | undefined,
  seq: number,
  balance?: { [acc: string]: number }
}
export const BALANCE = () => MDB.collection<Balance>("balances");

export type ServerOp = OmitUnion<Operation, 'id' | 'edited' | 'date'> & { chatId: number, threadId: number | undefined, idempotencyKey: string, seq: number, messages?: number[] }
export type SavedOp = WithId<ServerOp>
export const OP = () => MDB.collection<ServerOp>("ops");
