import { describe, it, expect } from "vitest";
import { HTTP_STATUS } from "../../src/lib/http-status";

describe("HTTP_STATUS", () => {
  it("has correct codes", () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.PAYMENT_REQUIRED).toBe(402);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });
});
