import { Balance as SavedBalance, BALANCE, OP, SavedOp, OmitUnion } from "./splitStore";
import { singleton } from "tsyringe";
import { Operation, OperationSplit, BalanceState, Balance } from "../../../../entity";
import { MDBClient } from "../../utils/MDB";
import { ObjectId } from "mongodb";
import { Subject } from "../../utils/subject";

type StateListener = (balance: BalanceState, op: Operation) => void

@singleton()
export class SplitModule {
  private balance = BALANCE();
  private ops = OP();

  readonly stateSubject = new Subject<{ chatId: number, balanceState: BalanceState, operation: Operation }>;

  commitOperation = async (chatId: number, operation: Operation) => {
    const session = MDBClient.startSession()
    try {
      await session.withTransaction(async () => {
        // Write op
        const { id, uid, correction, ...op } = operation;
        const insertedId = (await this.ops.insertOne({ ...op, uid, idempotencyKey: `${uid}_${id}`, chatId, correction: correction ? new ObjectId(correction) : undefined })).insertedId
        operation.id = insertedId.toHexString()

        // Update balance
        let atoms = opToAtoms(operation)

        if (operation.correction) {
          let srcOp = (await this.ops.findOne({ _id: new ObjectId(operation.correction) }))!
          const origAtoms = opToAtoms(srcOp)
          atoms = sumAtoms([...atoms, ...invertAtoms(origAtoms)])
        }

        const updateBalances = atoms.reduce((upd, [acc, incr]) => {
          upd[`balance.${acc}`] = incr
          return upd
        }, {} as { [selector: string]: number })

        await this.balance.updateOne({ chatId }, {
          chatId,
          $inc: { ...updateBalances, seq: 1 }
        }, { upsert: true })

      })

      const balanceState = await this.getBalance(chatId)
      // notify
      this.stateSubject.next({ chatId, balanceState, operation })
      return { operation, balanceState }

    } finally {
      await session.endSession()
    }

  };

  balanceCache = new Map<number, BalanceState>();
  getBalance = async (chatId: number): Promise<BalanceState> => {
    const savedBalance = (await this.balance.findOne({ chatId }))
    let balance: Balance
    let seq = 0
    if (savedBalance) {
      balance = Object.entries(savedBalance.balance).reduce((balance, [acc, sum]) => {
        balance.push({ pair: acc.split('-') as [string, string], sum })
        return balance
      }, [] as Balance)
      seq = savedBalance.seq
    } else {
      balance = []
    }
    const res = { seq, balance }
    this.balanceCache.set(chatId, res)
    return res
  }

  getBalanceCached = async (chatId: number) => {
    let balance = this.balanceCache.get(chatId)
    const balancePromsie = this.getBalance(chatId)
    if (!balance) {
      balance = await balancePromsie
    }
    return { balance, balancePromsie }
  }

  logCache = new Map<string, SavedOp[]>();
  getLog = async (chatId: number, limit = 500): Promise<SavedOp[]> => {
    const res = await this.ops.find({ chatId }, { limit, sort: { _id: -1 } }).toArray()
    this.logCache.set(`${chatId}-${limit}`, res)
    return res
  }

  getLogCached = async (chatId: number, limit = 500) => {
    let log = this.logCache.get(`${chatId}-${limit}`)
    const logPromise = this.getLog(chatId, limit)
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

const opToAtoms = (op: SavedOp | Operation) => {
  let atoms: Atom[]

  if (op.type === 'split') {

    atoms = splitOpToAtoms(op)
  } else if (op.type === 'transfer') {
    atoms = [atom(op.uid, op.dstUid, op.sum)]
  } else {
    throw new Error('unsupported opration')
  }
  return atoms
}

const splitOpToAtoms = (split: Omit<OperationSplit, 'id' | 'correction'>): Atom[] => {
  const dst = split.uid
  const atoms: Atom[] = []
  // TODO: use math sutable for finacial operations
  const sum = -(split.sum / split.uids.length)
  split.uids.forEach(src => {
    if (src !== dst) {
      atoms.push(atom(src, dst, sum))
    }
  })

  return atoms
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