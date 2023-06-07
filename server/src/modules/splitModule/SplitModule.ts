import { Balance as SavedBalance, BALANCE, OP, SavedOp, OmitUnion, ServerOp } from "./splitStore";
import { singleton } from "tsyringe";
import { Operation, OperationSplit, BalanceState, Balance, ClientAPICommandOperation } from "../../../../entity";
import { MDBClient } from "../../utils/MDB";
import { ObjectId, WithId } from "mongodb";
import { Subject } from "../../utils/subject";
import { savedOpToApi } from "../../api/ClientAPI";

type StateListener = (balance: BalanceState, op: Operation) => void

@singleton()
export class SplitModule {
  private balance = BALANCE();
  private ops = OP();

  readonly stateSubject = new Subject<{ chatId: number, threadId: number | undefined, balanceState: BalanceState, operation: SavedOp, type: 'create' | 'update' | 'delete' }>;

  commitOperation = async (chatId: number, threadId: number | undefined, type: 'create' | 'update', operation: ClientAPICommandOperation & { uid: number }) => {
    if (typeof operation.sum !== 'number' || operation.sum % 1 !== 0 || operation.sum < 0) {
      throw new Error("Sum should be a positive integer")
    }
    const session = MDBClient.startSession()
    let _id: ObjectId | undefined
    try {
      await session.withTransaction(async () => {
        // Write op
        const { id, uid, ...op } = operation;
        const opData = { ...op, uid, chatId, threadId };

        let atoms = opToAtoms(operation)

        if (type === 'create') {
          // create new op
          _id = (await this.ops.insertOne({ ...opData, seq: 0, idempotencyKey: `${uid}_${id}` }, { session })).insertedId
        } else if (type === 'update') {
          _id = new ObjectId(id)
          // update op
          const op = (await this.ops.findOne({ _id, deleted: { $ne: true } }))
          if (!op) {
            throw new Error("Operation not found")
          }

          // revert balance
          const invertedAtoms = invertAtoms(opToAtoms(op))
          const updateBalances = invertedAtoms.reduce((upd, [acc, incr]) => {
            console.log(acc, incr)
            upd[`balance.${acc}`] = incr;
            return upd
          }, {} as { [selector: string]: number })

          await this.balance.updateOne({ chatId, threadId }, {
            $inc: { ...updateBalances, seq: 1 }
          }, { session })

          // update after balance - check seq not changed
          const res = await this.ops.updateOne({ _id, seq: op.seq }, { $set: opData, $inc: { seq: 1 } }, { session })
          if (res.modifiedCount === 0) {
            // propbably seq updated concurrently - throw
            throw new Error("Error occured, try again later")
          }
        } else {
          throw new Error('Unknown operation modification type')
        }

        // Update balance
        const updateBalances = atoms.reduce((upd, [acc, incr]) => {
          console.log(acc, incr)
          upd[`balance.${acc}`] = incr;
          return upd
        }, {} as { [selector: string]: number })

        await this.balance.updateOne({ chatId, threadId }, {
          $set: { chatId },
          $inc: { ...updateBalances, seq: 1 }
        }, { upsert: true, session })

      })

      const balanceState = await this.getBalance(chatId, threadId)
      const op = await this.ops.findOne({ _id })
      if (!op) {
        throw new Error("operation lost during " + type)
      }

      // notify all
      this.stateSubject.next({ chatId, threadId, balanceState, operation: op, type })
      return { operation: op, balanceState }


    } finally {
      await session.endSession()
    }
  };

  deleteOperation = async (id: string) => {
    const _id = new ObjectId(id);
    const op = await this.ops.findOne({ _id });
    if (!op) {
      throw new Error("Operation not found")
    }
    const { chatId, threadId } = op;
    if (op?.deleted) {
      // already deleted - just return current state
      const balanceState = await this.getBalance(chatId, threadId);
      return { operation: op, balanceState };
    } else {
      const session = MDBClient.startSession();
      try {
        await session.withTransaction(async () => {
          // revert balance
          const atoms = invertAtoms(opToAtoms(op));
          const updateBalances = atoms.reduce((upd, [acc, incr]) => {
            upd[`balance.${acc}`] = incr;
            return upd;
          }, {} as { [selector: string]: number });

          await this.balance.updateOne({ chatId, threadId }, {
            $inc: { ...updateBalances, seq: 1 }
          }, { session });

          // update after balance - check seq not changed
          const res = await this.ops.updateOne({ _id, seq: op.seq }, { $set: { deleted: true }, inc: { seq: 1 } }, { session })
          if (res.modifiedCount === 0) {
            // propbably seq updated concurrently - throw
            throw new Error("Error occured, try again later")
          }
          op.deleted = true;
          op.seq += 1;

        });
      } finally {
        await session.endSession();
      }

      const balanceState = await this.getBalance(chatId, threadId);

      // notify all
      this.stateSubject.next({ chatId, threadId, balanceState, operation: op, type: 'delete' })

      return { operation: op, balanceState };
    }
  }

