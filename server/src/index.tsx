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
import { MainScreenView, UserContext, UsersProvider } from "../../src/view/MainScreen";
import { SplitModule } from "./modules/splitModule/SplitModule";
import { savedOpToApi, savedUserToApi } from "./api/ClientAPI";
import { UsersModule as UsersClientModule } from "../../src/model/UsersModule";
import { UserModule } from "./modules/userModule/UserModule";

var path = require("path");
const PORT = process.env.PORT || 5001;

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

  app.use(compression()).get("/tg/", async (req, res) => {
    try {
      const chatId = Number(req.query.tgWebAppStartParam)
      const splitModule = container.resolve(SplitModule);
      const userIdString = req.cookies.user_id;
      const userId = userIdString ? Number.parseInt(userIdString, 10) : undefined
      const { balance } = await splitModule.getBalanceCached(chatId)
      const { log: savedLog } = await splitModule.getLogCached(chatId)
      const log = savedOpToApi(savedLog);

      const users = await container.resolve(UserModule).getUsersCached(chatId)
      const usersProvider = new UsersClientModule()
      savedUserToApi(users, chatId).forEach(usersProvider.updateUser)


      // const app = ''
      const app = ReactDOMServer.renderToString(
        <UserContext.Provider
          value={userId}
        >
          <UsersProvider.Provider value={usersProvider}>
            <MainScreenView balance={balance.balance} log={log} />
          </UsersProvider.Provider>
        </UserContext.Provider>
      );
      const data = await getIndexStr();
      res.send(
        data.replace('<div id="root"></div>', `<div id="root">${app}</div>`)
      );
    } catch (e) {
      console.error("Something went wrong:", e);
      return res.status(500).send("Oops 🤷‍♂️");
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
