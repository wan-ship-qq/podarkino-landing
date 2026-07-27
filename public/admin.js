const GATEWAY_ORIGIN = "https://podarkino-admin-access.foku1337.chatgpt.site";
const SITE_ORIGIN = "https://wan-ship-qq.github.io/podarkino-landing";
const API_URL = window.location.origin === GATEWAY_ORIGIN
  ? "/api/admin-v2"
  : `${GATEWAY_ORIGIN}/api/admin-v2`;
const SESSION_KEY = "podarkinoAdminSession";

const productDefaults = {
  title: "Новый товар",
  description: "",
  composition: "",
  weight: "",
  price: "",
  image: "assets/tea-sweets.jpg",
  imageCaption: "",
  viewerImage: "",
  viewerImageCaption: "",
  images: [],
  imageCaptions: [],
  visible: true
};

const contentFields = [
  ["heroTitle", "Главный заголовок", "textarea"],
  ["heroLead", "Текст под главным заголовком", "textarea"],
  ["productsTitle", "Заголовок блока товаров", "textarea"],
  ["footerText", "Текст в подвале", "textarea"]
];

const pageImageSlots = [
  ["teacher", "Учителю / Воспитателю", "assets/teacher-gift-3.jpg", "Подарочный набор учителю ко Дню учителя"],
  ["trainer", "Тренеру", "assets/trainer-gift-2.jpg", "Дети дарят подарочный набор тренеру в спортивном зале"],
  ["relatives", "Родным и близким", "assets/relatives-gift-1.jpg", "Большая семья получает подарочный набор за праздничным столом"],
  ["colleague", "Коллегам", "assets/colleague-gift.jpg", "Коллеги отмечают праздник за чаепитием с подарочным набором"],
  ["friends", "Друзьям", "assets/friends-gift-2.jpg", "Девушка вручает другу подарочный набор"],
  ["child", "Ребёнку", "assets/child-gift-1.jpg", "Мальчик с подарочным набором на дне рождения"],
  ["belovedWoman", "Любимой", "assets/beloved-woman-gift.jpg", "Мужчина дарит любимой девушке подарочный набор"],
  ["belovedMan", "Любимому", "assets/beloved-gift-1.jpg", "Девушка дарит любимому мужчине подарочный набор"]
];

let products = [];
let content = {};
let pendingUploads = 0;
let isDirty = false;
let expandedProductIndex = null;
let lastDeletedProduct = null;
let draggedPhoto = null;
let imageEditorSource = "";
let imageEditorImage = null;
let imageEditorSaveHandler = null;

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
const pagePhotosEditor = document.querySelector("#page-photos-editor");
const reviewsEditor = document.querySelector("#reviews-editor");
const contactsEditor = document.querySelector("#contacts-editor");
const saveButton = document.querySelector("#save");
const undoDeleteButton = document.querySelector("#undo-delete");
const imageEditorModal = document.querySelector("#image-editor-modal");
const imageEditorCanvas = document.querySelector("#image-editor-canvas");
const imageEditorRatio = document.querySelector("#image-editor-ratio");
const imageEditorZoom = document.querySelector("#image-editor-zoom");
const imageEditorX = document.querySelector("#image-editor-x");
const imageEditorY = document.querySelector("#image-editor-y");
const imageEditorSave = document.querySelector("#image-editor-save");

function markDirty() {
  isDirty = true;
  saveButton.textContent = "Сохранить изменения";
  setStatus("Есть несохранённые изменения.");
}

function markSaved() {
  isDirty = false;
  saveButton.textContent = "Сохранить на сайте";
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function sessionToken() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}

function mediaUrl(source) {
  if (!source || /^(?:[a-z]+:|\/\/|data:|blob:)/i.test(source)) return source;
  return `${SITE_ORIGIN}/${String(source).replace(/^\.?\//, "")}`;
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (sessionToken()) headers.Authorization = `Bearer ${sessionToken()}`;
  const requestUrl = new URL(`${API_URL}${path}`, window.location.origin);
  requestUrl.searchParams.set("_", Date.now().toString());
  const response = await fetch(requestUrl, { ...options, headers, cache: "no-store" });
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
  field.addEventListener("input", () => {
    onInput(field.value);
    markDirty();
  });
  label.append(field);
  return label;
}

