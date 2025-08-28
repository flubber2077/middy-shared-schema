import type { MiddlewareObj, Request } from "@middy/core";
import { createError } from "@middy/util";
import type { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";

type RequestPart = "event" | "context" | "response";
type ErrorFormatter = (input: StandardSchema.FailureResult) => string;

export const standardSchemaValidator = <
  E extends StandardSchema,
  C extends StandardSchema<Request["context"]>,
  R extends StandardSchema,
>({
  eventSchema,
  contextSchema,
  responseSchema,
  errorFormatter,
}: {
  eventSchema?: E;
  contextSchema?: C;
  responseSchema?: R;
  errorFormatter?: ErrorFormatter;
}): MiddlewareObj<
  StandardSchema.InferOutput<E>,
  StandardSchema.InferInput<R>,
  Error,
  StandardSchema.InferOutput<C>
> => {
  const getValidator = buildValidator(errorFormatter);

  const eventValidator = getValidator(eventSchema, "event", 400);
  const contextValidator = getValidator(contextSchema, "context", 400);
  const before = async (request: Request) => {
    await eventValidator(request);
    await contextValidator(request);
  };

  const responseValidator = getValidator(responseSchema, "response", 500);
  const after = async (request: Request) => {
    await responseValidator(request);
  };

  return {
    before: (eventSchema ?? contextSchema) ? before : undefined,
    after: responseSchema ? after : undefined,
  };
};

const buildValidator =
  (errorFormatter: ErrorFormatter | undefined) =>
  <T extends StandardSchema>(
    schema: T | undefined,
    part: RequestPart,
    code: number,
  ) => {
    if (!schema) return emptyFunction;
    return async (request: Request) => {
      let result = schema["~standard"].validate(request[part]);
      if (result instanceof Promise) result = await result;
      if (result.issues)
        throw getValidationError(code, part, result, errorFormatter);
      request[part] = result.value;
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
    : `The ${objectName} object failed validation`;
  return createError(code, JSON.stringify({ message }), {
    cause: { package: "middy-standard-schema", data: result.issues },
  });
};

const emptyFunction = () => void {};
