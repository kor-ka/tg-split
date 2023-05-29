export type User = {
    id: number;
    name: string;
    imageUrl?: string
    disabled?: boolean
}

export type Balance = { pair: [string, string], sum: number }[]

export type BalanceState = { balance: Balance, seq: number }

export type OperationBase = { id: string, uid: number, correction?: string }

export type OperationSplit = OperationBase & {
    type: 'split',
    uids: number[],
    sum: number
}
export type OperationTransfer = OperationBase & {
    type: 'transfer',
    title: string,
    dstUid: number,
    sum: number
}


export type Operation = OperationSplit | OperationTransfer

export type Log = Operation[]

export type FullState = {
    balanceState: BalanceState,
    log: Log,
    users: User[]
}