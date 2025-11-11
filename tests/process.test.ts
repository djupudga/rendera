import { expect, test } from "bun:test"
import { processTemplate } from "../lib/process"

test("ejs", () => {
  // Setup
  const yamlString = `
  foo: <%= values.foo %>
  bar: <%= values.bar %>
  baz: <%= values.baz %>`
  const manifest = {
      foo: "foo",
      bar: "bar",
      baz: "baz",
  }
  const flags = {
    render: "ejs",
    env: "",
  }
  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(`\n  foo: foo\n  bar: bar\n  baz: baz`)
})

test("handlebars", () => {
  // Setup
  const yamlString = `
  foo: {{ values.foo }}
  bar: {{ values.bar }}
  baz: {{ values.baz }}`
  const manifest = {
    foo: "foo",
    bar: "bar",
    baz: "baz",
  }
  const flags = {
    render: "handlebars",
    env: "",
  }
  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(`\n  foo: foo\n  bar: bar\n  baz: baz`)
})

test("env", () => {
  // Setup
  const yamlString = `foo: {{env.foo}}`
  const manifest = {}
  const flags = {
    render: "handlebars",
    env: "",
  }
  process.env["foo"] = "bar"
  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(`foo: bar`)
})

test("env with env file", () => {
  // Setup
  const yamlString = `foo: {{env.foo}}`
  const manifest = {}
  const flags = {
    render: "handlebars",
    env: "./tests/fixtures/env.yml",
  }

  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(`foo: bar`)
})

test("ejs helpers", () => {
  // Setup
  const yamlString = `
<%= toYaml(values.foo) %>
bar: <%= quote(values.bar) %>
baz: <%= trunc(values.baz, 3) %>
foo:
<%= indent(values.bar, 2) %>
base64: <%= toBase64(values.bar) %>`
  const manifest = {
    foo: { a: "a", b: "b" },
    bar: "bar",
    baz: "alongstring",
  }
  const flags = {
    render: "ejs",
    env: "",
  }
  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(
    `\na: a\nb: b\nbar: "bar"\nbaz: alo\nfoo:\n  bar\nbase64: YmFy`,
  )
})

test("handlebars helpers", () => {
  // Setup
  const yamlString = `
{{toYaml values.foo}}
bar: {{quote values.bar}}
baz: {{trunc values.baz 3}}
foo:
{{indent values.bar 2}}
base64: {{toBase64 values.bar}}`
  const manifest = {
    foo: { a: "a", b: "b" },
    bar: "bar",
    baz: "alongstring",
  }
  const flags = {
    render: "handlebars",
    env: "",
  }
  // Exercise
  const result = processTemplate(yamlString, manifest, flags, "")
  // Verify
  expect(result).toBe(
    `\na: a\nb: b\nbar: "bar"\nbaz: alo\nfoo:\n  bar\nbase64: YmFy`,
  )
})
