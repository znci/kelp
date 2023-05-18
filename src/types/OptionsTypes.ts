/**
 * Types for User Options
 */

/**
 * Route Options
 * @param enabled Whether or not to enable the route
 * @param path The path to the route
 */
export type RouteOptions = {
  enabled?: boolean;
  path?: string;
};

/**
 * Public Options
 * @param enabled Whether or not to enable the public folder
 * @param path The path to the public folder
 */
export type PublicOptions = {
  enabled?: boolean;
  path?: string;
};

/**
 * Custom Middleware Options
 * @param enabled Whether or not to enable the custom middleware
 * @param middleware The middleware function
 */
export type CustomMiddleware = {
  enabled?: boolean;
  middleware?: (req: any, res: any) => void;
};

/**
 * View Engine Options
 * @param path Path to the view engine routes folder
 */
export type viewEngineOptions = {
  path?: string;
};

/**
 * User Options
 * @param bodyParser Whether or not to enable body-parser
 * @param cors Whether or not to enable cors
 * @param ejs Whether or not to enable ejs
 * @param ejsOptions Options for ejs
 * @param pug Whether or not to enable pug
 * @param pugOptions Options for pug
 * @param welcome Whether or not to enable the welcome page
 * @param routes Whether or not to enable the routes folder
 * @param routeOptions Options for the routes folder
 * @param custom Whether or not to enable custom middleware
 * @param customMiddleware The custom middleware function
 * @param public Whether or not to enable the public folder
 * @param publicOptions Options for the public folder
 */
export type UserOptions = {
  bodyParser?: boolean;
  cors?: boolean;
  ejs?: boolean;
  ejsOptions?: viewEngineOptions;
  pug?: boolean;
  pugOptions?: viewEngineOptions;
  welcome?: boolean;
  routes?: boolean;
  routeOptions?: RouteOptions;
  custom?: boolean;
  customMiddleware?: CustomMiddleware;
  public?: boolean;
  publicOptions?: PublicOptions;
};
