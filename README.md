# Middy-Standard-Schema

A Standard-Schema based Middy Validator

## Getting started

### Install

```bash
npm install middy-standard-schema
```

### Usage

After installation, use as a standard middy middleware with any compatible schema.

```typescript
export const eventSchema = z.object({
  body: z.object({
    HelloWorld: z.string(),
  }),
});

export const handler = middy(lambdaFunction).use(
  standardSchemaValidator({ eventSchema }),
);
```

## Features

### Supports any Standard-Schema compatible validation library

```typescript
import z from "zod";
import { type } from "arktype";
import * as v from "valibot";

const validator = standardSchemaValidator({
  beforeSchema: z.object(),
  contextSchema: type({}),
  responseSchema: v.object({}),
});

middy(lambdaFunction).use(validator);
```

### Intelligently merges into Event type

```typescript
const eventSchema = z.looseObject({
  queryStringParameters: z.looseObject({ search: z.string() }),
});

middy<APIGatewayProxyEvent>()
  .use(standardSchemaValidator({ eventSchema }))
  .handler((event) => {
    event.queryStringParameters.search;
    //                          ^? (property) search: string
    event.queryStringParameters.unspecified;
    //                          ^? string | undefined
  });
```

### Transform Requests on Command

By default, events will be transformed by the validation. This behavior can be modified to also transform Contexts and Responses, or turned off altogether to just allow for non-transforming validation.

## Contribution

Any and all issues and PRs are **greatly** appreciated.
Please leave a star if this project was helpful to you.
