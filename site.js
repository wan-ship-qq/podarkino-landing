const assetVersion = "20260724-0927";

function versionedAsset(source) {
  if (typeof source !== "string" || !source.startsWith("assets/")) return source;
  return `${source.split("?")[0]}?v=${assetVersion}`;
}

const fallbackProducts = [
  {
    title: "Подарочный набор орехов в шоколаде",
    description: "Ореховое ассорти для учителя, воспитателя, близких людей и уютного чаепития.",
    composition: "Арахис в кунжуте, арахис в шоколаде, арахис в белом шоколаде, миндаль в шоколаде, миндаль в белом шоколаде",
    weight: "400 г",
    price: "820 ₽",
    image: "assets/nuts-in-chocolate-box-3d.png?v=20260720-1837",
    viewerImage: "assets/nuts-in-chocolate-box-full.jpg?v=20260720-1855",
    images: [
      "assets/nuts-in-chocolate-detail-1.jpg",
      "assets/nuts-in-chocolate-detail-2.jpg",
      "assets/nuts-in-chocolate-detail-3.jpg",
      "assets/nuts-in-chocolate-detail-4.jpg",
      "assets/nuts-in-chocolate-detail-5.jpg"
    ],
    badge: "хит",
    visible: true
  },
  {
    title: "Подарочный набор сладостей «Сердце»",
    description: "Яркий сладкий подарок для близкого человека, искреннего признания или особого повода.",
    composition: "Арахис в белом шоколаде, мармелад в карамельной глазури, клюква в шоколаде",
    weight: "200 г",
    price: "560 ₽",
    image: "assets/sweets-heart-box-3d.png?v=20260720-1907",
    viewerImage: "assets/sweets-heart-box-full.jpg?v=20260720-1907",
    images: [
      "assets/sweets-heart-detail-1.jpg",
      "assets/sweets-heart-detail-2.jpg",
      "assets/sweets-heart-detail-3.jpg",
      "assets/sweets-heart-detail-4.jpg",
      "assets/sweets-heart-detail-5.jpg"
    ],
    badge: "новинка",
    visible: true
  },
  {
    title: "Подарочный набор сладостей «Нежность»",
    description: "Нежный сладкий подарок для близкого человека, душевного поздравления или знака внимания.",
    composition: "Вишня в шоколаде, мармелад в карамельной глазури, конфеты «Адель»",
    weight: "200 г",
    price: "670 ₽",
    image: "assets/sweets-tenderness-box-3d.png?v=20260720-1925",
    viewerImage: "assets/sweets-tenderness-box-full.jpg?v=20260720-1925",
    images: [
      "assets/sweets-tenderness-detail-1.jpg",
      "assets/sweets-tenderness-detail-2.jpg",
      "assets/sweets-tenderness-detail-3.jpg",
      "assets/sweets-tenderness-detail-4.jpg",
      "assets/sweets-tenderness-detail-5.jpg",
      "assets/sweets-tenderness-detail-6.jpg",
      "assets/sweets-tenderness-detail-7.jpg",
      "assets/sweets-tenderness-detail-8.jpg",
      "assets/sweets-tenderness-detail-9.jpg"
    ],
    badge: "новинка",
    visible: true
  }
];

const productsRoot = document.querySelector("[data-products]");
const defaultContent = {};
const cartStorageKey = "podarkinoCart";
const orderEmail = "shakhtar142@yandex.com";
const cartModal = document.querySelector("[data-cart-modal]");
const cartItemsRoot = document.querySelector("[data-cart-items]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartTotalRow = document.querySelector("[data-cart-total-row]");
const cartTotal = document.querySelector("[data-cart-total]");
const cartCount = document.querySelector("[data-cart-count]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const checkoutStatus = document.querySelector("[data-checkout-status]");
let cart = loadCart();
let cartLastFocusedElement = null;

function productId(product) {
  return String(product.id || product.title || "gift")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

function numericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s|\u00a0/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d{1,2})?/);
  return match ? Number(match[0]) : null;
}