function productPhotos(product) {
  return [product.image, ...(Array.isArray(product.images) ? product.images : [])]
    .filter((source) => typeof source === "string" && source.trim());
}

function productPhotoCaptions(product) {
  const captions = [
    typeof product.imageCaption === "string" ? product.imageCaption : "",
    ...(Array.isArray(product.imageCaptions) ? product.imageCaptions : [])
  ];
  while (captions.length < productPhotos(product).length) captions.push("");
  return captions;
}

function setProductPhotos(index, photos, captions = productPhotoCaptions(products[index])) {
  const [image = "", ...images] = photos;
  const [imageCaption = "", ...imageCaptions] = captions;
  products[index] = { ...products[index], image, imageCaption, images, imageCaptions };
}

function moveProductPhoto(productIndex, photoIndex, direction) {
  const photos = productPhotos(products[productIndex]);
  const next = photoIndex + direction;
  if (next < 0 || next >= photos.length) return;
  const captions = productPhotoCaptions(products[productIndex]);
  [photos[photoIndex], photos[next]] = [photos[next], photos[photoIndex]];
  [captions[photoIndex], captions[next]] = [captions[next], captions[photoIndex]];
  setProductPhotos(productIndex, photos, captions);
  markDirty();
  renderProducts();
}

function makeProductPhotoCover(productIndex, photoIndex) {
  if (photoIndex === 0) return;
  const photos = productPhotos(products[productIndex]);
  const captions = productPhotoCaptions(products[productIndex]);
  const [cover] = photos.splice(photoIndex, 1);
  const [coverCaption] = captions.splice(photoIndex, 1);
  photos.unshift(cover);
  captions.unshift(coverCaption);
  setProductPhotos(productIndex, photos, captions);
  markDirty();
  renderProducts();
}

function removeProductPhoto(productIndex, photoIndex) {
  const photos = productPhotos(products[productIndex]);
  const captions = productPhotoCaptions(products[productIndex]);
  photos.splice(photoIndex, 1);
  captions.splice(photoIndex, 1);
  setProductPhotos(productIndex, photos, captions);
  markDirty();
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
    image.src = mediaUrl(source);
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

function imageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть фотографию для обрезки"));
    image.src = mediaUrl(source);
  });
}

function selectedCropRatio() {
  if (!imageEditorImage) return 1;
  if (imageEditorRatio.value === "original") {
    return imageEditorImage.naturalWidth / imageEditorImage.naturalHeight;
  }
  return Number(imageEditorRatio.value) || 1;
}

function renderImageEditor() {
  if (!imageEditorImage) return;
  const ratio = selectedCropRatio();
  const maxSide = 1400;
  const width = ratio >= 1 ? maxSide : Math.round(maxSide * ratio);
  const height = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide;
  imageEditorCanvas.width = Math.max(1, width);
  imageEditorCanvas.height = Math.max(1, height);

  const context = imageEditorCanvas.getContext("2d");
  const zoom = Number(imageEditorZoom.value) || 1;
  const baseScale = Math.max(
    imageEditorCanvas.width / imageEditorImage.naturalWidth,
    imageEditorCanvas.height / imageEditorImage.naturalHeight
  );
  const scale = baseScale * zoom;
  const drawWidth = imageEditorImage.naturalWidth * scale;
  const drawHeight = imageEditorImage.naturalHeight * scale;
  const travelX = Math.max(0, (drawWidth - imageEditorCanvas.width) / 2);
  const travelY = Math.max(0, (drawHeight - imageEditorCanvas.height) / 2);
  const drawX = (imageEditorCanvas.width - drawWidth) / 2 + (Number(imageEditorX.value) / 100) * travelX;
  const drawY = (imageEditorCanvas.height - drawHeight) / 2 + (Number(imageEditorY.value) / 100) * travelY;

  context.fillStyle = "#fff";
  context.fillRect(0, 0, imageEditorCanvas.width, imageEditorCanvas.height);
  context.drawImage(imageEditorImage, drawX, drawY, drawWidth, drawHeight);
}

