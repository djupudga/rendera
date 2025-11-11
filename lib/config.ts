import fs from "fs"
import path from "path"
import { yamlParse } from "yaml-cfn"
import type { Flags } from "./types.d"

export function applyConfig(flags: Flags): Flags {
  const copy = { ...flags }
  const configPath = flags.config
    ? path.resolve(process.cwd(), flags.config)
    : path.resolve(process.cwd(), ".renderarc")
  if (fs.existsSync(configPath)) {
    try {
      const file = fs.readFileSync(configPath, "utf8").toString()
      const cfg = yamlParse(file) as Record<string, any>
      const validKeys = [
        "data",
        "render",
        "env",
        "config",
        "helpers",
      ] as (keyof Flags)[]
      for (const [key, value] of Object.entries(cfg)) {
        if (!validKeys.includes(key as keyof Flags)) {
          throw new Error(
            `Error reading ${configPath} - unknown config key: ${key}`,
          )
        }
        if (flags[key as keyof Flags] == undefined) {
          copy[key as keyof Flags] = value
        }
      }
    } catch (e) {
      console.error(`Unable to load config file: ${configPath}`)
      console.error((e as Error).message)
      process.exit(1)
    }
  }
  // Set default values if not already set
  if (!copy.render) {
    copy.render = "ejs"
  }
  return copy
}
