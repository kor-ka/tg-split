import React from "react";
import { useSearchParams } from "react-router-dom";
import { OperationTransfer } from "../../entity";
import { useVMvalue } from "../utils/vm/useVM";
import { useNav, UsersProvider, ModelContext, BackButtopnController, CardLight, ListItem, MainButtopnController } from "./MainScreen";

export const AddTransferScreen = () => {
    const model = React.useContext(ModelContext)
    const nav = useNav()
    const sumRef = React.useRef<HTMLInputElement>(null)

    let [searchParams] = useSearchParams();

    const usersModule = React.useContext(UsersProvider)

    const editOpId = searchParams.get("editTrasfer")
    const editOp: OperationTransfer | undefined = model?.log.val?.find(t => t.type === 'split' && t.id === editOpId) as OperationTransfer | undefined

    const dst = useVMvalue(usersModule.getUser(editOp?.dstUid ?? Number(searchParams.get('uid'))))
    const initialSum = React.useMemo(() => editOp?.sum ?? Number(searchParams.get('sum')), [])

    const [loading, setLoading] = React.useState(false)
    const onClick = React.useCallback(() => {
        const sum = Number(sumRef.current?.value)
        if (sum === 0) {
            return
        }
        if (!loading) {
            setLoading(true)
            model?.commitOperation({ type: 'transfer', sum, id: model.nextId() + '', dstUid: dst.id, correction: editOp?.id })
                .catch(e => console.error(e))
                .then(() => nav(-1))
                .finally(() => setLoading(false))
        }
    }, [loading])
    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0px' }}>
            <CardLight><ListItem titile={`You → ${dst.fullName}`} /></CardLight>
            <input ref={sumRef} defaultValue={initialSum} autoFocus={true} type="number" inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
        </div>
        <MainButtopnController onClick={onClick} text={"Add payment"} progress={loading} />
    </>
}