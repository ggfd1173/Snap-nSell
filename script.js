const photoInput = document.querySelector("#photoInput");
const previewImage = document.querySelector("#previewImage");
const uploadPlaceholder = document.querySelector("#uploadPlaceholder");
const dropZone = document.querySelector("#dropZone");
const form = document.querySelector("#listingForm");
const clearButton = document.querySelector("#clearButton");
const refreshComparisons = document.querySelector("#refreshComparisons");
const toast = document.querySelector("#toast");
const photoNext = document.querySelector("#photoNext");
const fakeUpload = document.querySelector("#fakeUpload");
const installApp = document.querySelector("#installApp");
const startSelling = document.querySelector("#startSelling");
const removePhoto = document.querySelector("#removePhoto");
const stepTabs = document.querySelectorAll("[data-step-target]");
const stepViews = document.querySelectorAll("[data-step]");
const sellButton = document.querySelector(".bottom-nav-sell");

const OPENROUTER_CONFIG = {
  enabled: true,
  apiKey:
    window.SNAP_SELL_CONFIG?.openRouterApiKey ||
    localStorage.getItem("snapSellOpenRouterKey") ||
    "",
  model:
    window.SNAP_SELL_CONFIG?.openRouterModel ||
    localStorage.getItem("snapSellOpenRouterModel") ||
    "openai/gpt-4o-mini",
};

const fields = {
  itemName: document.querySelector("#itemName"),
  brand: document.querySelector("#brand"),
  condition: document.querySelector("#condition"),
  marketplace: document.querySelector("#marketplace"),
  tone: document.querySelector("#tone"),
  notes: document.querySelector("#notes"),
};

const output = {
  status: document.querySelector("#analysisStatus"),
  qualityScore: document.querySelector("#qualityScore"),
  colourGuess: document.querySelector("#colourGuess"),
  angleTip: document.querySelector("#angleTip"),
  title: document.querySelector("#titleOutput"),
  description: document.querySelector("#descriptionOutput"),
  bullets: document.querySelector("#bulletOutput"),
  price: document.querySelector("#priceOutput"),
  priceReason: document.querySelector("#priceReason"),
  priceConfidence: document.querySelector("#priceConfidence"),
  rangeFill: document.querySelector("#rangeFill"),
  rangeLow: document.querySelector("#rangeLow"),
  rangeHigh: document.querySelector("#rangeHigh"),
  comparisonList: document.querySelector("#comparisonList"),
  marketPosition: document.querySelector("#marketPosition"),
  feedbackSummary: document.querySelector("#feedbackSummary"),
  feedbackList: document.querySelector("#feedbackList"),
  checklist: document.querySelector("#checklist"),
  listingHistory: document.querySelector("#listingHistory"),
  emptyListings: document.querySelector("#emptyListings"),
};

const categoryData = {
  furniture: {
    keywords: ["chair", "table", "desk", "sofa", "couch", "cabinet", "dresser", "bed", "shelf"],
    base: 120,
    comps: ["Modern dining chair", "Solid wood side table", "Compact home office desk"],
  },
  electronics: {
    keywords: ["phone", "laptop", "tablet", "camera", "speaker", "headphones", "watch", "monitor", "console"],
    base: 320,
    comps: ["Pre-owned device with charger", "Lightly used tech bundle", "Popular model in good condition"],
  },
  fashion: {
    keywords: ["jacket", "dress", "shoes", "boots", "bag", "coat", "jeans", "shirt", "watch"],
    base: 75,
    comps: ["Branded wardrobe item", "Clean casual wear", "Seasonal fashion piece"],
  },
  appliance: {
    keywords: ["fridge", "washer", "dryer", "microwave", "vacuum", "oven", "coffee", "kettle"],
    base: 180,
    comps: ["Working household appliance", "Clean kitchen appliance", "Reliable home essential"],
  },
  sports: {
    keywords: ["bike", "helmet", "golf", "board", "weights", "treadmill", "scooter", "kayak"],
    base: 150,
    comps: ["Outdoor gear in used condition", "Fitness item ready for pickup", "Popular sports equipment"],
  },
  general: {
    keywords: [],
    base: 95,
    comps: ["Similar local listing", "Comparable used item", "Recently listed alternative"],
  },
};

