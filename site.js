const assetVersion = "20260720-1855";

const fallbackProducts = [
  {
    title: "Подарочный набор орехов в шоколаде",
    description: "Ореховое ассорти для учителя, воспитателя, близких людей и уютного чаепития.",
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
    image: "assets/sweets-heart-gift-set.jpg",
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
    image: "assets/sweets-tenderness-gift-set.jpg",
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
    image.src = product.image;
    image.alt = product.title || "Подарок из магазина Подаркино";
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
  <div class="product-viewer-hero">
    <h2 class="product-viewer-title"></h2>
    <div class="product-viewer-stage">
      <button class="product-viewer-nav product-viewer-prev" type="button" aria-label="Предыдущее фото">&#8249;</button>
      <img class="product-viewer-photo" alt="" data-image-viewer="off" />
      <button class="product-viewer-nav product-viewer-next" type="button" aria-label="Следующее фото">&#8250;</button>
      <span class="product-viewer-count" aria-live="polite"></span>
    </div>
  </div>
  <div class="product-viewer-details">
    <p class="product-viewer-description"></p>
    <div class="product-facts">
      <div class="product-fact"><span>Состав</span><b data-product-composition></b></div>
      <div class="product-fact"><span>Масса</span><b data-product-weight></b></div>
      <div class="product-fact"><span>Цена</span><b data-product-price></b></div>
    </div>
  </div>
`;
document.body.append(productViewer);

const productViewerPhoto = productViewer.querySelector(".product-viewer-photo");
const productViewerClose = productViewer.querySelector(".product-viewer-close");
const productViewerPrevious = productViewer.querySelector(".product-viewer-prev");
const productViewerNext = productViewer.querySelector(".product-viewer-next");
const productViewerCount = productViewer.querySelector(".product-viewer-count");
let activeProductImages = [];
let activeProductImageIndex = 0;
let productLastFocusedElement = null;
let productTouchStartX = null;

function showProductImage(index) {
  if (!activeProductImages.length) return;
  activeProductImageIndex = (index + activeProductImages.length) % activeProductImages.length;
  const item = activeProductImages[activeProductImageIndex];
  productViewerPhoto.src = item.src;
  productViewerPhoto.alt = item.alt;
  productViewerCount.textContent = `${activeProductImageIndex + 1} / ${activeProductImages.length}`;
  const singleImage = activeProductImages.length < 2;
  productViewerPrevious.hidden = singleImage;
  productViewerNext.hidden = singleImage;
  productViewerCount.hidden = singleImage;
}

function openProductViewer(product) {
  productLastFocusedElement = document.activeElement;
  const sources = [product.viewerImage || product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  activeProductImages = sources.map((src, index) => ({
    src,
    alt: `${product.title || "Подарочный набор"}${index ? `, фото ${index + 1}` : ""}`
  }));
  productViewer.querySelector(".product-viewer-title").textContent = product.title || "Подарочный набор";
  productViewer.querySelector(".product-viewer-description").textContent = product.description || "Описание набора скоро появится.";
  productViewer.querySelector("[data-product-composition]").textContent = product.composition || "Состав скоро добавим";
  productViewer.querySelector("[data-product-weight]").textContent = product.weight || "Уточняется";
  productViewer.querySelector("[data-product-price]").textContent = product.price || "Уточняется";
  showProductImage(0);
  productViewer.hidden = false;
  document.body.classList.add("viewer-open");
  productViewerClose.focus();
}

function closeProductViewer() {
  if (productViewer.hidden) return;
  productViewer.hidden = true;
  productViewerPhoto.removeAttribute("src");
  activeProductImages = [];
  document.body.classList.remove("viewer-open");
  productLastFocusedElement?.focus();
}

productViewerClose.addEventListener("click", closeProductViewer);
productViewerPrevious.addEventListener("click", () => showProductImage(activeProductImageIndex - 1));
productViewerNext.addEventListener("click", () => showProductImage(activeProductImageIndex + 1));
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
