import type middy from "@middy/core";
import { createError } from "@middy/util";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type ValidationInput<T extends StandardSchemaV1> = {
  eventSchema?: T;
  contextSchema?: T;
  responseSchema?: T;
  options?: {
    modify?: { event?: boolean; context?: boolean; response?: boolean };
  };
};

const modifyDefaults = {
  event: true,
  context: false,
  response: false,
} as const;

export const commonValidationMiddleware = <T extends StandardSchemaV1>({
  eventSchema,
  contextSchema,
  responseSchema,
  options,
}: ValidationInput<T>): middy.MiddlewareObj => {
  const modify = { ...modifyDefaults, ...options?.modify };
  const before: middy.MiddlewareFn = async (request) => {
    if (eventSchema) {
      let result = eventSchema["~standard"].validate(request.event);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(400, "Event", result);
      }
      if (modify.event) request.event = result;
    }

    if (contextSchema) {
      let result = contextSchema["~standard"].validate(request.context);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(400, "Context", result);
      }

      if (modify.context) request.context = result;
    }
  };

  const after: middy.MiddlewareFn = async (request) => {
    if (responseSchema) {
      let result = responseSchema["~standard"].validate(request.response);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw getValidationError(500, "Response", result);
      }

      if (modify.response) request.response = result;
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
  result: StandardSchemaV1.FailureResult,
) =>
  createError(code, `${objectName} object failed validation`, {
    cause: { package: "", data: result.issues },
  });

// TODO:
// name package
// make sure it works
// idk look for best practices. no one is making types work better for this library mostly.
