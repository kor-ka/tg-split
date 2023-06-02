import React, { useCallback } from "react";
import { Balance, Log, OperationSplit, OperationTransfer } from "../../entity"
import { SessionModel } from "../model/SessionModel"
import { UsersModule } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM"
import {
    useLocation as loc,
    useNavigate as nav, useSearchParams
} from "react-router-dom";

export let __DEV__ = false
let WebApp: any = undefined
if (typeof window !== "undefined") {
    __DEV__ = window.location.hostname.indexOf("localhost") >= 0
    WebApp = (window as any).Telegram.WebApp
}

export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule());

const useNav = () => {
    if (typeof window !== "undefined") {
        return nav()
    } else {
        return () => { }
    }
}

const useLoc = () => {
    if (typeof window !== "undefined") {
        return loc()
    } else {
        return { key: "default" }
    }
}

export const MainScreen = () => {
    const model = React.useContext(ModelContext)
    return model ? <MainScreenWithModel model={model} /> : null
}

const MainScreenWithModel = ({ model }: { model: SessionModel }) => {
    const balance = useVMvalue(model.balance)
    const log = useVMvalue(model.log)
    return <MainScreenView balance={balance?.balance} log={log} />
}

export const MainScreenView = ({ balance, log }: { balance?: Balance, log?: Log }) => {
    const nav = useNav()
    return <div style={{ padding: "8px 0px" }}>
        <BackButtopnController />
        <BalanceView balance={balance} />
        <LogView log={log} />
        {/* <button onClick={() => nav("/tg/addPayment")} >Add payment</button> */}
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"Add expence"} />
    </div>
}

const Card = ({ children }: { children: any }) => {
    return <div style={{ margin: '8px 16px', padding: 4, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16 }}>{children}</div>
}

const CardLight = ({ children }: { children: any }) => {
    return <div style={{ margin: '0px 20px', }}>{children}</div>
}

const ListItem = ({ titile: title, subtitle, right }: { titile?: string, subtitle?: string, right?: React.ReactNode }) => {
    return <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'space-between', padding: 4, alignItems: 'center' }}>
        <div style={{ display: 'flex', padding: '2px 0px', flexDirection: "column", flexShrink: 1, minWidth: 0 }}>
            {!!title && <div style={{ padding: '2px 4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>}
            {!!subtitle && <div style={{ padding: '2px 4px', fontSize: '0.8em', color: "var(--tg-theme-hint-color)" }}>{subtitle}</div>}
        </div>
        <div style={{ padding: '4px 16px', flexShrink: 0, alignItems: 'center' }}>{right}</div>
    </div>
}

const BalanceEntry = ({ balance }: { balance: Balance[0] }) => {
    const usersModule = React.useContext(UsersProvider)
    const user = useVMvalue(usersModule.getUser(balance.pair[1]))
    const title = React.useMemo(() => {
        const youOwe = balance.sum < 0;
        return `${youOwe ? 'You' : user.name} → ${youOwe ? user.name : 'you'}`

    }, [balance])
    const subtitle = React.useMemo(() => {
        const youOwe = balance.sum < 0;
        return `${youOwe ? 'You' : user.fullName} owe${youOwe ? '' : 's'} ${youOwe ? user.fullName : 'you'}`

    }, [balance])

    const nav = useNav()
    const navigateToAddPayment = React.useCallback(() => {
        nav(`/tg/addPayment?uid=${user.id}&sum=${Math.abs(balance.sum)}`)
    }, [nav, user.id])
    return <div onClick={balance.sum < 0 ? navigateToAddPayment : undefined}>
        <Card>
            <ListItem titile={title} subtitle={subtitle} right={<span style={{ fontSize: '1.4em' }}>{(balance.sum).toString()}</span>} />
        </Card>
    </div>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    return <>{balance?.map(e =>
        <BalanceEntry key={e.pair.join('-')} balance={e} />
    ) ?? <Card> <ListItem titile={"✨ All settle up ✨"}/> </Card> }</>
}

const SplitLogItem = ({ op }: { op: OperationSplit }) => {
    const usersModule = React.useContext(UsersProvider)
    const actor = useVMvalue(usersModule.getUser(op.uid))
    // extract as components? 
    // TODO: test many - should not affect summ
    const fullNames = React.useMemo(() => {
        return op.uids.map((uid) => usersModule.getUser(uid).val.fullName).join(', ')
    }, [...op.uids])
    const namesShort = React.useMemo(() => {
        return op.uids.length > 2 ? `${op.uids.length} persons` : op.uids.map((uid) => usersModule.getUser(uid).val.name).join(', ')
    }, [...op.uids])

    const subtitle = React.useMemo(() => {
        return [op.description?.trim(), `Splitted among: ${fullNames}`].filter(Boolean).join('. ')
    }, [fullNames, op.description])

    return <CardLight>
        <ListItem titile={`⚡️ ${actor.name} → ${namesShort}`} subtitle={subtitle} right={<span style={{ fontSize: '1.4em' }}>{op.sum?.toString()}</span>} />
    </CardLight>
}

const TransferLogItem = ({ op }: { op: OperationTransfer }) => {
    const usersModule = React.useContext(UsersProvider)
    const srcuser = useVMvalue(usersModule.getUser(op.uid))
    const dstuser = useVMvalue(usersModule.getUser(op.dstUid))
    const subtitle = React.useMemo(() => `${srcuser.fullName} payed ${op.sum} to ${dstuser.fullName}`, [srcuser, dstuser])
    return <CardLight>
        <ListItem titile={`💸 ${srcuser.name} → ${dstuser.name}`} subtitle={subtitle} right={<span style={{ fontSize: '1.4em' }}>{(op.sum).toString()}</span>} />
    </CardLight>
}

const LogView = ({ log }: { log?: Log }) => {
    return <>{log?.map(op => op.type === 'split' ? <SplitLogItem key={op.id} op={op} /> : op.type === 'transfer' ? <TransferLogItem key={op.id} op={op} /> : null)}</>
}


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
    const model = React.useContext(ModelContext)
    const descriptionRef = React.useRef<HTMLInputElement>(null)
    const sumRef = React.useRef<HTMLInputElement>(null)

    const usersModule = React.useContext(UsersProvider)

    const [checked, setChecked] = React.useState<Set<number>>(new Set([...usersModule.users.values()].sort((a) => a.val.disabled ? -1 : 0).filter(u => !u.val.disabled).map(u => u.val.id)))
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
            model?.commitOperation({ type: 'split', sum, id: model.nextId() + '', description: descriptionRef.current?.value, uids: [...checked.values()] })
                .catch(e => console.error(e))
                .then(() => nav(-1))
                .finally(() => setLoading(false))
        }
    }, [loading, checked])

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0px' }}>
            <input ref={descriptionRef} style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="Enter a description" />
            <input ref={sumRef} autoFocus={true} type="number" inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            <CardLight><ListItem subtitle="Split across: " /></CardLight>
            {[...usersModule.users.values()].map(u => <UserCheckListItem id={u.val.id} key={u.val.id} onUserClick={onUserClick} checked={checked.has(u.val.id)} />)}
        </div>
        <MainButtopnController onClick={onClick} text={"Add expence"} progress={loading} />
    </>
}

