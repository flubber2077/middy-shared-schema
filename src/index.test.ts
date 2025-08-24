import { HttpError } from "@middy/util";
import type { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";
import type { Context } from "aws-lambda";
import { describe, expect, test } from "vitest";
import z from "zod";
import { standardSchemaValidator } from "./index.js";
import type { Request } from "@middy/core";

describe("basic tests", () => {
  test("expect empty middleware if nothing is supplied", () => {
    const middleware = standardSchemaValidator({});
    expect(middleware.before).toBeUndefined();
    expect(middleware.after).toBeUndefined();
    expect(middleware.onError).toBeUndefined();
  });

  test("expect middleware to be populated if schemes are supplied", () => {
    const mockSchema = z.object();
    const middleware = standardSchemaValidator({
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
  ] as const)(
    "if validation fails in %s, proper error is thrown",
    async (part, method, statusCode) => {
      const schema = z.object({});
      const middleware = standardSchemaValidator({ [`${part}Schema`]: schema });
      const request = { [part]: "notAnObject" };
      await expect(
        middleware[method]!(request as unknown as Request),
      ).rejects.toThrowError(HttpError);
      await expect(
        middleware[method]!(request as unknown as Request),
      ).rejects.toMatchObject({
        statusCode,
        cause: { package: "middy-standard-schema", data: {} },
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
  ] as const)("modify %s when options are set true", async (part, method) => {
    const options = { modify: { response: true, event: true, context: true } };
    const middleware = standardSchemaValidator({
      [`${part}Schema`]: modifyingSchema,
      options,
    });
    const request = { [part]: {} };
    middleware[method]!(request as unknown as Request);
    expect(request[part]!.field).toBe("exists");
  });

  test.each([
    ["event", "before"],
    ["context", "before"],
    ["response", "after"],
  ] as const)(
    "don't modify %s when options are set false",
    async (part, method) => {
      const options = {
        modify: { response: false, event: false, context: false },
      };
      const middleware = standardSchemaValidator({
        [`${part}Schema`]: modifyingSchema,
        options,
      });
      const request = { [part]: {} };
      await middleware[method]!(request as unknown as Request);
      console.log(request);
      expect(request[part]!.field).toBeUndefined();
    },
  );

  test("default modify options", async () => {
    const modifyingSchema = z.object({}).transform((o) => "exists");
    const middleware = standardSchemaValidator({
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
    await middleware.before!(request as unknown as Request);
    expect(request.event).toBe("exists");
    expect(request.context).toStrictEqual({});
    await middleware.after!(request as unknown as Request);
    expect(request.response).toStrictEqual({});
  });
});

describe("asynchronous tests", () => {
  test("basic asynchronous test", async () => {
    const schema = z.object().transform(async () => await "hi");

    const middleware = standardSchemaValidator({
      eventSchema: schema,
      contextSchema: schema as StandardSchema<Context>,
      responseSchema: schema,
      options: { modify: { event: true, context: true, response: true } },
    });
    const request = { event: {}, context: {}, response: {} };
    await middleware.before!(request as Request);
    await middleware.after!(request as Request);
    expect(request.event).toBe("hi");
    expect(request.context).toBe("hi");
    expect(request.response).toBe("hi");
  });
});

describe.todo("typing tests");
