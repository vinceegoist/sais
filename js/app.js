import {
  getRecipes,
  postRecipeTest
} from "./api.js";

/* GET ELEMENTS */

const getForm = document.querySelector("#get-form");
const getButton = document.querySelector("#get-button");
const getStatus = document.querySelector("#get-status");
const getResponse = document.querySelector("#get-response");
const recipeList = document.querySelector("#recipe-list");

/* POST ELEMENTS */

const postForm = document.querySelector("#post-form");
const postButton = document.querySelector("#post-button");
const postStatus = document.querySelector("#post-status");
const postResponse = document.querySelector("#post-response");

/**
 * Changes a button between its normal and loading states.
 */
function setLoading(
  button,
  isLoading,
  loadingText,
  normalText
) {
  button.disabled = isLoading;

  button.textContent = isLoading
    ? loadingText
    : normalText;
}

/**
 * Displays a success, error, or normal status message.
 */
function setStatus(element, message, type = "") {
  element.textContent = message;

  element.className =
    `request-status ${type}`.trim();
}

/**
 * Converts a JavaScript object into formatted JSON.
 */
function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

/**
 * Escapes text before inserting it into HTML.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Finds the recipe array inside different possible API response formats.
 */
function normalizeRecipeArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.recipes)) {
    return payload.recipes;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

/**
 * Displays recipes as cards.
 */
function renderRecipes(payload) {
  const recipes = normalizeRecipeArray(payload);

  recipeList.replaceChildren();

  if (recipes.length === 0) {
    const message = document.createElement("p");

    message.textContent =
      "The GET request succeeded, but no recipe results were found.";

    recipeList.append(message);

    return;
  }

  const recipeCards = recipes
    .map((recipe, index) => {
      const title =
        recipe?.title ??
        recipe?.name ??
        recipe?.recipe_name ??
        `Recipe ${index + 1}`;

      const description =
        recipe?.description ??
        recipe?.summary ??
        recipe?.instructions ??
        "No description available.";

      const category =
        recipe?.category ??
        recipe?.cuisine ??
        recipe?.meal_type ??
        "Uncategorized";

      const id =
        recipe?.id ??
        recipe?.uuid ??
        "No ID";

      const shortDescription =
        String(description).slice(0, 180);

      return `
        <article class="recipe-card">
          <h3>${escapeHtml(title)}</h3>

          <p>${escapeHtml(shortDescription)}</p>

          <div class="recipe-meta">
            <span>${escapeHtml(category)}</span>
            <span>ID: ${escapeHtml(id)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  recipeList.innerHTML = recipeCards;
}

/**
 * Handles the GET form submission.
 */
getForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(getForm);

  const apiKey =
    String(formData.get("apiKey") ?? "");

  const search =
    String(formData.get("search") ?? "");

  const perPage =
    Number(formData.get("perPage") ?? 6);

  setLoading(
    getButton,
    true,
    "Sending GET...",
    "Send GET Request"
  );

  setStatus(
    getStatus,
    "Sending GET request..."
  );

  getResponse.textContent = "Loading...";

  recipeList.replaceChildren();

  try {
    const result = await getRecipes({
      apiKey,
      search,
      perPage
    });

    const statusText =
      result.statusText || "OK";

    setStatus(
      getStatus,
      `${result.status} ${statusText} — GET request successful.`,
      "success"
    );

    getResponse.textContent =
      formatJson(result.body);

    renderRecipes(result.body);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unknown GET request error occurred.";

    setStatus(
      getStatus,
      message,
      "error"
    );

    getResponse.textContent =
      formatJson({
        error: message
      });
  } finally {
    setLoading(
      getButton,
      false,
      "Sending GET...",
      "Send GET Request"
    );
  }
});

/**
 * Handles the POST form submission.
 */
postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(postForm);

  const ingredientText =
    String(formData.get("ingredients") ?? "");

  const ingredients = ingredientText
    .split(",")
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient !== "");

  const recipePayload = {
    title:
      String(formData.get("title") ?? "").trim(),

    category:
      String(formData.get("category") ?? "").trim(),

    description:
      String(formData.get("description") ?? "").trim(),

    calories:
      Number(formData.get("calories") ?? 0),

    ingredients,

    submittedAt:
      new Date().toISOString()
  };

  setLoading(
    postButton,
    true,
    "Sending POST...",
    "Send POST Request"
  );

  setStatus(
    postStatus,
    "Sending POST request..."
  );

  postResponse.textContent = "Loading...";

  try {
    const result =
      await postRecipeTest(recipePayload);

    const statusText =
      result.statusText || "OK";

    setStatus(
      postStatus,
      `${result.status} ${statusText} — POST request successful.`,
      "success"
    );

    postResponse.textContent =
      formatJson(result.body);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unknown POST request error occurred.";

    setStatus(
      postStatus,
      message,
      "error"
    );

    postResponse.textContent =
      formatJson({
        error: message
      });
  } finally {
    setLoading(
      postButton,
      false,
      "Sending POST...",
      "Send POST Request"
    );
  }
});