  balanceCache = new Map<string, BalanceState>();
  getBalance = async (chatId: number, threadId: number | undefined): Promise<BalanceState> => {
    const savedBalance = (await this.balance.findOne({ chatId, threadId }))
    let balance: Balance
    let seq = 0
    if (savedBalance?.balance) {
      balance = Object.entries(savedBalance.balance).reduce((balance, [acc, sum]) => {
        balance.push({ pair: acc.split('-').map(uid => Number(uid)) as [number, number], sum })
        return balance
      }, [] as Balance)
      seq = savedBalance.seq
    } else {
      balance = []
    }
    const res = { seq, balance }
    this.balanceCache.set(`${chatId}_${threadId}`, res)
    return res
  }

  getBalanceCached = async (chatId: number, threadId: number | undefined) => {
    let balance = this.balanceCache.get(`${chatId}_${threadId}`)
    const balancePromsie = this.getBalance(chatId, threadId)
    if (!balance) {
      balance = await balancePromsie
    }
    return { balance, balancePromsie }
  }

  logCache = new Map<string, SavedOp[]>();
  getLog = async (chatId: number, threadId: number | undefined, limit = 500): Promise<SavedOp[]> => {
    const res = await this.ops.find({ chatId, threadId }, { limit, sort: { _id: -1 } }).toArray()
    this.logCache.set(`${chatId}-${threadId}-${limit}`, res)
    return res
  }

  getLogCached = async (chatId: number, threadId: number | undefined, limit = 500) => {
    let log = this.logCache.get(`${chatId}-${threadId}-${limit}`)
    const logPromise = this.getLog(chatId, threadId, limit)
    if (!log) {
      log = await logPromise
    }
    return { log, logPromise }
  }
}

type Atom = [string, number];
const atom = (src: number, dst: number, sum: number): Atom => {
  const flip = src > dst ? -1 : 1
  const account = [flip === 1 ? src : dst, flip === 1 ? dst : src].join('-')
  return [account, sum * flip]
}

const opToAtoms = (op: SavedOp | (ClientAPICommandOperation & { uid: number })) => {
  let atoms: Atom[]

  if (op.type === 'split') {

    atoms = splitOpToAtoms(op)
  } else if (op.type === 'transfer') {
    atoms = (op.uid !== op.dstUid) ? [atom(op.uid, op.dstUid, op.sum)] : []
  } else {
    throw new Error('unsupported opration')
  }
  return atoms
}

const splitOpToAtoms = (split: Omit<OperationSplit, 'id' | 'date'>): Atom[] => {
  const src = split.uid;
  const atoms: Atom[] = [];

  let sum = split.sum;
  console.log('int sum', sum);

  const rem = sum % split.uids.length;
  console.log('rem', rem);

  sum -= rem;
  console.log('sum-rem', rem);

  sum /= split.uids.length
  console.log('sum/len', sum);

  split.uids.forEach((dst, i) => {
    if (dst !== src) {
      console.log('adding part', dst, src, sum + (i < rem ? 1 : 0));
      atoms.push(atom(src, dst, sum + (i < rem ? 1 : 0)));
    }
  });

  return atoms;
}

const sumAtoms = (atoms: Atom[]) => {
  const byAccount = new Map<string, Atom>()
  atoms.forEach(([account, sum]) => {
    let atom = byAccount.get(account)
    if (!atom) {
      atom = [account, 0]
      byAccount.set(account, atom)
    }
    atom[1] += sum
  })
  return [...byAccount.values()]
}

const invertAtoms = (atoms: Atom[]) => {
  return atoms.map(([account, sum]) => [account, -sum] as Atom)
}
