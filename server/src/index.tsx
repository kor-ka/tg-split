// lig bug workaround
import * as TB from "node-telegram-bot-api";
import "dotenv/config"
import "reflect-metadata";
import cookieParser from "cookie-parser";
import compression from "compression";
import express from "express";
import { Server } from "socket.io";
import * as ReactDOMServer from "react-dom/server";
import { createServer } from "http";
import { TelegramBot } from "./api/tg/tg";
import { SocketApi } from "./api/socket";
import { container } from "tsyringe";
import * as fs from "fs";
import { initMDB } from "./utils/MDB";
import { ClndrAvailable, MainScreenView, Timezone, UserContext, UsersProvider } from "../../src/view/MainScreen";
import { SplitModule } from "./modules/splitModule/SplitModule";
import { savedOpsToApi, savedUserToApi } from "./api/ClientAPI";
import { UsersModule as UsersClientModule } from "../../src/model/UsersModule";
import { UserModule } from "./modules/userModule/UserModule";
import { VM } from "../../src/utils/vm/VM";
import { Balance, Operation } from "../../src/shared/entity";
import { optimiseBalance } from "../../src/model/optimiseBalance";
import { ChatMetaModule } from "./modules/chatMetaModule/ChatMetaModule";
import cors from "cors";
import { checkChatToken } from "./api/Auth";

var path = require("path");
const PORT = process.env.PORT || 5001;

const CLNDR_DOMAIN = 'https://tg-clndr-4023e1d4419a.herokuapp.com';

export const appRoot = path.resolve(__dirname);

const indexFilePath = path.resolve(__dirname + "/../../../../build/index.html");

const getIndexStrPromise = () => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(indexFilePath, "utf8", (err, data) => {
      if (err) {
        reject(data);
      } else {
        resolve(data);
      }
    });
  });
};
// index file for SSR
let _indexFileStr: Promise<string> | undefined;

const getIndexStr = () => {
  if (!_indexFileStr) {
    _indexFileStr = getIndexStrPromise().catch((e) => {
      _indexFileStr = undefined;
      throw e;
    });
  }
  return _indexFileStr;
};

// TODO: ref mdb access to async (how to resolve async chains?)
// MDB is accessed statically
initMDB().then(() => {
  let app = express();
  app
    .use((req, res, next) => {
      if (
        req.get("X-Forwarded-Proto") === "https" ||
        req.hostname === "localhost"
      ) {
        next();
      } else if (
        req.get("X-Forwarded-Proto") !== "https" &&
        req.get("X-Forwarded-Port") !== "443"
      ) {
        //Redirect if not HTTP with original request URL
        res.redirect("https://" + req.hostname + req.url);
      }
    })
    .get("/favicon.ico", async (_, res) => {
      res.sendFile(path.resolve(__dirname + "/../../../../public/favicon.ico"));
    })

    .use(express.json({ limit: "500kb" }))
    .use(cookieParser());

  app.get("/enabledInChat/:chatId", cors({ origin: CLNDR_DOMAIN }), async (req, res) => {
    const chatMetaModule = container.resolve(ChatMetaModule);
    const chatId = Number.parseInt(req.params.chatId as string);
    res.send(!!await chatMetaModule.getChatMeta(chatId))
  });

  app.use(compression()).get("/tg/", async (req, res) => {
    try {
      const splitModule = container.resolve(SplitModule);
      const chatMetaModule = container.resolve(ChatMetaModule);

      const [chat_descriptor, token] = (req.query.tgWebAppStartParam as string).split('T') ?? [];
      const [chatId, threadId] = chat_descriptor.split('_').map(Number) ?? [];

      const userIdString = req.cookies.user_id;
      const userId = userIdString ? Number.parseInt(userIdString, 10) : undefined
      if (userId !== undefined) {
        res.cookie('ssr_user_id', userId, { sameSite: 'none', secure: true })
      }

      const timeZone = req.cookies.time_zone
      if (timeZone !== undefined) {
        res.cookie('ssr_time_zone', timeZone, { sameSite: 'none', secure: true })
      }

      const [balanceCached, chatMeta] = await Promise.all([splitModule.getBalanceCached(chatId, threadId), chatMetaModule.getChatMeta(chatId)])

      try {
        checkChatToken(token, chatId);
      } catch (e) {
        if ((chatMeta?.token ?? undefined) !== token) {
          throw new Error("unauthorized")
        }
      }

      const { balance: balanceState } = balanceCached;
      const balance = optimiseBalance(balanceState.balance).reduce((balanceState, e) => {
        if (e.sum > 0) {
          e.pair.reverse()
          e.sum *= -1
        }
        if (userId !== undefined && e.pair.includes(userId)) {
          balanceState.yours.push(e)
        } else {
          balanceState.others.push(e)
        }
        return balanceState
      }, { yours: [] as Balance, others: [] as Balance })
      const balanceStateVm = new VM<{ yours: Balance, others: Balance, seq: number } | undefined>({ seq: balanceState.seq, ...balance })

      const { log: savedLog } = await splitModule.getLogCached(chatId, threadId)
      const logMap = new Map<string, VM<Operation>>()
      savedOpsToApi(savedLog).forEach(o => logMap.set(o.id, new VM(o)))

      const users = await container.resolve(UserModule).getUsersCached(chatId)
      const usersProvider = new UsersClientModule(userId)
      savedUserToApi(users, chatId, threadId).forEach(usersProvider.updateUser)



      // const app = ''
      const app = ReactDOMServer.renderToString(
        <Timezone.Provider value={timeZone}>
          <ClndrAvailable.Provider value={req.cookies[`cldr_available_${chatId}`] === 'true'}>
            <UserContext.Provider
              value={userId}
            >
              <UsersProvider.Provider value={usersProvider}>
                <MainScreenView balanceVM={balanceStateVm} logVM={new VM(logMap)} />
              </UsersProvider.Provider>
            </UserContext.Provider>
          </ClndrAvailable.Provider>
        </Timezone.Provider>
      );
      const data = await getIndexStr();
      res.send(
        data.replace('<div id="root"></div>', `<div id="root">${app}</div>`)
      );
    } catch (e) {
      console.error("Something went wrong:", e);
      if (e instanceof Error) {
        return res.status(500).send(e.message);
      } else {
        return res.status(500).send("Oops 🤷‍♂️");
      }
    }
  });
  app
    .use(function (_, res, next) {
      res.set("Cache-control", "public, max-age=86400000");
      next();
    })
    .use(express.static(path.resolve(__dirname + "/../../../../build")))
    .get("*", async (_, res) => {
      res.sendFile(path.resolve(__dirname + "/../../../../build/index.html"));
    });

  const server = createServer(app);
  let io = new Server(server, {
    transports: ["websocket"],
  });

  new SocketApi(io).init();
  new TelegramBot().init();

  server.listen(PORT, () => console.log(`lll- on ${PORT}`));
}).catch(e => console.error(e));