async function openImageEditor(source, onSave) {
  try {
    setStatus("Открываю редактор фотографии…");
    imageEditorSource = source;
    imageEditorImage = await imageFromSource(source);
    imageEditorSaveHandler = onSave;
    imageEditorRatio.value = "original";
    imageEditorZoom.value = "1";
    imageEditorX.value = "0";
    imageEditorY.value = "0";
    renderImageEditor();
    imageEditorModal.hidden = false;
    document.body.classList.add("image-editor-open");
    setStatus("Настройте кадр и нажмите «Сохранить обрезку».", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function closeImageEditor() {
  imageEditorModal.hidden = true;
  document.body.classList.remove("image-editor-open");
  imageEditorSource = "";
  imageEditorImage = null;
  imageEditorSaveHandler = null;
}

async function saveImageCrop() {
  if (!imageEditorImage || !imageEditorSaveHandler) return;
  imageEditorSave.disabled = true;
  try {
    const blob = await new Promise((resolve) => imageEditorCanvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error("Не удалось сохранить обрезанную фотографию");
    const name = `${imageEditorSource.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") || "photo"}-crop.webp`;
    const path = await uploadPhoto(new File([blob], name, { type: "image/webp" }));
    await imageEditorSaveHandler(path);
    closeImageEditor();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    imageEditorSave.disabled = false;
  }
}

async function addProductPhotos(productIndex, files) {
  try {
    const photos = productPhotos(products[productIndex]);
    for (const file of files) {
      photos.push(await uploadPhoto(file));
      setProductPhotos(productIndex, photos);
      markDirty();
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
    markDirty();
    renderProducts();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function setProductPhotoSource(productIndex, photoIndex, source) {
  const photos = productPhotos(products[productIndex]);
  photos[photoIndex] = source;
  setProductPhotos(productIndex, photos);
  markDirty();
  renderProducts();
}

async function replaceProductViewerPhoto(productIndex, file) {
  try {
    products[productIndex].viewerImage = await uploadPhoto(file);
    markDirty();
    renderProducts();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function setProductViewerPhoto(productIndex, source) {
  products[productIndex].viewerImage = source;
  markDirty();
  renderProducts();
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

  const viewerSource = product.viewerImage || product.image;
  if (viewerSource) {
    const viewerManager = el("div", "photo-item viewer-photo-manager");
    const viewerImage = document.createElement("img");
    viewerImage.src = mediaUrl(viewerSource);
    viewerImage.alt = product.viewerImageCaption || `${product.title || "Товар"}, главное фото`;
    const viewerDetails = el("div", "photo-details");
    viewerDetails.append(el("strong", "", "Фото при открытии набора"));
    const viewerCaption = document.createElement("input");
    viewerCaption.type = "text";
    viewerCaption.className = "photo-caption";
    viewerCaption.placeholder = "Подпись к фото";
    viewerCaption.value = product.viewerImageCaption || "";
    viewerCaption.addEventListener("input", () => {
      products[productIndex].viewerImageCaption = viewerCaption.value;
      markDirty();
    });
    viewerDetails.append(viewerCaption);
    const viewerActions = el("div", "photo-actions");
    const viewerReplace = el("button", "", "Заменить");
    viewerReplace.type = "button";
    const viewerPicker = filePicker({
      onFiles: ([file]) => replaceProductViewerPhoto(productIndex, file)
    });
    viewerReplace.addEventListener("click", () => viewerPicker.click());
    const viewerCrop = el("button", "", "Обрезать");
    viewerCrop.type = "button";
    viewerCrop.addEventListener("click", () => {
      openImageEditor(viewerSource, (path) => setProductViewerPhoto(productIndex, path));
    });
    const useCover = el("button", "", "Как обложка");
    useCover.type = "button";
    useCover.hidden = !product.viewerImage;
    useCover.addEventListener("click", () => {
      products[productIndex].viewerImage = "";
      markDirty();
      renderProducts();
    });
    viewerActions.append(viewerReplace, viewerPicker, viewerCrop, useCover);
    viewerManager.append(viewerImage, viewerDetails, viewerActions);
    manager.append(viewerManager);
  }

  const list = el("div", "photo-list");
  const photos = productPhotos(product);
  const captions = productPhotoCaptions(product);
  photos.forEach((source, photoIndex) => {
    const item = el("div", "photo-item");
    item.draggable = true;
    item.addEventListener("dragstart", () => {
      draggedPhoto = { productIndex, photoIndex };
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      draggedPhoto = null;
      item.classList.remove("dragging");
    });
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!draggedPhoto || draggedPhoto.productIndex !== productIndex || draggedPhoto.photoIndex === photoIndex) return;
      const reordered = productPhotos(products[productIndex]);
      const reorderedCaptions = productPhotoCaptions(products[productIndex]);
      const [moved] = reordered.splice(draggedPhoto.photoIndex, 1);
      const [movedCaption] = reorderedCaptions.splice(draggedPhoto.photoIndex, 1);
      reordered.splice(photoIndex, 0, moved);
      reorderedCaptions.splice(photoIndex, 0, movedCaption);
      setProductPhotos(productIndex, reordered, reorderedCaptions);
      draggedPhoto = null;
      markDirty();
      renderProducts();
    });
    const image = document.createElement("img");
    image.src = mediaUrl(source);
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
      image.src = mediaUrl(sourceInput.value);
      photos[photoIndex] = sourceInput.value;
      setProductPhotos(productIndex, photos);
      markDirty();
      renderPreview();
    });

    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.className = "photo-caption";
    captionInput.placeholder = "Подпись к фото";
    captionInput.value = captions[photoIndex] || "";
    captionInput.setAttribute("aria-label", `Подпись к фото ${photoIndex + 1}`);
    captionInput.addEventListener("input", () => {
      const nextCaptions = productPhotoCaptions(products[productIndex]);
      nextCaptions[photoIndex] = captionInput.value;
      setProductPhotos(productIndex, productPhotos(products[productIndex]), nextCaptions);
      markDirty();
    });

    details.append(top, sourceInput, captionInput);

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

    const crop = el("button", "", "Обрезать");
    crop.type = "button";
    crop.addEventListener("click", () => {
      openImageEditor(source, (path) => setProductPhotoSource(productIndex, photoIndex, path));
    });

    const cover = el("button", "photo-cover", "Обложка");
    cover.type = "button";
    cover.hidden = photoIndex === 0;
    cover.addEventListener("click", () => makeProductPhotoCover(productIndex, photoIndex));

    const remove = el("button", "danger photo-remove", "Удалить");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (window.confirm("Удалить эту фотографию из товара?")) {
        removeProductPhoto(productIndex, photoIndex);
      }
    });

    actions.append(left, right, cover, replace, replacePicker, crop, remove);
    item.append(image, details, actions);
    list.append(item);
  });
  manager.append(list);
  return manager;
}

function renderProducts() {
  productsEditor.replaceChildren();

  products.forEach((product, index) => {
    const expanded = expandedProductIndex === index;
    const card = el("article", `product-editor ${product.visible === false ? "off" : ""} ${expanded ? "expanded" : "collapsed"}`);
    const head = el("div", "product-editor-head");
    const toggle = el("button", "product-toggle", `${index + 1}. ${product.title || "Без названия"}`);
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.addEventListener("click", () => {
      expandedProductIndex = expanded ? null : index;
      renderProducts();
    });
    head.append(toggle);

    const actions = el("div", "product-actions");
    const up = el("button", "", "↑");
    up.type = "button";
    up.disabled = index === 0;
    up.addEventListener("click", () => moveProduct(index, -1));
    const down = el("button", "", "↓");
    down.type = "button";
    down.disabled = index === products.length - 1;
    down.addEventListener("click", () => moveProduct(index, 1));
    const duplicate = el("button", "", "Копировать");
    duplicate.type = "button";
    duplicate.addEventListener("click", () => duplicateProduct(index));
    const remove = el("button", "danger", "Удалить");
    remove.type = "button";
    remove.addEventListener("click", () => removeProduct(index));
    actions.append(up, down, duplicate, remove);
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

    const body = el("div", "product-editor-body");
    body.hidden = !expanded;
    body.append(fields, photoManager(product, index), visible);
    card.append(head, body);
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
      image.src = mediaUrl(product.image);
      image.alt = product.title || "";
      imageWrap.append(image);
    }
    const body = el("div", "preview-body");
    body.append(el("h4", "", product.title || "Без названия"));
    body.append(el("p", "", product.description || ""));
    const facts = el("div", "preview-facts");
    facts.append(
      el("span", "", `Цена: ${product.price || "не указана"}`),
      el("span", "", `Масса: ${product.weight || "не указана"}`),
      el("span", "", `Состав: ${product.composition || "не указан"}`)
    );
    body.append(facts);
    const gallery = el("div", "preview-gallery");
    [product.viewerImage || product.image, ...(product.images || [])].filter(Boolean).slice(0, 6).forEach((source) => {
      const thumb = document.createElement("img");
      thumb.src = mediaUrl(source);
      thumb.alt = "";
      gallery.append(thumb);
    });
    if (gallery.childElementCount) body.append(gallery);
    card.append(imageWrap, body);
    productsPreview.append(card);
  });
}

function updateProduct(index, key, value) {
  products[index] = { ...products[index], [key]: value };
  markDirty();
  renderPreview();
}

function moveProduct(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= products.length) return;
  [products[index], products[next]] = [products[next], products[index]];
  if (expandedProductIndex === index) expandedProductIndex = next;
  else if (expandedProductIndex === next) expandedProductIndex = index;
  markDirty();
  renderProducts();
}

