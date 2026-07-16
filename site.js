const assetVersion = "20260716-1758";

const fallbackProducts = [
  {
    title: "Подарочный набор орехов в шоколаде",
    description: "Ореховое ассорти для учителя, воспитателя, близких людей и уютного чаепития.",
    image: "assets/nuts-in-chocolate-product-main.jpg?v=20260716-1800",
    badge: "хит",
    visible: true
  },
  {
    title: "Подарочный набор сладостей «Сердце»",
    description: "Яркий сладкий подарок для близкого человека, искреннего признания или особого повода.",
    image: "assets/sweets-heart-gift-set.jpg",
    badge: "новинка",
    visible: true
  },
  {
    title: "Подарочный набор сладостей «Нежность»",
    description: "Нежный сладкий подарок для близкого человека, душевного поздравления или знака внимания.",
    image: "assets/sweets-tenderness-gift-set.jpg",
    badge: "новинка",
    visible: true
  }
];

const productsRoot = document.querySelector("[data-products]");
const defaultContent = {};

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `Открыть фото: ${product.title || "Подарок"}`);

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-img";

  if (product.image) {
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.title || "Подарок из магазина Подаркино";
    image.loading = "lazy";
    imageWrap.append(image);
  }

  const title = document.createElement("h3");
  title.textContent = product.title || "Подарок";

  const description = document.createElement("p");
  description.textContent = product.description || "";

  if (product.badge) {
    const badge = document.createElement("span");
    badge.className = "product-badge";
    badge.textContent = product.badge;
    imageWrap.append(badge);
  }

  article.append(imageWrap, title, description);
  return article;
}

const imageViewer = document.createElement("div");
imageViewer.className = "image-viewer";
imageViewer.setAttribute("role", "dialog");
imageViewer.setAttribute("aria-modal", "true");
imageViewer.setAttribute("aria-label", "Фото товара");
imageViewer.hidden = true;
imageViewer.innerHTML = `
  <button class="image-viewer-close" type="button" aria-label="Закрыть фото">&times;</button>
  <img class="image-viewer-photo" alt="" />
`;
document.body.append(imageViewer);

const viewerPhoto = imageViewer.querySelector(".image-viewer-photo");
const viewerClose = imageViewer.querySelector(".image-viewer-close");
let lastFocusedElement = null;

function openImageViewer(card) {
  const image = card.querySelector(".product-img img");
  if (!image) return;

  lastFocusedElement = document.activeElement;
  viewerPhoto.src = image.currentSrc || image.src;
  viewerPhoto.alt = image.alt;
  imageViewer.hidden = false;
  document.body.classList.add("viewer-open");
  viewerClose.focus();
}

function closeImageViewer() {
  if (imageViewer.hidden) return;

  imageViewer.hidden = true;
  viewerPhoto.removeAttribute("src");
  document.body.classList.remove("viewer-open");
  lastFocusedElement?.focus();
}

productsRoot?.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (card) openImageViewer(card);
});

productsRoot?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".product-card");
  if (!card) return;

  event.preventDefault();
  openImageViewer(card);
});

viewerClose.addEventListener("click", closeImageViewer);
imageViewer.addEventListener("click", (event) => {
  if (event.target === imageViewer) closeImageViewer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeImageViewer();
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
