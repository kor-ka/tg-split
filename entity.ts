export type User = {
    id: number;
    name: string;
    lastname?: string;
    username?: string;
    imageUrl?: string;
    disabled: boolean;
}

export type Balance = { pair: [number, number], sum: number }[]

export type BalanceState = { balance: Balance, seq: number }

export type OperationBase = { id: string, uid: number, correction?: string, corrected?: boolean }

export type OperationSplit = OperationBase & {
    type: 'split',
    uids: number[],
    sum: number,
    description?: string
}
export type OperationTransfer = OperationBase & {
    type: 'transfer',
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