import React, { useCallback } from "react";
import { Balance, BalanceState, Log, Operation, OperationSplit, OperationTransfer } from "../../entity"
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
import { VM } from "../utils/vm/VM";

export let __DEV__ = false
export let WebApp: any = undefined
if (typeof window !== "undefined") {
    __DEV__ = window.location.hostname.indexOf("localhost") >= 0 || window.location.search.endsWith("_dev_=true")
    WebApp = (window as any).Telegram.WebApp
}
export const showAlert = (message: string) => {
    WebApp?.showAlert(message)
    if (__DEV__) {
        alert(message)
    }
}

export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule());

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
    return <MainScreenView balanceVM={model.balance} logVM={model.logModule.log} />
}

export const MainScreenView = ({ balanceVM, logVM: log }: { balanceVM: VM<BalanceState | undefined>, logVM: VM<Map<string, VM<Operation>>> }) => {
    const nav = useNav()
    return <div style={{ display: 'flex', flexDirection: 'column', padding: "8px 0px" }}>
        <BackButtopnController />
        <BalanceView balanceVM={balanceVM} />
        <LogView logVM={log} />
        {/* <button onClick={() => nav("/tg/addPayment")} >Add payment</button> */}
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"Add expense"} />
    </div>
}

export const Card = ({ children, style }: { children: any, style?: any }) => {
    return <div style={{ display: 'flex', flexDirection: 'column', margin: '8px 16px', padding: 4, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16, ...style }}>{children}</div>
}

export const CardLight = ({ children, style }: { children: any, style?: any }) => {
    return <div style={{ display: 'flex', flexDirection: 'column', margin: '0px 20px', ...style }}>{children}</div>
}

export const ListItem = React.memo(({ titile: title, subtitle, right, style, titleStyle, subTitleStyle, rightStyle, leftStyle }: { titile?: string, subtitle?: string, right?: React.ReactNode, style?: any, titleStyle?: any, subTitleStyle?: any, rightStyle?: any, leftStyle?: any }) => {
    return <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'space-between', padding: 4, alignItems: 'center', ...style }}>
        <div style={{ display: 'flex', padding: '2px 0px', flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0, ...leftStyle }}>
            {!!title && <div style={{ padding: '2px 4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', ...titleStyle }}>{title}</div>}
            {!!subtitle && <div style={{ padding: '2px 4px', fontSize: '0.8em', color: "var(--tg-theme-hint-color)", ...subTitleStyle }}>{subtitle}</div>}
        </div>
        {!!right && <div style={{ padding: '4px 16px', flexShrink: 0, alignItems: 'center', ...rightStyle }}>{right}</div>}
    </div>
}
)
const BalanceEntry = React.memo(({ balance }: { balance: Balance[0] }) => {
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
        <ListItem titile={title} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: balance.sum < 0 ? 'var(--text-destructive-color)' : 'var(--text-confirm-color)' }}>{(Math.abs(balance.sum) / 100).toString()}</span>} />
    </div>
})

const BalanceView = React.memo(({ balanceVM }: { balanceVM: VM<BalanceState | undefined> }) => {
    const balance = useVMvalue(balanceVM)?.balance

    let [balancePositive, sumPosistive] = React.useMemo(() => {
        const b = balance?.filter(b => b.sum > 0) || []
        const sum = b.reduce((acc, e) => acc + e.sum, 0)
        return [b, sum]
    }, [balance])

    let [balanceNegative, sumNegative] = React.useMemo(() => {
        const b = balance?.filter(b => b.sum < 0) || []
        const sum = b.reduce((acc, e) => acc + e.sum, 0)
        return [b, sum]
    }, [balance])

    const userId = React.useContext(UserContext)
    if (userId === undefined) {
        return <Card> <ListItem titile={"Loading..."} subtitle="Figuring out the final details..." /> </Card>
    }
    if (balance?.length === 0) {
        return <Card> <ListItem titile="✨ All settled up ✨" subtitle="You are awesome" /> </Card>
    }

    return <>
        {!!balanceNegative.length && <Card key="negative">
            {balanceNegative?.map(e =>
                <BalanceEntry key={e.pair.join('-')} balance={e} />
            )}
            {balanceNegative.length > 1 && <div style={{ marginBottom: 8, color: "var(--tg-theme-hint-color)" }}>
                <ListItem
                    key="negative-total"
                    titile="Total"
                    right={(Math.abs(sumNegative) / 100).toString()} />
            </div>}
        </Card>}

        {!!balancePositive.length && <Card key="positive">
            {balancePositive?.map(e =>
                <BalanceEntry key={e.pair.join('-')} balance={e} />
            )}
            {balancePositive.length > 1 && <div style={{ marginBottom: 8, color: "var(--tg-theme-hint-color)" }}>
                <ListItem
                    key="positive-total"
                    titile="Total"
                    right={(Math.abs(sumPosistive) / 100).toString()} />
            </div>}
        </Card>}
    </>
})

