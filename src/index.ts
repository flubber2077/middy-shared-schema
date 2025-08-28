import type { MiddlewareObj, Request } from "@middy/core";
import { createError } from "@middy/util";
import type { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";

type RequestPart = "event" | "context" | "response";
type ErrorFormatter = (input: StandardSchema.FailureResult) => string;

const modifyDefaults = {
  event: true,
  context: false,
  response: false,
} as const;

export const standardSchemaValidator = <
  E extends StandardSchema,
  C extends StandardSchema<Request["context"]>,
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
    modify?: Record<RequestPart, boolean>;
    errorFormatter?: ErrorFormatter;
  };
}): MiddlewareObj<
  StandardSchema.InferOutput<E>,
  StandardSchema.InferInput<R>,
  Error,
  StandardSchema.InferOutput<C>
> => {
  const modify = { ...modifyDefaults, ...options?.modify };
  const errorFormatter = options?.errorFormatter;

  const before = async (request: Request) => {
    if (eventSchema) {
      let result = eventSchema["~standard"].validate(request.event);
      if (result instanceof Promise) result = await result;
      if (result.issues)
        throw getValidationError(400, "Event", result, errorFormatter);
      if (modify.event) request.event = result.value;
    }

    if (contextSchema) {
      let result = contextSchema["~standard"].validate(request.context);
      if (result instanceof Promise) result = await result;
      if (result.issues)
        throw getValidationError(400, "Context", result, errorFormatter);
      if (modify.context) request.context = result.value;
    }
  };

  const after = async (request: Request) => {
    if (responseSchema) {
      let result = responseSchema["~standard"].validate(request.response);
      if (result instanceof Promise) result = await result;
      if (result.issues)
        throw getValidationError(500, "Response", result, errorFormatter);
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
  errorFormatter?: ErrorFormatter,
) => {
  const message = errorFormatter
    ? errorFormatter(result)
    : `${objectName} object failed validation`;
  return createError(code, JSON.stringify({ message }), {
    cause: { package: "middy-standard-schema", data: result.issues },
  });
};