export const AddTransferScreen = () => {
    const nav = useNav()
    const sumRef = React.useRef<HTMLInputElement>(null)

    let [searchParams] = useSearchParams();

    const usersModule = React.useContext(UsersProvider)

    const dst = useVMvalue(usersModule.getUser(Number(searchParams.get('uid'))))
    const initialSum = React.useMemo(() => Number(searchParams.get('sum')), [])

    const model = React.useContext(ModelContext)
    const [loading, setLoading] = React.useState(false)
    const onClick = React.useCallback(() => {
        const sum = Number(sumRef.current?.value)
        if (sum === 0) {
            return
        }
        if (!loading) {
            setLoading(true)
            model?.commitOperation({ type: 'transfer', sum, id: model.nextId() + '', dstUid: dst.id })
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

export const BackButtopnController = () => {
    const nav = useNav()
    const bb = React.useMemo(() => WebApp?.BackButton, [])
    const goBack = useCallback(() => nav(-1), [])

    const location = useLoc();
    const canGoBack = React.useMemo(() => location.key !== 'default', [location.key])


    React.useEffect(() => {
        if (canGoBack) {
            bb.show()
        } else {
            bb.hide()
        }
    }, [canGoBack])

    React.useEffect(() => {
        console.log(bb)
        bb.onClick(goBack)
        return () => {
            bb.offClick(goBack)
        }
    }, [bb])

    return (canGoBack && __DEV__) ? <button style={{ position: 'absolute', top: 0, left: 0 }} onClick={goBack}>{"< back"}</button> : null
}

export const MainButtopnController = ({ onClick, text, color, textColor, isActive, isVisible, progress }: { onClick: () => void, text?: string, color?: string, textColor?: string, isActive?: boolean, isVisible?: boolean, progress?: boolean }) => {
    const mb = React.useMemo(() => WebApp?.MainButton, [])
    React.useEffect(() => {
        console.log("configure mb", mb, { text, color, text_color: textColor, is_active: isActive ?? true, is_visible: isVisible ?? true })
        mb.setParams({ text, color, text_color: textColor, is_active: isActive ?? true, is_visible: isVisible ?? true })
    }, [text, color, textColor, isActive, isVisible])
    React.useEffect(() => {
        mb.onClick(onClick)
        return () => {
            mb.offClick(onClick)
        }
    }, [onClick])
    React.useEffect(() => {
        console.log("configure mb", mb, progress)
        if (progress) {
            mb.showProgress()
        } else {
            mb.hideProgress()
        }
    }, [progress])

    return (__DEV__ && isVisible !== false) ? <button style={{ position: 'absolute', top: 0, right: 0 }} disabled={isActive === true} onClick={onClick} >{text}{progress ? "⌛️" : ""}</button> : null
}
