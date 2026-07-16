const RECIPE_API_BASE_URL = "https://recipeapi.io/api/v1";
const BRUNO_ECHO_URL = "https://echo.usebruno.com";

/**
 * Reads the response returned by the server.
 *
 * It attempts to read JSON first. If the server does not return JSON,
 * it reads the response as plain text.
 */
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  let body;

  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    let serverMessage = "";

    if (typeof body === "object" && body !== null) {
      serverMessage =
        body.message ??
        body.error ??
        body.detail ??
        "";
    } else {
      serverMessage = body;
    }

    throw new Error(
      serverMessage ||
      `Request failed with status ${response.status}.`
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    body
  };
}

/**
 * Sends a GET request to Recipe API.
 *
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {string} options.search
 * @param {number} options.perPage
 */
export async function getRecipes({
  apiKey,
  search,
  perPage = 6
}) {
  const cleanApiKey = apiKey.trim();
  const cleanSearch = search.trim();

  if (!cleanApiKey) {
    throw new Error("Please enter your Recipe API key.");
  }

  if (!cleanSearch) {
    throw new Error("Please enter a recipe search term.");
  }

  const queryParameters = new URLSearchParams({
    search: cleanSearch,
    per_page: String(perPage)
  });

  const requestUrl =
    `${RECIPE_API_BASE_URL}/recipes?${queryParameters.toString()}`;

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${cleanApiKey}`
    }
  });

  return parseResponse(response);
}

/**
 * Sends a POST request to Bruno's test echo API.
 *
 * The echo endpoint returns the submitted request data.
 * It does not permanently save the recipe.
 *
 * @param {Object} recipe
 */
export async function postRecipeTest(recipe) {
  const response = await fetch(BRUNO_ECHO_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(recipe)
  });

  return parseResponse(response);
}