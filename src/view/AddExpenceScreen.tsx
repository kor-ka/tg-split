import React, { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Atom } from "../shared/atom";
import { Condition, OperationSplit, SharesCondition } from "../shared/entity";
import { splitToAtoms } from "../shared/splitToAtoms";
import { UserClient } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM";
import { VM } from "../utils/vm/VM";
import { BackButtopnController, Button, Card, CardLight, ListItem, MainButtopnController, ModelContext, showConfirm, UserContext, UsersProvider, WebApp, __DEV__ } from "./MainScreen"
import { useHandleOperation } from "./useHandleOperation";
import { formatSum } from "./utils/formatSum";

const describeCondition = (condition: Condition) => {
    if (condition.type === 'shares') {
        if (condition.shares > 1) {
            return `covers split part for ${condition.shares} persons`
        }
        return "covers own split part"
    } else if (condition.type === 'disabled') {
        return "not involved"
    }
    return "???"
}

const SharesConditionView = React.memo(({ condition, onConditionChange }: { condition: SharesCondition, onConditionChange: (condition: Condition) => void }) => {
    const sharesIncr = React.useCallback((incr: 1 | -1) => {
        let shares = (condition.shares += incr) || 1
        onConditionChange({ ...condition, shares })
    }, [condition, onConditionChange]);

    const sharesPlus = React.useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation()
        sharesIncr(1)
    }, [sharesIncr]);

    const sharesMinus = React.useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation()
        sharesIncr(-1)
    }, [sharesIncr]);

    return <ListItem style={{ marginBottom: 8 }}
        subtitle="split parts to cover"
        right={<>
            <button style={{ marginRight: 8, padding: '2px 8px', fontFamily: 'monospace', fontSize: '1.4em' }} onClick={sharesMinus} >−</button>
            {condition.shares}
            <button style={{ marginLeft: 8, padding: '2px 8px', fontFamily: 'monospace', fontSize: '1.4em' }} onClick={sharesPlus} >+</button>
        </>} />
})

const UserCheckListItem = React.memo(({ onConditionUpdated, disabled, userVm, sum, condition }: { userVm: VM<UserClient>, condition: Condition, sum: number, onConditionUpdated: (condition: Condition) => void, disabled: boolean }) => {
    const user = useVMvalue(userVm)
    const onClick = React.useCallback(() => {
        const nextCondition: Condition = condition.type === 'disabled' ? { uid: user.id, type: 'shares', shares: 1, extra: 0 } : { uid: user.id, type: 'disabled' };
        onConditionUpdated(nextCondition)
    }, [onConditionUpdated, user.id, condition]);

    const [showConditionDetails, setShowConditionDetails] = useState(false);
    React.useEffect(() => {
        if (condition.type === 'disabled') {
            setShowConditionDetails(false)
        }
    }, [condition]);

    const onSumClick = React.useCallback((e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation()
        if (condition.type !== 'disabled') {
            setShowConditionDetails(show => !show)
        }
    }, [condition]);

    const conditionDescription = React.useMemo(() => `${describeCondition(condition)}`, [condition])

    return <div onClick={disabled ? undefined : onClick}>
        <Card >
            <ListItem
                titile={user.fullName}
                subtitle={conditionDescription}
                right={
                    <>
                        <span onClick={onSumClick} style={{ marginRight: 8, fontSize: '1.2em' }}>{formatSum(sum)}</span>
                        <input checked={condition.type !== 'disabled'} readOnly={true} type="checkbox" disabled={disabled} style={{ transform: "scale(1.4)", accentColor: 'var(--tg-theme-button-color)' }} />
                    </>
                }
            />
            {(condition.type === 'shares') && showConditionDetails && <SharesConditionView condition={condition} onConditionChange={onConditionUpdated} />}
        </Card>
    </div>
})

const getDefaultCondition = (user: UserClient): Condition => {
    return user.disabled ? { uid: user.id, type: 'disabled' } : { uid: user.id, type: 'shares', shares: 1, extra: 0 }
}

