import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Condition, OperationSplit, SharesCondition } from "../shared/entity";
import { splitToAtoms } from "../shared/splitToAtoms";
import { UserClient } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM";
import { VM } from "../utils/vm/VM";
import { BackButtopnController, Button, Card, CardLight, ListItem, MainButtopnController, ModelContext, showConfirm, useNav, UserContext, UsersProvider, WebApp, __DEV__ } from "./MainScreen"
import { useHandleOperation } from "./useHandleOperation";
import { formatSum } from "./utils/formatSum";

const describeCondition = (user: UserClient, condition: Condition) => {
    if (condition.type === 'shares') {
        if (condition.shares > 1) {
            return `covers split part for ${condition.shares} persons 〉`
        }
        return "covers own split part 〉"
    } else if (condition.type === 'disabled') {
        return user.disabled ? "not in group" : "not involved"
    }
    return "???"
}

const SharesConditionView = React.memo(({ condition, onConditionChange }: { condition: SharesCondition, onConditionChange: (condition: Condition) => void }) => {
    const sharesIncr = React.useCallback((incr: 1 | -1) => {
        let shares = (condition.shares + incr) || 1;
        onConditionChange({ ...condition, shares });
        WebApp?.HapticFeedback.selectionChanged();
    }, [condition, onConditionChange]);

    const sharesPlus = React.useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation();
        sharesIncr(1);
    }, [sharesIncr]);

    const sharesMinus = React.useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation();
        sharesIncr(-1);
    }, [sharesIncr]);

    const preventParentClick = React.useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
    }, []);

    return <ListItem onClick={preventParentClick} style={{ marginBottom: 8 }}
        subtitle="split parts to cover"
        right={<>
            <button style={{ marginRight: 8, padding: '2px 8px', fontFamily: 'monospace', fontSize: '1.4em', fontWeight: 900 }} onClick={sharesMinus} >−</button>
            {condition.shares}
            <button style={{ marginLeft: 8, padding: '2px 8px', fontFamily: 'monospace', fontSize: '1.4em', fontWeight: 900 }} onClick={sharesPlus} >+</button>
        </>} />
})

const UserCheckListItem = React.memo(({ onConditionUpdated, disabled, userVm, sum, condition }: { userVm: VM<UserClient>, condition: Condition, sum: number, onConditionUpdated: (condition: Condition) => void, disabled: boolean }) => {
    const user = useVMvalue(userVm);
    const onClick = React.useCallback(() => {
        const nextCondition: Condition = condition.type === 'disabled' ? { uid: user.id, type: 'shares', shares: 1, extra: 0 } : { uid: user.id, type: 'disabled' };
        onConditionUpdated(nextCondition);
        WebApp?.HapticFeedback.selectionChanged();
    }, [onConditionUpdated, user.id, condition]);

    const [isConditionShown, setIsShowConditionShown] = useState(false);
    React.useEffect(() => {
        if (condition.type === 'disabled') {
            setIsShowConditionShown(false);
        }
    }, [condition]);

    const showCondition = React.useCallback((e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation();
        if (condition.type !== 'disabled') {
            setIsShowConditionShown(show => !show);
        }
    }, [condition]);

    const conditionDescription = React.useMemo(() => `${describeCondition(user, condition)}`, [condition]);

    return <Card onClick={!disabled ? showCondition : undefined}>
        <ListItem
            titile={user.fullName}
            subtitle={conditionDescription}
            right={
                <>
                    <span style={{ marginRight: 8, fontSize: '1.2em' }}>{formatSum(sum)}</span>
                    <input checked={condition.type !== 'disabled'} onClick={onClick} readOnly={true} type="checkbox" disabled={disabled} style={{ width: 20, height: 20, accentColor: 'var(--tg-theme-button-color)' }} />
                </>
            }
        />
        {(condition.type === 'shares') && <div style={{ transition: `max-height ${isConditionShown ? 'ease-in' : 'ease-out'} 150ms`, maxHeight: isConditionShown ? 150 : 0, overflow: 'hidden' }}><SharesConditionView condition={condition} onConditionChange={onConditionUpdated} /></div>}
    </Card>
})

const getDefaultCondition = (user: UserClient): Condition => {
    return user.disabled ? { uid: user.id, type: 'disabled' } : { uid: user.id, type: 'shares', shares: 1, extra: 0 }
}

