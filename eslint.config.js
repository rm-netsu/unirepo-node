import eslint from '@eslint/js'
import eslintPluginImport from 'eslint-plugin-import'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

/** @type {tseslint.ConfigArray} */
const CONFIG = tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	prettierRecommended,
	eslintPluginUnicorn.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
		plugins: {
			import: eslintPluginImport,
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'max-depth': ['warn', 3],
			complexity: ['warn', 10],
			'no-else-return': 'error',
			'unicorn/better-regex': 'warn',
			'unicorn/template-indent': 'off',
			'unicorn/number-literal-case': 'off',
			'unicorn/relative-url-style': ['error', 'always'],

			'import/order': [
				'error',
				{
					groups: [
						'type',
						'builtin',
						'external',
						'internal',
						['parent', 'sibling', 'index'],
						'unknown',
					],
					pathGroups: [
						{
							pattern: '#/**',
							group: 'internal',
							position: 'before',
						},
					],
					pathGroupsExcludedImportTypes: ['type'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					fixStyle: 'separate-type-imports',
					prefer: 'type-imports',
				},
			],
			'@typescript-eslint/consistent-type-exports': 'error',

			'@typescript-eslint/no-empty-object-type': [
				'error',
				{
					allowInterfaces: 'with-single-extends',
				},
			],
		},
		settings: {
			'import/resolver': {
				typescript: {
					project: './tsconfig.json',
				},
				node: true,
			},
		},
	},
)
export default CONFIG
