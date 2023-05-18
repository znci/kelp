/*
	Kelp Types
*/

import { UserOptions } from "./OptionsTypes";

interface Heartbeat {
  ROUTE: string;
  FLAGS?: {
    disabled?: boolean;
  };
}

export type KelpOptions = {
  PORT?: number;
  OPTIONS?: UserOptions;
  IS_DEV_MODE?: boolean;
  HEARTBEAT?: Heartbeat;
};

export type KelpRoute = {
  path: string;
  method: string;
  handler: (req: Express.Request, res: Express.Response) => void;
  flags?: {
    disabled?: boolean;
    devRoute?: boolean;
  };
};
