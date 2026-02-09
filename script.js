import { parseJsonToTree, treeToJsonString } from "./jsonTreeCore.js";

const jsonInput = document.getElementById("jsonInput");
const parseBtn = document.getElementById("parseBtn");
const resetBtn = document.getElementById("resetBtn");
const errorMsg = document.getElementById("errorMsg");
const treeRoot = document.getElementById("treeRoot");
const collapseAllBtn = document.getElementById("collapseAllBtn");
const expandAllBtn = document.getElementById("expandAllBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomRange = document.getElementById("zoomRange");
const zoomLabel = document.getElementById("zoomLabel");
const viewFlowBtn = document.getElementById("viewFlowBtn");
const viewFlowHBtn = document.getElementById("viewFlowHBtn");
const viewClassicBtn = document.getElementById("viewClassicBtn");
const filterArrayBtn = document.getElementById("filterArrayBtn");
const canvasFullscreenBtn = document.getElementById("canvasFullscreenBtn");
const treePanel = document.querySelector(".tree-panel");

let rootNode = null;
let zoomScale = 1;
let viewMode = "flow";
let boxSeq = 1;
let arrayPathOnly = false;
let canvasFullscreen = false;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;
let pendingCenterNodeId = null;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.05;

const demoJson = {
  name: "Alice",
  age: 29,
  active: true,
  skills: ["JavaScript", "CSS", "HTML"],
  profile: {
    city: "Shanghai",
    score: 99.5,
    projects: [{ title: "Tree UI", stars: 12 }, { title: "Parser", stars: 8 }]
  }
};

function clampScale(scale) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

function syncZoomUI() {
  const percent = Math.round(zoomScale * 100);
  zoomRange.value = String(percent);
  zoomLabel.textContent = `${percent}%`;
}

function applyZoom() {
  const canvas = treeRoot.querySelector(".viz-canvas");
  if (!canvas) return;
  canvas.style.zoom = String(zoomScale);
  canvas.style.transform = `translate(${panX}px, ${panY}px)`;
  canvas.style.transformOrigin = "top left";
}

function setZoom(scale) {
  zoomScale = clampScale(scale);
  syncZoomUI();
  applyZoom();
  if (viewMode === "flow-h") {
    const canvas = treeRoot.querySelector(".viz-canvas.flow-h-tree");
    if (canvas) drawHorizontalLines(canvas);
  }
}

function isPanIgnoredTarget(target) {
  if (!(target instanceof Element)) return true;
  return Boolean(
    target.closest(
      "button,input,textarea,select,option,label,.flow-box,.classic-node-content,.flow-field-row,.flow-mini-box"
    )
  );
}

function startPan(clientX, clientY) {
  isPanning = true;
  panStartX = clientX;
  panStartY = clientY;
  panOriginX = panX;
  panOriginY = panY;
  treeRoot.classList.add("is-panning");
}

function updatePan(clientX, clientY) {
  if (!isPanning) return;
  const scale = Math.max(zoomScale, 0.01);
  panX = panOriginX + (clientX - panStartX) / scale;
  panY = panOriginY + (clientY - panStartY) / scale;
  applyZoom();
}

function endPan() {
  if (!isPanning) return;
  isPanning = false;
  treeRoot.classList.remove("is-panning");
}

function formatLeaf(node) {
  if (node.type === "string") return `"${node.value}"`;
  return String(node.value);
}

function setDefaultCollapsed(node, isRoot = false) {
  if (!node || node.children.length === 0) return;
  node.collapsed = !isRoot;
  for (const child of node.children) {
    setDefaultCollapsed(child, false);
  }
}

function setCollapsedRecursively(node, collapsed, includeSelf = true) {
  if (!node) return;
  if (includeSelf && node.children.length > 0) {
    node.collapsed = collapsed;
  }
  for (const child of node.children) {
    setCollapsedRecursively(child, collapsed, true);
  }
}

function handleNodeToggle(node) {
  if (!node || node.children.length === 0) return;
  const nextCollapsed = !node.collapsed;
  node.collapsed = nextCollapsed;
  if (nextCollapsed) {
    setCollapsedRecursively(node, true, false);
    if (node.type === "array") {
      pendingCenterNodeId = node.parent ? node.parent.id : node.id;
    } else {
      pendingCenterNodeId = null;
    }
  } else {
    pendingCenterNodeId = node.type === "array" ? node.id : null;
  }
  render();
}

function centerNodeInViewport(nodeId) {
  if (!nodeId) return;
  const canvas = treeRoot.querySelector(".viz-canvas");
  if (!canvas) return;

  const target =
    canvas.querySelector(`[data-id="${nodeId}"]`) || canvas.querySelector(`[data-inline-id="${nodeId}"]`);
  if (!target) return;

  const rootRect = treeRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const centerX = rootRect.left + rootRect.width / 2;
  const centerY = rootRect.top + rootRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const scale = Math.max(zoomScale, 0.01);

  panX += (centerX - targetCenterX) / scale;
  panY += (centerY - targetCenterY) / scale;
  applyZoom();
}

function buildNodeTitle(node, isRoot) {
  if (isRoot) return "root";
  return node.key == null ? "(unnamed)" : String(node.key);
}

function buildNodeType(node) {
  if (node.type === "object") return `Object (${node.children.length})`;
  if (node.type === "array") return `Array (${node.children.length})`;
  return node.type;
}

function buildLeafType(node) {
  if (node.type === "null") return "null";
  return node.type;
}

function nodeMatchesArrayPath(node) {
  if (!node) return false;
  if (node.type === "array") return true;
  if (node.type !== "object") return false;
  return node.children.some((child) => nodeMatchesArrayPath(child));
}

function isVisibleNode(node) {
  if (!arrayPathOnly) return true;
  return nodeMatchesArrayPath(node);
}

function getVisibleChildren(node) {
  if (!node || !node.children) return [];
  return node.children.filter((child) => isVisibleNode(child));
}

function createFieldRowBase(node) {
  const row = document.createElement("div");
  row.className = "flow-field-row";
  return row;
}

function createInlineObjectBox(node, expandedArrays) {
  const mini = document.createElement("div");
  mini.className = "flow-mini-box";
  mini.dataset.inlineId = node.id;

  const miniTop = document.createElement("div");
  miniTop.className = "flow-mini-top";

  const key = document.createElement("span");
  key.className = "flow-mini-key";
  key.textContent = String(node.key);
  miniTop.appendChild(key);

  const type = document.createElement("span");
  type.className = "flow-mini-type";
  type.textContent = buildNodeType(node);
  miniTop.appendChild(type);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "flow-field-toggle";
  toggle.textContent = node.collapsed ? "+" : "-";
  toggle.title = node.collapsed ? "展开对象字段" : "收起对象字段";
  toggle.addEventListener("click", () => handleNodeToggle(node));
  miniTop.appendChild(toggle);

  mini.appendChild(miniTop);

  if (node.collapsed) {
    return mini;
  }

  const miniFields = document.createElement("div");
  miniFields.className = "flow-mini-fields";

  for (const child of getVisibleChildren(node)) {
    const row = createFieldRowBase(child);

    if (child.type === "object") {
      row.classList.add("flow-field-row-object");
      row.appendChild(createInlineObjectBox(child, expandedArrays));
    } else if (child.type === "array") {
      row.classList.add("flow-field-row-array");
      const fieldKey = document.createElement("span");
      fieldKey.className = "flow-field-key";
      fieldKey.textContent = String(child.key);
      row.appendChild(fieldKey);

      const fieldType = document.createElement("span");
      fieldType.className = "flow-field-type";
      fieldType.textContent = buildNodeType(child);
      row.appendChild(fieldType);

      const fieldToggle = document.createElement("button");
      fieldToggle.type = "button";
      fieldToggle.className = "flow-field-toggle";
      fieldToggle.textContent = child.collapsed ? "+" : "-";
      fieldToggle.title = child.collapsed ? "展开数组子节点" : "收起数组子节点";
      fieldToggle.addEventListener("click", () => handleNodeToggle(child));
      row.appendChild(fieldToggle);

      if (!child.collapsed) {
        expandedArrays.push({ node: child, anchorEl: row });
      }
    } else {
      row.classList.add("flow-field-row-leaf");
      const fieldKey = document.createElement("span");
      fieldKey.className = "flow-field-key";
      fieldKey.textContent = String(child.key);
      row.appendChild(fieldKey);

      const fieldType = document.createElement("span");
      fieldType.className = "flow-field-type";
      fieldType.textContent = buildLeafType(child);
      row.appendChild(fieldType);

      const fieldValue = document.createElement("span");
      fieldValue.className = "flow-field-value";
      fieldValue.textContent = formatLeaf(child);
      row.appendChild(fieldValue);
    }

    miniFields.appendChild(row);
  }

  mini.appendChild(miniFields);
  return mini;
}

function createFlowNode(node, isRoot = false) {
  const item = document.createElement("li");
  item.className = "flow-node";

  const box = document.createElement("div");
  box.className = "flow-box";
  box.dataset.id = node.id;

  const top = document.createElement("div");
  top.className = "flow-top";

  if (node.type === "object" || node.type === "array") {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "flow-toggle";
    toggle.textContent = node.collapsed ? "+" : "-";
    toggle.title = node.collapsed ? "展开节点" : "收起节点";
    toggle.addEventListener("click", () => handleNodeToggle(node));
    top.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "flow-toggle-spacer";
    top.appendChild(spacer);
  }

  const title = document.createElement("span");
  title.className = "flow-key";
  title.textContent = buildNodeTitle(node, isRoot);
  top.appendChild(title);

  box.appendChild(top);

  const meta = document.createElement("div");
  meta.className = "flow-meta";
  meta.textContent = buildNodeType(node);
  box.appendChild(meta);

  if (node.type === "object" || node.type === "array") {
    if (node.collapsed) {
      item.appendChild(box);
      return item;
    }

    const fields = document.createElement("div");
    fields.className = "flow-fields";
    const expandedArrays = [];

    for (const child of getVisibleChildren(node)) {
      const row = createFieldRowBase(child);

      if (child.type === "object") {
        row.classList.add("flow-field-row-object");
        row.appendChild(createInlineObjectBox(child, expandedArrays));
      } else if (child.type === "array") {
        row.classList.add("flow-field-row-array");
        const fieldKey = document.createElement("span");
        fieldKey.className = "flow-field-key";
        fieldKey.textContent = String(child.key);
        row.appendChild(fieldKey);

        const fieldType = document.createElement("span");
        fieldType.className = "flow-field-type";
        fieldType.textContent = buildNodeType(child);
        row.appendChild(fieldType);

        const fieldToggle = document.createElement("button");
        fieldToggle.type = "button";
        fieldToggle.className = "flow-field-toggle";
        fieldToggle.textContent = child.collapsed ? "+" : "-";
        fieldToggle.title = child.collapsed ? "展开数组子节点" : "收起数组子节点";
        fieldToggle.addEventListener("click", () => handleNodeToggle(child));
        row.appendChild(fieldToggle);

        if (!child.collapsed) {
          expandedArrays.push({ node: child, anchorEl: row });
        }
      } else {
        row.classList.add("flow-field-row-leaf");
        const fieldKey = document.createElement("span");
        fieldKey.className = "flow-field-key";
        fieldKey.textContent = String(child.key);
        row.appendChild(fieldKey);

        const fieldType = document.createElement("span");
        fieldType.className = "flow-field-type";
        fieldType.textContent = buildLeafType(child);
        row.appendChild(fieldType);

        const fieldValue = document.createElement("span");
        fieldValue.className = "flow-field-value";
        fieldValue.textContent = formatLeaf(child);
        row.appendChild(fieldValue);
      }

      fields.appendChild(row);
    }
    box.appendChild(fields);

    item.appendChild(box);

    if (expandedArrays.length > 0) {
      const children = document.createElement("ul");
      children.className = "flow-children";
      for (const entry of expandedArrays) {
        children.appendChild(createFlowNode(entry.node));
      }
      item.appendChild(children);
    }
    return item;
  }

  if (node.type !== "object" && node.type !== "array") {
    const value = document.createElement("div");
    value.className = "flow-value";
    value.textContent = formatLeaf(node);
    box.appendChild(value);
  }

  item.appendChild(box);

  return item;
}

function createFlowNodeHorizontal(node, isRoot = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "h-node";

  const box = document.createElement("div");
  box.className = "flow-box h-box";
  box.dataset.id = node.id;
  box.dataset.boxId = `box_${boxSeq++}`;

  const top = document.createElement("div");
  top.className = "flow-top";

  if (node.type === "object" || node.type === "array") {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "flow-toggle";
    toggle.textContent = node.collapsed ? "+" : "-";
    toggle.title = node.collapsed ? "展开节点" : "收起节点";
    toggle.addEventListener("click", () => handleNodeToggle(node));
    top.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "flow-toggle-spacer";
    top.appendChild(spacer);
  }

  const title = document.createElement("span");
  title.className = "flow-key";
  title.textContent = buildNodeTitle(node, isRoot);
  top.appendChild(title);
  box.appendChild(top);

  const meta = document.createElement("div");
  meta.className = "flow-meta";
  meta.textContent = buildNodeType(node);
  box.appendChild(meta);

  const expandedArrays = [];
  if (node.type === "object" || node.type === "array") {
    if (!node.collapsed) {
      const fields = document.createElement("div");
      fields.className = "flow-fields";

      for (const child of getVisibleChildren(node)) {
        const row = createFieldRowBase(child);

        if (child.type === "object") {
          row.classList.add("flow-field-row-object");
          row.appendChild(createInlineObjectBox(child, expandedArrays));
        } else if (child.type === "array") {
          row.classList.add("flow-field-row-array");
          const fieldKey = document.createElement("span");
          fieldKey.className = "flow-field-key";
          fieldKey.textContent = String(child.key);
          row.appendChild(fieldKey);

          const fieldType = document.createElement("span");
          fieldType.className = "flow-field-type";
          fieldType.textContent = buildNodeType(child);
          row.appendChild(fieldType);

          const fieldToggle = document.createElement("button");
          fieldToggle.type = "button";
          fieldToggle.className = "flow-field-toggle";
          fieldToggle.textContent = child.collapsed ? "+" : "-";
          fieldToggle.title = child.collapsed ? "展开数组子节点" : "收起数组子节点";
          fieldToggle.addEventListener("click", () => handleNodeToggle(child));
          row.appendChild(fieldToggle);

          row.dataset.anchorId = `anchor_${child.id}`;
          if (!child.collapsed) {
            expandedArrays.push({ node: child, anchorEl: row });
          }
        } else {
          row.classList.add("flow-field-row-leaf");
          const fieldKey = document.createElement("span");
          fieldKey.className = "flow-field-key";
          fieldKey.textContent = String(child.key);
          row.appendChild(fieldKey);

          const fieldType = document.createElement("span");
          fieldType.className = "flow-field-type";
          fieldType.textContent = buildLeafType(child);
          row.appendChild(fieldType);

          const fieldValue = document.createElement("span");
          fieldValue.className = "flow-field-value";
          fieldValue.textContent = formatLeaf(child);
          row.appendChild(fieldValue);
        }

        fields.appendChild(row);
      }
      box.appendChild(fields);
    }
  } else {
    const value = document.createElement("div");
    value.className = "flow-value";
    value.textContent = formatLeaf(node);
    box.appendChild(value);
  }

  wrapper.appendChild(box);

  if (expandedArrays.length > 0) {
    const childrenPanel = document.createElement("div");
    childrenPanel.className = "h-children";

    for (const entry of expandedArrays) {
      const edge = document.createElement("div");
      edge.className = "h-edge";
      edge.dataset.anchorId = entry.anchorEl.dataset.anchorId || `anchor_${entry.node.id}`;
      entry.anchorEl.dataset.anchorId = edge.dataset.anchorId;

      const childWrap = document.createElement("div");
      childWrap.className = "h-child-wrap";
      childWrap.appendChild(createFlowNodeHorizontal(entry.node));
      edge.appendChild(childWrap);
      childrenPanel.appendChild(edge);
    }
    wrapper.appendChild(childrenPanel);
  }

  return wrapper;
}

function drawHorizontalLines(canvas) {
  const svg = canvas.querySelector(".h-lines");
  if (!svg) return;
  svg.innerHTML = "";
  const scale = Math.max(zoomScale, 0.01);

  const childWraps = canvas.querySelectorAll(".h-child-wrap");
  for (const wrap of childWraps) {
    wrap.style.transform = "";
  }
  const edgeEls = canvas.querySelectorAll(".h-edge");
  for (const edge of edgeEls) {
    edge.style.marginTop = "0px";
  }

  const rect = canvas.getBoundingClientRect();
  const firstW = Math.max(canvas.scrollWidth, rect.width);
  const firstH = Math.max(canvas.scrollHeight, rect.height);
  svg.setAttribute("width", String(Math.ceil(firstW)));
  svg.setAttribute("height", String(Math.ceil(firstH)));

  const panels = canvas.querySelectorAll(".h-children");
  const minGap = 14;

  for (const panel of panels) {
    const edges = Array.from(panel.children).filter((el) => el.classList.contains("h-edge"));
    const entries = [];

    for (const edge of edges) {
      const anchorId = edge.dataset.anchorId;
      if (!anchorId) continue;
      const anchorRow = canvas.querySelector(`[data-anchor-id="${anchorId}"]`);
      const childWrap = edge.querySelector(".h-child-wrap");
      const childBox = edge.querySelector(".h-box");
      if (!anchorRow || !childWrap || !childBox) continue;

      const toggle = anchorRow.querySelector(".flow-field-toggle");
      const a = (toggle || anchorRow).getBoundingClientRect();
      const b = childBox.getBoundingClientRect();
      const anchorY = (a.top + a.height / 2 - rect.top) / scale;
      const currentCenterY = (b.top + b.height / 2 - rect.top) / scale;
      const naturalTop = (b.top - rect.top) / scale;
      entries.push({
        edge,
        childWrap,
        childBox,
        anchorY,
        currentCenterY,
        halfH: b.height / (2 * scale),
        naturalTop
      });
    }

    entries.sort((x, y) => x.anchorY - y.anchorY);

    let prevCenter = -Infinity;
    let prevHalf = 0;
    for (const entry of entries) {
      const desiredCenter = entry.anchorY;
      const minCenter = prevCenter + prevHalf + minGap + entry.halfH;
      const naturalCenter = entry.currentCenterY;
      const finalCenter = Math.max(naturalCenter, desiredCenter, minCenter);
      const finalTop = finalCenter - entry.halfH;
      const shift = finalTop - entry.naturalTop;
      entry.edge.style.marginTop = `${shift}px`;
      prevCenter = finalCenter;
      prevHalf = entry.halfH;
    }
  }

  const rect2 = canvas.getBoundingClientRect();
  const finalW = Math.max(canvas.scrollWidth, rect2.width);
  const finalH = Math.max(canvas.scrollHeight, rect2.height);
  svg.setAttribute("width", String(Math.ceil(finalW)));
  svg.setAttribute("height", String(Math.ceil(finalH)));
  svg.setAttribute("viewBox", `0 0 ${Math.ceil(finalW)} ${Math.ceil(finalH)}`);

  const edges = canvas.querySelectorAll(".h-edge");
  for (const edge of edges) {
    const anchorId = edge.dataset.anchorId;
    if (!anchorId) continue;
    const anchor = canvas.querySelector(`[data-anchor-id="${anchorId}"]`);
    const childBox = edge.querySelector(".h-box");
    if (!anchor || !childBox) continue;

    const toggle = anchor.querySelector(".flow-field-toggle");
    const a = anchor.getBoundingClientRect();
    const t = toggle ? toggle.getBoundingClientRect() : null;
    const b = childBox.getBoundingClientRect();

    const x1 = ((t ? t.right : a.right) - rect2.left) / scale;
    const y1 = ((t ? t.top + t.height / 2 : a.top + a.height / 2) - rect2.top) / scale;
    const x2 = (b.left - rect2.left) / scale;
    const y2 = (b.top + b.height / 2 - rect2.top) / scale;
    const midX = x1 + Math.max(18, (x2 - x1) * 0.35);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--flow-line)");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);
  }
}