function removeProduct(index) {
  if (!window.confirm(`Удалить товар «${products[index].title || "Без названия"}»?`)) return;
  lastDeletedProduct = { product: products[index], index };
  products.splice(index, 1);
  expandedProductIndex = null;
  undoDeleteButton.hidden = false;
  markDirty();
  renderProducts();
}

function undoProductDelete() {
  if (!lastDeletedProduct) return;
  products.splice(lastDeletedProduct.index, 0, lastDeletedProduct.product);
  expandedProductIndex = lastDeletedProduct.index;
  lastDeletedProduct = null;
  undoDeleteButton.hidden = true;
  markDirty();
  renderProducts();
}

function duplicateProduct(index) {
  const copy = JSON.parse(JSON.stringify(products[index]));
  copy.title = `${copy.title || "Товар"} — копия`;
  products.splice(index + 1, 0, copy);
  expandedProductIndex = index + 1;
  markDirty();
  renderProducts();
}

function addProduct() {
  products.push({ ...productDefaults });
  expandedProductIndex = products.length - 1;
  markDirty();
  renderProducts();
}

function renderContent() {
  contentEditor.replaceChildren();
  contentFields.forEach(([key, label, type]) => {
    contentEditor.append(inputField(label, content[key], (value) => {
      content[key] = value;
    }, {
      type: type === "url" ? "url" : "text",
      textarea: type === "textarea",
      wide: type === "textarea"
    }));
  });
}

