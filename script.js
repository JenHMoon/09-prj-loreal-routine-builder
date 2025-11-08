/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Array to keep track of selected products */
let selectedProducts = [];

/* Array to store conversation history with the AI */
let conversationHistory = [];

/* Maximum number of conversation turns to keep in history */
const MAX_HISTORY_TURNS = 6; // Keep last 6 exchanges (3 user + 3 assistant)

/* Trim conversation history to prevent token overflow */
function trimConversationHistory() {
  /* Always keep the system message (first item) */
  if (conversationHistory.length > MAX_HISTORY_TURNS + 1) {
    const systemMessage = conversationHistory[0];
    const recentMessages = conversationHistory.slice(-MAX_HISTORY_TURNS);
    conversationHistory = [systemMessage, ...recentMessages];
  }
}

/* Load selected products from localStorage on page load */
function loadSelectedProductsFromStorage() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
      updateSelectedProductsList();
      /* Mark the cards as selected if they're currently visible */
      markVisibleCardsAsSelected();
    } catch (error) {
      console.error("Error loading saved products:", error);
      selectedProducts = [];
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Mark visible product cards as selected based on selectedProducts array */
function markVisibleCardsAsSelected() {
  selectedProducts.forEach((product) => {
    const card = document.querySelector(
      `.product-card[data-product-id="${product.id}"]`
    );
    if (card) {
      card.classList.add("selected");
    }
  });
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card-front">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
        <div class="selection-indicator">
          <i class="fa-solid fa-check"></i>
        </div>
      </div>
      <div class="product-description">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  /* Add click event listeners to all product cards */
  addProductClickListeners(products);

  /* Mark cards as selected if they're in the selectedProducts array */
  markVisibleCardsAsSelected();
}

/* Handle clicking on product cards to select/unselect them */
function addProductClickListeners(products) {
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      /* Get product ID and convert to number for comparison */
      const productId = Number(card.getAttribute("data-product-id"));

      /* Check if this product is already selected */
      const isSelected = selectedProducts.some((p) => p.id === productId);

      if (isSelected) {
        /* Remove product from selected array */
        selectedProducts = selectedProducts.filter((p) => p.id !== productId);
        /* Remove visual selection indicator */
        card.classList.remove("selected");
      } else {
        /* Find the product data and add it to selected array */
        const product = products.find((p) => p.id === productId);
        selectedProducts.push(product);
        /* Add visual selection indicator */
        card.classList.add("selected");
      }

      /* Update the selected products display */
      updateSelectedProductsList();

      /* Save to localStorage */
      saveSelectedProductsToStorage();
    });
  });
}

/* Update the display of selected products */
function updateSelectedProductsList() {
  const selectedProductsList = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection">No products selected yet. Click on products above to select them.</p>
    `;
  } else {
    selectedProductsList.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 15px;">
        <span style="font-size: 14px; color: #666;">${
          selectedProducts.length
        } product${selectedProducts.length > 1 ? "s" : ""} selected</span>
        <button id="clearAllBtn" class="clear-all-btn">
          <i class="fa-solid fa-trash"></i> Clear All
        </button>
      </div>
      ${selectedProducts
        .map(
          (product) => `
        <div class="selected-product-item" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <span>${product.name}</span>
          <button class="remove-btn" aria-label="Remove ${product.name}">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      `
        )
        .join("")}
    `;

    /* Add click event listeners to remove buttons */
    addRemoveButtonListeners();

    /* Add click event listener to clear all button */
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", clearAllSelections);
    }
  }
}

/* Handle clicking remove buttons in the selected products list */
function addRemoveButtonListeners() {
  const removeButtons = document.querySelectorAll(
    ".selected-product-item .remove-btn"
  );

  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      /* Prevent the click from bubbling up */
      e.stopPropagation();

      /* Get the product ID from the parent element and convert to number */
      const productItem = button.closest(".selected-product-item");
      const productId = Number(productItem.getAttribute("data-product-id"));

      /* Remove product from selected array */
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);

      /* Remove visual selection from product card if visible */
      const productCard = document.querySelector(
        `.product-card[data-product-id="${productId}"]`
      );
      if (productCard) {
        productCard.classList.remove("selected");
      }

      /* Update the selected products display */
      updateSelectedProductsList();

      /* Save to localStorage */
      saveSelectedProductsToStorage();
    });
  });
}