const conditionMultipliers = {
  Excellent: 1.15,
  Good: 1,
  Fair: 0.72,
  "Needs repair": 0.38,
};

let imageAnalysis = null;
let imageDataUrl = "";
let currentCategory = "general";
let generatedListing = false;
let installPromptEvent = null;
let savedListings = JSON.parse(localStorage.getItem("snapSellListings") || "[]");

function money(value) {
  return `$${Math.max(1, Math.round(value))}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    toast.textContent = "Copied";
  }, 2600);
}

function showAiError(error) {
  const message = error?.message || "AI request failed.";
  output.status.textContent = "AI needs attention";
  showToast(`AI error: ${message}`);
}

function goToStep(step) {
  const nextStep = Number(step);

  if (nextStep === 2 && !imageAnalysis) {
    showToast("Add a photo first");
    return;
  }

  if (nextStep === 3 && !generatedListing) {
    showToast("Generate the listing first");
    return;
  }

  if (nextStep === 4) {
    renderSavedListings();
  }

  stepViews.forEach((view) => {
    view.classList.toggle("active", Number(view.dataset.step) === nextStep);
  });

  document.body.dataset.step = String(nextStep);

  document.querySelectorAll(".step-tab").forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.stepTarget) === nextStep);
  });

  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.stepTarget) === nextStep);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function persistListings() {
  localStorage.setItem("snapSellListings", JSON.stringify(savedListings));
}

function currentListingSnapshot(source = "Demo estimate") {
  const details = getDetails();

  return {
    id: Date.now(),
    title: output.title.textContent,
    description: output.description.textContent,
    price: output.price.textContent,
    marketplace: details.marketplace,
    source,
    createdAt: new Date().toLocaleString([], {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }),
  };
}

function saveCurrentListing(source) {
  const title = output.title.textContent.trim();

  if (!title || title === "Upload a photo and add a few details") {
    return;
  }

  const listing = currentListingSnapshot(source);
  savedListings = [listing, ...savedListings].slice(0, 20);
  persistListings();
  renderSavedListings();
}

function renderSavedListings() {
  if (!output.listingHistory || !output.emptyListings) return;

  output.emptyListings.classList.toggle("show", savedListings.length === 0);
  output.listingHistory.replaceChildren(
    ...savedListings.map((listing) => {
      const card = document.createElement("article");
      card.className = "listing-card";

      const title = document.createElement("h3");
      const description = document.createElement("p");
      const footer = document.createElement("div");
      const price = document.createElement("span");
      const meta = document.createElement("span");

      footer.className = "listing-card-footer";
      title.textContent = listing.title;
      description.textContent = listing.description.length > 150
        ? `${listing.description.slice(0, 150)}...`
        : listing.description;
      price.textContent = listing.price || "Price pending";
      meta.textContent = listing.marketplace || listing.createdAt;
      footer.append(price, meta);
      card.append(title, description, footer);

      return card;
    })
  );
}

function categoryFor(text) {
  const lowered = text.toLowerCase();
  return (
    Object.entries(categoryData).find(([, data]) =>
      data.keywords.some((keyword) => lowered.includes(keyword))
    )?.[0] || "general"
  );
}

function marketplaceTone(marketplace) {
  if (marketplace.includes("Facebook")) {
    return "Friendly, quick to scan, and good for local pickup.";
  }

  if (marketplace.includes("Trade Me")) {
    return "Detailed, tidy, and clear about condition for confident bidding.";
  }

  if (marketplace.includes("eBay")) {
    return "Search-friendly with clear specifics for wider buyers.";
  }

  return "Clear and balanced for a general marketplace listing.";
}

function toneInstruction(tone) {
  const tones = {
    Professional: "polished, clear, trustworthy, and suitable for broad marketplace buyers",
    Casual: "relaxed, natural, and easy to read without sounding too salesy",
    Friendly: "warm, helpful, and approachable with buyer-friendly wording",
    Premium: "refined, confident, and value-focused while staying honest",
    "Short and direct": "concise, direct, and easy to scan",
  };

  return tones[tone] || tones.Professional;
}

function inferColourName([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max - min < 24) {
    if (max > 205) return "white";
    if (max < 75) return "black";
    return "grey";
  }

  if (r > g + 35 && r > b + 35) return g > 105 ? "tan / warm" : "red";
  if (g > r + 25 && g > b + 20) return "green";
  if (b > r + 25 && b > g + 20) return "blue";
  if (r > 170 && g > 140 && b < 110) return "yellow";
  return "mixed";
}

function analyseImage(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      imageDataUrl = reader.result;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const size = 80;
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let brightness = 0;
        let contrast = 0;
        const samples = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        }

        r = Math.round(r / samples);
        g = Math.round(g / samples);
        b = Math.round(b / samples);
        brightness = brightness / samples;

        for (let i = 0; i < pixels.length; i += 4) {
          const pixelBrightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          contrast += Math.abs(pixelBrightness - brightness);
        }

        contrast = contrast / samples;
        const quality = Math.min(98, Math.max(35, Math.round(brightness * 0.28 + contrast * 0.9)));
        const aspect = image.width / image.height;
        const angleTip =
          aspect > 1.25
            ? "Crop closer"
            : aspect < 0.75
              ? "Add side view"
              : "Looks balanced";

        resolve({
          fileName: file.name,
          brightness,
          contrast,
          quality,
          colour: inferColourName([r, g, b]),
          dimensions: `${image.width} x ${image.height}`,
          angleTip,
        });
      };

      image.src = reader.result;
      previewImage.src = reader.result;
      previewImage.style.display = "block";
      uploadPlaceholder.style.display = "none";
    };

    reader.readAsDataURL(file);
  });
}

function getDetails() {
  return {
    itemName: fields.itemName.value.trim(),
    brand: fields.brand.value.trim(),
    condition: fields.condition.value,
    marketplace: fields.marketplace.value,
    tone: fields.tone.value,
    notes: fields.notes.value.trim(),
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("The model did not return JSON.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function aiPrompt(details) {
  return `Analyze the uploaded product photo and seller details, then create a marketplace listing.

Return only JSON with this shape:
{
  "detectedItem": "what the photo appears to show",
  "title": "Snap & Sell - short listing title",
  "description": "in-depth marketplace description, 4-6 useful paragraphs",
  "bullets": ["3-5 buyer-facing selling points"],
  "category": "furniture|electronics|fashion|appliance|sports|general",
  "recommendedPrice": 120,
  "lowPrice": 90,
  "highPrice": 150,
  "priceReason": "brief reason for the price",
  "marketFeedback": {
    "position": "competitive|premium|value|needs work",
    "summary": "short buyer-market feedback after comparing similar listings",
    "tips": ["2-4 practical seller actions to improve the listing or sale chance"]
  },
  "comparisons": [
    {"name": "similar listing name", "price": 110, "source": "Facebook Marketplace"},
    {"name": "similar listing name", "price": 125, "source": "Trade Me"},
    {"name": "similar listing name", "price": 140, "source": "Local marketplace"}
  ]
}

Seller details:
- Item name: ${details.itemName || "unknown"}
- Brand: ${details.brand || "unknown"}
- Condition: ${details.condition}
- Marketplace: ${details.marketplace}
- Tone: ${details.tone}
- Extra notes: ${details.notes || "none"}

Rules:
- First identify what is visible in the image.
- The title must start with "Snap & Sell - ".
- Write the description in this tone: ${toneInstruction(details.tone)}.
- Make the description in-depth: include item summary, visible condition, buyer use case, included/unknown details, pickup/shipping note if relevant, and one honest caveat where details are uncertain.
- Use seller details when supplied, but do not invent exact model numbers, dimensions, accessories, or defects.
- If the exact brand/model is uncertain, say that in the description.
- Compare against realistic similar used marketplace items and explain the pricing logic.
- Use NZD-style dollar prices.
- The comparisons should be plausible market comparables, not exact live search results.
- The market feedback should explain whether the price is competitive and what would help the listing sell faster.`;
}

const aiResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "marketplace_listing",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        detectedItem: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        bullets: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 5,
        },
        category: {
          type: "string",
          enum: ["furniture", "electronics", "fashion", "appliance", "sports", "general"],
        },
        recommendedPrice: { type: "number" },
        lowPrice: { type: "number" },
        highPrice: { type: "number" },
        priceReason: { type: "string" },
        marketFeedback: {
          type: "object",
          additionalProperties: false,
          properties: {
            position: { type: "string" },
            summary: { type: "string" },
            tips: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 4,
            },
          },
          required: ["position", "summary", "tips"],
        },
        comparisons: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              price: { type: "number" },
              source: { type: "string" },
            },
            required: ["name", "price", "source"],
          },
          minItems: 3,
          maxItems: 3,
        },
      },
      required: [
        "detectedItem",
        "title",
        "description",
        "bullets",
        "category",
        "recommendedPrice",
        "lowPrice",
        "highPrice",
        "priceReason",
        "marketFeedback",
        "comparisons",
      ],
    },
  },
};

async function requestAiListing(details) {
  if (!OPENROUTER_CONFIG.apiKey) {
    throw new Error("OpenRouter key is not configured. Paste your key into OPENROUTER_CONFIG.apiKey in script.js.");
  }

  if (!OPENROUTER_CONFIG.model) {
    throw new Error("OpenRouter model is not configured.");
  }

  if (!imageDataUrl) {
    throw new Error("Upload a photo before using AI.");
  }

  const requestBody = {
    model: OPENROUTER_CONFIG.model,
    temperature: 0.25,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: aiPrompt(details) },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };

  const sendRequest = (body) => fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": location.origin,
      "X-Title": "Snap & Sell",
    },
    body: JSON.stringify(body),
  });

  let response = await sendRequest({ ...requestBody, response_format: aiResponseFormat });
  let payload = await response.json().catch(() => ({}));

  if (!response.ok && /response_format|schema|structured/i.test(payload?.error?.message || payload?.message || "")) {
    response = await sendRequest(requestBody);
    payload = await response.json().catch(() => ({}));
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `OpenRouter request failed (${response.status}).`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return extractJson(Array.isArray(content) ? content.map((part) => part.text || "").join("\n") : content);
}

function buildListing(markGenerated = true) {
  const details = getDetails();
  const seedText = `${details.itemName} ${details.brand} ${details.notes} ${imageAnalysis?.fileName || ""}`;
  currentCategory = categoryFor(seedText);
  const category = categoryData[currentCategory];
  const titleSubject = details.itemName || category.comps[0];
  const titleParts = ["Snap & Sell -", details.brand, details.condition, titleSubject].filter(Boolean);
  const title = titleParts.join(" ");
  const colourLine = imageAnalysis ? `The photo suggests a ${imageAnalysis.colour} main colour.` : "";
  const detailLine = details.notes ? `Seller notes: ${details.notes}` : "Add measurements, accessories, pickup details, and any faults before posting.";
  const marketplaceLine = marketplaceTone(details.marketplace);
  const selectedTone = toneInstruction(details.tone);

  const description = [
    `${titleSubject} available in ${details.condition.toLowerCase()} condition.`,
    `This Snap & Sell draft gives buyers a fuller picture of the item before they message. It is written in a ${details.tone.toLowerCase()} tone: ${selectedTone}.`,
    colourLine || "The current photo area is ready for an item image, which will help buyers quickly judge appearance and condition.",
    detailLine,
    `Condition is listed as ${details.condition.toLowerCase()}. Before posting, confirm any visible wear, marks, missing parts, included accessories, size, and pickup or shipping details so buyers know exactly what to expect.`,
    `This item is positioned in the ${currentCategory} category, with a suggested price range based on similar used marketplace listings. The recommendation is a starting point, not a guarantee, so adjust if your local market is slower or faster.`,
    `Prepared for ${details.marketplace}. ${marketplaceLine}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const bullets = [
    imageAnalysis ? `Photo checked: ${imageAnalysis.quality}/100 quality score` : "Add a bright front photo",
    details.brand ? `Brand included: ${details.brand}` : "Mention the brand if known",
    details.condition === "Needs repair" ? "Be upfront about repair needs" : "Ready for buyer questions",
    details.marketplace.includes("Trade Me") ? "Consider reserve and shipping options" : "Best for clear local pickup terms",
  ];

  const conditionMultiplier = conditionMultipliers[details.condition] || 1;
  const confidence = imageAnalysis && details.itemName ? "High" : details.itemName || imageAnalysis ? "Medium" : "Low";
  const recommended = category.base * conditionMultiplier;
  const low = recommended * 0.78;
  const high = recommended * 1.28;

  output.title.textContent = title;
  output.description.textContent = description;
  output.bullets.replaceChildren(...bullets.map((item) => createListItem(item)));
  output.price.textContent = money(recommended);
  output.priceReason.textContent = `Based on ${details.condition.toLowerCase()} condition, ${currentCategory} category, and typical used-item positioning. Verify against live marketplace results before posting.`;
  output.priceConfidence.textContent = `${confidence} confidence`;
  output.rangeFill.style.width = `${confidence === "High" ? 78 : confidence === "Medium" ? 58 : 36}%`;
  output.rangeLow.textContent = money(low);
  output.rangeHigh.textContent = money(high);

  renderComparisons(recommended, details.marketplace);
  renderMarketFeedback({
    category: currentCategory,
    condition: details.condition,
    recommended,
    low,
    high,
    marketplace: details.marketplace,
    hasPhoto: Boolean(imageAnalysis),
    hasNotes: details.notes.length > 10,
  });
  generatedListing = markGenerated || generatedListing;
  if (markGenerated) {
    saveCurrentListing("Local generator");
  }
  renderChecklist();
}