const UserPickerEntry = React.memo(({ id, onClick }: { id: number, onClick: (id: number) => void }) => {
    const usersModule = React.useContext(UsersProvider);
    const user = useVMvalue(usersModule.getUser(id));
    const onCardClick = React.useCallback(() => {
        onClick(id)
    }, [id, onClick])
    return <Card onClick={onCardClick} style={{ margin: 4, backgroundColor: 'var(--tg-theme-bg-color)' }}><ListItem titile={user.fullName} /></Card>
})

const UserPicker = React.memo(({ show, showGroupOption, onUserClick, onGroupClick }: { show: boolean, showGroupOption: boolean, onUserClick: (id: number) => void, onGroupClick?: () => void }) => {
    const usersModule = React.useContext(UsersProvider);
    const userId = React.useContext(UserContext);
    const [vms] = React.useState(
        () => {
            const vms = [...usersModule.users.values()]
                .sort((a, b) =>
                    // bring current user up
                    (a.val.id === userId) ? -1 : (b.val.id === userId) ? 1 :
                        (a.val.disabled === b.val.disabled) ?
                            // alphabet sort
                            a.val.fullName.localeCompare(b.val.fullName) :
                            // push disabled to the end
                            a.val.disabled ? 1 : -1);
            return vms;

        }
    );

    const onGroupCardClick = React.useCallback(() => {
        onGroupClick?.();
    }, [onGroupClick]);

    return <div style={{ maxHeight: show ? 300 : 0, transition: `max-height ${show ? 'ease-in' : 'ease-out'} 150ms`, display: 'flex', flexDirection: 'column', padding: '0 16px', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div style={{ display: 'flex', padding: '8px 0', flexDirection: 'row', flexWrap: 'wrap', overflow: show ? 'scroll' : 'hidden' }}>
            {vms.map(u => <UserPickerEntry key={u.val.id} id={u.val.id} onClick={onUserClick} />)}
            {showGroupOption && <Card onClick={onGroupCardClick} style={{ margin: 4, backgroundColor: 'var(--tg-theme-bg-color)' }}><ListItem titile="Group" /></Card>}
        </div>
    </div >
})

export const AddExpenceScreen = () => {
    // 
    // general
    // 
    const nav = useNav()
    const [searchParams] = useSearchParams();
    const model = React.useContext(ModelContext);
    const userId = React.useContext(UserContext);

    const editTransactionId = searchParams.get("editExpense");
    const editTransaction: OperationSplit | undefined = editTransactionId ? model?.logModule.getOperationOpt(editTransactionId) : undefined;

    let disable = !!editTransaction?.deleted;

    const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
    const sumInputRef = React.useRef<HTMLInputElement>(null);

    const usersModule = React.useContext(UsersProvider);


    // 
    // sum
    // 
    const [sum, setSum] = React.useState(editTransaction ? editTransaction.sum : 0)
    const [sumStr, setSumStr] = React.useState(editTransaction ? formatSum(sum, true, false) : '')
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
            setSumStr(e.target.value);
        }
    }, [])

    // 
    // src/dst 
    // 
    const [srcUserId, setSrcUserId] = React.useState(editTransaction?.uid ?? userId ?? NaN);
    const [showUserPicker, setShowUserPicker] = React.useState<'src' | 'dst' | false>(false);
    const pickSrc = React.useCallback(() => {
        setShowUserPicker(picker => picker === 'src' ? false : 'src');
    }, []);
    const pickDst = React.useCallback(() => {
        setShowUserPicker(picker => picker === 'dst' ? false : 'dst');
    }, []);
    const onUserPicked = React.useCallback((uid: number) => {
        setShowUserPicker((picker) => {
            if (picker === 'src') {
                setSrcUserId(uid)
            } else if (picker === 'dst') {
                nav(`/tg/addPayment?src=${srcUserId}&dst=${uid}&sum=${sum}`)
            }
            return false
        })
    }, [srcUserId, sum])
    const srcUser = useVMvalue(usersModule.getUser(srcUserId));


    // 
    // conditions
    // 
    const [{ conditions, vms, atoms }, setUserEntries] = React.useState(
        () => {
            const vms = [...usersModule.users.values()]
                .sort((a, b) =>
                    // bring current user up
                    (a.val.id === userId) ? -1 : (b.val.id === userId) ? 1 :
                        (a.val.disabled === b.val.disabled) ?
                            // alphabet sort
                            a.val.fullName.localeCompare(b.val.fullName) :
                            // push disabled to the end
                            a.val.disabled ? 1 : -1);
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

    const onConditionUpdated = React.useCallback((upd?: Condition, selectAll?: boolean) => {
        setUserEntries(({ sortedIds, conditions, vms }) => {
            let conditionsNext = conditions;
            if (upd) {
                conditionsNext = conditionsNext.map(c => c.uid === upd?.uid ? upd : c);
            }
            if (selectAll !== undefined) {
                conditionsNext = conditionsNext.map(c => {
                    if (selectAll) {
                        return c.type === 'disabled' ? getDefaultCondition(usersModule.getUser(c.uid).val) : c
                    } else {
                        return { type: 'disabled', uid: c.uid }
                    }
                })
            }
            const atoms = splitToAtoms(userId ?? -1, sumRef.current, conditionsNext, false)
                // [2][1] is dst user id in atom
                .sort((a, b) => sortedIds.indexOf(a[2][1]) - sortedIds.indexOf(b[2][1]));
            return { sortedIds, conditions: conditionsNext, vms, atoms }
        });
    }, []);


    const [handleOperation, loading] = useHandleOperation();

    disable = disable || loading;

    // 
    // actions
    // 
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
                        uid: srcUserId,
                        description: descriptionRef.current?.value,
                        conditions
                    }
                }))
        }
    }, [model, conditions, editTransaction, handleOperation, srcUserId]);


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

    const someSelected = React.useMemo(() => !!conditions.find(c => c.type !== 'disabled'), [conditions])
    const onAllCheckClick = React.useCallback(() => {
        onConditionUpdated(undefined, !someSelected)
        WebApp?.HapticFeedback.selectionChanged();
    }, [someSelected])

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0px', whiteSpace: 'pre-wrap' }}>

            <div style={{ flexDirection: 'row', paddingLeft: 4 }}>
                <Button onClick={pickSrc} style={{ marginRight: 8 }}><ListItem titile={srcUser.name} /></Button>
                →
                <Button onClick={pickDst} disabled={!!editTransactionId} style={{ marginLeft: 8 }}><ListItem titile="Group" /></Button>
            </div>
            <UserPicker show={!!showUserPicker} showGroupOption={showUserPicker === 'dst'} onUserClick={onUserPicked} onGroupClick={pickDst} />

            <input ref={sumInputRef} value={sumStr} onChange={onSumInputChange} autoFocus={!editTransaction} disabled={disable} inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            <textarea ref={descriptionRef} defaultValue={editTransaction?.description} disabled={disable} style={{ flexGrow: 1, padding: '8px 28px' }} placeholder={disable ? "No description" : `What did ${srcUser.name} pay for?`} />
            <CardLight>
                <ListItem subtitle="Split among: " right={
                    <input onClick={onAllCheckClick} checked={someSelected} readOnly={true} type="checkbox" disabled={disable} style={{ width: 20, height: 20, accentColor: 'var(--tg-theme-button-color)' }} />
                } />
            </CardLight>
            {conditions.map((c, i) => <UserCheckListItem key={c.uid} userVm={vms[i]} condition={conditions[i]} onConditionUpdated={onConditionUpdated} sum={atoms[i][1]} disabled={disable} />)}
            <CardLight><ListItem subtitle={`Missing someone?\nIf there are users not displayed here (but they are in the group), ask them to write a message to the group or open this app.\n${!editTransaction ? `Don't worry if you can't add them right now, you can still add the expense and edit the list of involved users later on.` : ''}`} /></CardLight>
            {editTransaction && <Button disabled={disable} onClick={onDeleteClick}><ListItem titleStyle={{ color: "var(--text-destructive-color)", alignSelf: 'center' }} titile="DELETE EXPENSE" /></Button>}
        </div>
        <MainButtopnController onClick={onClick} text={(editTransaction ? 'EDIT' : 'ADD') + ' EXPENSE'} progress={loading} isActive={!disable && (sum !== 0)} />
    </>
}