function createClassicNode(node, isRoot = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "classic-node";

  const content = document.createElement("div");
  content.className = "classic-node-content";
  content.dataset.id = node.id;

  if (node.type === "object" || node.type === "array") {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "classic-toggle";
    toggle.textContent = node.collapsed ? "+" : "-";
    toggle.title = node.collapsed ? "展开" : "折叠";
    toggle.addEventListener("click", () => handleNodeToggle(node));
    content.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "classic-toggle-spacer";
    content.appendChild(spacer);
  }

  const keySpan = document.createElement("span");
  keySpan.className = "classic-key";
  keySpan.textContent = isRoot ? "root" : `${node.key}:`;
  content.appendChild(keySpan);

  const typeSpan = document.createElement("span");
  typeSpan.className = "classic-type";
  if (node.type === "object") typeSpan.textContent = `{Object(${node.children.length})}`;
  else if (node.type === "array") typeSpan.textContent = `[Array(${node.children.length})]`;
  else typeSpan.textContent = `<${node.type}>`;
  content.appendChild(typeSpan);

  if (node.type !== "object" && node.type !== "array") {
    const valueSpan = document.createElement("span");
    valueSpan.className = "classic-value";
    valueSpan.textContent = `= ${formatLeaf(node)}`;
    content.appendChild(valueSpan);
  }

  wrapper.appendChild(content);

  if ((node.type === "object" || node.type === "array") && !node.collapsed) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "classic-children";
    for (const child of getVisibleChildren(node)) {
      childrenContainer.appendChild(createClassicNode(child));
    }
    wrapper.appendChild(childrenContainer);
  }

  return wrapper;
}

