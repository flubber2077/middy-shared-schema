import { describe, test, vi, expect } from "vitest";
import {sharedSchemaValidator} from './index.js'

describe('basic tests', () => {
    test('expect empty middleware if nothing is supplied', () => {
        const middleware = sharedSchemaValidator({})
        expect(middleware.before).toBeUndefined()
        expect(middleware.after).toBeUndefined()
        expect(middleware.onError).toBeUndefined()
    })
})
test("something", () => {
  expect(1 + 1).toBe(2);
});
