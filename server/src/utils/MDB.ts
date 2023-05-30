import { MongoClient, Db } from "mongodb";

// Connection URL
const url =
  process.env.MONGODB_URI || require("../../../../../secret.json").mdbUrl;

// Database Name
const dbName = "tg-split";

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

  MDB.collection("balances").createIndex(
    { chatId: 1 },
    {
      name: "balances:chatUnique",
      unique: true,
    }
  );

  MDB.collection("ops").createIndex(
    { chatId: 1, idempotencyKey: 1 },
    {
      name: "ops:idempotencyUnique",
      unique: true,
    }
  );

  MDB.collection("ops").createIndex(
    { correction: 1 },
    {
      name: "ops:corectionUnique",
      unique: true,
      partialFilterExpression: { correction: { $type: "objectId" } },
    }
  );

  MDB.collection("users").createIndex(
    { id: 1 },
    {
      name: "users:unique",
      unique: true,
    }
  );

};
