import { describe, test, vi, expect } from "vitest";
import { sharedSchemaValidator } from "./index.js";
import z from "zod";

describe("basic tests", () => {
  test("expect empty middleware if nothing is supplied", () => {
    const middleware = sharedSchemaValidator({});
    expect(middleware.before).toBeUndefined();
    expect(middleware.after).toBeUndefined();
    expect(middleware.onError).toBeUndefined();
  });

  test("expect middleware to be populated if schemes are supplied", () => {
    const mockSchema = z.object();
    const middleware = sharedSchemaValidator({
      eventSchema: mockSchema,
      responseSchema: mockSchema,
    });
    expect(middleware.before).not.toBeUndefined();
    expect(middleware.after).not.toBeUndefined();
    expect(middleware.onError).toBeUndefined();
  });
});
