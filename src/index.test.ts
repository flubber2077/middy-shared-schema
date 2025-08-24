import { HttpError } from "@middy/util";
import { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";
import type { Context } from "aws-lambda";
import { describe, expect, test } from "vitest";
import z from "zod";
import { sharedSchemaValidator } from "./index.js";

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

describe("validation failure test suite", () => {
  const sch = z.object({});
  test.each([
    ["event", "before", 400],
    ["context", "before", 400],
    ["response", "after", 500],
  ])(
    "if validation fails in %s, proper error is thrown",
    async (part, method, statusCode) => {
      const schema = z.object({});
      const middleware = sharedSchemaValidator({ [`${part}Schema`]: schema });
      const request = { [part]: "notAnObject" };
      await expect(middleware[method](request)).rejects.toThrowError(HttpError);
      await expect(middleware[method](request)).rejects.toMatchObject({
        statusCode,
        cause: { package: "middy-shared-schema", data: {} },
      });
    },
  );
});

describe("modify objects test suite", () => {
  const modifyingSchema = z.object({ field: z.string().default("exists") });

  test.each([
    ["event", "before"],
    ["context", "before"],
    ["response", "after"],
  ])("modify %s when options are set true", async (part, method) => {
    const options = { modify: { response: true, event: true, context: true } };
    const middleware = sharedSchemaValidator({
      [`${part}Schema`]: modifyingSchema,
      options,
    });
    const request = { [part]: {} };
    middleware[method](request);
    expect(request[part].field).toBe("exists");
  });

  test.each([
    ["event", "before"],
    ["context", "before"],
    ["response", "after"],
  ])("don't modify %s when options are set false", async (part, method) => {
    const options = {
      modify: { response: false, event: false, context: false },
    };
    const middleware = sharedSchemaValidator({
      [`${part}Schema`]: modifyingSchema,
      options,
    });
    const request = { [part]: {} };
    await middleware[method](request);
    console.log(request);
    expect(request[part].field).toBeUndefined();
  });

  test("default modify options", async () => {
    const modifyingSchema = z.object({}).transform((o) => "exists");
    const middleware = sharedSchemaValidator({
      eventSchema: modifyingSchema,
      contextSchema: modifyingSchema as StandardSchema<Context>,
      responseSchema: modifyingSchema,
    });
    const request = {
      event: {},
      context: {},
      response: {},
      error: undefined,
      internal: undefined,
    };
    await middleware.before!(request);
    expect(request.event).toBe("exists");
    expect(request.context).toStrictEqual({});
    await middleware.after!(request);
    expect(request.response).toStrictEqual({});
  });
});

describe.todo("synchronous tests");

describe.todo("typing tests");
