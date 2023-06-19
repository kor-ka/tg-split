import { OmitUnion, Optional } from "./types";


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
export type SharesCondition = ConditionBase & {
    type: 'shares',
    shares: number,

} & ExtraCondition;
export type Condition = SharesCondition | DisabledCondition;

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
export type ClientAPICommandCreateOperation = OmitUnion<Operation, 'edited' | 'deleted' | 'date'>
// OMG
export type ClientAPICommandUpdateOperation = OmitUnion<Optional<OperationSplit, 'description' | 'sum'> | OperationTransfer, 'edited' | 'deleted' | 'date'>
export type ClientApiCreateCommand = { type: 'create', operation: ClientAPICommandCreateOperation }
export type ClientApiUpdateCommand = { type: 'update', operation: ClientAPICommandUpdateOperation }
export type ClientAPICommand =
    ClientApiCreateCommand |
    ClientApiUpdateCommand |
    { type: 'delete', id: string };
