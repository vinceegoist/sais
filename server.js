import express from "express";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.RECIPE_API_KEY;
const RECIPE_API_BASE_URL = "https://recipeapi.io/api/v1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDirectory = path.join(__dirname, "public");
const dataDirectory = path.join(__dirname, "data");
const customRecipesFile = path.join(
  dataDirectory,
  "custom-recipes.json"
);

const allowedRecipeQueryParameters = new Set([
  "search",
  "search_in",
  "ingredients",
  "cuisine",
  "meal_type",
  "difficulty",
  "dietary_tags",
  "prep_time_min",
  "prep_time_max",
  "cook_time_min",
  "cook_time_max",
  "calories_per_serving_min",
  "calories_per_serving_max",
  "protein_min",
  "protein_max",
  "sort",
  "order",
  "page",
  "per_page"
]);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDirectory));

async function ensureDataFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(customRecipesFile, "utf8");
  } catch {
    await writeFile(customRecipesFile, "[]", "utf8");
  }
}

async function readCustomRecipes() {
  await ensureDataFile();

  const contents = await readFile(
    customRecipesFile,
    "utf8"
  );

  try {
    const recipes = JSON.parse(contents);
    return Array.isArray(recipes) ? recipes : [];
  } catch {
    return [];
  }
}

async function saveCustomRecipes(recipes) {
  await ensureDataFile();

  await writeFile(
    customRecipesFile,
    JSON.stringify(recipes, null, 2),
    "utf8"
  );
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPositiveNumber(value, fallback = null) {
  if (
    value === "" ||
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

function normalizeIngredients(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ingredient) => {
      if (typeof ingredient === "string") {
        return {
          id: null,
          name: cleanText(ingredient),
          category: "custom",
          quantity: null,
          unit: "",
          optional: false
        };
      }

      return {
        id: null,
        name: cleanText(ingredient?.name),
        category:
          cleanText(ingredient?.category) || "custom",
        quantity: cleanPositiveNumber(
          ingredient?.quantity
        ),
        unit: cleanText(ingredient?.unit),
        optional: Boolean(ingredient?.optional)
      };
    })
    .filter((ingredient) => ingredient.name);
}

function normalizeInstructions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(cleanText).filter(Boolean);
}

function validateRecipe(body) {
  const recipe = {
    name: cleanText(body.name),
    description: cleanText(body.description),
    difficulty:
      cleanText(body.difficulty) || "easy",
    meal_type:
      cleanText(body.meal_type) || "main",
    cuisine:
      cleanText(body.cuisine) || "filipino",
    servings: cleanPositiveNumber(
      body.servings,
      1
    ),
    prep_time: cleanPositiveNumber(
      body.prep_time,
      0
    ),
    cook_time: cleanPositiveNumber(
      body.cook_time,
      0
    ),
    calories_per_serving: cleanPositiveNumber(
      body.calories_per_serving
    ),
    protein: cleanPositiveNumber(body.protein),
    ingredients: normalizeIngredients(
      body.ingredients
    ),
    instructions: normalizeInstructions(
      body.instructions
    )
  };

  const errors = [];

  if (recipe.name.length < 3) {
    errors.push(
      "Recipe name must contain at least 3 characters."
    );
  }

  if (!recipe.description) {
    errors.push("Description is required.");
  }

  if (recipe.ingredients.length === 0) {
    errors.push("Add at least one ingredient.");
  }

  if (recipe.instructions.length === 0) {
    errors.push("Add at least one instruction.");
  }

  return { recipe, errors };
}

function matchesCustomRecipe(recipe, query) {
  const search = cleanText(
    query.search
  ).toLowerCase();

  const cuisine = cleanText(
    query.cuisine
  ).toLowerCase();

  const difficulty = cleanText(
    query.difficulty
  ).toLowerCase();

  const mealType = cleanText(
    query.meal_type
  ).toLowerCase();

  const searchableText =
    `${recipe.name} ${recipe.description}`.toLowerCase();

  return (
    (!search || searchableText.includes(search)) &&
    (!cuisine ||
      recipe.cuisine.toLowerCase() === cuisine) &&
    (!difficulty ||
      recipe.difficulty.toLowerCase() === difficulty) &&
    (!mealType ||
      recipe.meal_type.toLowerCase() === mealType)
  );
}

