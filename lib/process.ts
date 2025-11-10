import ejs from "ejs"
import fs from "fs"
import handlebars from "handlebars"
import type { Flags } from "./types.d"
import { helpers } from "./helpers"
import { yamlParse } from "yaml-cfn"
import path from "path"
import { run } from "./run"

const ENV_HELPERS = "RENDERA_HELPERS"
const DEFAULT_HELPERS_PATH = "rendera_helpers"

// Data should contain all types in helpers
type Data = {
  env: Record<string, string>
  values: Record<string, any>
} & {
  indent: typeof helpers.indent
  toYaml: (obj: any) => string
  quote: (val: any) => string
  trunc: (i: string, n: number) => string
  toBase64: (s: string) => string
  getFile: (file: string) => string
  fileToBase64: (file: string) => string
  lookupCfOutput: (stackName: string, key: string) => string
  getParameter: (name: string, query?: string) => string
  valueOrDefault: (value: any, defaultValue: any) => any
}

function solvePaths(p: string): string[] {
  const paths: string[] = []
  if (fs.existsSync(p) === false) {
    throw new Error(`Helpers path does not exist: ${p}`)
  }
  if (p.endsWith(".js")) {
    paths.push(path.resolve(p))
  } else if (fs.lstatSync(p).isDirectory()) {
    const dirFiles = fs.readdirSync(p)
    for (const f of dirFiles) {
      if (f.endsWith(".js")) {
        paths.push(path.resolve(p, f))
      }
    }
  } else {
    throw new Error(`Helpers path is not a .js file or directory: ${p}`)
  }
  return paths
}

function loadCustomHelpers(
  wd: string,
  data: Data,
  flags: Flags,
  renderEngine: "handlebars" | "ejs",
) {
  let helpersPaths = DEFAULT_HELPERS_PATH
  if (process.env[ENV_HELPERS]) {
    helpersPaths = process.env[ENV_HELPERS]
  }
  if (flags.helpers) {
    helpersPaths = flags.helpers
  }
  if (!helpersPaths) return

  if (helpersPaths === DEFAULT_HELPERS_PATH && !fs.existsSync(helpersPaths)) {
    return
  }

  // Split and make unique
  const helpers = Array.from(new Set(helpersPaths.split(":")))

  for (const helpersPath of helpers) {
    const paths = solvePaths(helpersPath)
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const customHelpers = require(p)
        const args = {
          wd,
          run,
        }
        for (const key in customHelpers) {
          if (renderEngine === "handlebars") {
            // @ts-ignore
            handlebars.registerHelper(key, customHelpers[key](args))
          } else if (renderEngine === "ejs") {
            // @ts-ignore
            data[key] = customHelpers[key](args)
          }
        }
      } else {
        throw new Error(`Helpers file not found: ${p}`)
      }
    }
  }
}

export function processTemplate(
  templString: string,
  values: Record<string, any> | undefined,
  flags: Flags,
  wd: string,
) {
  wd = path.resolve(wd)
  // Check if wd is a file
  if (fs.lstatSync(wd).isFile()) {
    wd = path.dirname(wd)
  }
  const data = { values: values || {} } as Data
  data.env = Object.assign({}, process.env) as Record<string, string>

  if (flags.env) {
    const envFile = flags.env
    const env = fs.readFileSync(envFile, "utf8").toString()
    const envData = yamlParse(env)
    if (envData) {
      data.env = Object.assign(data.env, envData)
    }
  }

  if (flags.render === "ejs") {
    data.indent = helpers.indent
    data.toYaml = helpers.toYaml
    data.quote = helpers.quote
    data.trunc = helpers.trunc
    data.toBase64 = helpers.toBase64
    data.getFile = helpers.getFile(wd)
    data.fileToBase64 = helpers.fileToBase64(wd)
    data.lookupCfOutput = helpers.lookupCfOutput()
    data.getParameter = helpers.getParameter()
    data.valueOrDefault = helpers.valueOrDefault

    loadCustomHelpers(wd, data, flags, "ejs")

    return ejs.render(templString, data, {
      escape: (s: string) => (s == null ? "" : s),
    })
  } else if (flags.render === "handlebars") {
    handlebars.registerHelper("indent", helpers.indent)
    handlebars.registerHelper("toYaml", helpers.toYaml)
    handlebars.registerHelper("quote", helpers.quote)
    handlebars.registerHelper("trunc", helpers.trunc)
    handlebars.registerHelper("toBase64", helpers.toBase64)
    handlebars.unregisterHelper("getFile")
    handlebars.unregisterHelper("fileToBase64")
    handlebars.registerHelper("getFile", helpers.getFile(wd))
    handlebars.registerHelper("fileToBase64", helpers.fileToBase64(wd))
    handlebars.registerHelper(
      "lookupCfOutput",
      helpers.lookupCfOutput(),
    )
    handlebars.registerHelper("valueOrDefault", helpers.valueOrDefault)
    handlebars.registerHelper(
      "getParameter",
      helpers.getParameter(),
    )

    loadCustomHelpers(wd, data, flags, "handlebars")

    const template = handlebars.compile(templString, { noEscape: true })
    return template(data)
  } else {
    throw new Error(`Unsupported rendering engine: ${flags.render}`)
  }
}