function applyAiListing(aiListing, details) {
  const safeCategory = categoryData[aiListing.category] ? aiListing.category : categoryFor(`${aiListing.title} ${details.notes}`);
  currentCategory = safeCategory;
  const recommended = Number(aiListing.recommendedPrice) || categoryData[currentCategory].base;
  const low = Number(aiListing.lowPrice) || recommended * 0.78;
  const high = Number(aiListing.highPrice) || recommended * 1.28;
  const bullets = Array.isArray(aiListing.bullets) && aiListing.bullets.length
    ? aiListing.bullets.slice(0, 5)
    : ["AI generated listing copy", "Check details before posting", "Confirm price against live listings"];

  const aiTitle = aiListing.title || details.itemName || "Marketplace listing";
  output.title.textContent = aiTitle.startsWith("Snap & Sell -") ? aiTitle : `Snap & Sell - ${aiTitle}`;
  output.description.textContent = aiListing.description || "AI generated a listing, but no description was returned.";
  output.bullets.replaceChildren(...bullets.map((item) => createListItem(item)));
  output.price.textContent = money(recommended);
  output.priceReason.textContent = aiListing.priceReason || "AI estimated this from the photo and seller details. Verify against live marketplace results before posting.";
  output.priceConfidence.textContent = "AI estimate";
  output.rangeFill.style.width = "82%";
  output.rangeLow.textContent = money(low);
  output.rangeHigh.textContent = money(high);
  output.marketPosition.textContent = aiListing.marketFeedback?.position || "AI estimate";
  output.feedbackSummary.textContent =
    aiListing.marketFeedback?.summary ||
    "AI compared the item details with similar marketplace positioning and estimated a competitive listing strategy.";
  output.feedbackList.replaceChildren(
    ...(Array.isArray(aiListing.marketFeedback?.tips) && aiListing.marketFeedback.tips.length
      ? aiListing.marketFeedback.tips.slice(0, 4)
      : ["Confirm the price against live marketplace results", "Add exact measurements and pickup details"]).map((tip) =>
      createListItem(tip)
    )
  );

  if (Array.isArray(aiListing.comparisons) && aiListing.comparisons.length) {
    output.comparisonList.replaceChildren(
      ...aiListing.comparisons.slice(0, 3).map((comparison) => {
        const card = document.createElement("div");
        card.className = "comparison-card";
        const source = comparison.source || details.marketplace;
        const name = document.createElement("strong");
        const sourceLine = document.createElement("span");
        const note = document.createElement("span");
        const price = document.createElement("div");

        price.className = "price";
        name.textContent = comparison.name || "Similar listing";
        sourceLine.textContent = source;
        note.textContent = "AI market estimate";
        price.textContent = money(Number(comparison.price) || recommended);
        card.append(name, sourceLine, note, price);
        return card;
      })
    );
  } else {
    renderComparisons(recommended, details.marketplace);
  }

  generatedListing = true;
  saveCurrentListing("AI estimate");
  renderChecklist();
}