function displayPrice(value) {
  const number = numericPrice(value);
  if (number === null) return value || "Цена уточняется";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: number % 1 ? 2 : 0
  }).format(number);
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    return Array.isArray(stored) ? stored.filter((item) => item?.id && item?.quantity > 0) : [];
  } catch (error) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function cartSummary() {
  const knownTotal = cart.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
  const hasUnknownPrices = cart.some((item) => item.unitPrice === null);
  return {
    knownTotal,
    hasUnknownPrices,
    text: hasUnknownPrices
      ? (knownTotal ? `${displayPrice(knownTotal)} + цена уточняется` : "Уточняется")
      : displayPrice(knownTotal)
  };
}

function addToCart(product) {
  const id = productId(product);
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id,
      title: product.title || "Подарочный набор",
      image: versionedAsset(product.image || product.viewerImage || ""),
      priceText: product.price || "",
      unitPrice: numericPrice(product.price),
      quantity: 1
    });
  }
  saveCart();
  renderCart();
  openCart();
}

function changeCartQuantity(id, change) {
  const item = cart.find((value) => value.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity < 1) cart = cart.filter((value) => value.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function cartItemElement(item) {
  const article = document.createElement("article");
  article.className = "cart-item";

  const imageWrap = document.createElement("div");
  imageWrap.className = "cart-item-image";
  if (item.image) {
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    image.dataset.imageViewer = "off";
    imageWrap.append(image);
  }

  const info = document.createElement("div");
  info.className = "cart-item-info";
  const title = document.createElement("h3");
  title.textContent = item.title;
  const price = document.createElement("p");
  price.textContent = item.unitPrice === null ? (item.priceText || "Цена уточняется") : displayPrice(item.unitPrice);

  const controls = document.createElement("div");
  controls.className = "cart-item-controls";
  const minus = document.createElement("button");
  minus.type = "button";
  minus.textContent = "−";
  minus.setAttribute("aria-label", `Уменьшить количество: ${item.title}`);
  minus.addEventListener("click", () => changeCartQuantity(item.id, -1));
  const quantity = document.createElement("b");
  quantity.textContent = item.quantity;
  quantity.setAttribute("aria-label", `Количество: ${item.quantity}`);
  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.setAttribute("aria-label", `Увеличить количество: ${item.title}`);
  plus.addEventListener("click", () => changeCartQuantity(item.id, 1));
  controls.append(minus, quantity, plus);

  const remove = document.createElement("button");
  remove.className = "cart-item-remove";
  remove.type = "button";
  remove.textContent = "Удалить";
  remove.addEventListener("click", () => removeFromCart(item.id));

  info.append(title, price, controls, remove);
  article.append(imageWrap, info);
  return article;
}

function renderCart() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = quantity;
  cartCount.dataset.empty = quantity ? "false" : "true";
  cartEmpty.hidden = cart.length > 0;
  cartItemsRoot.replaceChildren(...cart.map(cartItemElement));
  cartTotalRow.hidden = cart.length === 0;
  cartTotal.textContent = cartSummary().text;
  checkoutForm.toggleAttribute("inert", cart.length === 0);
  checkoutForm.classList.toggle("is-disabled", cart.length === 0);
  checkoutStatus.textContent = "";
}

function openCart() {
  if (!cartModal) return;
  cartLastFocusedElement = document.activeElement;
  cartModal.hidden = false;
  document.body.classList.add("cart-open");
  cartModal.querySelector(".cart-close")?.focus();
}

function closeCart() {
  if (!cartModal || cartModal.hidden) return;
  cartModal.hidden = true;
  document.body.classList.remove("cart-open");
  cartLastFocusedElement?.focus();
}

document.querySelector("[data-cart-open]")?.addEventListener("click", openCart);
document.querySelectorAll("[data-cart-close]").forEach((button) => button.addEventListener("click", closeCart));
document.querySelector("[data-cart-shop]")?.addEventListener("click", () => {
  closeCart();
  document.querySelector("#sets")?.scrollIntoView({ behavior: "smooth" });
});

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!cart.length) {
    checkoutStatus.textContent = "Сначала добавьте хотя бы один набор.";
    return;
  }
  if (!checkoutForm.reportValidity()) return;

  const data = new FormData(checkoutForm);
  const summary = cartSummary();
  const lines = cart.map((item, index) => {
    const itemTotal = item.unitPrice === null ? (item.priceText || "цена уточняется") : displayPrice(item.unitPrice * item.quantity);
    return `${index + 1}. ${item.title} — ${item.quantity} шт. — ${itemTotal}`;
  });
  const body = [
    "Здравствуйте! Хочу оформить заказ:",
    "",
    ...lines,
    "",
    `Общая сумма: ${summary.text}`,
    `Способ оплаты: ${data.get("payment")}`,
    "",
    `ФИО: ${data.get("customerName")}`,
    `Телефон: ${data.get("customerPhone")}`,
    `Почта: ${data.get("customerEmail")}`
  ].join("\n");

  checkoutStatus.textContent = "Заказ подготовлен — открываем почтовое приложение.";
  window.location.href = `mailto:${orderEmail}?subject=${encodeURIComponent("Заказ на сайте Подаркино")}&body=${encodeURIComponent(body)}`;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartModal && !cartModal.hidden) closeCart();
});

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  const box = document.createElement("button");
  box.className = "product-box";
  if (product.image?.includes("box-3d")) box.classList.add("product-box--cutout");
  box.type = "button";
  box.setAttribute("aria-label", `Открыть набор: ${product.title || "Подарок"}`);

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-img";

  if (product.image) {
    const image = document.createElement("img");
    image.src = versionedAsset(product.image);
    image.alt = product.imageCaption || product.title || "Подарок из магазина Подаркино";
    image.loading = "lazy";
    image.dataset.imageViewer = "off";
    imageWrap.append(image);
  }

  box.append(imageWrap);
  box.addEventListener("click", () => openProductViewer(product));

  article.append(box);
  return article;
}

