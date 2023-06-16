import React, { useCallback } from "react";
import { Balance, BalanceState, Log, Operation, OperationSplit, OperationTransfer } from "../shared/entity"
import { SessionModel, SortedBalance } from "../model/SessionModel"
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
import { formatSum } from "./utils/formatSum";

export let __DEV__ = false
export let WebApp: any = undefined
if (typeof window !== "undefined") {
    __DEV__ = window.location.hostname.indexOf("localhost") >= 0 || window.location.search.endsWith("_dev_=true")
    WebApp = (window as any).Telegram.WebApp
}
export const showAlert = (message: string) => {
    if (__DEV__) {
        window.alert(message)
    } else {
        WebApp?.showAlert(message)
    }
}

export const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    if (__DEV__) {
        callback(window.confirm(message))
    } else {
        WebApp?.showConfirm(message, callback)

    }
}


export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule());
export const Timezone = React.createContext<string | undefined>(undefined);

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

    return <Timezone.Provider value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        <ModelContext.Provider value={model}>
            <UserContext.Provider value={model.tgWebApp.user.id}>
                <UsersProvider.Provider value={model.users}>
                    <RouterProvider router={router} />
                </UsersProvider.Provider>
            </UserContext.Provider>
        </ModelContext.Provider>
    </Timezone.Provider>
}

export const MainScreen = () => {
    const model = React.useContext(ModelContext)
    return model ? <MainScreenWithModel model={model} /> : null
}

const MainScreenWithModel = ({ model }: { model: SessionModel }) => {
    return <MainScreenView balanceVM={model.balance} logVM={model.logModule.log} />
}

export const MainScreenView = ({ balanceVM, logVM: log }: { balanceVM: VM<SortedBalance | undefined>, logVM: VM<Map<string, VM<Operation>>> }) => {
    const nav = useNav()
    return <div style={{ display: 'flex', flexDirection: 'column', padding: "8px 0px" }}>
        <BackButtopnController />
        <BalanceView balanceVM={balanceVM} />
        <LogView logVM={log} />
        {/* <button onClick={() => nav("/tg/addPayment")} >Add payment</button> */}
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"ADD EXPENSE"} />
    </div>
}

export const Card = ({ children, style, onClick }: { children: any, style?: any, onClick?: React.MouseEventHandler<HTMLDivElement> }) => {
    return <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', margin: '8px 16px', padding: 4, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16, ...style }}>{children}</div>
}

export const Button = ({ children, style, onClick, disabled }: { children: any, style?: any, onClick?: React.MouseEventHandler<HTMLButtonElement>, disabled?: boolean }) => {
    return <button disabled={disabled} onClick={onClick} style={{ margin: '8px 16px', padding: 0, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 8, ...style }}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: 4, opacity: disabled ? 0.8 : undefined }}>{children}</div>
    </button>
}


export const CardLight = ({ children, style }: { children: any, style?: any }) => {
    return <div style={{ display: 'flex', flexDirection: 'column', margin: '0px 20px', ...style }}>{children}</div>
}

