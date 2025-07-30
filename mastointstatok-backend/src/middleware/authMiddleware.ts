import { type Request, type Response, type NextFunction } from 'express';

// THIS WILL BE USED WHEN WE IMPLEMENT THE CLIENT APIS. It may be possible to just use this on the client endpoints. Will see. Will leave here for now.

/**
 * Middleware to ensure a request is authenticated, either through a user session
 * or a valid federated request (HTTP Signature).
 *
 * This allows endpoints to be accessed by both logged-in users (e.g., fetching their own feed)
 * and other ActivityPub servers (e.g., receiving a 'Like' activity).
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Case 1: The request is from another federated server.
  // The Fedify middleware runs before this and will populate `req.federationContext` if the HTTP Signature is valid. We can trust this request.
  
  // @ts-ignore: Property 'federationContext' is dynamically added by Fedify middleware
  if (req.federationContext?.actor) {
    return next();
  }

  // Case 2: The request is from a user logged into our web app.
  // Passport's session middleware will populate `req.isAuthenticated()`.
  if (req.isAuthenticated()) {
    return next();
  }

  // If neither of the above cases are true, the request is unauthorized.
  res.status(401).json({ message: 'Unauthorized: A valid user session or federated signature is required.' });
};