const productViewer = document.createElement("div");
productViewer.className = "product-viewer";
productViewer.setAttribute("role", "dialog");
productViewer.setAttribute("aria-modal", "true");
productViewer.setAttribute("aria-label", "Карточка подарочного набора");
productViewer.hidden = true;
productViewer.innerHTML = `
  <button class="product-viewer-close" type="button" aria-label="Закрыть карточку">&times;</button>
  <div class="product-viewer-card">
    <h2 class="product-viewer-title"></h2>
    <div class="product-viewer-layout">
      <div class="product-viewer-stage">
        <button class="product-viewer-nav product-viewer-prev" type="button" aria-label="Предыдущее фото">&#8249;</button>
        <img class="product-viewer-photo" alt="" data-image-viewer="off" />
        <p class="product-viewer-caption" hidden></p>
        <button class="product-viewer-nav product-viewer-next" type="button" aria-label="Следующее фото">&#8250;</button>
        <span class="product-viewer-count" aria-live="polite"></span>
      </div>
      <div class="product-viewer-details">
        <p class="product-viewer-description"></p>
        <div class="product-facts">
          <div class="product-fact"><span>Состав</span><b data-product-composition></b></div>
          <div class="product-fact"><span>Масса</span><b data-product-weight></b></div>
          <div class="product-fact"><span>Цена</span><b data-product-price></b></div>
        </div>
        <button class="product-viewer-cart" type="button">В корзину</button>
        <nav class="product-switcher" aria-label="Переключение наборов">
          <button class="product-switcher-button" type="button" data-product-previous aria-label="Предыдущий набор">&#8592; Предыдущий</button>
          <span class="product-switcher-count" data-product-count aria-live="polite"></span>
          <button class="product-switcher-button" type="button" data-product-next aria-label="Следующий набор">Следующий &#8594;</button>
        </nav>
      </div>
    </div>
  </div>
`;
document.body.append(productViewer);

