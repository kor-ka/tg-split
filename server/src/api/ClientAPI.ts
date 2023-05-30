import { ObjectId } from "mongodb";
import * as socketIo from "socket.io";
import { container } from "tsyringe";
import { BalanceState, FullState, Log, Operation, User } from "../../../entity";
import { PinsModule } from "../modules/pinsModule/PinsModule";
import { SplitModule } from "../modules/splitModule/SplitModule";
import { SavedOp } from "../modules/splitModule/splitStore";
import { UserModule } from "../modules/userModule/UserModule";
import { SavedUser } from "../modules/userModule/userStore";
import { SW } from "../utils/stopwatch";
import { checkTgAuth } from "./tg/getTgAuth";

export class ClientAPI {
    private io: socketIo.Server;

    private splitModule = container.resolve(SplitModule)
    private userModule = container.resolve(UserModule)
    private pinModule = container.resolve(PinsModule)
    constructor(private socket: socketIo.Server) {
        this.io = socket
    }

    // TODO: remove as soom as tgWebAppStartParam/start_param will be fixed
    resolveChatId = async (chatId?: number, chat_instance?: string) => {
        if (chatId) {
            return chatId
        } else if (chat_instance) {
            const meta = await this.pinModule.getPinMetaByInstance(chat_instance)
            if (meta?.chatId) {
                return meta?.chatId
            }
        }
        throw new Error('unable to resolve chatId')
    }

    readonly init = () => {
        this.splitModule.stateSubject.subscribe(state => {
            const { chatId, ...update } = state
            const upd: Partial<FullState> = update
            this.io.to('chatClient_' + state.chatId).emit('state', update)
        })

        this.userModule.userUpdated.subscribe(({ user, chatId }) => {
            const upd: User = user
            this.io.to('chatClient_' + chatId).emit('user', upd)
        })

        this.io.on('connection', (socket) => {
            try {
                const sw = new SW("connection");
                if (!socket.handshake.query.userState) {
                    return;
                }
                sw.lap();
                const { initData, initDataUnsafe } = socket.handshake.query
                const tgData = JSON.parse(decodeURIComponent(initDataUnsafe as string)) as { auth_date: number, hash: string, chat?: { id: number }, start_param?: string, chat_instance?: string, user: { id: number, first_name: string, last_name?: string, username?: string } }
                const { auth_date, hash, chat_instance } = tgData
                const auth = checkTgAuth(decodeURIComponent(initData as string), hash, auth_date);
                if (!auth) {
                    return
                }
                sw.lap("tgAuth");
                let chatId = tgData.start_param ? Number(tgData.start_param) : undefined;
                socket.on("op", async (operation: Omit<Operation, 'uid'>, ack: (res: { patch: { operation: Operation, balanceState: BalanceState }, error?: never } | { error: string, patch?: never }) => void) => {
                    const cid = await this.resolveChatId(chatId, chat_instance);
                    try {
                        const op = { ...operation, uid: tgData.user.id } as Operation
                        const patch = await this.splitModule.commitOperation(cid, op)
                        ack({ patch })
                    } catch (e) {
                        console.error(e)
                        let message = 'unknown error'
                        if (e instanceof Error) {
                            message = e.message
                        }
                        ack({ error: message })
                    }
                });
                (async () => {
                    try {
                        const cid = await this.resolveChatId(chatId, chat_instance);
                        socket.join("chatClient_" + cid);

                        this.userModule.updateUser(cid, { id: tgData.user.id, name: tgData.user.first_name, lastname: tgData.user.last_name, username: tgData.user.username, disabled: false })

                        const users = savedUserToApi(await this.userModule.getUsersCached(cid), cid)
                        const { balance, balancePromsie } = await this.splitModule.getBalanceCached(cid)
                        const { log, logPromise } = await this.splitModule.getLogCached(cid)
                        // emit cached
                        const upd: FullState = { balanceState: balance, log: savedOpToApi(log), users }
                        socket.emit("state", upd)

                        { // emit updated
                            const [balance, log] = await Promise.all([balancePromsie, logPromise])
                            const upd: FullState = { balanceState: balance, log: savedOpToApi(log), users }
                            socket.emit("state", upd)
                        }

                    } catch (e) {
                        console.error(e)
                    }
                })()
            } catch (e) {
                console.error(e)
            }

        })
    }
}

export const savedOpToApi = (saved: SavedOp[]): Log => {
    return saved.map(s => {
        const { _id, correction, ...op } = s
        return { ...op, id: _id.toHexString(), correction: correction?.toHexString() }
    })
}

export const savedUserToApi = (saved: SavedUser[], chatId: number): User[] => {
    return saved.map(s => {
        const { _id, chatIds, disabledChatIds, ...u } = s
        return { ...u, disabled: !!disabledChatIds?.includes(chatId) }
    })
}
