import { OmitUnion } from "./types";

// 
// Abstract 
// 
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

export type OperationBase = { id: string, uid: number, date: number, edited?: boolean, deleted?: boolean }

export type OperationSplit = OperationBase & {
    type: 'split',
    conditions: Condition[],
    uids?: number[],
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

type ExtraCondition = { extra: number };
type ConditionBase = { uid: number };
export type DisabledCondition = ConditionBase & {
    type: 'disabled',
};
export type FixedCondition = ConditionBase & {
    type: 'fixed',
    sum: number
};
export type SharesCondition = ConditionBase & {
    type: 'shares',
    shares: number,

} & ExtraCondition;
export type Condition = FixedCondition | SharesCondition | DisabledCondition;

// 
// Client API
// 
export type FullState = {
    balanceState: BalanceState,
    log: Log,
    users: User[]
}

export type StateUpdate = {
    type: 'create' | 'update' | 'delete'
    balanceState: BalanceState,
    operation: Operation,
}

// 
// Server API
// 
export type ClientAPICommandOperation = OmitUnion<Operation, 'uid' | 'edited' | 'deleted' | 'date'>
export type ClientAPICommand =
    { type: 'create' | 'update', operation: ClientAPICommandOperation } |
    { type: 'delete', id: string };