/* Clear all selected products */
function clearAllSelections() {
  /* Confirm with user before clearing */
  const confirmClear = confirm(
    "Are you sure you want to clear all selected products?"
  );

  if (confirmClear) {
    /* Clear the array */
    selectedProducts = [];

    /* Remove selected class from all visible cards */
    document.querySelectorAll(".product-card.selected").forEach((card) => {
      card.classList.remove("selected");
    });

    /* Update the display */
    updateSelectedProductsList();

    /* Save to localStorage */
    saveSelectedProductsToStorage();

    /* Clear conversation history since routine is no longer relevant */
    conversationHistory = [];
    chatWindow.innerHTML = "";
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Initialize the selected products display */
loadSelectedProductsFromStorage();
updateSelectedProductsList();

/* Generate Routine button handler */
const generateRoutineBtn = document.getElementById("generateRoutine");

generateRoutineBtn.addEventListener("click", async () => {
  /* Check if any products are selected */
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <p style="color: #d9534f;">Please select at least one product to generate a routine.</p>
    `;
    return;
  }

  /* Warn if too many products are selected */
  if (selectedProducts.length > 8) {
    const confirmGenerate = confirm(
      `You have selected ${selectedProducts.length} products. Selecting many products may result in an incomplete response. Do you want to continue?`
    );
    if (!confirmGenerate) {
      return;
    }
  }

  /* Show loading message */
  chatWindow.innerHTML = `
    <p><i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...</p>
  `;

  /* Prepare the product data to send to OpenAI */
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  /* Create the prompt for OpenAI */
  const prompt = `I have selected the following beauty and skincare products. Please create a MORNING ROUTINE ONLY for me, explaining when and how to use each product:

${productData
  .map((p, index) => `${index + 1}. ${p.brand} ${p.name} (${p.category})`)
  .join("\n")}

Please provide ONLY the morning routine with step-by-step instructions. Be clear, concise, and complete. Do not include evening routine.`;

  /* Initialize conversation history with system message and user's routine request */
  conversationHistory = [
    {
      role: "system",
      content:
        "You are a helpful beauty and skincare expert assistant. You provide advice on skincare routines, haircare, makeup, fragrance, and related beauty topics. You help users understand how to use their selected products effectively and answer questions about beauty and personal care. Keep your responses clear, concise, and complete.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    /* Send request to OpenAI API with max_tokens parameter */
    const response = await fetch("https://chatbot.jenmoon279.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        max_tokens: 3000,
      }),
    });

    /* Check if the response is successful */
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    /* Get the response data */
    const data = await response.json();

    /* Extract the AI's response */
    const aiResponse = data.choices[0].message.content;

    /* Check if the response was cut off due to token limit */
    const finishReason = data.choices[0].finish_reason;
    const continuePrompt =
      finishReason === "length"
        ? '<br><br><p style="color: #ff9800; font-size: 13px; margin-top: 10px;">💬 Response incomplete. Type "continue" below to see more.</p>'
        : "";

    /* Add the AI's response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Display the generated routine in the chat window with night routine option */
    chatWindow.innerHTML = `
      <div class="chat-message assistant-message">
        <strong>Your Morning Routine:</strong><br><br>
        <div style="white-space: pre-line; line-height: 1.8;">
          ${aiResponse}${continuePrompt}
        </div>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #f0f7ff; border-radius: 8px; border: 1px solid #2196f3;">
        <p style="margin-bottom: 10px; color: #333;">
          <strong>Would you like to see the evening/night routine as well?</strong>
        </p>
        <button id="generateNightRoutineBtn" class="night-routine-btn">
          <i class="fa-solid fa-moon"></i> Generate Night Routine
        </button>
      </div>
    `;

    /* Add click listener to the night routine button */
    const nightRoutineBtn = document.getElementById("generateNightRoutineBtn");
    if (nightRoutineBtn) {
      nightRoutineBtn.addEventListener("click", generateNightRoutine);
    }
  } catch (error) {
    /* Display error message if something goes wrong */
    chatWindow.innerHTML = `
      <p style="color: #d9534f;">
        <i class="fa-solid fa-exclamation-circle"></i> 
        Sorry, there was an error generating your routine. Please try again.
      </p>
      <p style="font-size: 12px; color: #999;">Error: ${error.message}</p>
    `;
  }
});

/* Generate night routine function */
async function generateNightRoutine() {
  /* Add a user message to the chat window */
  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      <strong>You:</strong><br>
      Please show me the evening/night routine.
    </div>
  `;

  /* Show loading indicator */
  chatWindow.innerHTML += `
    <div class="chat-message loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i> Generating night routine...
    </div>
  `;

  /* Scroll to bottom */
  chatWindow.scrollTop = chatWindow.scrollHeight;

  /* Add the request to conversation history */
  conversationHistory.push({
    role: "user",
    content:
      "Now please provide the evening/night routine for the same products. Be clear, concise, and complete.",
  });

  try {
    /* Send request to OpenAI API */
    const response = await fetch("https://chatbot.jenmoon279.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    /* Check if the response was cut off due to token limit */
    const finishReason = data.choices[0].finish_reason;
    const continuePrompt =
      finishReason === "length"
        ? '<br><br><p style="color: #ff9800; font-size: 13px; margin-top: 10px;">💬 Response incomplete. Type "continue" below to see more.</p>'
        : "";

    /* Add response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display the night routine */
    chatWindow.innerHTML += `
      <div class="chat-message assistant-message">
        <strong>Your Night Routine:</strong><br><br>
        <div style="white-space: pre-line; line-height: 1.8;">
          ${aiResponse}${continuePrompt}
        </div>
      </div>
    `;

    /* Scroll to bottom */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display error */
    chatWindow.innerHTML += `
      <div class="chat-message error-message">
        <p style="color: #d9534f;">
          <i class="fa-solid fa-exclamation-circle"></i> 
          Sorry, there was an error generating the night routine.
        </p>
        <p style="font-size: 12px; color: #999;">Error: ${error.message}</p>
      </div>
    `;

    /* Scroll to bottom */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/* Chat form submission handler - for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get the user's question from the input field */
  const userInput = document.getElementById("userInput");
  const userQuestion = userInput.value.trim();

  /* Check if there's a question */
  if (!userQuestion) {
    return;
  }

  /* Check if conversation has been started */
  if (conversationHistory.length === 0) {
    chatWindow.innerHTML = `
      <p style="color: #d9534f;">
        Please generate a routine first by selecting products and clicking "Generate Routine".
      </p>
    `;
    return;
  }

  /* Handle "continue" requests to get the rest of an incomplete response */
  const isContinueRequest = userQuestion.toLowerCase() === "continue";
  const displayQuestion = isContinueRequest
    ? "Please continue..."
    : userQuestion;

  /* Add user's question to the chat window */
  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      <strong>You:</strong><br>
      ${displayQuestion}
    </div>
  `;

  /* Clear the input field */
  userInput.value = "";

  /* Add user's question to conversation history */
  conversationHistory.push({
    role: "user",
    content: isContinueRequest
      ? "Please continue from where you left off."
      : userQuestion,
  });

  /* Trim conversation history to prevent token overflow */
  trimConversationHistory();

  /* Show loading indicator */
  chatWindow.innerHTML += `
    <div class="chat-message loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i> Thinking...
    </div>
  `;

  /* Scroll to bottom of chat window */
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    /* Send request to OpenAI API with full conversation history */
    const response = await fetch("https://chatbot.jenmoon279.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        max_tokens: 2000,
      }),
    });

    /* Check if the response is successful */
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    /* Get the response data */
    const data = await response.json();

    /* Extract the AI's response */
    const aiResponse = data.choices[0].message.content;

    /* Check if the response was cut off due to token limit */
    const finishReason = data.choices[0].finish_reason;
    const continuePrompt =
      finishReason === "length"
        ? '<br><br><p style="color: #ff9800; font-size: 13px; margin-top: 10px;">💬 Response incomplete. Type "continue" below to see more.</p>'
        : "";

    /* Add the AI's response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display the AI's response */
    chatWindow.innerHTML += `
      <div class="chat-message assistant-message">
        <strong>Assistant:</strong><br>
        <div style="white-space: pre-line; line-height: 1.8;">
          ${aiResponse}${continuePrompt}
        </div>
      </div>
    `;

    /* Scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display error message */
    chatWindow.innerHTML += `
      <div class="chat-message error-message">
        <p style="color: #d9534f;">
          <i class="fa-solid fa-exclamation-circle"></i> 
          Sorry, there was an error processing your question.
        </p>
        <p style="font-size: 12px; color: #999;">Error: ${error.message}</p>
      </div>
    `;

    /* Scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
