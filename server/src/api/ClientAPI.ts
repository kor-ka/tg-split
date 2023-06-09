import * as socketIo from "socket.io";
import { container } from "tsyringe";
import { ClientAPICommand, FullState, Log, Operation, StateUpdate, User } from "../../../entity";
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

    readonly init = () => {
        this.splitModule.stateUpateSubject.subscribe(state => {
            const { chatId, threadId, balanceState, operation, type } = state
            const upd: StateUpdate = { balanceState, operation: savedOpToApi(operation), type }
            this.io.to('chatClient_' + [chatId, threadId].filter(Boolean).join('_')).emit('update', upd)
        })

        this.userModule.userUpdated.subscribe(({ user, chatId }) => {
            const upd: User = user
            this.io.to('chatUsersClient_' + chatId).emit('user', upd)
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
                const [chatId, threadId] = tgData.start_param?.split('_').map(Number) ?? []
                if (chatId === undefined) {
                    return
                }

                socket.on("op", async (
                    command: ClientAPICommand,
                    ack: (res: { patch: StateUpdate, error?: never } | { error: string, patch?: never }) => void) => {
                    try {
                        // TODO: sanitise op
                        const { type } = command
                        if (type === 'create' || type === 'update') {
                            const { operation } = command
                            const op = { ...operation, uid: tgData.user.id } as Operation
                            const { operation: updatedOp, balanceState } = await this.splitModule.commitOperation(chatId, threadId, type, op)
                            ack({ patch: { type, balanceState, operation: savedOpToApi(updatedOp) } })
                        } else if (type === 'delete') {
                            const { operation: updatedOp, balanceState } = await this.splitModule.deleteOperation(command.id, tgData.user.id)
                            ack({ patch: { type, balanceState, operation: savedOpToApi(updatedOp) } })
                        }

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
                        socket.join(`chatClient_${tgData.start_param}`);
                        socket.join(`chatUsersClient_${chatId}`);

                        this.userModule.updateUser(chatId, threadId, { id: tgData.user.id, name: tgData.user.first_name, lastname: tgData.user.last_name, username: tgData.user.username, disabled: false })

                        const users = savedUserToApi(await this.userModule.getUsersCached(chatId), chatId, threadId)
                        const { balance, balancePromsie } = await this.splitModule.getBalanceCached(chatId, threadId)
                        const { log, logPromise } = await this.splitModule.getLogCached(chatId, threadId)
                        // emit cached
                        const upd: FullState = { balanceState: balance, log: savedOpsToApi(log), users }
                        socket.emit("state", upd)

                        { // emit updated
                            const [balance, log] = await Promise.all([balancePromsie, logPromise])
                            const upd: FullState = { balanceState: balance, log: savedOpsToApi(log), users }
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

export const savedOpToApi = (saved: SavedOp): Operation => {
    const { _id, seq, ...op } = saved
    return { ...op, id: _id.toHexString(), date: _id.getTimestamp().getTime(), edited: seq > 0 }
}

export const savedOpsToApi = (saved: SavedOp[]): Log => {
    return saved.map(savedOpToApi)
}

export const savedUserToApi = (saved: SavedUser[], chatId: number, threadId?: number): User[] => {
    return saved.map(s => {
        const { _id, chatIds, disabledChatIds, threadIds, ...u } = s
        return { ...u, disabled: !!disabledChatIds?.includes(chatId) || (!!threadId && !threadIds?.includes(threadId)) }
    })
}
