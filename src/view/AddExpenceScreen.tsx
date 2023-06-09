import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { OperationSplit } from "../../entity";
import { useVMvalue } from "../utils/vm/useVM";
import { BackButtopnController, Card, CardLight, ListItem, MainButtopnController, ModelContext, showAlert, useNav, UserContext, UsersProvider, WebApp, __DEV__ } from "./MainScreen"

const UserCheckListItem = React.memo(({ id, checked, onUserClick, disabled }: { id: number, checked: boolean, onUserClick: (id: number) => void, disabled: boolean }) => {
    const usersModule = React.useContext(UsersProvider)
    const user = useVMvalue(usersModule.getUser(id))
    const onClick = React.useCallback(() => {
        onUserClick(id)
    }, [onUserClick, id])
    return <div onClick={disabled ? undefined : onClick}>
        <Card>
            <ListItem titile={user.fullName} right={<input checked={checked} readOnly={true} type="checkbox" disabled={disabled} style={{ transform: "scale(1.4)", filter: 'grayscale(1)' }} />} />
        </Card>
    </div>
})



export const AddExpenceScreen = () => {
    const nav = useNav();
    const [searchParams] = useSearchParams();
    const model = React.useContext(ModelContext);
    const userId = React.useContext(UserContext);

    const editTransactionId = searchParams.get("editExpense");
    const editTransaction: OperationSplit | undefined = editTransactionId ? model?.logModule.getOperationOpt(editTransactionId) : undefined;

    const disable = !!editTransaction?.deleted || (!!editTransaction && editTransaction.uid !== userId);

    const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
    const sumRef = React.useRef<HTMLInputElement>(null);

    const usersModule = React.useContext(UsersProvider);

    const [checked, setChecked] = React.useState<Set<number>>(
        editTransaction ?
            new Set(editTransaction.uids) :
            new Set([...usersModule.users.values()]
                .filter(u => !u.val.disabled).map(u => u.val.id))
    );

    const onUserClick = React.useCallback((id: number) => {
        setChecked(checked => {
            const res = new Set(checked);
            if (res.has(id)) {
                res.delete(id);
            } else {
                res.add(id);
            }
            WebApp?.HapticFeedback.selectionChanged()
            return res;
        })
    }, []);

    const [loading, setLoading] = React.useState(false);
    const onClick = React.useCallback(() => {
        console.log("submit click", sumRef.current?.value);
        const sum = Math.floor(Number(sumRef.current?.value.replace(',', '.')) * 100);
        if (!loading) {
            setLoading(true);
            model?.commitOperation({ type: editTransaction ? 'update' : 'create', operation: { type: 'split', sum, id: editTransaction?.id ?? model.nextId() + '', description: descriptionRef.current?.value, uids: [...checked.values()] } })
                .then(() => {
                    WebApp?.HapticFeedback.notificationOccurred("success");
                    nav(-1);
                })
                .catch(e => {
                    console.error(e);
                    WebApp?.HapticFeedback.notificationOccurred("error");
                    if (e instanceof Error) {
                        showAlert(e.message);
                    } else {
                        console.error(e);
                    }

                })
                .finally(() => setLoading(false));
        }
    }, [loading, checked]);

    const sorted = React.useMemo(() => [...usersModule.users.values()].sort((a, b) => (a.val.disabled === b.val.disabled) ? 0 : a.val.disabled ? 1 : -1), [usersModule.users]);

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0px', whiteSpace: 'pre-wrap' }}>
            <textarea ref={descriptionRef} defaultValue={editTransaction?.description} disabled={disable} style={{ flexGrow: 1, padding: '8px 28px' }} placeholder={disable ? "No description" : "Enter a description"} />
            <input ref={sumRef} defaultValue={editTransaction ? editTransaction.sum / 100 : undefined} autoFocus={true} disabled={disable} inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            <CardLight><ListItem subtitle="Split among: " /></CardLight>
            {sorted.map(u => <UserCheckListItem id={u.val.id} key={u.val.id} onUserClick={onUserClick} checked={checked.has(u.val.id)} disabled={disable} />)}
            <Card><ListItem subtitle={`Missing someone?\nIf there are users not displayed here (but they are in the group), ask them to write a message to the group or open this app.`} /></Card>
        </div>
        <MainButtopnController onClick={onClick} text={(editTransaction ? 'Edit' : 'Add') + ' expense'} progress={loading} isActive={!disable} />
    </>
}