export const ListItem = React.memo(({ titile: title, subtitle, right, style, titleStyle, subTitleStyle, rightStyle, leftStyle, onClick, onSubtitleClick }: { titile?: string, subtitle?: string, right?: React.ReactNode, style?: any, titleStyle?: any, subTitleStyle?: any, rightStyle?: any, leftStyle?: any, onClick?: React.MouseEventHandler<HTMLDivElement>, onSubtitleClick?: React.MouseEventHandler<HTMLDivElement> }) => {
    return <div onClick={onClick} style={{ display: 'flex', flexDirection: "row", justifyContent: 'space-between', padding: 4, alignItems: 'center', ...style }}>
        <div style={{ display: 'flex', padding: '2px 0px', flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0, ...leftStyle }}>
            {!!title && <div style={{ padding: '2px 4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', ...titleStyle }}>{title}</div>}
            {!!subtitle && <div onClick={onSubtitleClick} style={{ padding: '2px 4px', fontSize: '0.8em', color: "var(--tg-theme-hint-color)", ...subTitleStyle }}>{subtitle}</div>}
        </div>
        {!!right && <div style={{ display: 'flex', padding: '4px 16px', flexShrink: 0, alignItems: 'center', ...rightStyle }}>{right}</div>}
    </div>
}
)
const BalanceEntry = React.memo(({ balance }: { balance: Balance[0] }) => {
    const userId = React.useContext(UserContext)
    const usersModule = React.useContext(UsersProvider)
    const srcUser = useVMvalue(usersModule.getUser(balance.pair[0]))
    const dstUser = useVMvalue(usersModule.getUser(balance.pair[1]))
    const title = React.useMemo(() => {
        return `${srcUser.name} → ${dstUser.name}`

    }, [balance, srcUser, dstUser])
    const subtitle = React.useMemo(() => {
        const youOwe = (balance.sum < 0) && (srcUser.id === userId);
        return `${srcUser.fullName} owe${youOwe ? '' : 's'} ${dstUser.fullName}`

    }, [balance, srcUser, dstUser])

    const sumColor = React.useMemo(() => {
        if (userId !== undefined && balance.pair.includes(userId)) {
            return balance.pair[0] === userId ? 'var(--text-destructive-color)' : 'var(--text-confirm-color)'
        }
    }, [balance.pair, balance.sum, userId])

    const nav = useNav()
    const navigateToAddPayment = React.useCallback(() => {
        nav(`/tg/addPayment?uid=${dstUser.id}&sum=${Math.abs(balance.sum)}`)
    }, [nav, dstUser.id])
    const myDebt = (srcUser.id === userId) && (balance.sum < 0);
    return <div onClick={myDebt ? navigateToAddPayment : undefined}>
        <ListItem titile={title} subtitle={subtitle} right={
            <div style={{ position: 'relative', fontSize: '1.2em' }}>
                <span style={{ color: sumColor }}>{formatSum(balance.sum)}</span>
                {myDebt && <span style={{ position: 'absolute', color: 'var(--tg-theme-hint-color)', top: 0, bottom: 0, right: 'calc(-100% - 2px)' }}> 〉</span>}
            </div>
        } />
    </div>
})

let animateBalanceOnce = true;
const BalanceView = React.memo(({ balanceVM }: { balanceVM: VM<SortedBalance | undefined> }) => {
    const model = React.useContext(ModelContext);
    const balalnceSate = useVMvalue(balanceVM)
    const balance = balalnceSate?.yours;
    const othresBalance = balalnceSate?.others || [];

    let [balancePositive, sumPosistive] = React.useMemo(() => {
        const b = balance?.filter(b => b.sum > 0) || [];
        const sum = b.reduce((acc, e) => acc + e.sum, 0);
        return [b, sum];
    }, [balance]);

    let [balanceNegative, sumNegative] = React.useMemo(() => {
        const b = balance?.filter(b => b.sum < 0) || [];
        const sum = b.reduce((acc, e) => acc + e.sum, 0);
        return [b, sum]
    }, [balance]);

    const userId = React.useContext(UserContext);

    const shouldAnimate = React.useMemo(() => model && !model.ssrUserId() && animateBalanceOnce, []);
    // if ssr missing user, maxHeight to 1 line, 750 on client to animate 
    const [maxHeight, setMaxHeight] = React.useState(shouldAnimate ? 58.5 : 750);
    React.useEffect(() => {
        if (shouldAnimate) {
            animateBalanceOnce = false;
            setTimeout(() => {
                setMaxHeight(750);
                // expand to "no limit" after animation
                setTimeout(() => {
                    setMaxHeight(9000);
                }, 301);
            }, 10);
        }

    }, [shouldAnimate]);

    if (userId === undefined) {
        return <Card key="first" style={{ transition: "max-height ease-in 300ms", maxHeight, overflow: 'hidden' }}>
            <ListItem titile={"Loading..."} subtitle="Figuring out the final details..." />
        </Card>
    }

    if (balance?.length === 0) {
        return <Card> <ListItem titile="✨ All settled up ✨" subtitle="You are awesome" /> </Card>
    }

    return <>
        {!!balanceNegative.length &&
            <Card key="first" style={{ transition: "max-height ease-in 300ms", maxHeight, overflow: 'hidden' }}>
                {balanceNegative.map(e =>
                    <BalanceEntry key={e.pair.join('-')} balance={e} />
                )}
                {balanceNegative.length > 1 && <div style={{ marginBottom: 8, color: "var(--tg-theme-hint-color)" }}>
                    <ListItem
                        key="negative-total"
                        titile="Total"
                        right={formatSum(sumNegative)} />
                </div>}
            </Card>}

        {!!balancePositive.length &&
            <Card key={!!balanceNegative.length ? "second" : "first"} style={{ transition: "max-height ease-in 300ms", maxHeight, overflow: 'hidden' }}>
                {balancePositive.map(e =>
                    <BalanceEntry key={e.pair.join('-')} balance={e} />
                )}
                {balancePositive.length > 1 && <div style={{ marginBottom: 8, color: "var(--tg-theme-hint-color)" }}>
                    <ListItem
                        key="positive-total"
                        titile="Total"
                        right={formatSum(sumPosistive)} />
                </div>}
            </Card>}

        {!!othresBalance.length &&
            <Card key={"others"}>
                {othresBalance.map(e =>
                    <BalanceEntry key={e.pair.join('-')} balance={e} />
                )}
            </Card>}
    </>
});

