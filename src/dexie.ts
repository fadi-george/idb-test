import Dexie, { Table } from "dexie";
import { v4 as uuid } from "uuid";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  Using Dexie
`;

interface RecordedEvent {
  uuid: string;
  timestamp: number;
}

export class ReplayDexie extends Dexie {
  events!: Table<RecordedEvent>;
  constructor() {
    super("replay", { autoOpen: false });
  }
}

export const replayStorage = new ReplayDexie();
replayStorage.version(1).stores({
  events: "uuid, timestamp",
});
replayStorage.open().catch((reason) => {
  console.error("Failed to open db", reason);
});

const addEvent = async () => {
  try {
    await replayStorage.events.add({
      uuid: uuid(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("add event error", error);
  }
};

const cleanUp = async (time: number) => {
  try {
    await replayStorage.events.where("timestamp").below(time).delete();
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