function createListItem(text, className = "") {
  const li = document.createElement("li");
  li.textContent = text;
  if (className) li.className = className;
  return li;
}

function renderComparisons(recommended = categoryData[currentCategory].base, marketplace = fields.marketplace.value) {
  const category = categoryData[currentCategory];
  const offsets = [0.82, 1.04, 1.22].sort(() => Math.random() - 0.5);
  const cards = category.comps.map((name, index) => {
    const card = document.createElement("div");
    card.className = "comparison-card";
    const price = recommended * offsets[index];
    const days = [1, 3, 6][index];
    card.innerHTML = `
      <strong>${name}</strong>
      <span>${marketplace}</span>
      <span>Listed ${days} day${days > 1 ? "s" : ""} ago</span>
      <div class="price">${money(price)}</div>
    `;
    return card;
  });

  output.comparisonList.replaceChildren(...cards);
}

function renderMarketFeedback({ category, condition, recommended, low, high, marketplace, hasPhoto, hasNotes }) {
  const midpoint = (low + high) / 2;
  const position = recommended <= midpoint * 0.92 ? "Value" : recommended >= midpoint * 1.08 ? "Premium" : "Competitive";
  const conditionText =
    condition === "Excellent"
      ? "The condition supports a stronger asking price."
      : condition === "Fair" || condition === "Needs repair"
        ? "The condition makes clear fault notes especially important."
        : "The price sits in a normal used-item range.";
  const marketplaceText = marketplace.includes("Trade Me")
    ? "Trade Me buyers usually expect more detail, so measurements and shipping or pickup terms matter."
    : marketplace.includes("Facebook")
      ? "Facebook buyers scan quickly, so a sharp first photo and direct pickup details should help."
      : "A clear title, honest condition notes, and a realistic price should make the listing easier to trust.";
  const tips = [
    hasPhoto ? "Use the current photo as the main image if the item is clearly visible." : "Add a bright front photo before posting.",
    hasNotes ? "Keep the extra details in the listing because they answer buyer questions early." : "Add size, age, accessories, pickup suburb, and any faults.",
    recommended > categoryData[category].base ? "Start near the recommended price, then lower it if there is no interest." : "The price is approachable, so avoid discounting too quickly.",
    marketplaceText,
  ];

  output.marketPosition.textContent = position;
  output.feedbackSummary.textContent = `${conditionText} Similar ${category} listings suggest a useful range of ${money(low)} to ${money(high)}, with ${money(recommended)} as a sensible starting point.`;
  output.feedbackList.replaceChildren(...tips.map((tip) => createListItem(tip)));
}

