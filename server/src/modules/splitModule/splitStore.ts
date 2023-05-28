import { ObjectId, WithId } from "mongodb";
import { Operation } from "../../../../entity";
import { MDB } from "../../utils/MDB";

export type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Balance = {
  chatId: number,
  seq: number,
  balance: { [acc: string]: number }
}
export const BALANCE = () => MDB.collection<Balance>("balances");


export type SavedOp = WithId<OmitUnion<Operation, 'id'>>
export const OP = () => MDB.collection<OmitUnion<Operation, 'id'> & { chatId: number, idempotencyKey: string }>("balances");