function updateOutput() {
  return treeToJsonString(rootNode, 2);
}

function updateViewButtons() {
  viewFlowBtn.classList.toggle("active", viewMode === "flow");
  viewFlowHBtn.classList.toggle("active", viewMode === "flow-h");
  viewClassicBtn.classList.toggle("active", viewMode === "classic");
}

function updateFilterButton() {
  filterArrayBtn.classList.toggle("active", arrayPathOnly);
}

function updateFullscreenUI() {
  if (!treePanel) return;
  treePanel.classList.toggle("canvas-fullscreen", canvasFullscreen);
  document.body.classList.toggle("canvas-fullscreen-active", canvasFullscreen);
  canvasFullscreenBtn.classList.toggle("active", canvasFullscreen);
  canvasFullscreenBtn.setAttribute("aria-label", canvasFullscreen ? "退出全屏" : "画布全屏");
  canvasFullscreenBtn.setAttribute("title", canvasFullscreen ? "退出全屏" : "画布全屏");

  if (viewMode === "flow-h") {
    const canvas = treeRoot.querySelector(".viz-canvas.flow-h-tree");
    if (canvas) drawHorizontalLines(canvas);
  }
}

function render() {
  treeRoot.innerHTML = "";

  if (!rootNode) {
    treeRoot.textContent = "请先输入并解析 JSON";
    updateOutput();
    updateFilterButton();
    return;
  }

  if (!isVisibleNode(rootNode)) {
    treeRoot.textContent = "当前过滤条件下无可显示节点";
    updateOutput();
    updateViewButtons();
    updateFilterButton();
    return;
  }

  const canvas = document.createElement("div");
  canvas.className = `viz-canvas ${
    viewMode === "flow" ? "flow-tree" : viewMode === "flow-h" ? "flow-h-tree" : "classic-tree"
  }`;
  boxSeq = 1;

  if (viewMode === "flow") {
    const rootList = document.createElement("ul");
    rootList.className = "flow-level";
    rootList.appendChild(createFlowNode(rootNode, true));
    canvas.appendChild(rootList);
  } else if (viewMode === "flow-h") {
    const hRoot = document.createElement("div");
    hRoot.className = "h-root";
    hRoot.appendChild(createFlowNodeHorizontal(rootNode, true));
    canvas.appendChild(hRoot);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("h-lines");
    canvas.appendChild(svg);
  } else {
    canvas.appendChild(createClassicNode(rootNode, true));
  }

  treeRoot.appendChild(canvas);
  if (viewMode === "flow-h") {
    drawHorizontalLines(canvas);
    requestAnimationFrame(() => {
      if (!canvas.isConnected) return;
      drawHorizontalLines(canvas);
    });
  }
  applyZoom();
  updateOutput();
  updateViewButtons();
  updateFilterButton();

  if (pendingCenterNodeId) {
    const nodeId = pendingCenterNodeId;
    pendingCenterNodeId = null;
    requestAnimationFrame(() => {
      centerNodeInViewport(nodeId);
      if (viewMode === "flow-h") {
        const c = treeRoot.querySelector(".viz-canvas.flow-h-tree");
        if (c) drawHorizontalLines(c);
      }
    });
  }
}

