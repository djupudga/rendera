import fs from "fs"
import indentString from "indent-string"
import path from "path"
import { yamlDump } from "yaml-cfn"
import { getParameter, lookup } from "./aws"

export const helpers = {
  /**
   * Indents a string with the specified number of spaces.
   * @param str The string to indent.
   * @param spaces The number of spaces to indent the string.
   * @returns The indented string.
   * @example
   *   indent("foo", 2) // "  foo"
   *   indent("foo", 4) // "    foo"
   **/
  indent: indentString,
  /**
   * Converts an object to a YAML string.
   * @param obj The object to convert to YAML.
   * @returns The YAML string.
   * @example
   *   toYaml({ foo: "bar" }) // "foo: bar"
   **/
  toYaml: (obj: any) => yamlDump(obj).trim(),
  /**
   * Quotes a value.
   * @param val The value to quote.
   * @returns The quoted value.
   * @example
   *   quote("foo") // "\"foo\""
   **/
  quote: (val: any) => `"${val}"`,
  /**
   * Truncates a string to the specified length.
   * @param i The input string.
   * @param n The maximum length of the string.
   * @returns The truncated string.
   * @example
   *   trunc("foobar", 3) // "foo"
   *   trunc("foobar", 6) // "foobar"
   **/
  trunc: (i: string, n: number) => (i.length > n ? i.substring(0, n) : i),
  /**
   * Gets the contents of a file. It returns a function that's
   * used in a template to get the contents of a file.
   * The root is the directory of the 'crustomize.yml' file.
   * @param root The root directory of the file.
   * @param name The name of the file.
   * @returns The contents of the file.
   * @example
   *  {{ getFile("foo.txt") }}
   **/
  getFile(root: string) {
    return (name: string) => {
      return fs
        .readFileSync(path.resolve(process.cwd(), root, name))
        .toString()
    }
  },
  /**
   * Converts a file to a base64 string. It returns a function that's
   * used in a template to convert a file to a base64 string.
   * The root is the directory of the 'crustomize.yml' file.
   * @param root The root directory of the file.
   * @param name The name of the file.
   * @returns The base64 string.
   * @example
   *  {{ fileToBase64("foo.txt") }}
   **/
  fileToBase64(root: string) {
    return (name: string) => {
      return Buffer.from(
        fs
          .readFileSync(path.resolve(process.cwd(), root, name))
          .toString(),
      ).toString("base64")
    }
  },
  /**
   * Converts a string to a base64 string.
   * @param val The string to convert to a base64 string.
   * @returns The base64 string.
   * @example
   *  stringToBase64("foo") // "Zm9v"
   **/
  toBase64: (val: string) => Buffer.from(val).toString("base64"),
  /**
   * Looks up an output in a CloudFormation stack.
   * @param stack The name of the stack.
   * @param key The key of the output.
   * @returns The value of the output.
   * @example
   *   {{ lookup("my-stack", "MyOutput") }}
   **/
  lookupCfOutput() {
    return (stack: string, key: string) => lookup(stack, key)
  },
  /**
   * Gets a parameter from AWS parameter store.
   * @param name The name of the parameter.
   * @param query JMESPath query, if omitted Parameter.Value.
   * @returns The value of the parameter.
   * @example
   *  {{ getParameter("/my-parameter") }}
   **/
  getParameter() {
    return (name: string, query?: string) => getParameter(name, query)
  },
  /**
   * Picks value if not null or undefined, otherwise defaultValue.
   * @param value The value to check.
   * @param defaultValue The default value to return if the value is null or undefined.
   * @returns The picked value.
   * @example
   *  {{ valueOrDefault(env.DockerImage, "foo/bar:latest") }}
   */
  valueOrDefault(value: any, defaultValue: any) {
    return value != null ? value : defaultValue
  },
}
