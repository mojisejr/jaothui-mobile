export const SECURE_STORAGE_ERROR_MESSAGE = "ไม่สามารถเข้าถึงข้อมูลเข้าสู่ระบบอย่างปลอดภัยบนอุปกรณ์นี้ได้ กรุณาลองใหม่ภายหลัง";

export class MobileSessionStorageError extends Error {
  readonly cause?: unknown;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "MobileSessionStorageError";
    this.cause = options?.cause;
  }
}

/** SDK failures stay failures: never interpret an inaccessible key as a guest. */
export async function secureStorageCall<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (cause) {
    if (cause instanceof MobileSessionStorageError) throw cause;
    throw new MobileSessionStorageError(SECURE_STORAGE_ERROR_MESSAGE, { cause });
  }
}
