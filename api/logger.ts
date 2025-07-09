import pino from 'pino';

const logger = pino({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'trace',
	transport:
		process.env.NODE_ENV === 'production'
			? undefined
			: {
					target: 'pino-pretty',
					options: {
						colorize: true,
						ignore: 'pid,hostname',
					},
				},
});
export default logger;
