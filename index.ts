import meow from "meow"
import fs from "fs"
import { processTemplate } from "./lib/process"
import {yamlParse} from "yaml-cfn"
import path from "path"
import { applyConfig } from "./lib/config"

const cli = meow(
  `
  Rendera - Render configuration files from templates.

  Usage:
    $ rendera [OPTION] [FILE] [OUTPUT]

  Flags:
    -d, --data
      Path to YAML file containing substitution data.
    -r, --render
      Template engine (ejs or handlebars)
    -e, --env
      Path to YAML file containing environment variables.
    -H, --helpers
      Path to a JavaScript file containing custom helper functions.
    -c, --config
      Path to configuration file.
    --help
      Show this text
    --version
      Rendera version

  Description:
    Rendera is a command line tool for processing files as templates.
    It supports EJS and Handlebars templating languages. A typical use case
    is to generate multiple configuration files from a one or more template
    files, a data file and/or environment variables.

    Rendera accepts input from standard input and writes output to standard
    output.

    By default, rendera takes data from 'data.y(a)ml' and uses it as context
    for substitution in target templates. Rendera looks for the
    'data.y(a)ml' in the working folder. An alternative data file can be
    specified using the '-d' flag. Data file is optional and can be omitted.

    Rendera supports EJS and Handlebars as templating languages, with EJS being
    the default. This can be overridden by a flag (-e).

    Rendera can be configured using a config file (.brailsrc). All
    non-abbreviated flags can be used, i.e. 'engine' but not 'e'.
    The config file format is YAML.

    Rendera looks for the config file in the working folder. Alternatively, 
    a config file can be specified using the '-c' flag.

    Rendera exposes environment variables to the template files in the
    'env' variable. For example, the environment variable 'HOME' can be
    accessed like this: env.HOME


  Examples:
    $ cat template.ejs | rendera
    $ cat template.ejs | rendera -d data.yaml config.ini
    $ rendera folder/ -d data.yaml -f some-folder -c brailsrc -o deploy_ready.yaml
    $ SOME_VAR=foo brails -d data.yaml -f some-folder

`,
  {
    importMeta: import.meta,
    autoVersion: true,
    flags: {
      data: {
        type: "string",
        shortFlag: "d",
      },
      render: {
        type: "string",
        shortFlag: "r",
      },
      env: {
        type: "string",
        shortFlag: "e",
      },
      config: {
        type: "string",
        shortFlag: "c",
        default: ".renderarc",
      },
      helpers: {
        type: "string",
        shortFlag: "H",
      },
    },
  },
)


function validate(fromStdIn: boolean, source?: string, target?: string) {
  if (!source) {
    throw new Error("Source is missing")
  }

  const sourceIsFolder = !fromStdIn && fs.lstatSync(source).isDirectory()
  const targetIsFolder = target && fs.lstatSync(target).isDirectory()

  if (fromStdIn && targetIsFolder) {
    throw new Error("When reading from standard input, [output] must be a file")
  }
  
  if (sourceIsFolder && !targetIsFolder) {
    throw new Error("[source] is a folder, so [output] must be a folder too")
  }
}


function getFiles(fileOrFolder: string): string[] {
  const stats = fs.lstatSync(fileOrFolder)
  if (stats.isDirectory()) {
    const files: string[] = []
    const dirFiles = fs.readdirSync(fileOrFolder)
    for (const f of dirFiles) {
      const fullPath = `${fileOrFolder}/${f}`
      const fileStats = fs.lstatSync(fullPath)
      if (fileStats.isFile()) {
        files.push(fullPath)
      }
    }
    return files
  } else if (stats.isFile()) {
    return [fileOrFolder]
  } else {
    throw new Error(`[source] is neither a file nor a folder: ${fileOrFolder}`)
  }
}

function readYaml(path?: string): Record<string, any> {
  if (!path) {
    return {}
  }
  if (!fs.existsSync(path)) {
    throw new Error(`YAML file not found: ${path}`)
  }
  const content = fs.readFileSync(path, "utf8").toString()
  return yamlParse(content) as Record<string, any>
}

try {
  let flags = applyConfig(cli.flags)
  let source, target: string | undefined = undefined 
  let standardInData: string | undefined = undefined
  if (!process.stdin.isTTY) {
    standardInData = await new Response(Bun.stdin.stream()).text()
    if (cli.input.length == 1) {
      target = cli.input[0]
      // Target must be a file
      if (!fs.existsSync(target!)) {
        throw new Error("[target] does not exist")
      }
      if (fs.lstatSync(target!).isDirectory()) {
        throw new Error("When reading from standard input, [output] must be a file")
      }
    }
  } else if (cli.input.length == 1) {
    source = cli.input[0]
  } else if (cli.input.length == 2) {
    source = cli.input[0]
    target = cli.input[1]
  } else {
    cli.showHelp(1)
  }
  const data = readYaml(flags.data)
  const env = readYaml(flags.env)
  validate(!!standardInData, source, target)
  if (standardInData) {
    let res = processTemplate(
      standardInData,
      { ...data, ...env },
      flags,
      process.cwd(),
    )
    if (target) {
      fs.writeFileSync(target, res, "utf8")
    } else {
      console.log(res)
    }
  } else {
    const sourceFiles = getFiles(source!)
    for (const sourceFile of sourceFiles) {
      const wd = path.dirname(sourceFile)
      let res = processTemplate(
        fs.readFileSync(sourceFile, "utf8").toString(),
        { ...data, ...env },
        flags,
        wd,
      )
      if (target) {
        let targetPath = target
        if (fs.lstatSync(target).isDirectory()) {
          const baseName = path.basename(sourceFile)
          targetPath = path.join(target, baseName)
        }
        fs.writeFileSync(targetPath, res, "utf8")
      } else {
        // Will only happen onece.
        console.log(res)
      }
    }
  }
} catch (e) {
  const err = e as Error
  if (process.env["DEBUG"]) {
    console.error(err)
  } else {
    console.error("Error: " + (e as Error).message)
  }
  process.exit(1)
}


