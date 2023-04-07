/*
	Kelp Types
*/

interface Heartbeat {
	ROUTE: string;
	FLAGS?: {
		disabled?: boolean;
	};
};

export type KelpOptions = {
	PORT?: number;
	OPTIONS?: string[];
	IS_DEV_MODE?: boolean;
	HEARTBEAT?: Heartbeat;
};

export type KelpRoute = {
	path: string;
	method: string;
	handler: (req: any, res: any) => void;
	flags?: {
		disabled?: boolean;
		devRoute?: boolean;
	};
};

