import * as vscode from "vscode";
//import * as yaml from "js-yaml";
import * as yaml from "yaml-language-server-parser";
//import * as json from "jsonc-parser";
import { parse, Node, YamlNode } from "@xliic/openapi-ast-node";
import { ParserOptions } from "./parser-options";
import { OpenApiVersion } from "./types";

export function parseAstToObject(root: Node): any {
  return dfs(root);
}

function dfs(node: Node): any {

  if (node.isObject()) {
    const result = {};
    for (const child of node.getChildren()) {
      if (isYamlAnchorMergeNode(child)) {
        const innerNode = (<yaml.YAMLScalar>(<YamlNode>child).node);
        const value = (<yaml.YAMLNode>innerNode).value;
        Object.assign(result, dfs(new YamlNode(value.value)));
      } else {
        result[child.getKey()] = dfs(child);
      }
    }
    return result;
  } 
  else if (node.isArray()) {
    const result = [];
    for (const child of node.getChildren()) {
      result.push(dfs(child));
    }
    return result;
  }
  else {
    if (node instanceof YamlNode) {
      const innerNode = (<yaml.YAMLScalar>(<YamlNode>node).node);
      const value = (<yaml.YAMLNode>innerNode).value;
      if (value.valueObject !== undefined) {
        return value.valueObject;
      }
    }
    return node.getValue();
  }
}

function isYamlAnchorMergeNode(node: Node): boolean {
  if ((node instanceof YamlNode) && (node.getKey() === "<<")) {
    const innerNode = (<yaml.YAMLScalar>(<YamlNode>node).node);
    const value = (<yaml.YAMLNode>innerNode).value;
    if (value.kind === yaml.Kind.ANCHOR_REF) {
      return true;
    }
  }
  return false;
}

export function parseToAst(
  document: vscode.TextDocument,
  parserOptions: ParserOptions
): [OpenApiVersion, Node, vscode.Diagnostic[]] {
  if (
    !(
      document.languageId === "json" ||
      document.languageId === "jsonc" ||
      document.languageId == "yaml"
    )
  ) {
    return [OpenApiVersion.Unknown, null, null];
  }

  const [node, errors] = parse(document.getText(), document.languageId, parserOptions);
  const version = getOpenApiVersion(node);
  const messages = errors.map(
    (error): vscode.Diagnostic => {
      const position = document.positionAt(error.offset);
      const line = document.lineAt(position);
      return {
        source: "vscode-openapi",
        code: "",
        severity: vscode.DiagnosticSeverity.Error,
        message: error.message,
        range: line.range,
      };
    }
  );

  return [version, node, messages.length > 0 ? messages : null];
}

export function getOpenApiVersion(root: Node): OpenApiVersion {
  if (!root) {
    return OpenApiVersion.Unknown;
  }

  const swaggerVersionValue = root?.find("/swagger")?.getValue();
  const openApiVersionValue = root?.find("/openapi")?.getValue();

  if (swaggerVersionValue === "2.0") {
    return OpenApiVersion.V2;
  }

  if (
    openApiVersionValue &&
    typeof openApiVersionValue === "string" &&
    openApiVersionValue.match(/^3\.0\.\d(-.+)?$/)
  ) {
    return OpenApiVersion.V3;
  }

  return OpenApiVersion.Unknown;
}