export const AddExpenceScreen = () => {
    const [searchParams] = useSearchParams();
    const model = React.useContext(ModelContext);
    const userId = React.useContext(UserContext);

    const editTransactionId = searchParams.get("editExpense");
    const editTransaction: OperationSplit | undefined = editTransactionId ? model?.logModule.getOperationOpt(editTransactionId) : undefined;

    let disable = !!editTransaction?.deleted || (!!editTransaction && editTransaction.uid !== userId);

    const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
    const sumInputRef = React.useRef<HTMLInputElement>(null);

    const usersModule = React.useContext(UsersProvider);

    const [sum, setSum] = React.useState(editTransaction ? editTransaction.sum : 0)
    const [sumStr, setSumStr] = React.useState(formatSum(sum))
    const sumRef = React.useRef(sum)

    const onSumInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let num = 0
        try {
            num = Math.floor(Number(e.target.value.replace(',', '.')) * 100);
            num = Number.isNaN(num) ? 0 : num;
        } finally {
            if (num !== sumRef.current) {
                sumRef.current = num;
                setSum(num);
                onConditionUpdated();
            }
            setSumStr(e.target.value.startsWith('0') ? formatSum(num) : e.target.value);
        }
    }, [])


    const [{ conditions, vms, atoms }, setUserEntries] = React.useState(
        () => {
            const vms = [...usersModule.users.values()]
                .sort((a, b) =>
                    // bring current user up
                    (a.val.id === userId) ? -1 : (b.val.id === userId) ? 1 :
                        // push disabled to the end
                        (a.val.disabled === b.val.disabled) ? 0 : a.val.disabled ? 1 : -1);
            const sortedIds = vms.map(vm => vm.val.id);

            const conditions = vms.map(({ val: user }) => {
                if (editTransaction) {
                    return editTransaction?.conditions.find(c => c.uid === user.id) ?? { type: 'disabled' as const, uid: user.id };
                } else {
                    return getDefaultCondition(user);
                }
            });

            // TODO: unify initial and update calc?
            const atoms = splitToAtoms(userId ?? -1, sum, conditions, false)
                // [2][1] is dst user id in atom
                .sort((a, b) => sortedIds.indexOf(a[2][1]) - sortedIds.indexOf(b[2][1]));
            return { sortedIds, conditions, vms, atoms };

        }
    );

    const onConditionUpdated = React.useCallback((upd?: Condition) => {
        setUserEntries(({ sortedIds, conditions, vms }) => {
            const conditionsNext = conditions.map(c => c.uid === upd?.uid ? upd : c);
            const atoms = splitToAtoms(userId ?? -1, sumRef.current, conditionsNext, false)
                // [2][1] is dst user id in atom
                .sort((a, b) => sortedIds.indexOf(a[2][1]) - sortedIds.indexOf(b[2][1]));
            return { sortedIds, conditions: conditionsNext, vms, atoms }
        });
    }, []);


    const [handleOperation, loading] = useHandleOperation();

    disable = disable || loading;

    const onClick = React.useCallback(() => {
        console.log("submit click", sumInputRef.current?.value);
        const sum = Math.floor(Number(sumInputRef.current?.value.replace(',', '.')) * 100);
        if (model) {
            handleOperation(
                model.commitOperation({
                    type: editTransaction ? 'update' : 'create',
                    operation: {
                        type: 'split',
                        sum,
                        id: editTransaction?.id ?? model.nextId() + '',
                        description: descriptionRef.current?.value,
                        conditions
                    }
                }))
        }
    }, [model, conditions, editTransaction, handleOperation]);


    const onDeleteClick = React.useCallback(() => {
        showConfirm("Delete expense?\nThis can not be undone.", (confirmed) => {
            if (confirmed && model && editTransactionId) {
                handleOperation(
                    model.commitOperation({
                        type: 'delete',
                        id: editTransactionId
                    }))
            }
        })
    }, [model, editTransactionId, handleOperation])

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0px', whiteSpace: 'pre-wrap' }}>
            <textarea ref={descriptionRef} defaultValue={editTransaction?.description} disabled={disable} style={{ flexGrow: 1, padding: '8px 28px' }} placeholder={disable ? "No description" : "What did you pay for?"} />
            <input ref={sumInputRef} value={sumStr} onChange={onSumInputChange} autoFocus={true} disabled={disable} inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            <CardLight><ListItem subtitle="Split among: " /></CardLight>
            {conditions.map((c, i) => <UserCheckListItem key={c.uid} userVm={vms[i]} condition={conditions[i]} onConditionUpdated={onConditionUpdated} sum={atoms[i][1]} disabled={disable} />)}
            <Card><ListItem subtitle={`Missing someone?\nIf there are users not displayed here (but they are in the group), ask them to write a message to the group or open this app.\nDon't worry if you can't add them right now, you can still add the expense and edit the list of involved users later on.`} /></Card>
            {editTransaction && <Button disabled={disable} onClick={onDeleteClick}><ListItem titleStyle={{ color: "var(--text-destructive-color)", alignSelf: 'center' }} titile="DELETE EXPENSE" /></Button>}
        </div>
        <MainButtopnController onClick={onClick} text={(editTransaction ? 'EDIT' : 'ADD') + ' EXPENSE'} progress={loading} isActive={!disable} />
    </>
}
