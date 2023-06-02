import { singleton } from "tsyringe";
import { User } from "../../../../entity";
import { Subject } from "../../utils/subject";
import { SavedUser, USER } from "./userStore";

@singleton()
export class UserModule {
  private db = USER();

  readonly userUpdated = new Subject<{ chatId: number, user: User }>();

  updateUser = async (
    chatId: number,
    user: User
  ) => {
    const { id, disabled, ...updateFields } = user
    let update = Object.entries(updateFields).reduce((update, [key, value]) => {
      update[key] = value;
      return update;
    }, {} as any);

    let res = await this.db.updateOne(
      { id },
      {
        $set: {
          ...update,
        },
        $push: { ...disabled ? { disabledChatIds: chatId } : {}, chatIds: chatId },
        $pull: { ...disabled ? {} : { disabledChatIds: chatId } }
      },
      { upsert: true }
    );

    this.userUpdated.next({ chatId, user });

    return res;
  };

  private usersCache = new Map<number, SavedUser[]>;

  getUser = async (uid: number): Promise<SavedUser | null> => {
    return this.db.findOne({ id: uid })
  };

  getUsers = async (chatId: number): Promise<SavedUser[]> => {
    const res = (await this.db.find({ chatIds: chatId }).toArray())
    this.usersCache.set(chatId, res)
    return res
  };

  getUsersCached = async (chatId: number): Promise<SavedUser[]> => {
    let users = this.usersCache.get(chatId)
    if (!users) {
      users = await this.getUsers(chatId)
    }
    return users
  };
}