function renderChecklist() {
  const details = getDetails();
  const checks = [
    { text: "Photo uploaded", done: Boolean(imageAnalysis) },
    { text: "Item name is specific", done: details.itemName.length > 3 },
    { text: "Condition selected", done: Boolean(details.condition) },
    { text: "Faults or notes included", done: details.notes.length > 10 },
    { text: "Price checked against similar listings", done: output.price.textContent !== "--" },
  ];

  output.checklist.replaceChildren(
    ...checks.map((check) => createListItem(check.text, check.done ? "done" : ""))
  );
}

async function handlePhoto(file) {
  if (!file || !file.type.startsWith("image/")) return;
  output.status.textContent = "Analysing photo";
  imageAnalysis = await analyseImage(file);
  output.status.textContent = "Photo analysed";
  output.qualityScore.textContent = `${imageAnalysis.quality}/100`;
  output.colourGuess.textContent = imageAnalysis.colour;
  output.angleTip.textContent = imageAnalysis.angleTip;
  removePhoto.classList.add("show");

  if (!fields.itemName.value.trim()) {
    const cleanedName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
    const looksGeneric = /^(img|image|photo|screenshot|dsc|pxl)\s*\d*/i.test(cleanedName);

    if (cleanedName.length > 3 && !looksGeneric) {
      fields.itemName.value = cleanedName.replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
  }

  buildListing(false);
  goToStep(2);
}

function clearPhotoState() {
  photoInput.value = "";
  imageAnalysis = null;
  imageDataUrl = "";
  generatedListing = false;
  previewImage.removeAttribute("src");
  previewImage.style.display = "none";
  uploadPlaceholder.style.display = "grid";
  removePhoto.classList.remove("show");
  output.status.textContent = "Ready for a photo";
  output.qualityScore.textContent = "--";
  output.colourGuess.textContent = "--";
  output.angleTip.textContent = "Upload first";
  renderChecklist();
}

photoInput.addEventListener("change", (event) => {
  handlePhoto(event.target.files[0]);
});

photoNext.addEventListener("click", () => {
  goToStep(2);
});

removePhoto.addEventListener("click", () => {
  clearPhotoState();
  showToast("Photo removed");
  goToStep(1);
});

startSelling.addEventListener("click", () => {
  photoInput.click();
});

sellButton.addEventListener("click", () => {
  goToStep(1);
  photoInput.click();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installApp.classList.add("show");
});

installApp.addEventListener("click", async () => {
  if (!installPromptEvent) {
    showToast("Use your browser menu to add this app");
    return;
  }

  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installApp.classList.remove("show");
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  installApp.classList.remove("show");
  showToast("App installed");
});

stepTabs.forEach((button) => {
  button.addEventListener("click", () => {
    goToStep(button.dataset.stepTarget);
  });
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  handlePhoto(event.dataTransfer.files[0]);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const details = getDetails();

  if (!OPENROUTER_CONFIG.enabled) {
    output.status.textContent = "Listing generated";
    buildListing();
    goToStep(3);
    return;
  }

  output.status.textContent = "Asking OpenRouter";

  try {
    const aiListing = await requestAiListing(details);
    applyAiListing(aiListing, details);
    output.status.textContent = "AI listing generated";
    goToStep(3);
  } catch (error) {
    showAiError(error);
    buildListing();
    output.priceReason.textContent = `${output.priceReason.textContent} AI note: ${error.message}`;
    goToStep(3);
  }
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    if (imageAnalysis || fields.itemName.value.trim()) {
      buildListing(false);
    } else {
      renderChecklist();
    }
  });
});

