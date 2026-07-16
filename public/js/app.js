const state = {
  recipes: [],
  page: 1,
  lastPage: 1,
  search: "",
  cuisine: "",
  difficulty: ""
};

const elements = {
  recipeGrid:
    document.querySelector("#recipeGrid"),

  resultSummary:
    document.querySelector("#resultSummary"),

  statusPanel:
    document.querySelector("#statusPanel"),

  searchForm:
    document.querySelector("#searchForm"),

  searchInput:
    document.querySelector("#searchInput"),

  filterSearch:
    document.querySelector("#filterSearch"),

  cuisineFilter:
    document.querySelector("#cuisineFilter"),

  difficultyFilter:
    document.querySelector("#difficultyFilter"),

  applyFiltersButton:
    document.querySelector("#applyFiltersButton"),

  clearFiltersButton:
    document.querySelector("#clearFiltersButton"),

  previousPageButton:
    document.querySelector("#previousPageButton"),

  nextPageButton:
    document.querySelector("#nextPageButton"),

  pageIndicator:
    document.querySelector("#pageIndicator"),

  recipeFormModal:
    document.querySelector("#recipeFormModal"),

  recipeDetailsModal:
    document.querySelector("#recipeDetailsModal"),

  recipeDetailsContent:
    document.querySelector("#recipeDetailsContent"),

  recipeForm:
    document.querySelector("#recipeForm"),

  formError:
    document.querySelector("#formError"),

  saveRecipeButton:
    document.querySelector("#saveRecipeButton"),

  toast:
    document.querySelector("#toast")
};