function parseInput() {
  errorMsg.textContent = "";

  try {
    rootNode = parseJsonToTree(jsonInput.value);
    setDefaultCollapsed(rootNode, true);
    render();
  } catch (error) {
    rootNode = null;
    render();
    errorMsg.textContent = `解析失败：${error.message}`;
  }
}

function loadDemo() {
  jsonInput.value = JSON.stringify(demoJson, null, 2);
  parseInput();
}

parseBtn.addEventListener("click", parseInput);
resetBtn.addEventListener("click", loadDemo);

zoomInBtn.addEventListener("click", () => {
  setZoom(zoomScale + ZOOM_STEP);
});

zoomOutBtn.addEventListener("click", () => {
  setZoom(zoomScale - ZOOM_STEP);
});

zoomResetBtn.addEventListener("click", () => {
  setZoom(1);
});

collapseAllBtn.addEventListener("click", () => {
  if (!rootNode) return;
  setCollapsedRecursively(rootNode, true, false);
  render();
});

expandAllBtn.addEventListener("click", () => {
  if (!rootNode) return;
  setCollapsedRecursively(rootNode, false, false);
  render();
});

zoomRange.addEventListener("input", (event) => {
  const percent = Number(event.target.value);
  setZoom(percent / 100);
});

viewFlowBtn.addEventListener("click", () => {
  viewMode = "flow";
  render();
});