const SplitLogItem = React.memo(({ opVM }: { opVM: VM<OperationSplit> }) => {
    const op = useVMvalue(opVM)
    const userId = React.useContext(UserContext)
    const usersModule = React.useContext(UsersProvider)
    const actor = useVMvalue(usersModule.getUser(op.uid))
    // extract as components? (make names reactive)
    const fullNames = React.useMemo(() => {
        return op.uids.map((uid) => usersModule.getUser(uid).val.fullName).join(', ')
    }, [...op.uids])
    const namesShort = React.useMemo(() => {
        return op.uids.length > 2 ? `${op.uids.length} persons` : op.uids.map((uid) => usersModule.getUser(uid).val.name).join(', ')
    }, [...op.uids])

    const title = React.useMemo(() => `⚡️ ${actor.name} → ${op.description || namesShort}`, [actor.name, op.description, namesShort])

    const subtitle = React.useMemo(() => {
        return [op.description && `${actor.name} paid for ${op.description.trim()}`, `Split among: ${fullNames}`, op.edited ? '(edited)' : ''].filter(Boolean).join('. ')
    }, [fullNames, op.description, actor.name, op.edited])

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
    return <div onClick={onClick} style={op.deleted ? { textDecoration: 'line-through' } : undefined}>
        <ListItem titile={title} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: sumColor }}>{(op.sum / 100).toString()}</span>} />
    </div >
})

const TransferLogItem = React.memo(({ opVM }: { opVM: VM<OperationTransfer> }) => {
    const op = useVMvalue(opVM)
    const userId = React.useContext(UserContext)
    const usersModule = React.useContext(UsersProvider)
    const srcuser = useVMvalue(usersModule.getUser(op.uid))
    const dstuser = useVMvalue(usersModule.getUser(op.dstUid))
    const subtitle = React.useMemo(() => `${srcuser.fullName} payed ${op.sum / 100} to ${dstuser.fullName} ${op.edited ? '(edited)' : ''}`, [srcuser.fullName, dstuser.fullName, op.sum, op.edited])

    const nav = useNav()
    const onClick = React.useCallback(() => {
        nav(`/tg/editPayment?editPayment=${op.id}`)
    }, [])

    const sumColor = React.useMemo(() => {
        if (op.uid === userId) {
            return 'var(--text-destructive-color)'
        } else if (op.dstUid === userId) {
            return 'var(--text-confirm-color)'
        }
    }, [op.uid, op.dstUid, userId])

    return <div onClick={onClick} style={op.deleted ? { textDecoration: 'line-through' } : undefined}>
        <ListItem titile={`💸 ${srcuser.name} → ${dstuser.name}`} subtitle={subtitle} right={<span style={{ fontSize: '1.4em', color: sumColor }}>{(op.sum / 100).toString()}</span>} />
    </div>
})

const LogView = React.memo((({ logVM: logVm }: { logVM: VM<Map<string, VM<Operation>>> }) => {
    const logMap = useVMvalue(logVm)
    const log = React.useMemo(() => [...logMap.values()], [logMap])
    let prevDate = ""
    return <CardLight key="log">{log.map((op, i, array) => {
        const date = new Date(array[i].val.date).toLocaleString('en', { month: 'short', day: 'numeric' });
        const show = date !== prevDate
        prevDate = date
        return <React.Fragment key={op.val.id}>
            {show && <Card key={'date'} style={{ alignSelf: 'center', margin: 0, padding: 0, fontSize: '0.6em', borderRadius: 12, position: 'sticky', top: 16 }}><ListItem titile={date} titleStyle={{ padding: 0, fontWeight: 500 }} leftStyle={{ padding: '0 2px' }} /></Card>}
            {op.val.type === 'split' ? <SplitLogItem key={op.val.id} opVM={op as VM<OperationSplit>} /> : op.val.type === 'transfer' ? <TransferLogItem key={op.val.id} opVM={op as VM<OperationTransfer>} /> : null}
        </React.Fragment>
    })}</CardLight>
}))

export const BackButtopnController = React.memo(() => {
    const nav = useNav()
    const bb = React.useMemo(() => WebApp?.BackButton, [])
    const goBack = useCallback(() => nav(-1), [])

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
})

export const MainButtopnController = React.memo(({ onClick, text, color, textColor, isActive, isVisible, progress }: { onClick: () => void, text?: string, color?: string, textColor?: string, isActive?: boolean, isVisible?: boolean, progress?: boolean }) => {
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
        if (progress !== mb.isProgressVisible) {
            if (progress) {
                mb.showProgress()
            } else {
                mb.hideProgress()
            }
        }

    }, [progress])

    return (__DEV__ && isVisible !== false) ? <button style={{ position: 'absolute', top: 0, right: 0 }} disabled={isActive === false} onClick={onClick} >{text}{progress ? "⌛️" : ""}</button> : null
})
