const OWNER = "wan-ship-qq";
const REPO = "podarkino-landing";
const BRANCH = "main";
const PRODUCT_PATH = "data/products.json";
const CONTENT_PATH = "data/content.json";

const productDefaults = {
  title: "Новый товар",
  description: "",
  image: "assets/tea-sweets.jpg",
  visible: true
};

const contentFields = [
  ["heroEyebrow", "Подпись над главным заголовком", "text"],
  ["heroTitle", "Главный заголовок", "textarea"],
  ["heroLead", "Текст под главным заголовком", "textarea"],
  ["heroPrimaryButton", "Кнопка выбора", "text"],
  ["productsEyebrow", "Подпись блока товаров", "text"],
  ["productsTitle", "Заголовок блока товаров", "textarea"],
  ["productsLead", "Текст блока товаров", "textarea"],
  ["storyEyebrow", "Подпись истории", "text"],
  ["storyTitle", "Заголовок истории", "textarea"],
  ["storyText", "Текст истории", "textarea"],
  ["storyLine", "Финальная строка истории", "text"],
  ["finalEyebrow", "Подпись финального блока", "text"],
  ["finalTitle", "Заголовок финального блока", "textarea"],
  ["finalText", "Текст финального блока", "textarea"],
  ["finalButton", "Финальная кнопка", "text"],
  ["footerText", "Текст в подвале", "textarea"]
];

let products = [];
let content = {};

const tokenInput = document.querySelector("#token");
const rememberInput = document.querySelector("#remember-token");
const statusEl = document.querySelector("#status");
const productsEditor = document.querySelector("#products-editor");
const productsPreview = document.querySelector("#products-preview");
const contentEditor = document.querySelector("#content-editor");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function token() {
  return tokenInput.value.trim();
}

function headers(authToken = token()) {
  const result = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (authToken) result.Authorization = `Bearer ${authToken}`;
  return result;
}

function apiUrl(path) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Не удалось загрузить ${path}`);
  return response.json();
}

async function fetchFromGithub(path) {
  const response = await fetch(`${apiUrl(path)}?ref=${BRANCH}`, { headers: headers() });
  if (!response.ok) throw new Error(`GitHub не отдал ${path}`);
  const file = await response.json();
  return {
    sha: file.sha,
    data: JSON.parse(fromBase64(file.content))
  };
}

async function saveToGithub(path, data, message) {
  const current = await fetchFromGithub(path);
  const body = {
    message,
    branch: BRANCH,
    sha: current.sha,
    content: toBase64(`${JSON.stringify(data, null, 2)}\n`)
  };
  const response = await fetch(apiUrl(path), {
    method: "PUT",
    headers: {
      ...headers(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Не удалось сохранить ${path}`);
  }
  return response.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function inputField(labelText, value, onInput, options = {}) {
  const label = el("label", options.wide ? "wide" : "");
  label.append(labelText);
  const field = options.textarea ? document.createElement("textarea") : document.createElement("input");
  if (!options.textarea) field.type = options.type || "text";
  field.value = value || "";
  field.addEventListener("input", () => onInput(field.value));
  label.append(field);
  return label;
}