viewFlowHBtn.addEventListener("click", () => {
  viewMode = "flow-h";
  render();
});

viewClassicBtn.addEventListener("click", () => {
  viewMode = "classic";
  render();
});

filterArrayBtn.addEventListener("click", () => {
  arrayPathOnly = !arrayPathOnly;
  render();
});

canvasFullscreenBtn.addEventListener("click", () => {
  canvasFullscreen = !canvasFullscreen;
  updateFullscreenUI();
});

treeRoot.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(zoomScale + delta);
  },
  { passive: false }
);

treeRoot.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  if (!treeRoot.querySelector(".viz-canvas")) return;
  if (isPanIgnoredTarget(event.target)) return;
  startPan(event.clientX, event.clientY);
});

window.addEventListener("mousemove", (event) => {
  updatePan(event.clientX, event.clientY);
});

window.addEventListener("mouseup", () => {
  endPan();
});

treeRoot.addEventListener("mouseleave", () => {
  if (!isPanning) return;
  endPan();
});

window.addEventListener("resize", () => {
  if (viewMode !== "flow-h") return;
  const canvas = treeRoot.querySelector(".viz-canvas.flow-h-tree");
  if (!canvas) return;
  drawHorizontalLines(canvas);
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !canvasFullscreen) return;
  canvasFullscreen = false;
  updateFullscreenUI();
});

syncZoomUI();
updateFullscreenUI();
loadDemo();
