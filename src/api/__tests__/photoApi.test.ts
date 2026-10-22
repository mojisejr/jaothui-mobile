import { getBuffaloPhotos } from "../jaothui";
import { mobileRequest } from "../client";
jest.mock("../client", () => ({ mobileRequest: jest.fn() }));
const id = "764040226600001";
describe("bounded public photo API wrapper", () => {
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });
  it("POSTs only public microchips, no bearer, no unsafe numeric tokens", async () => {
    (mobileRequest as jest.Mock).mockResolvedValue({ photos: [] }); await getBuffaloPhotos([id]);
    expect(mobileRequest).toHaveBeenCalledWith("/api/mobile/v1/buffalos/photos", {
      method: "POST", body: { microchips: [id] }, signal: expect.any(AbortSignal),
    });
  });
  it("rejects raw oversize before issuing a network request", async () => {
    await expect(getBuffaloPhotos(Array(41).fill(id))).rejects.toThrow(); expect(mobileRequest).not.toHaveBeenCalled();
  });
  it("aborts an 8-second stalled optional endpoint and propagates fail-soft to coordinator", async () => {
    jest.useFakeTimers();
    (mobileRequest as jest.Mock).mockImplementation((_path, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const request = getBuffaloPhotos([id]); const check = expect(request).rejects.toThrow("aborted");
    jest.advanceTimersByTime(8000); await check;
  });
});
