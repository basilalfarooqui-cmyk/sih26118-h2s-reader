export type ReadingSource = "app" | "hardware";

export interface PendingReading {
  localId: string;
  workerName: string;
  workerId: string;
  hexCode: string;
  timeRecorded: string;
}

export interface ReadingPayload {
  workerName: string;
  workerId: string;
  hexCode: string;
  source: ReadingSource;
  timeRecorded: string;
  timeSynced?: string;
}
