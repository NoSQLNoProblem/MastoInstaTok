import { ActivityType } from "./ActivityType";

export interface Activity {
  id: string;
  type: ActivityType;
  actor: string;
  object: any;
  published?: string;
}