const visualClasses = [
  "visual-red",
  "visual-yellow",
  "visual-green",
  "visual-orange",
  "visual-purple"
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugToLabel(value) {
  if (!value) {
    return "Other";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
}

function getRecipeEmoji(recipe) {
  const text =
    `${recipe.name} ${recipe.meal_type} ${recipe.cuisine}`
      .toLowerCase();

  if (text.includes("chicken")) {
    return "🍗";
  }

  if (
    text.includes("beef") ||
    text.includes("steak")
  ) {
    return "🥩";
  }

  if (
    text.includes("fish") ||
    text.includes("salmon") ||
    text.includes("tuna")
  ) {
    return "🐟";
  }

  if (
    text.includes("soup") ||
    text.includes("stew")
  ) {
    return "🍲";
  }

  if (
    text.includes("pasta") ||
    text.includes("spaghetti") ||
    text.includes("noodle")
  ) {
    return "🍝";
  }

  if (text.includes("pizza")) {
    return "🍕";
  }

  if (text.includes("rice")) {
    return "🍚";
  }

  if (
    text.includes("dessert") ||
    text.includes("cake")
  ) {
    return "🍰";
  }

  if (
    text.includes("breakfast") ||
    text.includes("egg")
  ) {
    return "🍳";
  }

  if (
    text.includes("salad") ||
    text.includes("vegetable")
  ) {
    return "🥗";
  }

  if (text.includes("drink")) {
    return "🥤";
  }

  return "🍛";
}

function getVisualClass(recipe) {
  const source = `${recipe.name}-${recipe.id}`;

  const hash = [...source].reduce(
    (total, character) =>
      total + character.charCodeAt(0),
    0
  );

  return visualClasses[
    hash % visualClasses.length
  ];
}

function formatNumber(value, fallback = "—") {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function formatIngredient(ingredient) {
  if (typeof ingredient === "string") {
    return ingredient;
  }

  const parts = [
    ingredient?.quantity,
    ingredient?.unit,
    ingredient?.name
  ]
    .filter(
      (part) =>
        part !== null &&
        part !== undefined &&
        String(part).trim() !== ""
    )
    .map(String);

  return parts.join(" ") || "Ingredient";
}

function buildQueryString() {
  const parameters = new URLSearchParams({
    page: String(state.page),
    per_page: "9"
  });

  if (state.search) {
    parameters.set("search", state.search);
  }

  if (state.cuisine) {
    parameters.set("cuisine", state.cuisine);
  }

  if (state.difficulty) {
    parameters.set(
      "difficulty",
      state.difficulty
    );
  }

  return parameters.toString();
}

function renderSkeletons() {
  elements.recipeGrid.innerHTML = Array.from(
    { length: 6 },
    () => `
      <article
        class="skeleton-card"
        aria-hidden="true"
      >
        <div
          class="skeleton-block skeleton-image"
        ></div>

        <div class="skeleton-body">
          <div
            class="skeleton-block skeleton-line short"
          ></div>

          <div
            class="skeleton-block skeleton-line medium"
          ></div>

          <div
            class="skeleton-block skeleton-line tall"
          ></div>

          <div
            class="skeleton-block skeleton-line"
          ></div>
        </div>
      </article>
    `
  ).join("");
}

function renderRecipes() {
  if (state.recipes.length === 0) {
    elements.recipeGrid.innerHTML = `
      <div
        class="status-panel"
        style="grid-column: 1 / -1;"
      >
        No recipes matched your search.
        Try clearing the filters or add your
        own recipe.
      </div>
    `;

    return;
  }

  elements.recipeGrid.innerHTML =
    state.recipes
      .map((recipe, index) => {
        const sourceLabel =
          recipe.source === "custom"
            ? "Your Recipe"
            : "RecipeAPI";

        const difficulty = String(
          recipe.difficulty || "easy"
        ).toLowerCase();

        const totalTime =
          Number(recipe.prep_time || 0) +
          Number(recipe.cook_time || 0);

        return `
          <article class="recipe-card">
            <div
              class="recipe-visual ${getVisualClass(
                recipe
              )}"
            >
              <span
                class="recipe-source ${
                  recipe.source === "custom"
                    ? "custom"
                    : ""
                }"
              >
                ${sourceLabel}
              </span>

              <span
                class="recipe-emoji"
                aria-hidden="true"
              >
                ${getRecipeEmoji(recipe)}
              </span>
            </div>

            <div class="recipe-card-content">
              <div class="recipe-meta">
                <span class="meta-pill">
                  ${escapeHtml(
                    slugToLabel(recipe.cuisine)
                  )}
                </span>

                <span
                  class="meta-pill difficulty-${escapeHtml(
                    difficulty
                  )}"
                >
                  ${escapeHtml(
                    slugToLabel(difficulty)
                  )}
                </span>
              </div>

              <h3>
                ${escapeHtml(
                  recipe.name ||
                    "Untitled Recipe"
                )}
              </h3>

              <p class="recipe-description">
                ${escapeHtml(
                  recipe.description ||
                    "A delicious recipe ready for your table."
                )}
              </p>

              <div class="recipe-facts">
                <div class="recipe-fact">
                  <strong>
                    ${formatNumber(totalTime, 0)}
                    min
                  </strong>
                  <span>Total time</span>
                </div>

                <div class="recipe-fact">
                  <strong>
                    ${formatNumber(
                      recipe.servings
                    )}
                  </strong>
                  <span>Servings</span>
                </div>

                <div class="recipe-fact">
                  <strong>
                    ${formatNumber(
                      recipe.calories_per_serving
                    )}
                  </strong>
                  <span>Calories</span>
                </div>
              </div>

              <button
                class="view-button"
                type="button"
                data-recipe-index="${index}"
              >
                View Recipe
              </button>
            </div>
          </article>
        `;
      })
      .join("");
}

function updatePagination() {
  elements.previousPageButton.disabled =
    state.page <= 1;

  elements.nextPageButton.disabled =
    state.page >= state.lastPage;

  elements.pageIndicator.textContent =
    `Page ${state.page} of ${state.lastPage}`;
}

function showStatus(message) {
  elements.statusPanel.textContent = message;

  elements.statusPanel.classList.remove(
    "hidden"
  );
}

function hideStatus() {
  elements.statusPanel.classList.add("hidden");
  elements.statusPanel.textContent = "";
}

/*
  GET request
*/
async function loadRecipes() {
  hideStatus();
  renderSkeletons();

  elements.resultSummary.textContent =
    "Loading delicious recipes...";

  try {
    const response = await fetch(
      `/api/recipes?${buildQueryString()}`
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error?.message ||
          "Could not load recipes."
      );
    }

    state.recipes = Array.isArray(payload.data)
      ? payload.data
      : [];

    state.page = Number(
      payload.meta?.current_page || state.page
    );

    state.lastPage = Math.max(
      1,
      Number(payload.meta?.last_page || 1)
    );

    const customCount = Number(
      payload.meta?.custom_count || 0
    );

    const remoteTotal = Number(
      payload.meta?.total || 0
    );

    const sourceText =
      customCount > 0
        ? `${remoteTotal} API recipes and ${customCount} saved recipe${
            customCount === 1 ? "" : "s"
          }`
        : `${remoteTotal} recipes available from RecipeAPI`;

    elements.resultSummary.textContent =
      sourceText;

    renderRecipes();
    updatePagination();
  } catch (error) {
    state.recipes = [];

    elements.recipeGrid.innerHTML = "";

    elements.resultSummary.textContent =
      "Recipes could not be loaded.";

    showStatus(error.message);
    updatePagination();
  }
}

function openModal(modal) {
  modal.classList.remove("hidden");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add("modal-open");

  const focusTarget = modal.querySelector(
    "input, button, select, textarea"
  );

  focusTarget?.focus();
}

function closeModal(modal) {
  modal.classList.add("hidden");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  const openModals = document.querySelectorAll(
    ".modal-backdrop:not(.hidden)"
  );

  if (openModals.length === 0) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

function openRecipeDetails(recipe) {
  const ingredients = Array.isArray(
    recipe.ingredients
  )
    ? recipe.ingredients
    : [];

  const instructions = Array.isArray(
    recipe.instructions
  )
    ? recipe.instructions
    : [];

  const totalTime =
    Number(recipe.prep_time || 0) +
    Number(recipe.cook_time || 0);

  elements.recipeDetailsContent.innerHTML = `
    <div
      class="details-hero ${getVisualClass(
        recipe
      )}"
    >
      <span
        class="recipe-emoji"
        aria-hidden="true"
      >
        ${getRecipeEmoji(recipe)}
      </span>
    </div>

    <div class="details-body">
      <div class="recipe-meta">
        <span class="meta-pill">
          ${escapeHtml(
            slugToLabel(recipe.cuisine)
          )}
        </span>

        <span class="meta-pill">
          ${escapeHtml(
            slugToLabel(recipe.meal_type)
          )}
        </span>

        ${
          recipe.source === "custom"
            ? `
              <span class="meta-pill">
                Your recipe
              </span>
            `
            : ""
        }
      </div>

      <h2 id="detailsTitle">
        ${escapeHtml(recipe.name || "Recipe")}
      </h2>

      <p>
        ${escapeHtml(
          recipe.description ||
            "No description provided."
        )}
      </p>

      <div class="details-stat-grid">
        <div class="details-stat">
          <strong>
            ${formatNumber(
              recipe.prep_time,
              0
            )} min
          </strong>
          <span>Prep</span>
        </div>

        <div class="details-stat">
          <strong>
            ${formatNumber(
              recipe.cook_time,
              0
            )} min
          </strong>
          <span>Cook</span>
        </div>

        <div class="details-stat">
          <strong>
            ${formatNumber(totalTime, 0)} min
          </strong>
          <span>Total</span>
        </div>

        <div class="details-stat">
          <strong>
            ${formatNumber(recipe.servings)}
          </strong>
          <span>Servings</span>
        </div>
      </div>

      <div class="details-columns">
        <section>
          <h3>Ingredients</h3>

          <ul>
            ${
              ingredients.length
                ? ingredients
                    .map(
                      (ingredient) => `
                        <li>
                          ${escapeHtml(
                            formatIngredient(
                              ingredient
                            )
                          )}
                        </li>
                      `
                    )
                    .join("")
                : `
                  <li>
                    No ingredients provided.
                  </li>
                `
            }
          </ul>
        </section>

        <section>
          <h3>How to cook</h3>

          <ol>
            ${
              instructions.length
                ? instructions
                    .map(
                      (instruction) => `
                        <li>
                          ${escapeHtml(
                            instruction
                          )}
                        </li>
                      `
                    )
                    .join("")
                : `
                  <li>
                    No instructions provided.
                  </li>
                `
            }
          </ol>
        </section>
      </div>
    </div>
  `;

  openModal(elements.recipeDetailsModal);
}

function splitLines(value) {
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formToRecipe(form) {
  const formData = new FormData(form);

  return {
    name: formData.get("name"),
    description:
      formData.get("description"),
    cuisine: formData.get("cuisine"),
    meal_type: formData.get("meal_type"),
    difficulty:
      formData.get("difficulty"),
    servings: formData.get("servings"),
    prep_time: formData.get("prep_time"),
    cook_time: formData.get("cook_time"),

    ingredients: splitLines(
      formData.get("ingredients")
    ).map((name) => ({ name })),

    instructions: splitLines(
      formData.get("instructions")
    )
  };
}

function showFormError(messages) {
  const list = Array.isArray(messages)
    ? messages
    : [messages];

  elements.formError.innerHTML = list
    .map(
      (message) =>
        `• ${escapeHtml(message)}`
    )
    .join("<br>");

  elements.formError.classList.remove(
    "hidden"
  );
}

function hideFormError() {
  elements.formError.classList.add("hidden");
  elements.formError.textContent = "";
}

function showToast(
  message,
  type = "success"
) {
  elements.toast.textContent = message;

  elements.toast.classList.toggle(
    "error",
    type === "error"
  );

  elements.toast.classList.remove("hidden");

  window.clearTimeout(showToast.timeoutId);

  showToast.timeoutId = window.setTimeout(
    () => {
      elements.toast.classList.add("hidden");
    },
    3500
  );
}

/*
  POST request
*/
async function submitRecipe(event) {
  event.preventDefault();

  hideFormError();

  elements.saveRecipeButton.disabled = true;

  elements.saveRecipeButton.textContent =
    "Saving...";

  try {
    const response = await fetch(
      "/api/recipes",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(
          formToRecipe(elements.recipeForm)
        )
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      const details =
        payload.error?.details || [
          payload.error?.message ||
            "Could not save recipe."
        ];

      showFormError(details);
      return;
    }

    elements.recipeForm.reset();

    document.querySelector(
      "#recipeCuisine"
    ).value = "filipino";

    document.querySelector(
      "#recipeServings"
    ).value = "4";

    document.querySelector(
      "#recipePrepTime"
    ).value = "10";

    document.querySelector(
      "#recipeCookTime"
    ).value = "20";

    closeModal(elements.recipeFormModal);

    state.page = 1;

    showToast(
      `${payload.data.name} was saved successfully.`
    );

    await loadRecipes();
  } catch (error) {
    showFormError(error.message);
  } finally {
    elements.saveRecipeButton.disabled =
      false;

    elements.saveRecipeButton.textContent =
      "Save Recipe";
  }
}

function applyFilters() {
  state.search =
    elements.filterSearch.value.trim();

  state.cuisine =
    elements.cuisineFilter.value;

  state.difficulty =
    elements.difficultyFilter.value;

  state.page = 1;

  elements.searchInput.value = state.search;

  loadRecipes();
}

function clearFilters() {
  state.search = "";
  state.cuisine = "";
  state.difficulty = "";
  state.page = 1;

  elements.searchInput.value = "";
  elements.filterSearch.value = "";
  elements.cuisineFilter.value = "";
  elements.difficultyFilter.value = "";

  loadRecipes();
}

document
  .querySelectorAll(
    "#openRecipeFormButton, #openRecipeFormButtonSecondary"
  )
  .forEach((button) => {
    button.addEventListener("click", () => {
      hideFormError();
      openModal(elements.recipeFormModal);
    });
  });

document
  .querySelectorAll("[data-close-modal]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.querySelector(
        `#${button.dataset.closeModal}`
      );

      if (modal) {
        closeModal(modal);
      }
    });
  });

