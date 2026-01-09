import { Request, Response, NextFunction } from "express";

// Simulates a logged-in user (User ID 1 = Admin, User ID 2 = Creator)
export const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  // You can switch this by sending a header 'x-user-id' from Frontend
  const userId = req.headers["x-user-id"] || "2"; // Default to User 2 (Creator)

  // Attach to request body so controllers can use it
  req.body.userId = userId;
  next();
};
