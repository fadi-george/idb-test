import { v4 as uuid } from "uuid";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  Using IndexedDB w/ Promises
`;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("replay", 10);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("events")) {
        const events = db.createObjectStore("events", {
          keyPath: "uuid",
        });
        events.createIndex("timestamp", "timestamp");
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

openDB();

const addEvent = async () => {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("events", "readwrite");
      const store = tx.objectStore("events");

      tx.oncomplete = () => {
        resolve(null);
      };
      tx.onerror = (event) => {
        reject((event.target as IDBTransaction).error);
      };

      store.add({
        uuid: uuid(),
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("add event error", error);
  }
};

const cleanUp = async (time: number) => {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("events", "readwrite");
      const store = tx.objectStore("events");
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(time, true);

      tx.oncomplete = () => {
        resolve(null);
      };
      tx.onerror = (e) => {
        reject(e);
      };

      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
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

setTimeout(() => {
  clearInterval(t1);
  clearInterval(t2);
}, 2 * MIN_DIFF);
