import { io, Socket } from "socket.io-client";
import { VM } from "../utils/vm/VM";
import Cookies from "js-cookie";
import { BalanceState, FullState, Log, Operation, User } from "../../entity";
import { Deffered } from "../utils/deffered";
import { UsersModule } from "./UsersModule";

type TgWebAppInitData = { chat?: { id: number }, user: { id: number }, start_param?: string } & unknown;

export class SessionModel {
    readonly tgWebApp: TgWebAppInitData;
    readonly balance = new VM<BalanceState | undefined>(undefined);
    private logSet = new Set<string>()
    readonly log = new VM<Log | undefined>(undefined);
    readonly users = new UsersModule()

    private localOprationId = Date.now()

    private socket: Socket;

    private emit = (ev: string, ...args: any[]) => {
        console.log(ev, args);
        this.socket.emit(ev, ...args);
    };

    constructor(params: { initDataUnsafe: TgWebAppInitData, initData: string }) {
        Cookies.set("user_id", params.initDataUnsafe.user.id.toString(), { expires: 1000 * 60 * 60 * 24 * 30 })

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
            if (balanceState) {
                this.bumpBalance(balanceState);
            }
            if (log) {
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

    }

    private bumpBalance = (balanceState: BalanceState) => {
        if (this.balance.val?.seq ?? -1 < balanceState.seq) {
            this.balance.next(balanceState)
        }
    }

    private addOperation = (operation: Operation) => {
        if (!this.logSet.has(operation.id)) {
            this.logSet.add(operation.id)
            let log = [operation, ...this.log.val ?? []]
            this.log.next(log)
        }
    }

    nextId = () => this.localOprationId++
    commitOperation = (operation: Omit<Operation, 'uid'>): Promise<Operation> => {
        const d = new Deffered<Operation>()
        this.emit("op", operation, (res: { patch: { operation: Operation, balanceState: BalanceState }, error: never } | { error: string, patch: never }) => {
            const { patch, error } = res
            if (patch) {
                this.bumpBalance(patch.balanceState)
                this.addOperation(patch.operation)
                d.resolve(patch.operation)
            } else {
                d.reject(new Error(error))
            }
        });
        return d.promise
    };
}