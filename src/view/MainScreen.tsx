import React, { useCallback } from "react";
import { Balance, Log, OperationSplit, OperationTransfer } from "../../entity"
import { SessionModel } from "../model/SessionModel"
import { UsersModule } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM"
import {
    createBrowserRouter,
    RouterProvider,
    useNavigate as nav, useResolvedPath, useSearchParams
} from "react-router-dom";
import { AddExpenceScreen } from "./AddExpenceScreen";
import { AddTransferScreen } from "./AddTransferScreen";

export let __DEV__ = false
let WebApp: any = undefined
if (typeof window !== "undefined") {
    __DEV__ = window.location.hostname.indexOf("localhost") >= 0
    WebApp = (window as any).Telegram.WebApp
}

export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule(-1));

export const useNav = () => {
    if (typeof window !== "undefined") {
        return nav()
    } else {
        return () => { }
    }
}

const getPath = () => {
    if (typeof window !== "undefined") {
        return window.location.pathname
    }
    return ''
}

export const renderApp = (model: SessionModel) => {
    const router = createBrowserRouter([
        {
            path: "/tg",
            element: <MainScreen />,
        },
        {
            path: "/tg/addExpence",
            element: <AddExpenceScreen />,
        },
        {
            path: "/tg/editExpence",
            element: <AddExpenceScreen />,
        },
        {
            path: "/tg/addPayment",
            element: <AddTransferScreen />,
        },
        {
            path: "/tg/editPayment",
            element: <AddTransferScreen />,
        },
    ]);

    return <ModelContext.Provider value={model}>
        <UserContext.Provider value={model.tgWebApp.user.id}>
            <UsersProvider.Provider value={model.users}>
                <RouterProvider router={router} />
            </UsersProvider.Provider>
        </UserContext.Provider>
    </ModelContext.Provider>
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
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"Add expense"} />
    </div>
}

export const Card = ({ children }: { children: any }) => {
    return <div style={{ margin: '8px 16px', padding: 4, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16 }}>{children}</div>
}

export const CardLight = ({ children }: { children: any }) => {
    return <div style={{ margin: '0px 20px', }}>{children}</div>
}

export const ListItem = ({ titile: title, subtitle, right }: { titile?: string, subtitle?: string, right?: React.ReactNode }) => {
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
        return `${youOwe ? 'You' : user.name} → ${youOwe ? user.name : 'You'}`

    }, [balance])
    const subtitle = React.useMemo(() => {
        const youOwe = balance.sum < 0;
        return `${youOwe ? 'You' : user.fullName} owe${youOwe ? '' : 's'} ${youOwe ? user.fullName : 'You'}`

    }, [balance])

    const nav = useNav()
    const navigateToAddPayment = React.useCallback(() => {
        nav(`/tg/addPayment?uid=${user.id}&sum=${Math.abs(balance.sum)}`)
    }, [nav, user.id])
    return <div onClick={balance.sum < 0 ? navigateToAddPayment : undefined}>
        <Card>
            <ListItem titile={title} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: balance.sum < 0 ? 'var(--text-destructive-color)' : 'var(--text-confirm-color)' }}>{(Math.abs(balance.sum)).toString()}</span>} />
        </Card>
    </div>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    const userId = React.useContext(UserContext)
    if (userId === undefined) {
        return <Card> <ListItem titile={"Loading..."} subtitle="Figuring out the final details..." /> </Card>
    }
    if (balance?.length === 0) {
        return <Card> <ListItem titile="✨ All settled up ✨" subtitle="You are awesome" /> </Card>
    }
    return <>
        {balance?.map(e =>
            <BalanceEntry key={e.pair.join('-')} balance={e} />
        )}
    </>
}

const SplitLogItem = React.memo(({ op }: { op: OperationSplit }) => {
    const userId = React.useContext(UserContext)
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

    const title = React.useMemo(() => `⚡️ ${actor.name} → ${op.description || namesShort}`, [])

    const subtitle = React.useMemo(() => {
        return [op.description && `${actor.name} paid for ${op.description.trim()}`, `Split among: ${fullNames}`, op.correction ? '(edit)' : ''].filter(Boolean).join('. ')
    }, [fullNames, op.description])

    const nav = useNav()
    const onClick = React.useCallback(() => {
        nav(`/tg/editExpence?editExpense=${op.id}`)
    }, [])

    const sumColor = React.useMemo(() => {
        if (op.uid === userId) {
            return 'var(--text-destructive-color)'
        } else if (userId && op.uids.includes(userId)) {
            return 'var(--text-confirm-color)'
        }
    }, [op.uid, op.uids, userId])
    return <div onClick={(!op.corrected && (op.uid === userId)) ? onClick : undefined} style={op.corrected ? { textDecoration: 'line-through' } : undefined}>
        <CardLight>
            <ListItem titile={title} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: sumColor }}>{op.sum?.toString()}</span>} />
        </CardLight>
    </div >
})

const TransferLogItem = React.memo(({ op }: { op: OperationTransfer }) => {
    const userId = React.useContext(UserContext)
    const usersModule = React.useContext(UsersProvider)
    const srcuser = useVMvalue(usersModule.getUser(op.uid))
    const dstuser = useVMvalue(usersModule.getUser(op.dstUid))
    const subtitle = React.useMemo(() => `${srcuser.fullName} payed ${op.sum} to ${dstuser.fullName} ${op.correction ? '(edit)' : ''}`, [srcuser, dstuser])

    const nav = useNav()
    const onClick = React.useCallback(() => {
        nav(`/tg/editTransfer?editTrasfer=${op.id}`)
    }, [])

    const sumColor = React.useMemo(() => {
        if (op.uid === userId) {
            return 'var(--text-destructive-color)'
        } else if (op.dstUid === userId) {
            return 'var(--text-confirm-color)'
        }
    }, [op.uid, op.dstUid, userId])

    return <div onClick={(!op.corrected && (op.uid === userId)) ? onClick : undefined}>
        <CardLight>
            <ListItem titile={`💸 ${srcuser.name} → ${dstuser.name}`} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: sumColor }}>{(op.sum).toString()}</span>} />
        </CardLight>
    </div>
})

const LogView = ({ log }: { log?: Log }) => {
    return <>{log?.map(op => op.type === 'split' ? <SplitLogItem key={op.id} op={op} /> : op.type === 'transfer' ? <TransferLogItem key={op.id} op={op} /> : null)}</>
}

export const BackButtopnController = () => {
    const nav = useNav()
    const bb = React.useMemo(() => WebApp?.BackButton, [])
    const goBack = useCallback(() => nav('/tg/'), [])

    const canGoBack = getPath() !== '/tg/'

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
