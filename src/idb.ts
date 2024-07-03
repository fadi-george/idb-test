import { DBSchema, openDB } from "idb";
import { v4 as uuid } from "uuid";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  Using IDB
`;

interface ReplayDB extends DBSchema {
  events: {
    key: string;
    value: {
      uuid: string;
      timestamp: number;
    };
    indexes: { timestamp: number };
  };
}

const replayDB = openDB<ReplayDB>("replay", 10, {
  upgrade: (db) => {
    if (!db.objectStoreNames.contains("events")) {
      const events = db.createObjectStore("events", {
        keyPath: "uuid",
      });
      events.createIndex("timestamp", "timestamp");
    }
  },
});

const addEvent = async () => {
  try {
    const db = await replayDB;
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    await store.add({
      uuid: uuid(),
      timestamp: Date.now(),
    });
    await tx.done;
  } catch (error) {
    console.error("add event error", error);
  }
};

const cleanUp = async (time: number) => {
  try {
    const db = await replayDB;
    const tx = db.transaction("events", "readwrite");
    const index = tx.store.index("timestamp");
    const range = IDBKeyRange.upperBound(time, true); // below but not including time

    for await (const cursor of index.iterate(range)) {
      cursor.delete();
    }
    await tx.done;
  } catch (error) {
    console.error("cleanup error", error);
  }
};

const t1 = setInterval(() => {
  addEvent();
}, 1000);

const MIN_DIFF = 5 * 60 * 1000; // 5 minutes
const t2 = setInterval(() => {
  cleanUp(Date.now() - MIN_DIFF);
}, 10 * 1000);

// const stopFn = record();
setTimeout(() => {
  // stopFn?.();
  clearInterval(t1);
  clearInterval(t2);
}, 2 * MIN_DIFF);