const productViewerPhoto = productViewer.querySelector(".product-viewer-photo");
const productViewerClose = productViewer.querySelector(".product-viewer-close");
const productViewerPrevious = productViewer.querySelector(".product-viewer-prev");
const productViewerNext = productViewer.querySelector(".product-viewer-next");
const productViewerCount = productViewer.querySelector(".product-viewer-count");
const productViewerCaption = productViewer.querySelector(".product-viewer-caption");
const productPrevious = productViewer.querySelector("[data-product-previous]");
const productNext = productViewer.querySelector("[data-product-next]");
const productCount = productViewer.querySelector("[data-product-count]");
let activeProductImages = [];
let activeProductImageIndex = 0;
let productLastFocusedElement = null;
let productTouchStartX = null;
let activeProduct = null;
let viewerProducts = [];

function showProductImage(index) {
  if (!activeProductImages.length) return;
  activeProductImageIndex = (index + activeProductImages.length) % activeProductImages.length;
  const item = activeProductImages[activeProductImageIndex];
  productViewerPhoto.src = item.src;
  productViewerPhoto.alt = item.alt;
  productViewerCaption.textContent = item.caption || "";
  productViewerCaption.hidden = !item.caption;
  productViewerCount.textContent = `${activeProductImageIndex + 1} / ${activeProductImages.length}`;
  const singleImage = activeProductImages.length < 2;
  productViewerPrevious.hidden = singleImage;
  productViewerNext.hidden = singleImage;
  productViewerCount.hidden = singleImage;
}

function openProductViewer(product) {
  const wasHidden = productViewer.hidden;
  activeProduct = product;
  if (wasHidden) productLastFocusedElement = document.activeElement;
  const sources = [product.viewerImage || product.image, ...(Array.isArray(product.images) ? product.images : [])]
    .filter(Boolean)
    .map(versionedAsset);
  const captions = [
    product.viewerImageCaption || product.imageCaption || "",
    ...(Array.isArray(product.imageCaptions) ? product.imageCaptions : [])
  ];
  activeProductImages = sources.map((src, index) => ({
    src,
    alt: captions[index] || `${product.title || "Подарочный набор"}${index ? `, фото ${index + 1}` : ""}`,
    caption: captions[index] || ""
  }));
  productViewer.querySelector(".product-viewer-title").textContent = product.title || "Подарочный набор";
  productViewer.querySelector(".product-viewer-description").textContent = product.description || "Описание набора скоро появится.";
  productViewer.querySelector("[data-product-composition]").textContent = product.composition || "Состав скоро добавим";
  productViewer.querySelector("[data-product-weight]").textContent = product.weight || "Уточняется";
  productViewer.querySelector("[data-product-price]").textContent = product.price || "Уточняется";
  const productIndex = viewerProducts.indexOf(product);
  productCount.textContent = productIndex >= 0 ? `${productIndex + 1} / ${viewerProducts.length}` : "";
  const singleProduct = viewerProducts.length < 2;
  productPrevious.hidden = singleProduct;
  productNext.hidden = singleProduct;
  productCount.hidden = singleProduct;
  showProductImage(0);
  productViewer.hidden = false;
  document.body.classList.add("viewer-open");
  if (wasHidden) productViewerClose.focus();
}

function navigateProduct(step) {
  if (viewerProducts.length < 2) return;
  const currentIndex = Math.max(0, viewerProducts.indexOf(activeProduct));
  const nextIndex = (currentIndex + step + viewerProducts.length) % viewerProducts.length;
  openProductViewer(viewerProducts[nextIndex]);
}

function closeProductViewer() {
  if (productViewer.hidden) return;
  productViewer.hidden = true;
  productViewerPhoto.removeAttribute("src");
  activeProductImages = [];
  activeProduct = null;
  document.body.classList.remove("viewer-open");
  productLastFocusedElement?.focus();
}

