import { io, Socket } from "socket.io-client";
import { VM } from "../utils/vm/VM";
import Cookies from "js-cookie";
import { Balance, BalanceState, ClientAPICommand, FullState, Log, Operation, StateUpdate, User } from "../shared/entity";
import { Deffered } from "../utils/deffered";
import { UsersModule } from "./UsersModule";
import { OmitUnion } from "../shared/types";
import { optimiseBalance } from "./optimiseBalance";
import { LogModule } from "./LogModule";

type TgWebAppInitData = { chat?: { id: number }, user: { id: number }, start_param?: string } & unknown;

export type SortedBalance = { yours: Balance, others: Balance, seq: number }

const CLNDR_DOMAIN = 'https://tg-clndr-4023e1d4419a.herokuapp.com';

export class SessionModel {
    readonly tgWebApp: TgWebAppInitData;
    readonly balance = new VM<SortedBalance | undefined>(undefined);
    readonly logModule = new LogModule()
    readonly users: UsersModule
    readonly chatId: number

    private localOprationId = Date.now()

    private socket: Socket;

    private emit = (ev: string, ...args: any[]) => {
        console.log(ev, args);
        this.socket.emit(ev, ...args);
    };

    constructor(params: { initDataUnsafe: TgWebAppInitData, initData: string }) {
        const [chat_descriptor, token] = (params.initDataUnsafe.start_param ?? '').split('T') ?? [];
        const [chatId, threadId] = chat_descriptor.split('_').map(Number) ?? [];
        this.chatId = chatId

        Cookies.set("user_id", params.initDataUnsafe.user.id.toString(), { path: "/", sameSite: 'None', secure: true, expires: 7 })
        Cookies.set("time_zone", Intl.DateTimeFormat().resolvedOptions().timeZone, { path: "/", sameSite: 'None', secure: true, expires: 7 })

        this.users = new UsersModule(params.initDataUnsafe.user.id)

        this.tgWebApp = params.initDataUnsafe
        const endpoint =
            window.location.hostname.indexOf("localhost") >= 0
                ? "http://localhost:5001"
                : "https://tg-split.herokuapp.com/";

        this.socket = io(endpoint, {
            transports: ["websocket"],
            query: {
                userState: true,
                initData: params.initData,
                initDataUnsafe: encodeURIComponent(JSON.stringify(params.initDataUnsafe))
            },
        });

        this.socket.onAny((...e) => {
            console.log(e);
        });


        this.socket.on("state", ({ balanceState, log, users }: Partial<FullState>) => {
            console.log("on_State", { balanceState, log, users })
            if (balanceState) {
                this.bumpBalance(balanceState);
            }
            if (log) {
                // happens on reconnect and cache update
                // since some operation may be deleted in between, rewrite whole log
                // TODO: detect deletions?
                this.logModule.log.next(new Map())

                for (let i = log.length - 1; i >= 0; i--) {
                    this.addOperation(log[i])
                }
            }
            if (users) {
                users.forEach(this.users.updateUser)
            }

        });

        this.socket.on("user", (user: User) => {
            this.users.updateUser(user)
        });

        this.socket.on("update", (update: StateUpdate) => {
            this.bumpBalance(update.balanceState)
            if ((update.type === 'create') || this.logModule.log.val.has(update.operation.id)) {
                this.addOperation(update.operation)
            }
        });

    }

    private bumpBalance = (balanceState: BalanceState) => {
        console.log('bumpBalance', this.balance.val?.seq, balanceState)

        if ((this.balance.val?.seq ?? -1) < balanceState.seq) {
            const b = optimiseBalance(balanceState.balance).reduce((balanceState, e) => {
                if (e.sum > 0) {
                    e.pair.reverse()
                    e.sum *= -1
                }
                if (e.pair.includes(this.tgWebApp.user.id)) {
                    balanceState.yours.push(e)
                } else {
                    balanceState.others.push(e)
                }
                return balanceState
            }, { yours: [] as Balance, others: [] as Balance })
            this.balance.next({ seq: balanceState.seq, ...b })
        }
    }

    private addOperation = (operation: Operation) => {
        this.logModule.getOperationVm(operation).next(operation)
    }

    nextId = () => this.localOprationId++
    commitOperation = (operation: ClientAPICommand): Promise<Operation> => {
        const d = new Deffered<Operation>()
        this.emit("op", operation, (res: { patch: StateUpdate, error: never } | { error: string, patch: never }) => {
            console.log("on_op_ack", res)
            const { patch, error } = res
            if (patch) {
                this.bumpBalance(patch.balanceState)
                if ((patch.type === 'create') || this.logModule.log.val.has(patch.operation.id)) {
                    this.addOperation(patch.operation)
                }
                d.resolve(patch.operation)
            } else {
                d.reject(new Error(error))
            }
        });
        return d.promise
    };

    ssrTimeSone = () => {
        return Cookies.get('ssr_time_zone')
    }

    ssrUserId = () => {
        return Cookies.get('ssr_user_id')
    }

    clndrAvailableSync = () => {
        return Cookies.get(`cldr_available_${this.chatId}`) === 'true'
    }
    clndrAvailable = async () => {
        let clndrAvailable = this.clndrAvailableSync();
        if (!clndrAvailable) {
            const [chat_descriptor, token] = (this.tgWebApp.start_param as string).split('T') ?? [];
            const [chatId, threadId] = chat_descriptor.split('_').map(Number) ?? [];

            clndrAvailable = (await (await fetch(`${CLNDR_DOMAIN}/enabledInChat/${chatId}`)).text()) === 'true';
            if (clndrAvailable) {
                Cookies.set(`cldr_available_${this.chatId}`, 'true', { path: "/", sameSite: 'None', secure: true, expires: 7 })
            }
        }
        return clndrAvailable;
    }
}