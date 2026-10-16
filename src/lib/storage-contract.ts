import { ApiError } from "./security";

export interface DocumentStore<T> {
  read(key: string): Promise<T | undefined>;
  transact<R>(key: string, seed: (() => T) | undefined, fn: (state: T) => R): Promise<R>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

// Leave room for the workspace key, timestamp and SQL row encoding overhead.
export const MAX_DOCUMENT_BYTES = 1536 * 1024;
export function encodeDocument(value: unknown): string {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > MAX_DOCUMENT_BYTES)
    throw new ApiError(
      "Demo workspace storage limit reached. Export evidence and reset unused examples.",
      413,
    );
  return text;
}