productViewerClose.addEventListener("click", closeProductViewer);
productViewer.querySelector(".product-viewer-cart").addEventListener("click", () => {
  if (!activeProduct) return;
  const product = activeProduct;
  closeProductViewer();
  addToCart(product);
});
productViewerPrevious.addEventListener("click", () => showProductImage(activeProductImageIndex - 1));
productViewerNext.addEventListener("click", () => showProductImage(activeProductImageIndex + 1));
productPrevious.addEventListener("click", () => navigateProduct(-1));
productNext.addEventListener("click", () => navigateProduct(1));
productViewer.addEventListener("click", (event) => {
  if (event.target === productViewer) closeProductViewer();
});
productViewer.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) productTouchStartX = event.touches[0].clientX;
}, { passive: true });
productViewer.addEventListener("touchend", (event) => {
  if (productTouchStartX === null || !event.changedTouches.length) return;
  const deltaX = event.changedTouches[0].clientX - productTouchStartX;
  productTouchStartX = null;
  if (Math.abs(deltaX) > 50) showProductImage(activeProductImageIndex + (deltaX < 0 ? 1 : -1));
}, { passive: true });
document.addEventListener("keydown", (event) => {
  if (productViewer.hidden) return;
  if (event.key === "Escape") closeProductViewer();
  if (event.key === "ArrowLeft") showProductImage(activeProductImageIndex - 1);
  if (event.key === "ArrowRight") showProductImage(activeProductImageIndex + 1);
});

const imageViewer = document.createElement("div");
imageViewer.className = "image-viewer";
imageViewer.setAttribute("role", "dialog");
imageViewer.setAttribute("aria-modal", "true");
imageViewer.setAttribute("aria-label", "Полноэкранный просмотр фото");
imageViewer.hidden = true;
imageViewer.innerHTML = `
  <button class="image-viewer-close" type="button" aria-label="Закрыть фото">&times;</button>
  <button class="image-viewer-nav image-viewer-prev" type="button" aria-label="Предыдущее фото">&#8249;</button>
  <img class="image-viewer-photo" alt="" />
  <button class="image-viewer-nav image-viewer-next" type="button" aria-label="Следующее фото">&#8250;</button>
  <span class="image-viewer-counter" aria-live="polite"></span>
`;
document.body.append(imageViewer);

const viewerPhoto = imageViewer.querySelector(".image-viewer-photo");
const viewerClose = imageViewer.querySelector(".image-viewer-close");
const viewerPrevious = imageViewer.querySelector(".image-viewer-prev");
const viewerNext = imageViewer.querySelector(".image-viewer-next");
const viewerCounter = imageViewer.querySelector(".image-viewer-counter");
let lastFocusedElement = null;
let currentViewerImage = null;
let touchStartX = null;
let touchStartY = null;

const viewerImageSelector = 'main img:not([data-image-viewer="off"])';

function getViewerImages() {
  return [...document.querySelectorAll(viewerImageSelector)];
}

function showViewerImage(image) {
  const images = getViewerImages();
  const index = images.indexOf(image);
  if (index < 0) return;

  currentViewerImage = image;
  viewerPhoto.src = image.currentSrc || image.src;
  viewerPhoto.alt = image.alt;
  viewerCounter.textContent = `${index + 1} / ${images.length}`;
  const singleImage = images.length < 2;
  viewerPrevious.hidden = singleImage;
  viewerNext.hidden = singleImage;
  viewerCounter.hidden = singleImage;
}

function openImageViewer(image) {
  lastFocusedElement = document.activeElement;
  showViewerImage(image);
  imageViewer.hidden = false;
  document.body.classList.add("viewer-open");
  viewerClose.focus();
}

function navigateViewer(step) {
  const images = getViewerImages();
  if (images.length < 2) return;

  const currentIndex = Math.max(0, images.indexOf(currentViewerImage));
  const nextIndex = (currentIndex + step + images.length) % images.length;
  showViewerImage(images[nextIndex]);
}

function closeImageViewer() {
  if (imageViewer.hidden) return;

  imageViewer.hidden = true;
  viewerPhoto.removeAttribute("src");
  currentViewerImage = null;
  document.body.classList.remove("viewer-open");
  lastFocusedElement?.focus();
}

function enhanceViewerImage(image) {
  if (!image.matches(viewerImageSelector)) return;

  image.classList.add("viewer-trigger");
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.setAttribute("aria-label", `Открыть фото: ${image.alt || "изображение"}`);
}

document.querySelectorAll(viewerImageSelector).forEach(enhanceViewerImage);

const imageObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches(viewerImageSelector)) enhanceViewerImage(node);
      node.querySelectorAll(viewerImageSelector).forEach(enhanceViewerImage);
    });
  });
});