function pageImageEntry(key, fallbackSource, fallbackCaption) {
  const value = content.pageImages?.[key];
  if (typeof value === "string") return { src: value, caption: fallbackCaption };
  return {
    src: value?.src || fallbackSource,
    caption: typeof value?.caption === "string" ? value.caption : fallbackCaption
  };
}

function updatePageImage(key, entry) {
  content.pageImages = { ...(content.pageImages || {}), [key]: entry };
  markDirty();
}

async function replacePageImage(key, file) {
  try {
    const slot = pageImageSlots.find(([slotKey]) => slotKey === key);
    const current = pageImageEntry(key, slot?.[2] || "", slot?.[3] || "");
    updatePageImage(key, { ...current, src: await uploadPhoto(file) });
    renderPageImages();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderPageImages() {
  pagePhotosEditor.replaceChildren();
  pageImageSlots.forEach(([key, title, fallbackSource, fallbackCaption]) => {
    const entry = pageImageEntry(key, fallbackSource, fallbackCaption);
    const item = el("article", "page-photo-item");
    const image = document.createElement("img");
    image.src = mediaUrl(entry.src);
    image.alt = entry.caption || title;
    const details = el("div", "page-photo-details");
    details.append(el("strong", "", title));
    const caption = document.createElement("input");
    caption.type = "text";
    caption.placeholder = "Подпись / описание фото";
    caption.value = entry.caption;
    caption.addEventListener("input", () => {
      updatePageImage(key, { ...entry, caption: caption.value });
      image.alt = caption.value || title;
    });
    const actions = el("div", "page-photo-actions");
    const replace = el("button", "", "Заменить");
    replace.type = "button";
    const picker = filePicker({ onFiles: ([file]) => replacePageImage(key, file) });
    replace.addEventListener("click", () => picker.click());
    const crop = el("button", "", "Обрезать");
    crop.type = "button";
    crop.addEventListener("click", () => {
      openImageEditor(entry.src, (path) => {
        const latest = pageImageEntry(key, fallbackSource, fallbackCaption);
        updatePageImage(key, { ...latest, src: path });
        renderPageImages();
      });
    });
    actions.append(replace, picker, crop);
    details.append(caption, actions);
    item.append(image, details);
    pagePhotosEditor.append(item);
  });
}

function reviewImages() {
  if (!Array.isArray(content.reviews)) return [];
  return content.reviews.map((item) => (
    typeof item === "string" ? { src: item, caption: "" } : { src: item?.src || "", caption: item?.caption || "" }
  )).filter((item) => item.src);
}

function moveReview(index, direction) {
  const reviews = reviewImages();
  const next = index + direction;
  if (next < 0 || next >= reviews.length) return;
  [reviews[index], reviews[next]] = [reviews[next], reviews[index]];
  content.reviews = reviews;
  markDirty();
  renderReviewsAdmin();
}

async function addReviews(files) {
  try {
    const reviews = reviewImages();
    for (const file of files) reviews.push({ src: await uploadPhoto(file), caption: "" });
    content.reviews = reviews;
    markDirty();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    renderReviewsAdmin();
  }
}

async function replaceReview(index, file) {
  try {
    const reviews = reviewImages();
    reviews[index] = { ...reviews[index], src: await uploadPhoto(file) };
    content.reviews = reviews;
    markDirty();
    renderReviewsAdmin();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderReviewsAdmin() {
  reviewsEditor.replaceChildren();
  const reviews = reviewImages();
  if (!reviews.length) {
    reviewsEditor.append(el("p", "empty-note", "Отзывы ещё не загружены."));
    return;
  }
  reviews.forEach((review, index) => {
    const item = el("div", "review-admin-item");
    item.draggable = true;
    item.addEventListener("dragstart", () => {
      draggedPhoto = { reviewIndex: index };
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      draggedPhoto = null;
      item.classList.remove("dragging");
    });
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      if (draggedPhoto?.reviewIndex === undefined || draggedPhoto.reviewIndex === index) return;
      const reordered = reviewImages();
      const [moved] = reordered.splice(draggedPhoto.reviewIndex, 1);
      reordered.splice(index, 0, moved);
      content.reviews = reordered;
      draggedPhoto = null;
      markDirty();
      renderReviewsAdmin();
    });
    const image = document.createElement("img");
    image.src = mediaUrl(review.src);
    image.alt = review.caption || `Отзыв ${index + 1}`;
    const details = el("div", "review-admin-details");
    details.append(el("strong", "", `Отзыв ${index + 1}`));
    const caption = document.createElement("input");
    caption.type = "text";
    caption.placeholder = "Подпись к отзыву";
    caption.value = review.caption;
    caption.addEventListener("input", () => {
      const next = reviewImages();
      next[index] = { ...next[index], caption: caption.value };
      content.reviews = next;
      image.alt = caption.value || `Отзыв ${index + 1}`;
      markDirty();
    });
    details.append(caption);
    const actions = el("div", "review-admin-actions");
    const left = el("button", "", "←");
    left.type = "button";
    left.disabled = index === 0;
    left.addEventListener("click", () => moveReview(index, -1));
    const right = el("button", "", "→");
    right.type = "button";
    right.disabled = index === reviews.length - 1;
    right.addEventListener("click", () => moveReview(index, 1));
    const replace = el("button", "", "Заменить");
    replace.type = "button";
    const replacePicker = filePicker({ onFiles: ([file]) => replaceReview(index, file) });
    replace.addEventListener("click", () => replacePicker.click());
    const crop = el("button", "", "Обрезать");
    crop.type = "button";
    crop.addEventListener("click", () => {
      openImageEditor(review.src, (path) => {
        const next = reviewImages();
        next[index] = { ...next[index], src: path };
        content.reviews = next;
        markDirty();
        renderReviewsAdmin();
      });
    });
    const remove = el("button", "danger", "Удалить");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (!window.confirm("Удалить этот отзыв?")) return;
      reviews.splice(index, 1);
      content.reviews = reviews;
      markDirty();
      renderReviewsAdmin();
    });
    actions.append(left, right, replace, replacePicker, crop, remove);
    item.append(image, details, actions);
    reviewsEditor.append(item);
  });
}