refreshComparisons.addEventListener("click", () => {
  const textPrice = Number(output.price.textContent.replace(/[^0-9]/g, ""));
  renderComparisons(textPrice || categoryData[currentCategory].base, fields.marketplace.value);
});

clearButton.addEventListener("click", () => {
  form.reset();
  clearPhotoState();
  output.status.textContent = "Ready for a photo";
  output.title.textContent = "Upload a photo and add a few details";
  output.description.textContent =
    "Your generated marketplace-ready description will appear here with a clear title, useful buyer details, and a friendly tone.";
  output.bullets.replaceChildren();
  output.price.textContent = "--";
  output.priceReason.textContent = "Add an item name or upload a photo to estimate a sensible starting point.";
  output.priceConfidence.textContent = "Waiting";
  output.rangeFill.style.width = "0";
  output.rangeLow.textContent = "Low";
  output.rangeHigh.textContent = "High";
  output.marketPosition.textContent = "Waiting";
  output.feedbackSummary.textContent = "Generate a listing to see pricing, demand, and presentation feedback based on similar marketplace items.";
  output.feedbackList.replaceChildren();
  currentCategory = "general";
  renderComparisons();
  renderChecklist();
  goToStep(1);
});

fakeUpload.addEventListener("click", () => {
  showToast("Demo only: no marketplace upload sent");
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const element = document.querySelector(`#${button.dataset.copy}`);
    const text = element.textContent.trim();

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1400);
  });
});

renderComparisons();
renderChecklist();
renderSavedListings();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      output.status.textContent = "Ready for a photo";
    });
  });
}