function renderProducts() {
  productsEditor.replaceChildren();

  products.forEach((product, index) => {
    const card = el("article", `product-editor ${product.visible === false ? "off" : ""}`);
    const head = el("div", "product-editor-head");
    head.append(el("div", "product-editor-title", `${index + 1}. ${product.title || "Без названия"}`));

    const actions = el("div", "product-actions");
    const up = el("button", "", "↑");
    up.type = "button";
    up.disabled = index === 0;
    up.addEventListener("click", () => moveProduct(index, -1));
    const down = el("button", "", "↓");
    down.type = "button";
    down.disabled = index === products.length - 1;
    down.addEventListener("click", () => moveProduct(index, 1));
    const remove = el("button", "danger", "Удалить");
    remove.type = "button";
    remove.addEventListener("click", () => removeProduct(index));
    actions.append(up, down, remove);
    head.append(actions);

    const fields = el("div", "field-grid");
    fields.append(
      inputField("Название", product.title, (value) => updateProduct(index, "title", value)),
      inputField("Фото / URL картинки", product.image, (value) => updateProduct(index, "image", value), { type: "url", wide: true }),
      inputField("Описание", product.description, (value) => updateProduct(index, "description", value), { textarea: true, wide: true })
    );

    const visible = el("label", "check-row");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = product.visible !== false;
    checkbox.addEventListener("change", () => updateProduct(index, "visible", checkbox.checked));
    visible.append(checkbox, el("span", "", "Показывать на сайте"));

    card.append(head, fields, visible);
    productsEditor.append(card);
  });

  renderPreview();
}

function renderPreview() {
  productsPreview.replaceChildren();
  products.filter((product) => product.visible !== false).forEach((product) => {
    const card = el("article", "preview-card");
    const imageWrap = el("div", "preview-img");
    if (product.image) {
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.title || "";
      imageWrap.append(image);
    }
    const body = el("div", "preview-body");
    body.append(el("h4", "", product.title || "Без названия"));
    body.append(el("p", "", product.description || ""));
    card.append(imageWrap, body);
    productsPreview.append(card);
  });
}

function updateProduct(index, key, value) {
  products[index] = { ...products[index], [key]: value };
  renderPreview();
}

function moveProduct(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= products.length) return;
  [products[index], products[next]] = [products[next], products[index]];
  renderProducts();
}

function removeProduct(index) {
  products.splice(index, 1);
  renderProducts();
}

function addProduct() {
  products.push({ ...productDefaults });
  renderProducts();
}

function renderContent() {
  contentEditor.replaceChildren();
  contentFields.forEach(([key, label, type]) => {
    contentEditor.append(inputField(label, content[key], (value) => {
      content[key] = value;
    }, {
      type: type === "url" ? "url" : "text",
      textarea: type === "textarea"
    }));
  });
}

async function loadData() {
  setStatus("Загружаю данные...");
  try {
    if (token()) {
      const [productsFile, contentFile] = await Promise.all([
        fetchFromGithub(PRODUCT_PATH),
        fetchFromGithub(CONTENT_PATH)
      ]);
      products = productsFile.data;
      content = contentFile.data;
    } else {
      [products, content] = await Promise.all([
        fetchJson(PRODUCT_PATH),
        fetchJson(CONTENT_PATH)
      ]);
    }
    renderProducts();
    renderContent();
    setStatus("Данные загружены.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function saveData() {
  if (!token()) {
    setStatus("Для публикации нужен GitHub token с правом contents:write.", "error");
    return;
  }

  setStatus("Сохраняю изменения в GitHub...");
  try {
    await saveToGithub(PRODUCT_PATH, products, "Update products from site admin");
    await saveToGithub(CONTENT_PATH, content, "Update content from site admin");
    setStatus("Готово. GitHub Pages обновит сайт через несколько минут.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
  });
}

function setupTokenStorage() {
  const stored = localStorage.getItem("podarkinoAdminToken");
  if (stored) {
    tokenInput.value = stored;
    rememberInput.checked = true;
  }

  rememberInput.addEventListener("change", () => {
    if (!rememberInput.checked) localStorage.removeItem("podarkinoAdminToken");
    if (rememberInput.checked && token()) localStorage.setItem("podarkinoAdminToken", token());
  });

  tokenInput.addEventListener("input", () => {
    if (rememberInput.checked) localStorage.setItem("podarkinoAdminToken", token());
  });
}

document.querySelector("#add-product").addEventListener("click", addProduct);
document.querySelector("#reload").addEventListener("click", loadData);
document.querySelector("#save").addEventListener("click", saveData);
setupTabs();
setupTokenStorage();
loadData();