const SplitLogItem = React.memo(({ opVM }: { opVM: VM<OperationSplit> }) => {
    const op = useVMvalue(opVM)
    const userId = React.useContext(UserContext)
    const usersModule = React.useContext(UsersProvider)
    const actor = useVMvalue(usersModule.getUser(op.uid))
    // extract as components? (make names reactive)
    const fullNames = React.useMemo(() => {
        return op.conditions.map((cond) => usersModule.getUser(cond.uid).val.fullName).join(', ')
    }, [...op.conditions])
    const namesShort = React.useMemo(() => {
        return op.conditions.length > 2 ? `${op.conditions.length} persons` : op.conditions.map((cond) => usersModule.getUser(cond.uid).val.name).join(', ')
    }, [...op.conditions])

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
        } else if (userId && op.conditions.find(c => c.uid === userId)) {
            return 'var(--text-confirm-color)'
        }
    }, [op.uid, op.conditions, userId])
    return <div onClick={onClick} style={op.deleted ? { textDecoration: 'line-through' } : undefined}>
        <ListItem titile={title} subtitle={subtitle} right={
            <div style={{ position: 'relative', fontSize: '1.2em' }}>
                <span style={{ color: sumColor }}>{formatSum(op.sum)}</span>
                <span style={{ position: 'absolute', top: 0, bottom: 0, right: 'calc(-100% + 8px)', color: 'var(--tg-theme-hint-color)' }}> 〉</span>
            </div>
        } />
    </div>
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
        <ListItem titile={`💸 ${srcuser.name} → ${dstuser.name}`} subtitle={subtitle} right={
            <div style={{ position: 'relative', fontSize: '1.2em' }}>
                <span style={{ color: sumColor }}>{formatSum(op.sum)}</span>
                <span style={{ position: 'absolute', top: 0, bottom: 0, right: 'calc(-100% + 8px)', color: 'var(--tg-theme-hint-color)' }}> 〉</span>
            </div>}
        />
    </div>
})


let amimateDateOnce = true
const DateView = React.memo(({ date }: { date: string }) => {
    const model = React.useContext(ModelContext);
    const shouldAnimate = React.useMemo(() => model && !model.ssrTimeSone() && amimateDateOnce, []);
    const [maxHeight, setMaxHeight] = React.useState(shouldAnimate ? 0 : 50);
    React.useEffect(() => {
        if (shouldAnimate) {
            amimateDateOnce = false;
            setTimeout(() => {
                setMaxHeight(50);
            }, 10);
        }
    }, [shouldAnimate]);
    return <Card key={'date'} style={{ alignSelf: 'center', margin: 0, padding: 0, fontSize: '0.7em', borderRadius: 12, position: 'sticky', top: 16, transition: "max-height ease-in 300ms", maxHeight, overflow: 'hidden' }}>
        <ListItem titile={date} titleStyle={{ padding: 0, fontWeight: 500 }} leftStyle={{ padding: '0 4px' }} />
    </Card>
});

const LogView = React.memo((({ logVM: logVm }: { logVM: VM<Map<string, VM<Operation>>> }) => {
    const timeZone = React.useContext(Timezone)
    const logMap = useVMvalue(logVm)
    const log = React.useMemo(() => [...logMap.values()], [logMap])
    let prevDate: string | undefined = undefined
    return <>
        <CardLight key="log">{log.map((op, i, array) => {
            const date = timeZone && new Date(array[i].val.date).toLocaleString('en', { month: 'short', day: 'numeric', timeZone });
            const show = date !== prevDate
            prevDate = date
            return <React.Fragment key={op.val.id}>
                {show && date && <DateView date={date} />}
                {op.val.type === 'split' ? <SplitLogItem key={op.val.id} opVM={op as VM<OperationSplit>} /> : op.val.type === 'transfer' ? <TransferLogItem key={op.val.id} opVM={op as VM<OperationTransfer>} /> : null}
            </React.Fragment>
        })}</CardLight>
        {log.length === 200 && <Card><ListItem subtitle={`Maybe there are more operations, who knows 🤷‍♂️\nDeveloper was too lasy to implement pagination.`} /></Card>}
    </>
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