function buildRecipeApiUrl(query) {
  const url = new URL(
    `${RECIPE_API_BASE_URL}/recipes`
  );

  for (const [key, rawValue] of Object.entries(query)) {
    if (!allowedRecipeQueryParameters.has(key)) {
      continue;
    }

    const value = Array.isArray(rawValue)
      ? rawValue[0]
      : rawValue;

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      url.searchParams.set(key, value.trim());
    }
  }

  if (!url.searchParams.has("per_page")) {
    url.searchParams.set("per_page", "9");
  }

  if (!url.searchParams.has("page")) {
    url.searchParams.set("page", "1");
  }

  return url;
}

/*
  GET /api/recipes

  Gets recipes from RecipeAPI and combines them with
  recipes saved in custom-recipes.json.
*/
app.get("/api/recipes", async (request, response) => {
  if (!API_KEY) {
    return response.status(500).json({
      error: {
        code: "MISSING_API_KEY",
        message:
          "Set RECIPE_API_KEY in your .env file."
      }
    });
  }

  try {
    const url = buildRecipeApiUrl(request.query);

    const recipeApiResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json"
      }
    });

    const recipeApiPayload =
      await recipeApiResponse
        .json()
        .catch(() => ({}));

    if (!recipeApiResponse.ok) {
      return response
        .status(recipeApiResponse.status)
        .json({
          error:
            recipeApiPayload.error || {
              code: "RECIPE_API_ERROR",
              message:
                "RecipeAPI returned an error."
            }
        });
    }

    const customRecipes = (
      await readCustomRecipes()
    )
      .filter((recipe) =>
        matchesCustomRecipe(recipe, request.query)
      )
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

    const currentPage = Number(
      recipeApiPayload.meta?.current_page ||
        request.query.page ||
        1
    );

    const customRecipesForPage =
      currentPage === 1 ? customRecipes : [];

    const remoteRecipes = Array.isArray(
      recipeApiPayload.data
    )
      ? recipeApiPayload.data.map((recipe) => ({
          ...recipe,
          source: "recipeapi"
        }))
      : [];

    return response.json({
      data: [
        ...customRecipesForPage,
        ...remoteRecipes
      ],
      links: recipeApiPayload.links || {},
      meta: {
        ...(recipeApiPayload.meta || {}),
        custom_count: customRecipes.length,
        displayed_count:
          customRecipesForPage.length +
          remoteRecipes.length
      }
    });
  } catch (error) {
    console.error(error);

    return response.status(502).json({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message:
          "Could not connect to RecipeAPI. Check your connection."
      }
    });
  }
});

/*
  POST /api/recipes

  Saves a custom recipe to data/custom-recipes.json.
*/
app.post("/api/recipes", async (request, response) => {
  try {
    const { recipe, errors } = validateRecipe(
      request.body || {}
    );

    if (errors.length > 0) {
      return response.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Please correct the recipe fields.",
          details: errors
        }
      });
    }

    const customRecipes =
      await readCustomRecipes();

    const newRecipe = {
      id: `local-${randomUUID()}`,
      ...recipe,
      dietary_tags: [],
      source: "custom",
      created_at: new Date().toISOString()
    };

    customRecipes.push(newRecipe);

    await saveCustomRecipes(customRecipes);

    return response.status(201).json({
      data: newRecipe
    });
  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: {
        code: "SAVE_FAILED",
        message:
          "The custom recipe could not be saved."
      }
    });
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested route was not found."
    }
  });
});

ensureDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `Sarap Recipe List is running at http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "Could not initialize the data file:",
      error
    );

    process.exit(1);
  });