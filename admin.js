const API_URL = "https://podarkino-admin-api.wannahi459.workers.dev";
const SESSION_KEY = "podarkinoAdminSession";

const productDefaults = {
  title: "Новый товар",
  description: "",
  composition: "",
  weight: "",
  price: "",
  image: "assets/tea-sweets.jpg",
  images: [],
  visible: true
};

const contentFields = [
  ["heroEyebrow", "Подпись над главным заголовком", "text"],
  ["heroTitle", "Главный заголовок", "textarea"],
  ["heroLead", "Текст под главным заголовком", "textarea"],
  ["productsEyebrow", "Подпись блока товаров", "text"],
  ["productsTitle", "Заголовок блока товаров", "textarea"],
  ["productsLead", "Текст блока товаров", "textarea"],
  ["storyTitle", "Заголовок истории", "textarea"],
  ["storyText", "Текст истории", "textarea"],
  ["finalEyebrow", "Подпись финального блока", "text"],
  ["finalTitle", "Заголовок финального блока", "textarea"],
  ["finalText", "Текст финального блока", "textarea"],
  ["finalButton", "Финальная кнопка", "text"],
  ["footerText", "Текст в подвале", "textarea"]
];

let products = [];
let content = {};
let pendingUploads = 0;

const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const passwordInput = document.querySelector("#password");
const loginStatus = document.querySelector("#login-status");
const publishPanel = document.querySelector("#publish-panel");
const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const productsEditor = document.querySelector("#products-editor");
const productsPreview = document.querySelector("#products-preview");
const contentEditor = document.querySelector("#content-editor");
const saveButton = document.querySelector("#save");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function sessionToken() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (sessionToken()) headers.Authorization = `Bearer ${sessionToken()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/login") showLogin("Сессия завершена. Войдите снова.");
    throw new Error(body.error || "Сервер не ответил");
  }
  return body;
}

function showLogin(message = "") {
  sessionStorage.removeItem(SESSION_KEY);
  loginPanel.hidden = false;
  publishPanel.hidden = true;
  editor.hidden = true;
  loginStatus.textContent = message;
  loginStatus.className = `status ${message ? "error" : ""}`.trim();
  passwordInput.value = "";
}

function showEditor() {
  loginPanel.hidden = true;
  publishPanel.hidden = false;
  editor.hidden = false;
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

function productPhotos(product) {
  return [product.image, ...(Array.isArray(product.images) ? product.images : [])]
    .filter((source) => typeof source === "string" && source.trim());
}

function setProductPhotos(index, photos) {
  const [image = "", ...images] = photos;
  products[index] = { ...products[index], image, images };
}

function moveProductPhoto(productIndex, photoIndex, direction) {
  const photos = productPhotos(products[productIndex]);
  const next = photoIndex + direction;
  if (next < 0 || next >= photos.length) return;
  [photos[photoIndex], photos[next]] = [photos[next], photos[photoIndex]];
  setProductPhotos(productIndex, photos);
  renderProducts();
}

function removeProductPhoto(productIndex, photoIndex) {
  const photos = productPhotos(products[productIndex]);
  photos.splice(photoIndex, 1);
  setProductPhotos(productIndex, photos);
  renderProducts();
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Не удалось прочитать изображение"));
    };
    image.src = source;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Не удалось подготовить изображение"));
    reader.readAsDataURL(blob);
  });
}

async function prepareImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Выберите файл изображения");
  if (file.size > 20 * 1024 * 1024) throw new Error("Файл слишком большой. Максимум — 20 МБ");

  const image = await imageFromFile(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("Браузер не смог обработать изображение");
  return { filename: `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`, content: await blobToBase64(blob) };
}

async function uploadPhoto(file) {
  pendingUploads += 1;
  saveButton.disabled = true;
  setStatus("Загружаю фотографию…");
  try {
    const prepared = await prepareImage(file);
    const result = await apiRequest("/image", {
      method: "PUT",
      body: JSON.stringify(prepared)
    });
    setStatus("Фотография загружена. Не забудьте сохранить изменения на сайте.", "ok");
    return result.path;
  } finally {
    pendingUploads -= 1;
    saveButton.disabled = pendingUploads > 0;
  }
}

async function addProductPhotos(productIndex, files) {
  try {
    const photos = productPhotos(products[productIndex]);
    for (const file of files) {
      photos.push(await uploadPhoto(file));
      setProductPhotos(productIndex, photos);
    }
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    renderProducts();
  }
}

async function replaceProductPhoto(productIndex, photoIndex, file) {
  try {
    const photos = productPhotos(products[productIndex]);
    photos[photoIndex] = await uploadPhoto(file);
    setProductPhotos(productIndex, photos);
    renderProducts();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function filePicker({ multiple = false, onFiles }) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.multiple = multiple;
  input.hidden = true;
  input.addEventListener("change", () => {
    if (input.files.length) onFiles([...input.files]);
    input.value = "";
  });
  return input;
}

function photoManager(product, productIndex) {
  const manager = el("section", "photo-manager");
  const heading = el("div", "photo-manager-heading");
  heading.append(
    el("strong", "", "Фотографии товара"),
    el("p", "", "Первое фото — обложка. Фото можно загружать, заменять, удалять и менять местами.")
  );
  const addPhoto = el("button", "photo-add", "+ Загрузить фото");
  addPhoto.type = "button";
  const addPicker = filePicker({
    multiple: true,
    onFiles: (files) => addProductPhotos(productIndex, files)
  });
  addPhoto.addEventListener("click", () => addPicker.click());
  manager.append(heading, addPhoto, addPicker);

  const list = el("div", "photo-list");
  const photos = productPhotos(product);
  photos.forEach((source, photoIndex) => {
    const item = el("div", "photo-item");
    const image = document.createElement("img");
    image.src = source;
    image.alt = `${product.title || "Товар"}, фото ${photoIndex + 1}`;

    const details = el("div", "photo-details");
    const top = el("div", "photo-item-top");
    top.append(el("strong", "", `Фото ${photoIndex + 1}`));
    if (photoIndex === 0) top.append(el("span", "cover-badge", "Обложка"));

    const sourceInput = document.createElement("input");
    sourceInput.type = "text";
    sourceInput.value = source;
    sourceInput.setAttribute("aria-label", `Адрес фото ${photoIndex + 1}`);
    sourceInput.addEventListener("input", () => {
      image.src = sourceInput.value;
      photos[photoIndex] = sourceInput.value;
      setProductPhotos(productIndex, photos);
      renderPreview();
    });

    details.append(top, sourceInput);

    const actions = el("div", "photo-actions");
    const left = el("button", "", "←");
    left.type = "button";
    left.title = "Переместить фото влево";
    left.setAttribute("aria-label", `Переместить фото ${photoIndex + 1} влево`);
    left.disabled = photoIndex === 0;
    left.addEventListener("click", () => moveProductPhoto(productIndex, photoIndex, -1));

    const right = el("button", "", "→");
    right.type = "button";
    right.title = "Переместить фото вправо";
    right.setAttribute("aria-label", `Переместить фото ${photoIndex + 1} вправо`);
    right.disabled = photoIndex === photos.length - 1;
    right.addEventListener("click", () => moveProductPhoto(productIndex, photoIndex, 1));

    const replace = el("button", "photo-replace", "Заменить");
    replace.type = "button";
    const replacePicker = filePicker({
      onFiles: ([file]) => replaceProductPhoto(productIndex, photoIndex, file)
    });
    replace.addEventListener("click", () => replacePicker.click());

    const remove = el("button", "danger photo-remove", "Удалить");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (window.confirm("Удалить эту фотографию из товара?")) {
        removeProductPhoto(productIndex, photoIndex);
      }
    });

    actions.append(left, right, replace, replacePicker, remove);
    item.append(image, details, actions);
    list.append(item);
  });
  manager.append(list);
  return manager;
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
      inputField("Описание", product.description, (value) => updateProduct(index, "description", value), { textarea: true, wide: true }),
      inputField("Состав", product.composition, (value) => updateProduct(index, "composition", value), { textarea: true, wide: true }),
      inputField("Масса", product.weight, (value) => updateProduct(index, "weight", value)),
      inputField("Цена", product.price, (value) => updateProduct(index, "price", value))
    );

    const visible = el("label", "check-row");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = product.visible !== false;
    checkbox.addEventListener("change", () => updateProduct(index, "visible", checkbox.checked));
    visible.append(checkbox, el("span", "", "Показывать на сайте"));

    card.append(head, fields, photoManager(product, index), visible);
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
    const data = await apiRequest("/data");
    products = data.products;
    content = data.content;
    renderProducts();
    renderContent();
    setStatus("Данные загружены.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function saveData() {
  if (pendingUploads) {
    setStatus("Дождитесь окончания загрузки фотографий.", "error");
    return;
  }
  setStatus("Сохраняю изменения на сайте...");
  try {
    await apiRequest("/data", {
      method: "PUT",
      body: JSON.stringify({ products, content })
    });
    setStatus("Готово. Сайт обновится через несколько минут.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function login(event) {
  event.preventDefault();
  const password = passwordInput.value;
  if (!password) return;
  loginStatus.textContent = "Проверяю пароль…";
  loginStatus.className = "status";
  try {
    const data = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    sessionStorage.setItem(SESSION_KEY, data.token);
    passwordInput.value = "";
    showEditor();
    await loadData();
  } catch (error) {
    loginStatus.textContent = error.message;
    loginStatus.className = "status error";
    passwordInput.select();
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

document.querySelector("#add-product").addEventListener("click", addProduct);
document.querySelector("#reload").addEventListener("click", loadData);
document.querySelector("#save").addEventListener("click", saveData);
document.querySelector("#logout").addEventListener("click", () => showLogin());
loginForm.addEventListener("submit", login);
setupTabs();
if (sessionToken()) {
  showEditor();
  loadData();
} else {
  showLogin();
}
