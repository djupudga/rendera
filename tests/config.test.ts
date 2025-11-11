import { test, expect } from "bun:test"
import { applyConfig } from "../lib/config"

const configPath = "tests/fixtures/config_test/renderarc"

test("loads defaults from config file", () => {
  const flags: any = { config: configPath }
  const copy = applyConfig(flags)
  expect(copy.render).toBe("handlebars")
  expect(copy.data).toBe("foo.yml")
  expect(copy.env).toBe("bar.yml")
  expect(copy.helpers).toBe("helpers.js")
})

test("sets defaults if not already set", () => {
  const flags: any = {}
  const copy = applyConfig(flags)
  expect(copy.render).toBe("ejs")
  expect(copy.data).toBeUndefined()
  expect(copy.env).toBeUndefined()
  expect(copy.helpers).toBeUndefined()
  expect(copy.config).toBeUndefined()
})
