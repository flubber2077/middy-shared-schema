import type { MiddlewareObj, Request } from "@middy/core";
import { createError } from "@middy/util";
import type { StandardSchemaV1 as StandardSchema } from "@standard-schema/spec";

type RequestPart = "event" | "response";
type ErrorFormatter = (input: StandardSchema.FailureResult) => string;

export const standardSchemaValidator = <
  E extends StandardSchema,
  R extends StandardSchema,
>({
  eventSchema,
  responseSchema,
  errorFormatter,
}: {
  eventSchema?: E;
  responseSchema?: R;
  errorFormatter?: ErrorFormatter;
}): MiddlewareObj<
  StandardSchema.InferOutput<E>,
  StandardSchema.InferInput<R>
> => {
  const getValidator = buildValidator(errorFormatter);

  return {
    before: getValidator(eventSchema, "event", 400),
    after: getValidator(responseSchema, "response", 500),
  };
};

const buildValidator =
  (errorFormatter: ErrorFormatter | undefined) =>
  <T extends StandardSchema>(
    schema: T | undefined,
    part: RequestPart,
    code: number,
  ) => {
    if (!schema) return undefined;
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