function renderContacts() {
  contactsEditor.replaceChildren(
    inputField("Заголовок", content.contactsTitle, (value) => { content.contactsTitle = value; }),
    inputField("Текст", content.contactsText, (value) => { content.contactsText = value; }, { textarea: true, wide: true })
  );
}

async function loadData() {
  setStatus("Загружаю данные...");
  try {
    const data = await apiRequest("/data");
    products = data.products;
    content = data.content;
    expandedProductIndex = null;
    lastDeletedProduct = null;
    undoDeleteButton.hidden = true;
    renderProducts();
    renderContent();
    renderPageImages();
    renderReviewsAdmin();
    renderContacts();
    markSaved();
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
    markSaved();
    lastDeletedProduct = null;
    undoDeleteButton.hidden = true;
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
document.querySelector("#save").addEventListener("click", saveData);
document.querySelector("#logout").addEventListener("click", () => {
  if (!isDirty || window.confirm("Выйти без сохранения изменений?")) showLogin();
});
undoDeleteButton.addEventListener("click", undoProductDelete);
const reviewPicker = filePicker({ multiple: true, onFiles: addReviews });
document.body.append(reviewPicker);
document.querySelector("#add-reviews").addEventListener("click", () => reviewPicker.click());
document.querySelector("#image-editor-close").addEventListener("click", closeImageEditor);
document.querySelector("#image-editor-cancel").addEventListener("click", closeImageEditor);
imageEditorSave.addEventListener("click", saveImageCrop);
[imageEditorRatio, imageEditorZoom, imageEditorX, imageEditorY].forEach((control) => {
  control.addEventListener("input", renderImageEditor);
});
imageEditorModal.addEventListener("click", (event) => {
  if (event.target === imageEditorModal) closeImageEditor();
});
loginForm.addEventListener("submit", login);
window.addEventListener("beforeunload", (event) => {
  if (!isDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imageEditorModal.hidden) closeImageEditor();
});
setupTabs();
if (sessionToken()) {
  showEditor();
  loadData();
} else {
  showLogin();
}
