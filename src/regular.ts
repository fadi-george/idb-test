import { v4 as uuid } from "uuid";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  Using Basic IndexedDB
`;

let db: IDBDatabase | null = null;
const openDB = () => {
  const request = indexedDB.open("replay", 10);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("events")) {
      const store = db.createObjectStore("events", { keyPath: "uuid" });
      store.createIndex("timestamp", "timestamp");
    }
  };

  request.onsuccess = () => {
    console.log("DB opened successfully");
    db = request.result;
  };

  request.onerror = (e) => {
    console.error("Failed to open db", e);
  };
};

openDB();

const addEvent = () => {
  if (!db) return;

  const transaction = db.transaction("events", "readwrite");
  transaction.onerror = () => {
    console.error("Transaction error for add event", transaction.error);
  };

  const store = transaction.objectStore("events");
  store.add({
    uuid: uuid(),
    timestamp: Date.now(),
  });
};

const cleanUp = (time: number) => {
  if (!db) return;

  const transaction = db.transaction("events", "readwrite");
  const store = transaction.objectStore("events");
  const index = store.index("timestamp");
  const range = IDBKeyRange.upperBound(time, true);

  transaction.onerror = () => {
    console.error("Transaction error for clean up", transaction.error);
  };

  const request = index.openCursor(range);
  request.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
};

const t1 = setInterval(() => {
  addEvent();
}, 1000);

const MIN_DIFF = 5 * 60 * 1000; // 5 minutes
const t2 = setInterval(() => {
  cleanUp(Date.now() - MIN_DIFF);
}, 10 * 1000);

setTimeout(() => {
  clearInterval(t1);
  clearInterval(t2);
}, 2 * MIN_DIFF);
