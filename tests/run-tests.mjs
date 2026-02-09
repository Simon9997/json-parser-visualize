import assert from "node:assert/strict";
import { moveNode, nodeToPlain, parseJsonToTree, treeToJsonString } from "../jsonTreeCore.js";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function getChildByKey(node, key) {
  return node.children.find((child) => child.key === key) || null;
}

function getNodeByPath(root, path) {
  let cursor = root;
  for (const part of path) {
    cursor = getChildByKey(cursor, String(part));
    if (!cursor) return null;
  }
  return cursor;
}

test("解析后输出应与输入 JSON 数据一致", () => {
  const inputObj = {
    user: { name: "Alice", age: 30, married: false },
    tags: ["a", "b", null],
    score: 98.5
  };
  const inputStr = JSON.stringify(inputObj);
  const root = parseJsonToTree(inputStr);
  const outputObj = JSON.parse(treeToJsonString(root));
  assert.deepStrictEqual(outputObj, inputObj);
});

test("支持 JSON 基础类型作为根节点", () => {
  const root = parseJsonToTree("123");
  assert.equal(nodeToPlain(root), 123);
});

test("非法 JSON 输入会抛错", () => {
  assert.throws(() => parseJsonToTree("{name:}") , SyntaxError);
  assert.throws(() => parseJsonToTree("   "), /输入不能为空/);
});

test("拖拽模拟: 将对象字段拖入另一个对象", () => {
  const root = parseJsonToTree('{"a":1,"b":{"x":2},"arr":[10,20]}');
  const aNode = getNodeByPath(root, ["a"]);
  const bNode = getNodeByPath(root, ["b"]);

  assert.ok(aNode && bNode, "测试节点不存在");
  assert.equal(moveNode(root, aNode.id, bNode.id), true);

  assert.deepStrictEqual(nodeToPlain(root), {
    b: { x: 2, a: 1 },
    arr: [10, 20]
  });
});

test("拖拽模拟: 数组元素重排后索引应更新", () => {
  const root = parseJsonToTree('{"arr":[10,20,30]}');
  const item0 = getNodeByPath(root, ["arr", 0]);
  const item2 = getNodeByPath(root, ["arr", 2]);

  assert.ok(item0 && item2, "数组测试节点不存在");
  assert.equal(moveNode(root, item0.id, item2.id), true);

  assert.deepStrictEqual(nodeToPlain(root), {
    arr: [20, 30, 10]
  });
});