imageObserver.observe(document.querySelector("main") || document.body, {
  childList: true,
  subtree: true
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const image = event.target.closest(viewerImageSelector);
  if (image) openImageViewer(image);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (!(event.target instanceof Element)) return;
  const image = event.target.closest(viewerImageSelector);
  if (!image) return;

  event.preventDefault();
  openImageViewer(image);
});

viewerClose.addEventListener("click", closeImageViewer);
viewerPrevious.addEventListener("click", () => navigateViewer(-1));
viewerNext.addEventListener("click", () => navigateViewer(1));
imageViewer.addEventListener("click", (event) => {
  if (event.target === imageViewer) closeImageViewer();
});
imageViewer.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });
imageViewer.addEventListener("touchend", (event) => {
  if (touchStartX === null || touchStartY === null || !event.changedTouches.length) return;

  const deltaX = event.changedTouches[0].clientX - touchStartX;
  const deltaY = event.changedTouches[0].clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;

  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
    navigateViewer(deltaX < 0 ? 1 : -1);
  }
}, { passive: true });
imageViewer.addEventListener("touchcancel", () => {
  touchStartX = null;
  touchStartY = null;
});
document.addEventListener("keydown", (event) => {
  if (imageViewer.hidden) return;
  if (event.key === "Escape") closeImageViewer();
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateViewer(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateViewer(1);
  }
});

function renderProducts(products) {
  if (!productsRoot) return;

  const visibleProducts = products.filter((product) => product.visible !== false);
  viewerProducts = visibleProducts;
  productsRoot.replaceChildren(...visibleProducts.map(productCard));
}

async function loadProducts() {
  if (!productsRoot) return;

  try {
    const response = await fetch(`data/products.json?v=${assetVersion}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Products not available");
    const products = await response.json();
    renderProducts(Array.isArray(products) && products.length ? products : fallbackProducts);
  } catch (error) {
    renderProducts(fallbackProducts);
  }
}

function applyContent(content) {
  const data = { ...defaultContent, ...content };

  document.querySelectorAll("[data-content]").forEach((element) => {
    const key = element.dataset.content;
    if (typeof data[key] === "string") {
      element.textContent = data[key];
    }
  });

  renderReviews(data.reviews);
  renderPageImages(data.pageImages);

}

function renderPageImages(pageImages) {
  if (!pageImages || typeof pageImages !== "object") return;
  document.querySelectorAll("[data-image-key]").forEach((image) => {
    const value = pageImages[image.dataset.imageKey];
    if (!value) return;
    const source = typeof value === "string" ? value : value.src;
    const caption = typeof value === "object" ? value.caption : "";
    if (source) image.src = versionedAsset(source);
    if (caption) image.alt = caption;
  });
}

function renderReviews(reviews) {
  const root = document.querySelector("[data-reviews]");
  if (!root) return;
  if (!Array.isArray(reviews) || !reviews.length) {
    root.innerHTML = `<div class="reviews-empty"><div class="reviews-stars" aria-label="Пять звёзд">★★★★★</div><h3>Первые отзывы скоро появятся</h3><p>Здесь будут живые впечатления покупателей о наборах, оформлении и вручении подарков.</p></div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "reviews-grid";
  reviews.forEach((value, index) => {
    const source = typeof value === "string" ? value : value?.src;
    if (!source) return;
    const caption = typeof value === "object" ? value.caption || "" : "";
    const figure = document.createElement("figure");
    figure.className = "review-card";
    const image = document.createElement("img");
    image.src = source;
    image.alt = caption || `Отзыв покупателя ${index + 1}`;
    image.loading = "lazy";
    figure.append(image);
    if (caption) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption;
      figure.append(figcaption);
    }
    grid.append(figure);
  });
  root.replaceChildren(grid);
}

async function loadContent() {
  try {
    const response = await fetch(`data/content.json?v=${assetVersion}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Content not available");
    applyContent(await response.json());
  } catch (error) {
    applyContent(defaultContent);
  }
}

loadProducts();
loadContent();
renderCart();
