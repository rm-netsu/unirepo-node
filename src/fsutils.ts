export const isENOENT = ($: unknown) =>
	!!$ && typeof $ === 'object' && 'code' in $ && $.code === 'ENOENT'