document
  .querySelectorAll(".modal-backdrop")
  .forEach((backdrop) => {
    backdrop.addEventListener(
      "click",
      (event) => {
        if (event.target === backdrop) {
          closeModal(backdrop);
        }
      }
    );
  });

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      document
        .querySelectorAll(
          ".modal-backdrop:not(.hidden)"
        )
        .forEach(closeModal);
    }
  }
);

elements.searchForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    state.search =
      elements.searchInput.value.trim();

    state.page = 1;

    elements.filterSearch.value =
      state.search;

    loadRecipes();

    document
      .querySelector("#recipes")
      .scrollIntoView({
        behavior: "smooth"
      });
  }
);

elements.applyFiltersButton.addEventListener(
  "click",
  applyFilters
);

elements.clearFiltersButton.addEventListener(
  "click",
  clearFilters
);

elements.recipeForm.addEventListener(
  "submit",
  submitRecipe
);

elements.filterSearch.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      applyFilters();
    }
  }
);

elements.recipeGrid.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest(
      "[data-recipe-index]"
    );

    if (!button) {
      return;
    }

    const recipe =
      state.recipes[
        Number(button.dataset.recipeIndex)
      ];

    if (recipe) {
      openRecipeDetails(recipe);
    }
  }
);

elements.previousPageButton.addEventListener(
  "click",
  () => {
    if (state.page <= 1) {
      return;
    }

    state.page -= 1;

    loadRecipes();

    document
      .querySelector("#recipes")
      .scrollIntoView({
        behavior: "smooth"
      });
  }
);

elements.nextPageButton.addEventListener(
  "click",
  () => {
    if (state.page >= state.lastPage) {
      return;
    }

    state.page += 1;

    loadRecipes();

    document
      .querySelector("#recipes")
      .scrollIntoView({
        behavior: "smooth"
      });
  }
);

loadRecipes();
