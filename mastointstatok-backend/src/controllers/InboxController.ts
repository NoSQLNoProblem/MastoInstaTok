import { Request, Response, NextFunction } from 'express';
import * as InboxService from '../services/InboxService';

export const postToInbox = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    console.log(username);
    const activity = req.body;
    await InboxService.handleInboxActivity(username, activity);
    res.status(200).json({ message: 'Activity received' });
  } catch (error) {
    next(error);
  }
};
