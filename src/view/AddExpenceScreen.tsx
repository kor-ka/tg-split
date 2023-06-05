import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { OperationSplit } from "../../entity";
import { useVMvalue } from "../utils/vm/useVM";
import { BackButtopnController, Card, CardLight, ListItem, MainButtopnController, ModelContext, useNav, UsersProvider } from "./MainScreen"

const UserCheckListItem = React.memo(({ id, checked, onUserClick }: { id: number, checked: boolean, onUserClick: (id: number) => void }) => {
    const usersModule = React.useContext(UsersProvider)
    const user = useVMvalue(usersModule.getUser(id))
    const onClick = React.useCallback(() => {
        onUserClick(id)
    }, [onUserClick, id])
    return <div onClick={onClick}>
        <Card>
            <ListItem titile={user.fullName} right={<input checked={checked} readOnly={true} type="checkbox" style={{ transform: "scale(1.4)", filter: 'grayscale(1)' }} />} />
        </Card>
    </div>
})



export const AddExpenceScreen = () => {
    const nav = useNav()
    const [searchParams] = useSearchParams();
    const model = React.useContext(ModelContext)

    const editTransactionId = searchParams.get("editExpense")
    const editTransaction: OperationSplit | undefined = editTransactionId ? model?.logModule.getOperationOpt(editTransactionId) : undefined

    const descriptionRef = React.useRef<HTMLInputElement>(null)
    const sumRef = React.useRef<HTMLInputElement>(null)

    const usersModule = React.useContext(UsersProvider)

    const [checked, setChecked] = React.useState<Set<number>>(
        editTransaction ?
            new Set(editTransaction.uids) :
            new Set([...usersModule.users.values()].sort((a) => a.val.disabled ? -1 : 0).filter(u => !u.val.disabled).map(u => u.val.id))
    )

    const onUserClick = React.useCallback((id: number) => {
        setChecked(checked => {
            const res = new Set(checked)
            if (res.has(id)) {
                res.delete(id)
            } else {
                res.add(id)
            }
            return res
        })
    }, [])

    const [loading, setLoading] = React.useState(false)
    const onClick = React.useCallback(() => {
        const sum = Number(sumRef.current?.value)
        if (sum === 0) {
            return
        }
        if (!loading) {
            setLoading(true)
            model?.commitOperation({ type: 'split', sum, id: model.nextId() + '', correction: editTransaction?.id, description: descriptionRef.current?.value, uids: [...checked.values()] })
                .catch(e => console.error(e))
                .then(() => nav(-1))
                .finally(() => setLoading(false))
        }
    }, [loading, checked])

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0px' }}>
            <input ref={descriptionRef} defaultValue={editTransaction?.description} style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="Enter a description" />
            <input ref={sumRef} defaultValue={editTransaction?.sum} autoFocus={true} type="number" inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            <CardLight><ListItem subtitle="Split across: " /></CardLight>
            {[...usersModule.users.values()].map(u => <UserCheckListItem id={u.val.id} key={u.val.id} onUserClick={onUserClick} checked={checked.has(u.val.id)} />)}
        </div>
        <MainButtopnController onClick={onClick} text={(editTransaction ? 'Edit' : 'Add') + ' expense'} progress={loading} />
    </>
}
