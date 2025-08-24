import type middy from "@middy/core";
import { createError } from "@middy/util";
import type { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";
import type { Context } from "aws-lambda";

type TypeFromSchema<T extends StandardSchema | undefined> = NonNullable<
  NonNullable<T>["~standard"]["types"]
>;

const modifyDefaults = {
  event: true,
  context: false,
  response: false,
} as const;

export const sharedSchemaValidator = <
  E extends StandardSchema,
  C extends StandardSchema<Context>,
  R extends StandardSchema,
>({
  eventSchema,
  contextSchema,
  responseSchema,
  options,
}: {
  eventSchema?: E;
  contextSchema?: C;
  responseSchema?: R;
  options?: {
    modify?: { event?: boolean; context?: boolean; response?: boolean };
  };
}): middy.MiddlewareObj<
  TypeFromSchema<typeof eventSchema>["output"],
  TypeFromSchema<typeof responseSchema>["input"],
  Error,
  TypeFromSchema<typeof contextSchema>["output"]
> => {
  const modify = { ...modifyDefaults, ...options?.modify };
  const before: middy.MiddlewareFn = async (request) => {
    if (eventSchema) {
      let result = eventSchema["~standard"].validate(request.event);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(400, "Event", result);
      }
      if (modify.event) request.event = result.value;
    }

    if (contextSchema) {
      let result = contextSchema["~standard"].validate(request.context);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(400, "Context", result);
      }

      if (modify.context) request.context = result.value;
    }
  };

  const after: middy.MiddlewareFn = async (request) => {
    if (responseSchema) {
      let result = responseSchema["~standard"].validate(request.response);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(500, "Response", result);
      }

      if (modify.response) request.response = result.value;
    }
  };

  return {
    before: (eventSchema ?? contextSchema) ? before : undefined,
    after: responseSchema ? after : undefined,
  };
};

const getValidationError = (
  code: number,
  objectName: string,
  result: StandardSchema.FailureResult,
) =>
  createError(code, `${objectName} object failed validation`, {
    // TODO: change name of package
    cause: { package: "middy-shared-schema", data: result.issues },
  });
