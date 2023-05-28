export type User = {
    id: string;
    name: string;
    imageUrl?: string
    disabled?: boolean
}

export type Balance = { pair: [string, string], sum: number }[]

export type BalanceState = { balance: Balance, seq: number }

export type OperationBase = { id: string, uid: string, correction?: string }

export type OperationSplit = OperationBase & {
    type: 'split',
    uids: string[],
    sum: number
}
export type OperationTransfer = OperationBase & {
    type: 'transfer',
    title: string,
    dstUid: string,
    sum: number
}


export type Operation = OperationSplit | OperationTransfer

export type Log = Operation[]

export type FullState = {
    balance: BalanceState,
    log: Log,
    users: User[]
}