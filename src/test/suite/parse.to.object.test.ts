import * as vscode from "vscode";
import * as yaml from "js-yaml";
import * as json from "jsonc-parser";
import assert from "assert";
import { withRandomFileEditor } from "../utils";
import { resolve } from "path";
import { readFileSync } from 'fs';
import { parseToAst, parseAstToObject  } from '../../parsers';
import { ParserOptions, parserOptions } from "../../parser-options";
import { isEqual } from '../../audit/schema';

suite("Parse AST To Object Test Suite", () => {

  test("Test Json 1", async () => {

    const text = readFileSync(resolve(__dirname, "../../../tests/xkcd.json"), { encoding: "utf8" });

    await withRandomFileEditor(text, "json", async (editor, doc) => {
      const object = parseToObject(editor.document, parserOptions);
      assert.ok(object);

      const root = parseToAst(editor.document, parserOptions)[1];
      const object2 = parseAstToObject(root);
      assert.ok(object2);

      assert.deepEqual(object2, object);
      assert(isEqual(object2, object));
    });
  });

  test("Test Json 2", async () => {

    const text = readFileSync(resolve(__dirname, "../../../tests/petstore-v3.json"), { encoding: "utf8" });

    await withRandomFileEditor(text, "json", async (editor, doc) => {
      const object = parseToObject(editor.document, parserOptions);
      assert.ok(object);

      const root = parseToAst(editor.document, parserOptions)[1];
      const object2 = parseAstToObject(root);
      assert.ok(object2);

      assert.deepEqual(object2, object);
      assert(isEqual(object2, object));
    });
  });

  test("Test Yaml 1", async () => {

    const text = readFileSync(resolve(__dirname, "../../../tests/xkcd.yaml"), { encoding: "utf8" });

    await withRandomFileEditor(text, "yaml", async (editor, doc) => {
      const object = parseToObject(editor.document, parserOptions);
      assert.ok(object);

      const root = parseToAst(editor.document, parserOptions)[1];
      const object2 = parseAstToObject(root);
      assert.ok(object2);

      assert.deepEqual(object2, object);
      assert(isEqual(object2, object));
    });
  });

  test("Test Yaml 2", async () => {

    const text = readFileSync(resolve(__dirname, "../../../tests/petstore-v3.yaml"), { encoding: "utf8" });
    assert((text.indexOf("Pet: &anchor1") > 0) && (text.indexOf("<<: *anchor1") > 0));
    assert((text.indexOf("id: &anchor2") > 0) && (text.indexOf("<<: *anchor2") > 0));

    await withRandomFileEditor(text, "yaml", async (editor, doc) => {
      const object = parseToObject(editor.document, parserOptions);
      assert.ok(object);

      const root = parseToAst(editor.document, parserOptions)[1];
      const object2 = parseAstToObject(root);
      assert.ok(object2);

      assert.deepEqual(object2, object);
      assert(isEqual(object2, object));
    });
  });

  
  function parseToObject(document: vscode.TextDocument, options: ParserOptions): any | undefined {
    if (
      !(
        document.languageId === "json" ||
        document.languageId === "jsonc" ||
        document.languageId == "yaml"
      )
    ) {
      return null;
    }

    try {
      if (document.languageId === "yaml") {
        // FIXME what's up with parsing errors?
        const {
          yaml: { schema },
        } = options.get();
        return yaml.safeLoad(document.getText(), { schema });
      }

      const errors: json.ParseError[] = [];
      const parsed = json.parse(document.getText(), errors, { allowTrailingComma: true });
      if (errors.length == 0) {
        return parsed;
      }
    } catch (ex) {
      // ignore, return undefined on parsing errors
    }
  }

});
