function inferType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function createIdGenerator(start = 1) {
  let id = start;
  return function nextId() {
    id += 1;
    return String(id);
  };
}

function buildNode(value, key = null, parent = null, nextId = createIdGenerator()) {
  const type = inferType(value);
  const node = {
    id: nextId(),
    key,
    type,
    parent,
    collapsed: false,
    children: [],
    value: null
  };

  if (type === "object") {
    node.children = Object.entries(value).map(([k, v]) => buildNode(v, k, node, nextId));
  } else if (type === "array") {
    node.children = value.map((item, index) => buildNode(item, String(index), node, nextId));
  } else {
    node.value = value;
  }

  return node;
}

function nodeToPlain(node) {
  if (node.type === "object") {
    const out = {};
    for (const child of node.children) {
      out[child.key] = nodeToPlain(child);
    }
    return out;
  }

  if (node.type === "array") {
    return node.children.map((child) => nodeToPlain(child));
  }

  return node.value;
}

function parseJsonToTree(raw) {
  if (typeof raw !== "string") {
    throw new Error("输入必须是字符串");
  }

  const text = raw.trim();
  if (!text) {
    throw new Error("输入不能为空");
  }

  const parsed = JSON.parse(text);
  const nextId = createIdGenerator(1);
  return buildNode(parsed, "root", null, nextId);
}

function treeToJsonString(root, spaces = 2) {
  return JSON.stringify(nodeToPlain(root), null, spaces);
}

function findNodeById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

function isDescendant(ancestor, maybeChild) {
  if (!ancestor || !maybeChild) return false;

  for (const child of ancestor.children) {
    if (child.id === maybeChild.id || isDescendant(child, maybeChild)) return true;
  }

  return false;
}

function detachNode(node) {
  const parent = node.parent;
  if (!parent) return;

  const idx = parent.children.findIndex((item) => item.id === node.id);
  if (idx >= 0) {
    parent.children.splice(idx, 1);
  }
}

function ensureUniqueObjectKey(targetParent, desiredKey) {
  let key = desiredKey || "newKey";
  const used = new Set(targetParent.children.map((child) => child.key));

  if (!used.has(key)) return key;

  let i = 1;
  while (used.has(`${key}_${i}`)) {
    i += 1;
  }
  return `${key}_${i}`;
}

function normalizeArrayKeys(parentNode) {
  if (!parentNode || parentNode.type !== "array") return;

  parentNode.children.forEach((child, index) => {
    child.key = String(index);
  });
}

function moveNode(rootNode, sourceId, targetId) {
  const source = findNodeById(rootNode, sourceId);
  const target = findNodeById(rootNode, targetId);

  if (!source || !target || source.id === rootNode.id) return false;
  if (source.id === target.id) return false;
  if (isDescendant(source, target)) return false;

  const sourceOldParent = source.parent;
  detachNode(source);

  if (target.type === "object" || target.type === "array") {
    source.parent = target;

    if (target.type === "object") {
      source.key = ensureUniqueObjectKey(target, source.key || "movedKey");
    }

    target.children.push(source);
  } else {
    const parent = target.parent;
    if (!parent) return false;

    source.parent = parent;
    const targetIndex = parent.children.findIndex((item) => item.id === target.id);

    if (parent.type === "object") {
      source.key = ensureUniqueObjectKey(parent, source.key || target.key || "movedKey");
    }

    parent.children.splice(targetIndex + 1, 0, source);
  }

  normalizeArrayKeys(sourceOldParent);
  normalizeArrayKeys(target.parent);
  normalizeArrayKeys(target);
  return true;
}

export {
  inferType,
  buildNode,
  nodeToPlain,
  parseJsonToTree,
  treeToJsonString,
  findNodeById,
  moveNode
};
