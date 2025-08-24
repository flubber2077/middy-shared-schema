# Middy-Shared-Schema

A Standard-Schema based Middy Validator

## Features

### Supports any Standard-Schema based validator

```typescript
import z from "zod";
import { type } from "arktype";
import * as v from "valibot";

const validator = sharedSchemaValidator({
  beforeSchema: z.object(),
  contextSchema: type({}),
  responseSchema: v.object({}),
});

middy().use(validator);
```
