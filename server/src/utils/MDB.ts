import { MongoClient, Db } from "mongodb";

// Connection URL
const url =
  process.env.MONGODB_URI || require("../../../../../secret.json").mdbUrl;

// Database Name
const dbName = "tg-ytbq";

export const MDBClient = new MongoClient(url, { minPoolSize: 100 });

export let MDB: Db;

let connect = (resolve: (db: Db) => void) => {
  MDBClient.connect((error) => {
    console.warn("[MDB]", "connect", url);
    if (error) {
      console.warn("[MDB]", error);
      setTimeout(() => connect(resolve), 500);
    } else {
      console.warn("[MDB]", "inited");
      resolve(MDBClient.db(dbName));
    }
  });
};

let mdbPromise: Promise<void> | undefined;

export const initMDB = () => {
  if (!mdbPromise) {
    mdbPromise = _initMDB();
  }
  return mdbPromise;
};

const _initMDB = async () => {
  MDB = await new Promise<Db>((resolve) => {
    connect(resolve);
  });

  MDB.collection("content").createIndex(
    { "descriptor.type": 1, "descriptor.id": 1, chatId: 1 },
    {
      name: "content:contentUnique",
      unique: true,
      partialFilterExpression: { "descriptor.type": { $type: "string" } },
    }
  );

  MDB.collection("content").createIndex(
    { chatId: 1 },
    {
      name: "content:playingUnique",
      unique: true,
      partialFilterExpression: { playing: { $type: "objectId" } },
    }
  );

  MDB.collection("content").createIndex(
    { chatId: 1, "descriptor.type": 1, "descriptor.id": 1 },
    {
      name: "content:playingContent",
      partialFilterExpression: { playing: { $type: "objectId" } },
    }
  );

  MDB.collection("content").createIndex(
    {
      chatId: 1,
      playing: 1,
      lastPlayed: 1,
      playedQueueScore: -1,
      "votes.rating": -1,
      replyMessageId: 1,
    },
    {
      name: "content:pickNextCandidate",
    }
  );

  MDB.collection("content").createIndex(
    {
      chatId: 1,
      playedQueueScore: 1,
    },
    {
      name: "content:pickNextScoreTopBot",
      partialFilterExpression: { playedQueueScore: { $type: "int" } },
    }
  );

  MDB.collection("content").createIndex(
    {
      chatId: 1,
      playing: -1,
      lastPlayed: 1,
      playedQueueScore: -1,
      "votes.rating": -1,
      replyMessageId: 1,
    },
    {
      name: "content:queue",
    }
  );

  MDB.collection("content").createIndex(
    {
      chatId: 1,
      lastPlayed: 1,
      playedQueueScore: -1,
      "votes.rating": -1,
      replyMessageId: 1,
    },
    {
      name: "content:upNext",
      partialFilterExpression: { playing: null },
    }
  );

  MDB.collection("pins").createIndex(
    { chatId: 1 },
    {
      name: "pins:chatUnique",
      unique: true,
    }
  );

  MDB.collection("video_meta").createIndex(
    { id: 1 },
    {
      name: "vide:idUnique",
      unique: true,
    }
  );

  // Bind sessions
  MDB.collection("bind_session").createIndex(
    { code: 1 },
    {
      name: "code:unique",
      unique: true,
    }
  );

  MDB.collection("bind_session").createIndex(
    { sessionId: 1 },
    {
      name: "session:unique",
      unique: true,
    }
  );
};
